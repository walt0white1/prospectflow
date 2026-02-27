// ── POST /api/prospects/audit ─────────────────────────────────────────────────
// Lance un audit Playwright via un processus enfant (tsx) et sauvegarde en BDD.
// Exécution en child process pour éviter les conflits de bundling Next.js/Turbopack.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { spawn } from 'child_process'
import path from 'path'
import { computeProspectScore, computeSiteScore } from '@/lib/scorer'
import type { AuditResult } from '@/lib/scraper'
import { prisma } from '@/lib/prisma'

const BodySchema = z.object({
  url:         z.string().url('URL invalide'),
  prospectId:  z.string().optional(),
  screenshots: z.boolean().optional().default(false),
})

// ── Lance le worker Playwright dans un processus enfant ──────────────────────
function runAuditWorker(url: string, screenshots: boolean, timeout: number): Promise<AuditResult> {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(process.cwd(), 'src', 'scripts', 'audit-worker.ts')
    const tsxBin = path.join(process.cwd(), 'node_modules', '.bin', 'tsx')

    const args = [workerPath, url]
    if (screenshots) args.push('--screenshots')

    const child = spawn(tsxBin, args, {
      timeout,
      env: {
        ...process.env,
        // Forcer le chemin des browsers Playwright installés dans le projet
        PLAYWRIGHT_BROWSERS_PATH: path.join(process.cwd(), 'playwright-browsers'),
      },
      shell: process.platform === 'win32',
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

    child.on('close', (code) => {
      if (!stdout) {
        reject(new Error(`Worker sans output (code ${code}). Stderr: ${stderr.slice(0, 300)}`))
        return
      }
      try {
        const result = JSON.parse(stdout) as AuditResult | { error: string }
        if ('error' in result) {
          reject(new Error(result.error))
        } else {
          resolve(result)
        }
      } catch {
        reject(new Error(`JSON invalide du worker: ${stdout.slice(0, 200)}`))
      }
    })

    child.on('error', (err) => {
      reject(new Error(`Spawn échoué : ${err.message}`))
    })
  })
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: z.infer<typeof BodySchema>
  try {
    const raw = await req.json()
    body = BodySchema.parse(raw)
  } catch (err) {
    const msg = err instanceof z.ZodError
      ? err.issues.map((e: { message: string }) => e.message).join(', ')
      : 'Corps de requête invalide'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { url, prospectId, screenshots } = body

  // ── Audit Playwright (processus enfant) ──────────────────────────────────────
  let auditResult: AuditResult
  try {
    auditResult = await runAuditWorker(url, screenshots, 45_000)
  } catch (err) {
    console.error('[audit] Worker error:', err)
    return NextResponse.json(
      { error: `Audit échoué : ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }

  // ── Scoring ──────────────────────────────────────────────────────────────────
  const scoring = computeProspectScore({ hasWebsite: true, audit: auditResult })
  const siteScore = computeSiteScore(auditResult)

  // ── Persist to DB if prospectId provided ─────────────────────────────────────
  if (prospectId) {
    try {
      await prisma.prospect.update({
        where: { id: prospectId },
        data: {
          auditData:     auditResult as object,
          loadTime:      auditResult.loadTimeSec,
          mobileScore:   auditResult.mobileScore,
          seoScore:      auditResult.seoScore,
          sslValid:      auditResult.hasSSL,
          isResponsive:  auditResult.isResponsive,
          techStack:     auditResult.techStack,
          designAge:     auditResult.designAge ?? null,
          issues:        auditResult.issues as object,
          siteScore,
          prospectScore: scoring.prospectScore,
          priority:      scoring.priority,
          status:        'AUDITED',
          lastContactAt: new Date(),
        },
      })
    } catch (dbErr) {
      console.warn('[audit] DB save skipped:', dbErr instanceof Error ? dbErr.message : dbErr)
    }
  }

  // ── Response ─────────────────────────────────────────────────────────────────
  return NextResponse.json({
    audit:   auditResult,
    scoring: {
      prospectScore: scoring.prospectScore,
      siteScore,
      priority:      scoring.priority,
      breakdown:     scoring.breakdown,
    },
  })
}
