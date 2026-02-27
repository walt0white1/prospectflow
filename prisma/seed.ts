import { PrismaClient } from '../src/generated/prisma/client'
import {
  ProspectStatus,
  Priority,
  Source,
  EmailStatus,
  CampaignStatus,
  TemplateType,
} from '../src/generated/prisma/enums'
import bcrypt from 'bcryptjs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new (PrismaClient as any)()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ---------------------------------------------------------------------------
// Audit data helpers
// ---------------------------------------------------------------------------

function makeStaleAudit(url: string, cms: string, year: number) {
  const loadTime = Number((4 + Math.random() * 6).toFixed(1))
  return {
    url,
    timestamp: daysAgo(rand(1, 14)),
    loadTime,
    pageSize: rand(3000, 8000),
    numberOfRequests: rand(60, 140),
    hasSSL: false,
    isResponsive: false,
    mobileScore: rand(10, 35),
    hasTitle: Math.random() > 0.4,
    hasMetaDescription: false,
    hasH1: Math.random() > 0.5,
    hasOpenGraph: false,
    hasSitemap: false,
    hasRobotsTxt: false,
    seoScore: rand(10, 35),
    techStack: [cms, 'jQuery'],
    designAge: year,
    issues: [
      {
        id: 'no-ssl',
        label: 'Pas de HTTPS',
        severity: 'critical',
        category: 'security',
        description: 'Le site ne dispose pas de certificat SSL valide.',
        recommendation: 'Installer un certificat SSL (gratuit avec Let\'s Encrypt).',
      },
      {
        id: 'not-responsive',
        label: 'Site non responsive',
        severity: 'critical',
        category: 'mobile',
        description: 'Le site ne s\'adapte pas aux écrans mobiles.',
        recommendation: 'Refonte avec un thème responsive ou migration vers un CMS moderne.',
      },
      {
        id: 'slow-load',
        label: `Temps de chargement élevé (${loadTime}s)`,
        severity: 'high',
        category: 'performance',
        description: `La page met ${loadTime}s à charger, au-dessus du seuil acceptable de 3s.`,
        recommendation: 'Optimiser les images, activer le cache et utiliser un CDN.',
      },
      {
        id: 'old-design',
        label: `Design daté (${year})`,
        severity: 'medium',
        category: 'design',
        description: `L'apparence visuelle date de ${year} et nuit à la crédibilité.`,
        recommendation: 'Refonte complète pour un design moderne et professionnel.',
      },
      {
        id: 'no-meta',
        label: 'Meta description manquante',
        severity: 'medium',
        category: 'seo',
        description: 'Aucune meta description, pénalisant le référencement Google.',
        recommendation: 'Ajouter une meta description pertinente sur chaque page.',
      },
    ],
  }
}

