// Données de démonstration — utilisées quand la base de données n'est pas connectée

const ago = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString()

export interface MockProspect {
  id: string
  companyName: string
  industry: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  city: string
  postalCode: string | null
  website: string | null
  hasWebsite: boolean
  googleRating: number | null
  googleReviewCount: number | null
  prospectScore: number
  siteScore: number | null
  priority: string
  status: string
  source: string
  emailsSent: number
  lastEmailAt: string | null
  lastContactAt: string | null
  createdAt: string
  tags: string[]
  issues: string[] | null
  _count: { notes: number; emails: number }
}

type P = Omit<MockProspect, 'emailsSent' | 'lastEmailAt' | 'tags' | 'issues' | '_count'> & {
  emailsSent?: number; lastEmailAt?: string | null; tags?: string[]
  issues?: string[] | null; _count?: { notes: number; emails: number }
}

const p = (o: P): MockProspect => ({
  emailsSent: 0, lastEmailAt: null, tags: [], issues: null,
  _count: { notes: 0, emails: 0 }, ...o,
})

export const MOCK_PROSPECTS: MockProspect[] = [
  // ── HOT (no website, score 85-95) ──────────────────────────────────────────
  p({ id: 'p01', companyName: 'Boulangerie Artisanale Lefèbvre', industry: 'Boulangerie',
    firstName: 'Michel', lastName: 'Lefèbvre', email: null, phone: '04 72 45 23 11',
    city: 'Lyon', postalCode: '69001', website: null, hasWebsite: false,
    googleRating: 4.7, googleReviewCount: 234, prospectScore: 94, siteScore: null,
    priority: 'HOT', status: 'NEW', source: 'OPENSTREETMAP',
    createdAt: ago(2), lastContactAt: null }),

  p({ id: 'p02', companyName: 'Plomberie Martin & Fils', industry: 'Plomberie',
    firstName: 'Éric', lastName: 'Martin', email: null, phone: '06 12 34 56 78',
    city: 'Bordeaux', postalCode: '33000', website: null, hasWebsite: false,
    googleRating: 4.4, googleReviewCount: 87, prospectScore: 91, siteScore: null,
    priority: 'HOT', status: 'NEW', source: 'OPENSTREETMAP',
    createdAt: ago(1), lastContactAt: null }),

  p({ id: 'p03', companyName: 'Auto-École Prestige', industry: 'Auto-École',
    firstName: null, lastName: null, email: null, phone: '03 28 45 67 89',
    city: 'Lille', postalCode: '59000', website: null, hasWebsite: false,
    googleRating: 4.1, googleReviewCount: 312, prospectScore: 88, siteScore: null,
    priority: 'HOT', status: 'AUDITED', source: 'OPENSTREETMAP',
    createdAt: ago(3), lastContactAt: null }),

  p({ id: 'p04', companyName: 'Coiffure & Style Beaumont', industry: 'Coiffure',
    firstName: 'Sophie', lastName: 'Beaumont', email: 'sophie.beaumont@gmail.com', phone: '05 56 78 90 12',
    city: 'Bordeaux', postalCode: '33100', website: null, hasWebsite: false,
    googleRating: 4.8, googleReviewCount: 156, prospectScore: 87, siteScore: null,
    priority: 'HOT', status: 'CONTACTED', source: 'GOOGLE_MAPS',
    emailsSent: 1, lastEmailAt: ago(4), lastContactAt: ago(4),
    createdAt: ago(7), _count: { notes: 1, emails: 1 } }),

  p({ id: 'p05', companyName: 'Restaurant Le Vieux Moulin', industry: 'Restauration',
    firstName: 'Jean', lastName: 'Dupuis', email: null, phone: '04 91 23 45 67',
    city: 'Marseille', postalCode: '13001', website: null, hasWebsite: false,
    googleRating: 4.3, googleReviewCount: 521, prospectScore: 85, siteScore: null,
    priority: 'HOT', status: 'OPENED', source: 'OPENSTREETMAP',
    emailsSent: 1, lastEmailAt: ago(2), lastContactAt: ago(2),
    createdAt: ago(10), _count: { notes: 2, emails: 1 } }),

  // ── HIGH (bad site, score 60-79) ────────────────────────────────────────────
  p({ id: 'p06', companyName: 'Électricité Roux & Associés', industry: 'Électricité',
    firstName: 'Pierre', lastName: 'Roux', email: 'contact@electricite-roux.fr', phone: '04 72 11 22 33',
    city: 'Lyon', postalCode: '69003', website: 'http://electricite-roux.jimdo.com', hasWebsite: true,
    googleRating: 4.0, googleReviewCount: 42, prospectScore: 76, siteScore: 18,
    priority: 'HIGH', status: 'NEW', source: 'OPENSTREETMAP',
    createdAt: ago(5), lastContactAt: null,
    issues: ['Site Jimdo obsolète (2015)', 'Non responsive mobile', 'Pas de SSL'] }),

  p({ id: 'p07', companyName: 'Menuiserie Artisanale Leconte', industry: 'Menuiserie',
    firstName: null, lastName: null, email: null, phone: '02 99 45 67 89',
    city: 'Rennes', postalCode: '35000', website: 'http://menuiserie-leconte.wix.com', hasWebsite: true,
    googleRating: 4.6, googleReviewCount: 78, prospectScore: 74, siteScore: 22,
    priority: 'HIGH', status: 'AUDITED', source: 'OPENSTREETMAP',
    createdAt: ago(8), lastContactAt: null,
    issues: ['Site Wix générique', 'Vitesse < 3s mobile', 'Design 2014'] }),

  p({ id: 'p08', companyName: 'Pharmacie du Centre', industry: 'Pharmacie',
    firstName: 'Anne', lastName: 'Girard', email: 'pharmacie.centre@wanadoo.fr', phone: '03 67 89 01 23',
    city: 'Strasbourg', postalCode: '67000', website: 'http://pharmacie-centre-strasbourg.fr', hasWebsite: true,
    googleRating: 3.9, googleReviewCount: 203, prospectScore: 72, siteScore: 25,
    priority: 'HIGH', status: 'CONTACTED', source: 'OPENSTREETMAP',
    emailsSent: 1, lastEmailAt: ago(6), lastContactAt: ago(6),
    createdAt: ago(14), _count: { notes: 1, emails: 1 },
    issues: ['Page d\'accueil Flash', 'Aucun HTTPS', 'Pas de version mobile'] }),

  p({ id: 'p09', companyName: 'Cabinet Vétérinaire Morel', industry: 'Vétérinaire',
    firstName: 'Dr. Claire', lastName: 'Morel', email: 'cabinet.morel@orange.fr', phone: '04 93 12 34 56',
    city: 'Nice', postalCode: '06000', website: 'http://veterinaire-morel.fr', hasWebsite: true,
    googleRating: 4.9, googleReviewCount: 189, prospectScore: 69, siteScore: 28,
    priority: 'HIGH', status: 'REPLIED', source: 'GOOGLE_MAPS',
    emailsSent: 2, lastEmailAt: ago(1), lastContactAt: ago(1),
    createdAt: ago(18), _count: { notes: 3, emails: 2 },
    issues: ['Site statique HTML', 'Temps de chargement 8s', 'Pas de formulaire de contact'] }),

  p({ id: 'p10', companyName: 'Hôtel Les Glycines', industry: 'Hôtellerie',
    firstName: 'Marc', lastName: 'Fontaine', email: 'hotel.glycines@gmail.com', phone: '04 68 23 45 67',
    city: 'Toulouse', postalCode: '31000', website: 'http://hotel-glycines-toulouse.jimdo.com', hasWebsite: true,
    googleRating: 4.2, googleReviewCount: 445, prospectScore: 67, siteScore: 21,
    priority: 'HIGH', status: 'MEETING', source: 'OPENSTREETMAP',
    emailsSent: 3, lastEmailAt: ago(3), lastContactAt: ago(3),
    createdAt: ago(25), _count: { notes: 4, emails: 3 },
    issues: ['Site Jimdo sans SSL', 'Non optimisé SEO', 'Photos non compressées'] }),

  p({ id: 'p11', companyName: 'Peinture & Décoration Lambert', industry: 'Peinture',
    firstName: 'Luc', lastName: 'Lambert', email: null, phone: '02 40 56 78 90',
    city: 'Nantes', postalCode: '44000', website: 'http://peinture-lambert.pagesperso-orange.fr', hasWebsite: true,
    googleRating: 4.5, googleReviewCount: 63, prospectScore: 65, siteScore: 15,
    priority: 'HIGH', status: 'NEW', source: 'OPENSTREETMAP',
    createdAt: ago(4), lastContactAt: null,
    issues: ['Page perso Orange obsolète', 'Design 2008', 'Aucune optimisation'] }),

  p({ id: 'p12', companyName: 'Opticien Visio Plus', industry: 'Optique',
    firstName: 'Céline', lastName: 'Bernard', email: 'visioplus@sfr.fr', phone: '01 45 67 89 01',
    city: 'Paris', postalCode: '75011', website: 'http://visioplus75.fr', hasWebsite: true,
    googleRating: 4.1, googleReviewCount: 127, prospectScore: 62, siteScore: 30,
    priority: 'HIGH', status: 'PROPOSAL', source: 'OPENSTREETMAP',
    emailsSent: 4, lastEmailAt: ago(2), lastContactAt: ago(2),
    createdAt: ago(30), _count: { notes: 5, emails: 4 },
    issues: ['Site WordPress 2016 non maintenu', 'Plugins obsolètes', 'Mobile pas optimisé'] }),

  p({ id: 'p13', companyName: 'Garage Mécanique Bruneau', industry: 'Automobile',
    firstName: null, lastName: null, email: null, phone: '05 61 12 34 56',
    city: 'Toulouse', postalCode: '31100', website: 'http://garage-bruneau.site.voila.fr', hasWebsite: true,
    googleRating: 3.8, googleReviewCount: 91, prospectScore: 61, siteScore: 12,
    priority: 'HIGH', status: 'AUDITED', source: 'OPENSTREETMAP',
    createdAt: ago(6), lastContactAt: null,
    issues: ['Voilà Page — service fermé', 'Liens morts', 'Contenu 2011'] }),

  // ── MEDIUM (decent site, score 40-59) ──────────────────────────────────────
  p({ id: 'p14', companyName: 'Café des Artistes', industry: 'Restauration',
    firstName: 'Isabelle', lastName: 'Chevalier', email: 'cafe.artistes@gmail.com', phone: '04 72 67 89 01',
    city: 'Lyon', postalCode: '69007', website: 'https://cafe-des-artistes-lyon.fr', hasWebsite: true,
    googleRating: 4.4, googleReviewCount: 298, prospectScore: 57, siteScore: 45,
    priority: 'MEDIUM', status: 'NEW', source: 'OPENSTREETMAP',
    createdAt: ago(9), lastContactAt: null }),

  p({ id: 'p15', companyName: 'Institut Beauté Solène', industry: 'Esthétique',
    firstName: 'Solène', lastName: 'Petit', email: 'solene.petit@beautysalon.fr', phone: '01 23 45 67 89',
    city: 'Paris', postalCode: '75016', website: 'https://institut-solene.squarespace.com', hasWebsite: true,
    googleRating: 4.7, googleReviewCount: 342, prospectScore: 55, siteScore: 50,
    priority: 'MEDIUM', status: 'CONTACTED', source: 'GOOGLE_MAPS',
    emailsSent: 1, lastEmailAt: ago(10), lastContactAt: ago(10),
    createdAt: ago(20), _count: { notes: 1, emails: 1 } }),

  p({ id: 'p16', companyName: 'Dentiste Cabinet Moreau', industry: 'Dentisterie',
    firstName: 'Dr. Thomas', lastName: 'Moreau', email: 'dr.moreau.dentiste@gmail.com', phone: '04 93 34 56 78',
    city: 'Nice', postalCode: '06200', website: 'https://docteur-moreau-dentiste.fr', hasWebsite: true,
    googleRating: 4.6, googleReviewCount: 167, prospectScore: 52, siteScore: 52,
    priority: 'MEDIUM', status: 'NEW', source: 'OPENSTREETMAP',
    createdAt: ago(12), lastContactAt: null }),

  p({ id: 'p17', companyName: 'Fleuriste Madeleine', industry: 'Fleuriste',
    firstName: 'Madeleine', lastName: 'Rousseau', email: null, phone: '02 51 45 67 89',
    city: 'Nantes', postalCode: '44100', website: 'https://fleuriste-madeleine.fr', hasWebsite: true,
    googleRating: 4.9, googleReviewCount: 89, prospectScore: 50, siteScore: 55,
    priority: 'MEDIUM', status: 'AUDITED', source: 'OPENSTREETMAP',
    createdAt: ago(15), lastContactAt: null }),

  p({ id: 'p18', companyName: 'Traiteur Saveurs du Monde', industry: 'Traiteur',
    firstName: 'Karim', lastName: 'Benali', email: 'saveurs.monde@yahoo.fr', phone: '01 56 78 90 12',
    city: 'Paris', postalCode: '75003', website: 'https://saveurs-du-monde-paris.fr', hasWebsite: true,
    googleRating: 4.3, googleReviewCount: 212, prospectScore: 48, siteScore: 48,
    priority: 'MEDIUM', status: 'OPENED', source: 'GOOGLE_MAPS',
    emailsSent: 1, lastEmailAt: ago(5), lastContactAt: ago(5),
    createdAt: ago(22), _count: { notes: 2, emails: 1 } }),

  p({ id: 'p19', companyName: 'Librairie Le Mot à Lire', industry: 'Librairie',
    firstName: 'Françoise', lastName: 'Vidal', email: 'librairie.motlire@free.fr', phone: '03 20 34 56 78',
    city: 'Lille', postalCode: '59800', website: 'https://librairie-motlire.fr', hasWebsite: true,
    googleRating: 4.8, googleReviewCount: 156, prospectScore: 46, siteScore: 58,
    priority: 'MEDIUM', status: 'WON', source: 'OPENSTREETMAP',
    emailsSent: 5, lastEmailAt: ago(12), lastContactAt: ago(12),
    createdAt: ago(45), _count: { notes: 6, emails: 5 } }),

  p({ id: 'p20', companyName: 'Studio Yoga Harmonie', industry: 'Bien-être',
    firstName: 'Laure', lastName: 'Simon', email: 'yoga.harmonie@gmail.com', phone: '04 91 45 67 89',
    city: 'Marseille', postalCode: '13006', website: 'https://yoga-harmonie.fr', hasWebsite: true,
    googleRating: 5.0, googleReviewCount: 73, prospectScore: 44, siteScore: 60,
    priority: 'MEDIUM', status: 'NEW', source: 'OPENSTREETMAP',
    createdAt: ago(7), lastContactAt: null }),

  p({ id: 'p21', companyName: 'Agence Immobilière Horizon', industry: 'Immobilier',
    firstName: 'Nicolas', lastName: 'Faure', email: 'horizon.immo@orange.fr', phone: '05 57 23 45 67',
    city: 'Bordeaux', postalCode: '33300', website: 'https://horizon-immobilier33.fr', hasWebsite: true,
    googleRating: 3.7, googleReviewCount: 94, prospectScore: 43, siteScore: 62,
    priority: 'MEDIUM', status: 'CONTACTED', source: 'OPENSTREETMAP',
    emailsSent: 2, lastEmailAt: ago(8), lastContactAt: ago(8),
    createdAt: ago(28), _count: { notes: 2, emails: 2 } }),

  p({ id: 'p22', companyName: 'Kinésithérapie Dumont', industry: 'Kinésithérapie',
    firstName: 'Antoine', lastName: 'Dumont', email: 'kine.dumont@sfr.fr', phone: '02 99 67 89 01',
    city: 'Rennes', postalCode: '35200', website: 'https://kine-dumont-rennes.fr', hasWebsite: true,
    googleRating: 4.5, googleReviewCount: 108, prospectScore: 41, siteScore: 65,
    priority: 'MEDIUM', status: 'LOST', source: 'OPENSTREETMAP',
    emailsSent: 3, lastEmailAt: ago(20), lastContactAt: ago(20),
    createdAt: ago(50), _count: { notes: 3, emails: 3 } }),

  p({ id: 'p23', companyName: 'Boutique Mode & Tendance', industry: 'Mode',
    firstName: 'Aurélie', lastName: 'Lemaire', email: null, phone: '03 88 12 34 56',
    city: 'Strasbourg', postalCode: '67200', website: 'https://mode-tendance-strasbourg.shopify.com', hasWebsite: true,
    googleRating: 4.2, googleReviewCount: 67, prospectScore: 40, siteScore: 68,
    priority: 'MEDIUM', status: 'NEW', source: 'GOOGLE_MAPS',
    createdAt: ago(11), lastContactAt: null }),

  p({ id: 'p24', companyName: 'École de Danse Étoile', industry: 'École de danse',
    firstName: 'Nathalie', lastName: 'Colin', email: 'ecole.etoile@hotmail.fr', phone: '04 76 45 67 89',
    city: 'Grenoble', postalCode: '38000', website: 'https://ecole-danse-etoile.fr', hasWebsite: true,
    googleRating: 4.6, googleReviewCount: 134, prospectScore: 42, siteScore: 63,
    priority: 'MEDIUM', status: 'AUDITED', source: 'OPENSTREETMAP',
    createdAt: ago(16), lastContactAt: null }),

  p({ id: 'p25', companyName: 'Pizzeria Napoli Express', industry: 'Restauration',
    firstName: 'Giuseppe', lastName: 'Romano', email: 'napoli.express@gmail.com', phone: '04 72 34 56 78',
    city: 'Lyon', postalCode: '69008', website: 'https://napoli-express-lyon.fr', hasWebsite: true,
    googleRating: 4.4, googleReviewCount: 387, prospectScore: 45, siteScore: 55,
    priority: 'MEDIUM', status: 'NEW', source: 'OPENSTREETMAP',
    createdAt: ago(3), lastContactAt: null }),

  // ── LOW (good site, score 20-39) ────────────────────────────────────────────
  p({ id: 'p26', companyName: 'Consultant RH Expertia', industry: 'Conseil RH',
    firstName: 'Frédéric', lastName: 'Marchand', email: 'f.marchand@expertia-rh.fr', phone: '01 78 90 12 34',
    city: 'Paris', postalCode: '75008', website: 'https://expertia-rh.fr', hasWebsite: true,
    googleRating: null, googleReviewCount: null, prospectScore: 38, siteScore: 72,
    priority: 'LOW', status: 'NEW', source: 'IMPORT_CSV',
    createdAt: ago(20), lastContactAt: null }),

  p({ id: 'p27', companyName: 'Brasserie du Port', industry: 'Restauration',
    firstName: 'Stéphane', lastName: 'Moulin', email: 'brasserie.port@wanadoo.fr', phone: '02 40 12 34 56',
    city: 'Nantes', postalCode: '44000', website: 'https://brasserie-du-port-nantes.fr', hasWebsite: true,
    googleRating: 4.0, googleReviewCount: 502, prospectScore: 35, siteScore: 70,
    priority: 'LOW', status: 'CONTACTED', source: 'OPENSTREETMAP',
    emailsSent: 1, lastEmailAt: ago(25), lastContactAt: ago(25),
    createdAt: ago(35), _count: { notes: 1, emails: 1 } }),

  p({ id: 'p28', companyName: 'Cabinet Architecture Lefranc', industry: 'Architecture',
    firstName: 'Mathieu', lastName: 'Lefranc', email: 'mlefranc@archi-lefranc.fr', phone: '04 91 67 89 01',
    city: 'Marseille', postalCode: '13008', website: 'https://archi-lefranc.fr', hasWebsite: true,
    googleRating: 4.7, googleReviewCount: 28, prospectScore: 32, siteScore: 75,
    priority: 'LOW', status: 'NEW', source: 'MANUAL',
    createdAt: ago(13), lastContactAt: null }),

  p({ id: 'p29', companyName: 'Société Transport Rapide', industry: 'Transport',
    firstName: null, lastName: null, email: 'contact@transport-rapide.fr', phone: '03 28 78 90 12',
    city: 'Lille', postalCode: '59160', website: 'https://transport-rapide-nord.fr', hasWebsite: true,
    googleRating: 3.5, googleReviewCount: 41, prospectScore: 29, siteScore: 78,
    priority: 'LOW', status: 'BLACKLIST', source: 'OPENSTREETMAP',
    emailsSent: 2, lastEmailAt: ago(40), lastContactAt: ago(40),
    createdAt: ago(60), _count: { notes: 0, emails: 2 } }),

  p({ id: 'p30', companyName: 'Centre Laser Beauté', industry: 'Esthétique médicale',
    firstName: 'Émilie', lastName: 'Perrin', email: 'centre.laser@orange.fr', phone: '04 72 89 01 23',
    city: 'Lyon', postalCode: '69006', website: 'https://centre-laser-beaute-lyon.fr', hasWebsite: true,
    googleRating: 4.8, googleReviewCount: 215, prospectScore: 26, siteScore: 80,
    priority: 'LOW', status: 'NEW', source: 'GOOGLE_MAPS',
    createdAt: ago(17), lastContactAt: null }),

  p({ id: 'p31', companyName: 'Comptabilité Expertise Plus', industry: 'Comptabilité',
    firstName: 'Philippe', lastName: 'Gaudin', email: 'p.gaudin@expertise-plus.fr', phone: '05 61 45 67 89',
    city: 'Toulouse', postalCode: '31500', website: 'https://expertise-comptable-plus.fr', hasWebsite: true,
    googleRating: null, googleReviewCount: null, prospectScore: 22, siteScore: 82,
    priority: 'LOW', status: 'NEW', source: 'IMPORT_CSV',
    createdAt: ago(24), lastContactAt: null }),

  // ── COLD (score < 20) ────────────────────────────────────────────────────────
  p({ id: 'p32', companyName: 'McDonald\'s Place Bellecour', industry: 'Restauration rapide',
    firstName: null, lastName: null, email: null, phone: '04 72 00 11 22',
    city: 'Lyon', postalCode: '69002', website: 'https://www.mcdonalds.fr', hasWebsite: true,
    googleRating: 3.8, googleReviewCount: 1842, prospectScore: 5, siteScore: 95,
    priority: 'COLD', status: 'NEW', source: 'OPENSTREETMAP',
    createdAt: ago(30), lastContactAt: null }),

  p({ id: 'p33', companyName: 'BNP Paribas Agence Centrale', industry: 'Banque',
    firstName: null, lastName: null, email: null, phone: '36 82',
    city: 'Paris', postalCode: '75001', website: 'https://www.bnpparibas.fr', hasWebsite: true,
    googleRating: 2.1, googleReviewCount: 89, prospectScore: 3, siteScore: 98,
    priority: 'COLD', status: 'NEW', source: 'OPENSTREETMAP',
    createdAt: ago(30), lastContactAt: null }),

  p({ id: 'p34', companyName: 'Pharmacie des Champs', industry: 'Pharmacie',
    firstName: null, lastName: null, email: null, phone: '04 93 45 67 89',
    city: 'Nice', postalCode: '06000', website: 'https://pharmacie-des-champs-nice.fr', hasWebsite: true,
    googleRating: 4.4, googleReviewCount: 178, prospectScore: 12, siteScore: 88,
    priority: 'COLD', status: 'CONTACTED', source: 'OPENSTREETMAP',
    emailsSent: 1, lastEmailAt: ago(60), lastContactAt: ago(60),
    createdAt: ago(90), _count: { notes: 0, emails: 1 } }),

  p({ id: 'p35', companyName: 'Notaire Maître Duplessis', industry: 'Juridique',
    firstName: 'Maître', lastName: 'Duplessis', email: 'm.duplessis@notaires.fr', phone: '02 99 12 34 56',
    city: 'Rennes', postalCode: '35000', website: 'https://maitre-duplessis-notaire.fr', hasWebsite: true,
    googleRating: null, googleReviewCount: null, prospectScore: 8, siteScore: 91,
    priority: 'COLD', status: 'NEW', source: 'MANUAL',
    createdAt: ago(45), lastContactAt: null }),
]
