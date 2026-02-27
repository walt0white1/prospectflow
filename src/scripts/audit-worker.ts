/**
 * Script standalone d'audit — exécuté comme processus enfant depuis l'API route.
 * Usage : npx tsx src/scripts/audit-worker.ts <url> [--screenshots]
 * Output : JSON sur stdout (AuditResult) ou { error: string } en cas d'échec.
 */
import { auditWebsite } from '../lib/scraper'

async function main() {
  const args = process.argv.slice(2)
  const url = args[0]
  const screenshots = args.includes('--screenshots')

  if (!url) {
    process.stdout.write(JSON.stringify({ error: 'URL manquante' }))
    process.exit(1)
  }

  try {
    const result = await auditWebsite(url, { screenshots, timeout: 20000 })
    process.stdout.write(JSON.stringify(result))
    process.exit(0)
  } catch (err) {
    process.stdout.write(JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
    }))
    process.exit(1)
  }
}

main()