function makeDecentAudit(url: string, cms: string, year: number) {
  const loadTime = Number((1.5 + Math.random() * 2.5).toFixed(1))
  return {
    url,
    timestamp: daysAgo(rand(1, 30)),
    loadTime,
    pageSize: rand(800, 2500),
    numberOfRequests: rand(25, 60),
    hasSSL: true,
    isResponsive: true,
    mobileScore: rand(55, 85),
    hasTitle: true,
    hasMetaDescription: Math.random() > 0.3,
    hasH1: true,
    hasOpenGraph: Math.random() > 0.5,
    hasSitemap: Math.random() > 0.5,
    hasRobotsTxt: true,
    seoScore: rand(45, 72),
    techStack: [cms],
    designAge: year,
    issues: [
      {
        id: 'missing-og',
        label: 'Open Graph incomplet',
        severity: 'low',
        category: 'seo',
        description: 'Les balises Open Graph sont absentes ou incomplètes.',
        recommendation: 'Ajouter les balises og:title, og:description et og:image.',
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 Seeding ProspectFlow...\n')

  // Nettoyer la base
  await prisma.email.deleteMany()
  await prisma.note.deleteMany()
  await prisma.prospect.deleteMany()
  await prisma.campaign.deleteMany()
  await prisma.emailTemplate.deleteMany()
  await prisma.settings.deleteMany()
  await prisma.user.deleteMany()

  // -------------------------------------------------------------------------
  // Utilisateur test
  // -------------------------------------------------------------------------
  const passwordHash = await bcrypt.hash('test1234', 10)

  const user = await prisma.user.create({
    data: {
      email: 'test@test.com',
      name: 'Thomas Dupont',
      password: passwordHash,
      company: 'WebAgence Pro',
      phone: '06 12 34 56 78',
      signature: 'Thomas Dupont\nWebAgence Pro\n06 12 34 56 78\nwebagence-pro.fr',
    },
  })

  console.log(`✅ Utilisateur créé : ${user.email}`)

  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------
  await prisma.settings.create({
    data: {
      userId: user.id,
      dailyEmailLimit: 50,
      delayBetweenEmails: 30,
      defaultCity: 'Paris',
      defaultIndustry: 'restaurant',
      defaultSearchRadius: 15,
      autoAudit: true,
    },
  })

  // -------------------------------------------------------------------------
  // Campagnes
  // -------------------------------------------------------------------------
  const [campRestaurants, campArtisans, campProfessions] = await Promise.all([
    prisma.campaign.create({
      data: {
        userId: user.id,
        name: 'Restaurants Paris — Mai 2025',
        description: 'Restaurants parisiens avec sites obsolètes ou inexistants.',
        status: CampaignStatus.ACTIVE,
        targetCity: 'Paris',
        targetIndustry: 'restaurant',
        minScore: 60,
        maxProspects: 30,
        totalSent: 18,
        totalOpened: 11,
        totalReplied: 3,
        totalMeetings: 1,
        sequence: [
          { delay: 0, templateId: 'first_contact' },
          { delay: 3, templateId: 'follow_up_1' },
          { delay: 7, templateId: 'follow_up_2' },
        ],
      },
    }),
    prisma.campaign.create({
      data: {
        userId: user.id,
        name: 'Artisans Île-de-France',
        description: 'Plombiers, électriciens, menuisiers sans présence web.',
        status: CampaignStatus.PAUSED,
        targetCity: 'Paris',
        targetIndustry: 'plombier',
        minScore: 70,
        maxProspects: 50,
        totalSent: 7,
        totalOpened: 4,
        totalReplied: 1,
        totalMeetings: 0,
      },
    }),
    prisma.campaign.create({
      data: {
        userId: user.id,
        name: 'Professions libérales — Lyon',
        description: 'Avocats, comptables, kinés lyonnais avec sites datés.',
        status: CampaignStatus.DRAFT,
        targetCity: 'Lyon',
        targetIndustry: 'avocat',
        minScore: 50,
        maxProspects: 40,
        totalSent: 0,
        totalOpened: 0,
        totalReplied: 0,
        totalMeetings: 0,
      },
    }),
  ])

  console.log('✅ 3 campagnes créées')

  // -------------------------------------------------------------------------
  // Templates emails
  // -------------------------------------------------------------------------
  await prisma.emailTemplate.createMany({
    data: [
      {
        userId: user.id,
        name: 'Premier contact — Site inexistant',
        subject: 'Votre présence en ligne — {{companyName}}',
        type: TemplateType.FIRST_CONTACT,
        body: `Bonjour,\n\nEn cherchant {{companyName}} sur internet, je n'ai pas trouvé de site web à votre nom.\n\nDans votre secteur, 78 % des clients recherchent un prestataire en ligne avant de contacter. Sans site, vous passez à côté de cette clientèle.\n\nJe crée des sites simples, efficaces et abordables pour les {{industry}} — livraison en 2 semaines.\n\nDispo pour un appel de 10 minutes cette semaine ?\n\n{{signature}}`,
      },
      {
        userId: user.id,
        name: 'Premier contact — Site obsolète',
        subject: 'Votre site web — quelques points à améliorer',
        type: TemplateType.FIRST_CONTACT,
        body: `Bonjour,\n\nEn visitant votre site {{website}}, j'ai remarqué qu'il se charge en {{loadTime}} secondes et n'est pas adapté aux mobiles — ce qui représente aujourd'hui 65 % du trafic web.\n\nCes problèmes font fuir les visiteurs et pénalisent votre positionnement Google.\n\nJe propose des refontes rapides (3 semaines) avec résultats mesurables.\n\nUn échange rapide pour voir ce qu'on peut améliorer ?\n\n{{signature}}`,
      },
      {
        userId: user.id,
        name: 'Relance 1 — Sans réponse',
        subject: 'Re: Votre site web',
        type: TemplateType.FOLLOW_UP_1,
        body: `Bonjour,\n\nJe me permets de revenir vers vous suite à mon message de la semaine dernière.\n\nSi vous avez des questions sur une refonte ou la création de votre site, je suis disponible.\n\nBonne journée,\n{{signature}}`,
      },
      {
        userId: user.id,
        name: 'Relance 2 — Angle résultat',
        subject: 'Ce que ça rapporte concrètement',
        type: TemplateType.FOLLOW_UP_2,
        body: `Bonjour,\n\nDernier message de ma part.\n\nUn client {{industry}} comme vous a vu ses appels entrants augmenter de 40 % en 3 mois après refonte. Le site s'est rentabilisé en 2 semaines.\n\nSi l'idée vous intéresse, je vous offre un audit gratuit de 30 minutes.\n\n{{signature}}`,
      },
    ],
  })

  console.log('✅ 4 templates créés')

  // -------------------------------------------------------------------------
  // Prospects — Groupe 1 : SANS SITE WEB (15 prospects, score 85-95, HOT)
  // -------------------------------------------------------------------------
  const hotData = [
    { companyName: 'Boulangerie Artisanale Lefèbvre', industry: 'boulangerie', city: 'Clermont-Ferrand', postalCode: '63000', phone: '04 73 12 34 56', osmId: '245678901', googleRating: 4.6, googleReviewCount: 89 },
    { companyName: 'Plomberie Martin & Fils', industry: 'plombier', city: 'Nantes', postalCode: '44000', phone: '06 78 23 45 67', osmId: '245678902', googleRating: 4.8, googleReviewCount: 42 },
    { companyName: 'Salon Christine Coiffure', industry: 'coiffeur', city: 'Rouen', postalCode: '76000', phone: '02 35 45 67 89', osmId: '245678903', googleRating: 4.4, googleReviewCount: 127 },
    { companyName: 'Le Bouchon Lyonnais', industry: 'restaurant', city: 'Lyon', postalCode: '69002', phone: '04 78 34 56 78', osmId: '245678904', googleRating: 4.7, googleReviewCount: 203, campaignId: campRestaurants.id },
    { companyName: 'Dumont Électricité', industry: 'electricien', city: 'Strasbourg', postalCode: '67000', phone: '06 89 01 23 45', osmId: '245678905', googleRating: 4.9, googleReviewCount: 31 },
    { companyName: 'Cabinet Dentaire Dr. Rousseau', industry: 'dentiste', city: 'Montpellier', postalCode: '34000', phone: '04 67 56 78 90', osmId: '245678906', googleRating: 4.3, googleReviewCount: 58 },
    { companyName: 'Garage Auto Leblond', industry: 'garage', city: 'Nice', postalCode: '06000', phone: '04 93 23 45 67', osmId: '245678907', googleRating: 4.5, googleReviewCount: 76 },
    { companyName: 'Aux Mille Fleurs', industry: 'fleuriste', city: 'Rennes', postalCode: '35000', phone: '02 99 34 56 78', osmId: '245678908', googleRating: 4.8, googleReviewCount: 94 },
    { companyName: 'La Taverne du Coin', industry: 'restaurant', city: 'Bordeaux', postalCode: '33000', phone: '05 56 45 67 89', osmId: '245678909', googleRating: 4.2, googleReviewCount: 167, campaignId: campRestaurants.id },
    { companyName: 'Kiné Sport & Bien-être', industry: 'kine', city: 'Toulouse', postalCode: '31000', phone: '05 61 56 78 90', osmId: '245678910', googleRating: 4.6, googleReviewCount: 48 },
    { companyName: 'Pâtisserie Moreau', industry: 'boulangerie', city: 'Grenoble', postalCode: '38000', phone: '04 76 67 89 01', osmId: '245678911', googleRating: 4.9, googleReviewCount: 112 },
    { companyName: 'Photographe Marie Leclerc', industry: 'photographe', city: 'Paris', postalCode: '75011', phone: '06 12 78 90 12', osmId: '245678912', googleRating: 5.0, googleReviewCount: 37 },
    { companyName: 'Chauffage Bernard', industry: 'plombier', city: 'Lille', postalCode: '59000', phone: '03 20 78 90 12', osmId: '245678913', googleRating: 4.7, googleReviewCount: 29, campaignId: campArtisans.id },
    { companyName: 'Coach FitLife Nantes', industry: 'coach sportif', city: 'Nantes', postalCode: '44300', phone: '06 34 90 12 34', osmId: '245678914', googleRating: 4.5, googleReviewCount: 61 },
    { companyName: 'Expertise Comptable Girard', industry: 'comptable', city: 'Dijon', postalCode: '21000', phone: '03 80 90 12 34', osmId: '245678915', googleRating: 4.4, googleReviewCount: 22, campaignId: campProfessions.id },
  ]

  const hotProspects = await Promise.all(
    hotData.map((d, i) =>
      prisma.prospect.create({
        data: {
          userId: user.id,
          companyName: d.companyName,
          industry: d.industry,
          city: d.city,
          postalCode: d.postalCode,
          phone: d.phone,
          osmId: d.osmId,
          hasWebsite: false,
          source: Source.OPENSTREETMAP,
          googleRating: d.googleRating,
          googleReviewCount: d.googleReviewCount,
          prospectScore: rand(85, 95),
          priority: Priority.HOT,
          status: i < 4 ? ProspectStatus.CONTACTED : ProspectStatus.NEW,
          emailsSent: i < 4 ? 1 : 0,
          lastEmailAt: i < 4 ? daysAgo(rand(2, 10)) : null,
          emailOpened: i < 2,
          replied: i === 0,
          campaignId: d.campaignId ?? null,
          createdAt: daysAgo(rand(5, 30)),
          tags: ['hot', 'sans-site'],
        },
      })
    )
  )

  console.log(`✅ ${hotProspects.length} prospects HOT créés`)

  // -------------------------------------------------------------------------
  // Prospects — Groupe 2 : SITES OBSOLÈTES (25 prospects, score 15-38)
  // -------------------------------------------------------------------------
  const staleData = [
    { companyName: 'Restaurant Chez Paul', industry: 'restaurant', city: 'Paris', postalCode: '75005', website: 'http://chez-paul-paris.jimdo.com', cms: 'Jimdo', year: 2011, phone: '01 43 54 12 34', googleRating: 3.2, googleReviewCount: 45, campaignId: campRestaurants.id },
    { companyName: 'Coiffure Delphine', industry: 'coiffeur', city: 'Toulouse', postalCode: '31400', website: 'http://coiffure-delphine.wix.com', cms: 'Wix', year: 2013, phone: '05 61 23 45 67', googleRating: 3.8, googleReviewCount: 72 },
    { companyName: 'Boulangerie Du Moulin', industry: 'boulangerie', city: 'Lyon', postalCode: '69007', website: 'http://boulangerie-dumoulin.fr', cms: 'WordPress', year: 2014, phone: '04 78 12 23 34', googleRating: 4.1, googleReviewCount: 98 },
    { companyName: 'Cabinet Maître Lefebvre', industry: 'avocat', city: 'Paris', postalCode: '75008', website: 'http://avocat-lefebvre.fr', cms: 'HTML statique', year: 2010, phone: '01 42 65 87 09', googleRating: 3.5, googleReviewCount: 14, campaignId: campProfessions.id },
    { companyName: 'Dr. Lambert Dentiste', industry: 'dentiste', city: 'Bordeaux', postalCode: '33300', website: 'http://dentiste-lambert-bordeaux.fr', cms: 'HTML statique', year: 2009, phone: '05 56 34 56 78', googleRating: 4.0, googleReviewCount: 33 },
    { companyName: 'Plomberie Dupont Marseille', industry: 'plombier', city: 'Marseille', postalCode: '13004', website: 'http://plomberie-dupont13.fr', cms: 'WordPress', year: 2015, phone: '04 91 23 34 45', googleRating: 3.4, googleReviewCount: 19, campaignId: campArtisans.id },
    { companyName: 'Auto-École Martin', industry: 'garage', city: 'Nantes', postalCode: '44100', website: 'http://autoecole-martin-nantes.weebly.com', cms: 'Weebly', year: 2014, phone: '02 40 34 45 56', googleRating: 3.7, googleReviewCount: 88 },
    { companyName: 'Fleuriste Rose & Co', industry: 'fleuriste', city: 'Lyon', postalCode: '69003', website: 'http://fleuriste-rose.jimdo.com', cms: 'Jimdo', year: 2013, phone: '04 78 45 56 67', googleRating: 4.2, googleReviewCount: 54 },
    { companyName: 'Architecte Renard & Associés', industry: 'architecte', city: 'Paris', postalCode: '75016', website: 'http://renard-architecte.fr', cms: 'Flash', year: 2008, phone: '01 47 23 45 67', googleRating: 3.9, googleReviewCount: 8 },
    { companyName: 'Kiné du Centre Bordelais', industry: 'kine', city: 'Bordeaux', postalCode: '33000', website: 'http://kine-centre-bordeaux.fr', cms: 'WordPress', year: 2013, phone: '05 57 45 67 89', googleRating: 4.3, googleReviewCount: 41 },
    { companyName: 'Brasserie Les Copains', industry: 'restaurant', city: 'Strasbourg', postalCode: '67000', website: 'http://brasserie-lescopains.jimdo.com', cms: 'Jimdo', year: 2012, phone: '03 88 34 45 56', googleRating: 3.3, googleReviewCount: 67, campaignId: campRestaurants.id },
    { companyName: 'Studio Photo Lumière', industry: 'photographe', city: 'Paris', postalCode: '75019', website: 'http://studio-lumiere-photo.fr', cms: 'Flash', year: 2010, phone: '06 78 56 78 90', googleRating: 4.0, googleReviewCount: 23 },
    { companyName: 'Garage Sport Auto Marseille', industry: 'garage', city: 'Marseille', postalCode: '13010', website: 'http://sportauto13.fr', cms: 'WordPress', year: 2014, phone: '04 91 56 78 90', googleRating: 3.6, googleReviewCount: 31 },
    { companyName: 'Institut Jasmine Beauté', industry: 'coiffeur', city: 'Bordeaux', postalCode: '33800', website: 'http://jasmine-beaute.wix.com', cms: 'Wix', year: 2015, phone: '05 56 67 89 01', googleRating: 3.9, googleReviewCount: 58 },
    { companyName: 'Menuiserie Artisanale Roux', industry: 'plombier', city: 'Nantes', postalCode: '44200', website: 'http://menuiserie-roux-nantes.fr', cms: 'HTML statique', year: 2012, phone: '02 40 67 89 01', googleRating: 4.5, googleReviewCount: 17, campaignId: campArtisans.id },
    { companyName: 'Cabinet Dr. Dupuis Dentiste', industry: 'dentiste', city: 'Grenoble', postalCode: '38000', website: 'http://dentiste-dupuis-grenoble.fr', cms: 'WordPress', year: 2015, phone: '04 76 89 01 23', googleRating: 4.1, googleReviewCount: 44 },
    { companyName: "Restaurant L'Ardoise", industry: 'restaurant', city: 'Paris', postalCode: '75012', website: 'http://restaurant-ardoise.wix.com', cms: 'Wix', year: 2014, phone: '01 43 67 89 01', googleRating: 3.1, googleReviewCount: 89, campaignId: campRestaurants.id },
    { companyName: 'Électricité Plus Strasbourg', industry: 'electricien', city: 'Strasbourg', postalCode: '67200', website: 'http://electricite-plus67.fr', cms: 'WordPress', year: 2013, phone: '03 88 78 90 12', googleRating: 4.2, googleReviewCount: 12, campaignId: campArtisans.id },
    { companyName: 'Comptabilité Durand SARL', industry: 'comptable', city: 'Marseille', postalCode: '13001', website: 'http://comptabilite-durand.fr', cms: 'HTML statique', year: 2012, phone: '04 91 90 12 34', googleRating: 3.7, googleReviewCount: 9, campaignId: campProfessions.id },
    { companyName: 'Boulangerie Tradition Dorée', industry: 'boulangerie', city: 'Lille', postalCode: '59000', website: 'http://tradition-doree-lille.jimdo.com', cms: 'Jimdo', year: 2013, phone: '03 20 12 23 34', googleRating: 4.4, googleReviewCount: 76 },
    { companyName: 'Pharmacie Centrale Nice', industry: 'pharmacie', city: 'Nice', postalCode: '06100', website: 'http://pharmacie-centrale-nice.fr', cms: 'WordPress', year: 2012, phone: '04 93 12 23 34', googleRating: 3.8, googleReviewCount: 29 },
    { companyName: 'Salon Élégance Coiffure', industry: 'coiffeur', city: 'Clermont-Ferrand', postalCode: '63000', website: 'http://elegance-coiffure63.wix.com', cms: 'Wix', year: 2016, phone: '04 73 23 34 45', googleRating: 4.0, googleReviewCount: 83 },
    { companyName: 'SCP Delacroix Avocats', industry: 'avocat', city: 'Lyon', postalCode: '69006', website: 'http://delacroix-avocats-lyon.fr', cms: 'WordPress', year: 2013, phone: '04 78 34 45 56', googleRating: 3.6, googleReviewCount: 6, campaignId: campProfessions.id },
    { companyName: 'Garage Renault Morin', industry: 'garage', city: 'Rennes', postalCode: '35700', website: 'http://garage-morin-rennes.fr', cms: 'WordPress', year: 2014, phone: '02 99 45 56 67', googleRating: 3.9, googleReviewCount: 52 },
    { companyName: 'Kinésithérapie Blanchard', industry: 'kine', city: 'Lille', postalCode: '59800', website: 'http://kine-blanchard-lille.jimdo.com', cms: 'Jimdo', year: 2014, phone: '03 20 56 67 78', googleRating: 4.6, googleReviewCount: 35 },
  ]

  const staleProspects = await Promise.all(
    staleData.map((d, i) => {
      const audit = makeStaleAudit(d.website, d.cms, d.year)
      const score = rand(15, 38)
      const status: ProspectStatus =
        i < 6 ? ProspectStatus.CONTACTED :
        i < 10 ? ProspectStatus.AUDITED :
        i === 3 ? ProspectStatus.REPLIED :
        i === 0 ? ProspectStatus.OPENED :
        ProspectStatus.NEW

      return prisma.prospect.create({
        data: {
          userId: user.id,
          companyName: d.companyName,
          industry: d.industry,
          city: d.city,
          postalCode: d.postalCode,
          phone: d.phone,
          website: d.website,
          hasWebsite: true,
          source: Source.OPENSTREETMAP,
          googleRating: d.googleRating,
          googleReviewCount: d.googleReviewCount,
          loadTime: audit.loadTime,
          mobileScore: audit.mobileScore,
          seoScore: audit.seoScore,
          sslValid: audit.hasSSL,
          isResponsive: audit.isResponsive,
          techStack: audit.techStack,
          designAge: audit.designAge,
          auditData: audit as object,
          issues: audit.issues as object,
          prospectScore: score,
          siteScore: score,
          priority: score >= 80 ? Priority.HOT : score >= 60 ? Priority.HIGH : score >= 40 ? Priority.MEDIUM : score >= 20 ? Priority.LOW : Priority.COLD,
          status,
          emailsSent: i < 6 ? 1 : 0,
          lastEmailAt: i < 6 ? daysAgo(rand(3, 20)) : null,
          emailOpened: [0, 1, 2].includes(i),
          emailClicked: i === 1,
          replied: i === 3,
          campaignId: d.campaignId ?? null,
          createdAt: daysAgo(rand(10, 60)),
          tags: ['site-obsolete', d.cms.toLowerCase()],
        },
      })
    })
  )

  console.log(`✅ ${staleProspects.length} prospects site obsolète créés`)

  // -------------------------------------------------------------------------
  // Prospects — Groupe 3 : SITES CORRECTS (40 prospects, score variable)
  // -------------------------------------------------------------------------
  const decentData = [
    { companyName: 'Brasserie Le Commerce', industry: 'restaurant', city: 'Paris', postalCode: '75002', website: 'https://brasserie-le-commerce.fr', cms: 'WordPress', year: 2020, phone: '01 42 36 47 58', googleRating: 4.3, googleReviewCount: 312 },
    { companyName: 'Coiffure Tendance Studio', industry: 'coiffeur', city: 'Lyon', postalCode: '69001', website: 'https://tendance-studio.fr', cms: 'Squarespace', year: 2021, phone: '04 72 43 54 65', googleRating: 4.6, googleReviewCount: 189 },
    { companyName: 'Cabinet Dr. Morel Dentiste', industry: 'dentiste', city: 'Paris', postalCode: '75015', website: 'https://dr-morel-dentiste.fr', cms: 'WordPress', year: 2019, phone: '01 45 78 90 12', googleRating: 4.4, googleReviewCount: 67 },
    { companyName: 'Plomberie Moderne Chauffage', industry: 'plombier', city: 'Bordeaux', postalCode: '33100', website: 'https://pmc-bordeaux.fr', cms: 'WordPress', year: 2020, phone: '05 56 12 23 34', googleRating: 4.7, googleReviewCount: 43 },
    { companyName: 'Restaurant La Méditerranée', industry: 'restaurant', city: 'Marseille', postalCode: '13008', website: 'https://lamediterranee-marseille.fr', cms: 'WordPress', year: 2022, phone: '04 91 34 45 56', googleRating: 4.2, googleReviewCount: 245 },
    { companyName: 'Maître Fontaine Avocat', industry: 'avocat', city: 'Paris', postalCode: '75017', website: 'https://fontaine-avocat.fr', cms: 'WordPress', year: 2021, phone: '01 47 66 88 90', googleRating: 4.1, googleReviewCount: 18 },
    { companyName: 'Kiné Active Sport', industry: 'kine', city: 'Toulouse', postalCode: '31100', website: 'https://kine-active-toulouse.fr', cms: 'WordPress', year: 2020, phone: '05 61 78 90 12', googleRating: 4.8, googleReviewCount: 92 },
    { companyName: 'Photo Art Studio Bourdin', industry: 'photographe', city: 'Nantes', postalCode: '44000', website: 'https://bourdin-photo.fr', cms: 'Squarespace', year: 2022, phone: '06 23 45 67 89', googleRating: 4.9, googleReviewCount: 54 },
    { companyName: 'Garage Techno Auto', industry: 'garage', city: 'Lyon', postalCode: '69008', website: 'https://technoauto-lyon.fr', cms: 'WordPress', year: 2019, phone: '04 72 56 78 90', googleRating: 4.3, googleReviewCount: 78 },
    { companyName: 'Comptable Expert Conseil', industry: 'comptable', city: 'Nantes', postalCode: '44200', website: 'https://expert-conseil-nantes.fr', cms: 'WordPress', year: 2020, phone: '02 40 90 12 34', googleRating: 4.0, googleReviewCount: 14 },
    { companyName: 'Boulangerie Bio du Marché', industry: 'boulangerie', city: 'Grenoble', postalCode: '38000', website: 'https://bio-marche-grenoble.fr', cms: 'WordPress', year: 2021, phone: '04 76 12 34 56', googleRating: 4.7, googleReviewCount: 143 },
    { companyName: 'Électricité Nouvelle Énergie', industry: 'electricien', city: 'Paris', postalCode: '75020', website: 'https://nouvelle-energie-elec.fr', cms: 'WordPress', year: 2021, phone: '06 45 67 89 01', googleRating: 4.5, googleReviewCount: 29 },
    { companyName: 'Fleurs & Déco Marguerite', industry: 'fleuriste', city: 'Strasbourg', postalCode: '67000', website: 'https://marguerite-fleurs.fr', cms: 'Shopify', year: 2022, phone: '03 88 12 34 56', googleRating: 4.8, googleReviewCount: 116 },
    { companyName: 'Architecte Cabinet Vidal', industry: 'architecte', city: 'Paris', postalCode: '75007', website: 'https://vidal-architecte.fr', cms: 'WordPress', year: 2020, phone: '01 45 51 62 73', googleRating: 4.2, googleReviewCount: 11 },
    { companyName: 'Pharmacie des Halles', industry: 'pharmacie', city: 'Lyon', postalCode: '69001', website: 'https://pharmacie-deshalles-lyon.fr', cms: 'WordPress', year: 2019, phone: '04 78 28 39 50', googleRating: 4.4, googleReviewCount: 87 },
    { companyName: 'Coach Santé Équilibre', industry: 'coach sportif', city: 'Bordeaux', postalCode: '33000', website: 'https://sante-equilibre-coach.fr', cms: 'Squarespace', year: 2022, phone: '06 78 90 12 34', googleRating: 4.6, googleReviewCount: 48 },
    { companyName: 'Restaurant Le Jardin Secret', industry: 'restaurant', city: 'Toulouse', postalCode: '31000', website: 'https://jardinsecret-restaurant.fr', cms: 'WordPress', year: 2021, phone: '05 61 90 12 34', googleRating: 4.5, googleReviewCount: 178 },
    { companyName: 'Dentiste Dr. Fontana', industry: 'dentiste', city: 'Nice', postalCode: '06000', website: 'https://dr-fontana-nice.fr', cms: 'WordPress', year: 2020, phone: '04 93 56 78 90', googleRating: 4.6, googleReviewCount: 73 },
    { companyName: 'Plomberie Chauffage Urbain', industry: 'plombier', city: 'Strasbourg', postalCode: '67100', website: 'https://chauffage-urbain67.fr', cms: 'WordPress', year: 2019, phone: '03 88 34 56 78', googleRating: 4.3, googleReviewCount: 34 },
    { companyName: 'Coiffure Raffinement', industry: 'coiffeur', city: 'Paris', postalCode: '75009', website: 'https://raffinement-coiffure.fr', cms: 'Squarespace', year: 2022, phone: '01 48 74 85 96', googleRating: 4.7, googleReviewCount: 201 },
    { companyName: 'Garage Central Peugeot', industry: 'garage', city: 'Clermont-Ferrand', postalCode: '63000', website: 'https://garage-central63.fr', cms: 'WordPress', year: 2021, phone: '04 73 45 67 89', googleRating: 4.1, googleReviewCount: 61 },
    { companyName: 'Cabinet Expertise Lebrun', industry: 'comptable', city: 'Paris', postalCode: '75008', website: 'https://lebrun-expertise.fr', cms: 'WordPress', year: 2020, phone: '01 44 95 76 87', googleRating: 4.0, googleReviewCount: 7 },
    { companyName: 'Photo & Vidéo Horizon', industry: 'photographe', city: 'Marseille', postalCode: '13006', website: 'https://horizon-photo-video.fr', cms: 'Squarespace', year: 2021, phone: '06 34 56 78 90', googleRating: 4.8, googleReviewCount: 68 },
    { companyName: 'Boulangerie La Fournée', industry: 'boulangerie', city: 'Rennes', postalCode: '35000', website: 'https://lafournee-rennes.fr', cms: 'WordPress', year: 2020, phone: '02 99 67 89 01', googleRating: 4.5, googleReviewCount: 109 },
    { companyName: 'Avocat Droit des Affaires Perrin', industry: 'avocat', city: 'Lyon', postalCode: '69002', website: 'https://perrin-avocat-affaires.fr', cms: 'WordPress', year: 2021, phone: '04 72 12 34 56', googleRating: 4.3, googleReviewCount: 12 },
    { companyName: 'Kiné Rééducation Sportive', industry: 'kine', city: 'Paris', postalCode: '75016', website: 'https://reeducation-sportive-paris.fr', cms: 'WordPress', year: 2022, phone: '01 46 47 58 69', googleRating: 4.7, googleReviewCount: 84 },
    { companyName: 'Fleuriste Atelier des Fleurs', industry: 'fleuriste', city: 'Bordeaux', postalCode: '33000', website: 'https://atelierdesfleurs-bordeaux.fr', cms: 'Shopify', year: 2022, phone: '05 56 23 34 45', googleRating: 4.9, googleReviewCount: 132 },
    { companyName: 'Restaurant Ô Saveurs', industry: 'restaurant', city: 'Nice', postalCode: '06200', website: 'https://osaveurs-nice.fr', cms: 'WordPress', year: 2020, phone: '04 93 78 90 12', googleRating: 4.4, googleReviewCount: 156 },
    { companyName: 'Électricité Grenoble Service', industry: 'electricien', city: 'Grenoble', postalCode: '38100', website: 'https://elec-grenoble-service.fr', cms: 'WordPress', year: 2020, phone: '04 76 23 34 45', googleRating: 4.4, googleReviewCount: 18 },
    { companyName: 'Dentiste Pédiatrique Dr. Simon', industry: 'dentiste', city: 'Toulouse', postalCode: '31400', website: 'https://dent-pediatrique-simon.fr', cms: 'WordPress', year: 2021, phone: '05 61 34 56 78', googleRating: 4.8, googleReviewCount: 95 },
    { companyName: 'Architecte Espace & Lumière', industry: 'architecte', city: 'Marseille', postalCode: '13002', website: 'https://espace-lumiere-archi.fr', cms: 'Squarespace', year: 2022, phone: '04 91 23 34 45', googleRating: 4.5, googleReviewCount: 22 },
    { companyName: 'Garage Renault Strasbourg', industry: 'garage', city: 'Strasbourg', postalCode: '67200', website: 'https://renault-strasbourg-garage.fr', cms: 'WordPress', year: 2019, phone: '03 88 56 78 90', googleRating: 4.0, googleReviewCount: 47 },
    { companyName: 'Coiffure Créations Saïd', industry: 'coiffeur', city: 'Lille', postalCode: '59000', website: 'https://creations-said-coiffure.fr', cms: 'WordPress', year: 2021, phone: '03 20 34 45 56', googleRating: 4.5, googleReviewCount: 138 },
    { companyName: 'Restaurant La Coupole', industry: 'restaurant', city: 'Bordeaux', postalCode: '33000', website: 'https://la-coupole-bordeaux.fr', cms: 'WordPress', year: 2022, phone: '05 56 56 78 90', googleRating: 4.6, googleReviewCount: 273 },
    { companyName: 'Comptable Gestion Conseil', industry: 'comptable', city: 'Toulouse', postalCode: '31000', website: 'https://gestion-conseil-toulouse.fr', cms: 'WordPress', year: 2020, phone: '05 61 12 34 56', googleRating: 4.1, googleReviewCount: 11 },
    { companyName: 'Plomberie Sanitaires Pro', industry: 'plombier', city: 'Nice', postalCode: '06000', website: 'https://sanitaires-pro-nice.fr', cms: 'WordPress', year: 2021, phone: '04 93 45 67 89', googleRating: 4.6, googleReviewCount: 38 },
    { companyName: 'Pharmacie du Parc', industry: 'pharmacie', city: 'Grenoble', postalCode: '38000', website: 'https://pharmacie-du-parc-grenoble.fr', cms: 'WordPress', year: 2021, phone: '04 76 45 67 89', googleRating: 4.5, googleReviewCount: 64 },
    { companyName: 'Coach Nutrition & Fitness', industry: 'coach sportif', city: 'Paris', postalCode: '75011', website: 'https://nutrition-fitness-paris.fr', cms: 'WordPress', year: 2022, phone: '06 90 12 34 56', googleRating: 4.7, googleReviewCount: 79 },
    { companyName: 'Boulangerie Maison Berger', industry: 'boulangerie', city: 'Strasbourg', postalCode: '67000', website: 'https://maison-berger-boulangerie.fr', cms: 'WordPress', year: 2021, phone: '03 88 78 90 12', googleRating: 4.8, googleReviewCount: 167 },
    { companyName: 'Studio Photo Portrait', industry: 'photographe', city: 'Toulouse', postalCode: '31000', website: 'https://portrait-studio-toulouse.fr', cms: 'Squarespace', year: 2022, phone: '06 56 78 90 12', googleRating: 4.6, googleReviewCount: 41 },
  ]

  const decentProspects = await Promise.all(
    decentData.map((d, i) => {
      const audit = makeDecentAudit(d.website, d.cms, d.year)
      const score = rand(40, 75)
      const statuses: ProspectStatus[] = [
        ProspectStatus.NEW, ProspectStatus.AUDITED, ProspectStatus.CONTACTED,
        ProspectStatus.OPENED, ProspectStatus.MEETING,
      ]
      const status = i < 3 ? ProspectStatus.WON :
                     i < 5 ? ProspectStatus.MEETING :
                     i < 10 ? ProspectStatus.CONTACTED :
                     pick(statuses)

      return prisma.prospect.create({
        data: {
          userId: user.id,
          companyName: d.companyName,
          industry: d.industry,
          city: d.city,
          postalCode: d.postalCode,
          phone: d.phone,
          website: d.website,
          hasWebsite: true,
          source: i % 5 === 0 ? Source.MANUAL : Source.OPENSTREETMAP,
          googleRating: d.googleRating,
          googleReviewCount: d.googleReviewCount,
          loadTime: audit.loadTime,
          mobileScore: audit.mobileScore,
          seoScore: audit.seoScore,
          sslValid: true,
          isResponsive: true,
          techStack: audit.techStack,
          designAge: audit.designAge,
          auditData: audit as object,
          issues: audit.issues as object,
          prospectScore: score,
          siteScore: score + rand(5, 15),
          priority: score >= 60 ? Priority.HIGH : Priority.MEDIUM,
          status,
          emailsSent: status === ProspectStatus.NEW || status === ProspectStatus.AUDITED ? 0 : rand(1, 3),
          lastEmailAt: status === ProspectStatus.NEW ? null : daysAgo(rand(5, 45)),
          emailOpened: ([ProspectStatus.OPENED, ProspectStatus.MEETING, ProspectStatus.WON] as ProspectStatus[]).includes(status),
          emailClicked: ([ProspectStatus.MEETING, ProspectStatus.WON] as ProspectStatus[]).includes(status),
          replied: ([ProspectStatus.MEETING, ProspectStatus.WON] as ProspectStatus[]).includes(status),
          campaignId: null,
          createdAt: daysAgo(rand(15, 90)),
          tags: i < 3 ? ['converti'] : [],
        },
      })
    })
  )

  console.log(`✅ ${decentProspects.length} prospects site correct créés`)

  // -------------------------------------------------------------------------
  // Emails (30) — sur les prospects contactés
  // -------------------------------------------------------------------------
  const contactedProspects = [
    ...hotProspects.filter((_p, i: number) => i < 4),
    ...staleProspects.filter((_p, i: number) => i < 6),
    ...decentProspects.filter((_p, i: number) => i >= 5 && i < 15),
  ]

  const emailStatusFlow: EmailStatus[] = [
    EmailStatus.REPLIED, EmailStatus.CLICKED, EmailStatus.OPENED,
    EmailStatus.SENT, EmailStatus.OPENED, EmailStatus.CLICKED,
    EmailStatus.SENT, EmailStatus.REPLIED, EmailStatus.OPENED,
    EmailStatus.SENT,
  ]

  await Promise.all(
    contactedProspects.slice(0, 30).map((prospect, i) => {
      const status = emailStatusFlow[i % emailStatusFlow.length]
      const sentAt = daysAgo(rand(3, 45))
      return prisma.email.create({
        data: {
          prospectId: prospect.id,
          subject: i % 2 === 0
            ? `Votre présence en ligne — ${prospect.companyName}`
            : `Votre site web — quelques points à améliorer`,
          body: `Bonjour,\n\nEn cherchant ${prospect.companyName} sur internet, j'ai souhaité vous contacter concernant votre présence web.\n\nCordialement,\nThomas Dupont`,
          bodyHtml: `<p>Bonjour,</p><p>En cherchant <strong>${prospect.companyName}</strong> sur internet, j'ai souhaité vous contacter concernant votre présence web.</p><p>Cordialement,<br>Thomas Dupont</p>`,
          status,
          sentAt,
          openedAt: ([EmailStatus.OPENED, EmailStatus.CLICKED, EmailStatus.REPLIED] as EmailStatus[]).includes(status)
            ? new Date(sentAt.getTime() + rand(1, 48) * 3600000)
            : null,
          clickedAt: ([EmailStatus.CLICKED, EmailStatus.REPLIED] as EmailStatus[]).includes(status)
            ? new Date(sentAt.getTime() + rand(2, 72) * 3600000)
            : null,
          repliedAt: status === EmailStatus.REPLIED
            ? new Date(sentAt.getTime() + rand(3, 96) * 3600000)
            : null,
          brevoMsgId: `brevo-msg-${Date.now()}-${i}`,
          createdAt: daysAgo(rand(3, 50)),
        },
      })
    })
  )

  console.log('✅ 30 emails créés')

  // -------------------------------------------------------------------------
  // Notes (sur 20 prospects)
  // -------------------------------------------------------------------------
  const notesData = [
    { idx: 0, content: 'Patron très sympathique, intéressé par une page Google My Business. Relancer dans 2 semaines.' },
    { idx: 1, content: 'A rappelé spontanément. Demande devis pour site + réseaux sociaux.' },
    { idx: 2, content: 'RDV prévu le 15/03. Préparer une maquette du secteur coiffure.' },
    { idx: 3, content: 'Concurrent direct déjà contacté. Mettre en avant nos délais courts (2 semaines).' },
    { idx: 4, content: 'Pas répondu à 2 emails. Attendre 1 semaine puis appel téléphonique.' },
    { idx: 5, content: 'Site vraiment vétuste, Flash encore utilisé. Score élevé, priorité haute.' },
    { idx: 6, content: 'Gérant absent jusqu au 20/03, recontacter après.' },
    { idx: 7, content: 'Intéressé mais pas de budget avant juin. Ajouter au pipeline long terme.' },
    { idx: 8, content: 'Devis envoyé : 1 800€ pour refonte complète. En attente réponse.' },
    { idx: 9, content: 'Signé ! Mission lancée le 01/03. Livraison prévue le 22/03.' },
    { idx: 10, content: 'Email ouvert 3 fois mais pas de réponse. Lancer séquence relance.' },
    { idx: 11, content: 'Confrère recommandé par client existant. Prospect chaud.' },
    { idx: 12, content: 'Demande d ajout d un système de réservation en ligne.' },
    { idx: 13, content: 'Budget limité (800€ max). Proposer formule essentielle.' },
    { idx: 14, content: 'Contact LinkedIn établi. A liké notre post sur les sites mobiles.' },
    { idx: 15, content: 'Rappel laissé sur répondeur. Pas de retour.' },
    { idx: 16, content: 'Très intéressé par le SEO local. Préparer un audit SEO complet.' },
    { idx: 17, content: 'RDV visio fixé pour le 28/03 à 14h.' },
    { idx: 18, content: 'Veut refonte + maintenance mensuelle. Bonne opportunité récurrente.' },
    { idx: 19, content: 'A partagé notre email à son associé. Suivre les deux.' },
  ]

  const allProspects = [...hotProspects, ...staleProspects, ...decentProspects]

  await Promise.all(
    notesData.map((n) =>
      prisma.note.create({
        data: {
          prospectId: allProspects[n.idx].id,
          content: n.content,
          createdAt: daysAgo(rand(1, 20)),
        },
      })
    )
  )

  console.log('✅ 20 notes créées')

  // -------------------------------------------------------------------------
  // Résumé
  // -------------------------------------------------------------------------
  const totals = {
    users: await prisma.user.count(),
    prospects: await prisma.prospect.count(),
    emails: await prisma.email.count(),
    notes: await prisma.note.count(),
    campaigns: await prisma.campaign.count(),
    templates: await prisma.emailTemplate.count(),
  }

  console.log('\n📊 Base de données peuplée :')
  console.log(`   👤 ${totals.users} utilisateur`)
  console.log(`   🏢 ${totals.prospects} prospects (${hotProspects.length} HOT | ${staleProspects.length} sites obsolètes | ${decentProspects.length} sites corrects)`)
  console.log(`   📧 ${totals.emails} emails`)
  console.log(`   📝 ${totals.notes} notes`)
  console.log(`   🚀 ${totals.campaigns} campagnes`)
  console.log(`   📋 ${totals.templates} templates`)
  console.log('\n✅ Seed terminé !')
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed :', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
