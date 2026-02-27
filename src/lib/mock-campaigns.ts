// ── Types ─────────────────────────────────────────────────────────────────────

export type SequenceStep = {
  step: number
  delay: number   // jours après J+0
  type: 'FIRST_CONTACT' | 'FOLLOW_UP_1' | 'FOLLOW_UP_2' | 'FOLLOW_UP_3'
  label: string
}

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED'

export type MockCampaign = {
  id: string
  name: string
  description: string | null
  status: CampaignStatus
  targetCity: string | null
  targetIndustry: string | null
  minScore: number
  maxProspects: number
  sequence: SequenceStep[]
  totalSent: number
  totalOpened: number
  totalReplied: number
  totalMeetings: number
  prospectsCount: number
  createdAt: string
  updatedAt: string
}

export type CampaignProspect = {
  id: string
  companyName: string
  city: string
  industry: string
  prospectScore: number
  priority: string
  status: string
  currentStep: number        // 0=J+0, 1=J+3, 2=J+7 — étape atteinte
  emailsSentInCampaign: number
  lastEmailAt: string | null
  stoppedReason: 'replied' | 'blacklist' | null
}

export type MockCampaignDetail = MockCampaign & {
  prospects: CampaignProspect[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

const DEFAULT_SEQUENCE: SequenceStep[] = [
  { step: 0, delay: 0, type: 'FIRST_CONTACT', label: 'Premier contact' },
  { step: 1, delay: 3,  type: 'FOLLOW_UP_1',  label: 'Relance J+3' },
  { step: 2, delay: 7,  type: 'FOLLOW_UP_2',  label: 'Relance J+7' },
]

// ── Données mock ──────────────────────────────────────────────────────────────

export const MOCK_CAMPAIGNS: MockCampaign[] = [
  {
    id: 'camp01',
    name: 'Coiffeurs Lyon sans site',
    description: 'Ciblage coiffeurs Lyon centre sans présence web — potentiel HOT',
    status: 'ACTIVE',
    targetCity: 'Lyon',
    targetIndustry: 'Coiffeur',
    minScore: 70,
    maxProspects: 25,
    sequence: DEFAULT_SEQUENCE,
    totalSent: 12,
    totalOpened: 9,
    totalReplied: 2,
    totalMeetings: 1,
    prospectsCount: 5,
    createdAt: ago(12),
    updatedAt: ago(1),
  },
  {
    id: 'camp02',
    name: 'Plombiers Bordeaux',
    description: null,
    status: 'PAUSED',
    targetCity: 'Bordeaux',
    targetIndustry: 'Plomberie',
    minScore: 60,
    maxProspects: 10,
    sequence: DEFAULT_SEQUENCE,
    totalSent: 6,
    totalOpened: 4,
    totalReplied: 1,
    totalMeetings: 0,
    prospectsCount: 3,
    createdAt: ago(22),
    updatedAt: ago(6),
  },
  {
    id: 'camp03',
    name: 'Restaurants Marseille',
    description: 'Restaurants sans site ou site < 30 points',
    status: 'DRAFT',
    targetCity: 'Marseille',
    targetIndustry: 'Restaurant',
    minScore: 50,
    maxProspects: 50,
    sequence: DEFAULT_SEQUENCE,
    totalSent: 0,
    totalOpened: 0,
    totalReplied: 0,
    totalMeetings: 0,
    prospectsCount: 0,
    createdAt: ago(3),
    updatedAt: ago(3),
  },
  {
    id: 'camp04',
    name: 'Électriciens Paris',
    description: null,
    status: 'COMPLETED',
    targetCity: 'Paris',
    targetIndustry: 'Électricité',
    minScore: 65,
    maxProspects: 20,
    sequence: DEFAULT_SEQUENCE,
    totalSent: 18,
    totalOpened: 13,
    totalReplied: 4,
    totalMeetings: 2,
    prospectsCount: 6,
    createdAt: ago(50),
    updatedAt: ago(18),
  },
]

// ── Prospects par campagne ────────────────────────────────────────────────────

const CAMP01_PROSPECTS: CampaignProspect[] = [
  { id: 'p01', companyName: 'Boulangerie Artisanale Lefèbvre', city: 'Lyon', industry: 'Boulangerie',
    prospectScore: 94, priority: 'HOT', status: 'REPLIED',
    currentStep: 2, emailsSentInCampaign: 3, lastEmailAt: ago(1), stoppedReason: 'replied' },
  { id: 'p04', companyName: 'Coiffure & Style Beaumont', city: 'Bordeaux', industry: 'Coiffure',
    prospectScore: 87, priority: 'HOT', status: 'OPENED',
    currentStep: 1, emailsSentInCampaign: 2, lastEmailAt: ago(4), stoppedReason: null },
  { id: 'p05', companyName: 'Restaurant Le Vieux Moulin', city: 'Marseille', industry: 'Restauration',
    prospectScore: 85, priority: 'HOT', status: 'OPENED',
    currentStep: 1, emailsSentInCampaign: 2, lastEmailAt: ago(2), stoppedReason: null },
  { id: 'p02', companyName: 'Plomberie Martin & Fils', city: 'Bordeaux', industry: 'Plomberie',
    prospectScore: 91, priority: 'HOT', status: 'CONTACTED',
    currentStep: 0, emailsSentInCampaign: 1, lastEmailAt: ago(7), stoppedReason: null },
  { id: 'p03', companyName: 'Auto-École Prestige', city: 'Lille', industry: 'Auto-École',
    prospectScore: 88, priority: 'HOT', status: 'CONTACTED',
    currentStep: 0, emailsSentInCampaign: 1, lastEmailAt: ago(10), stoppedReason: null },
]

const CAMP02_PROSPECTS: CampaignProspect[] = [
  { id: 'p06', companyName: 'Électricité Roux & Associés', city: 'Lyon', industry: 'Électricité',
    prospectScore: 76, priority: 'HIGH', status: 'REPLIED',
    currentStep: 1, emailsSentInCampaign: 2, lastEmailAt: ago(3), stoppedReason: 'replied' },
  { id: 'p07', companyName: 'Menuiserie Artisanale Leconte', city: 'Rennes', industry: 'Menuiserie',
    prospectScore: 74, priority: 'HIGH', status: 'OPENED',
    currentStep: 1, emailsSentInCampaign: 2, lastEmailAt: ago(8), stoppedReason: null },
  { id: 'p29', companyName: 'Société Transport Rapide', city: 'Lille', industry: 'Transport',
    prospectScore: 29, priority: 'LOW', status: 'BLACKLIST',
    currentStep: 0, emailsSentInCampaign: 1, lastEmailAt: ago(25), stoppedReason: 'blacklist' },
]

const CAMP04_PROSPECTS: CampaignProspect[] = [
  { id: 'p10', companyName: 'Hôtel Les Glycines', city: 'Toulouse', industry: 'Hôtellerie',
    prospectScore: 67, priority: 'HIGH', status: 'MEETING',
    currentStep: 2, emailsSentInCampaign: 3, lastEmailAt: ago(20), stoppedReason: 'replied' },
  { id: 'p12', companyName: 'Opticien Visio Plus', city: 'Paris', industry: 'Optique',
    prospectScore: 62, priority: 'HIGH', status: 'PROPOSAL',
    currentStep: 2, emailsSentInCampaign: 3, lastEmailAt: ago(22), stoppedReason: 'replied' },
  { id: 'p08', companyName: 'Pharmacie du Centre', city: 'Strasbourg', industry: 'Pharmacie',
    prospectScore: 72, priority: 'HIGH', status: 'CONTACTED',
    currentStep: 0, emailsSentInCampaign: 1, lastEmailAt: ago(30), stoppedReason: null },
  { id: 'p09', companyName: 'Cabinet Vétérinaire Morel', city: 'Nice', industry: 'Vétérinaire',
    prospectScore: 69, priority: 'HIGH', status: 'REPLIED',
    currentStep: 2, emailsSentInCampaign: 3, lastEmailAt: ago(18), stoppedReason: 'replied' },
  { id: 'p11', companyName: 'Peinture & Décoration Lambert', city: 'Nantes', industry: 'Peinture',
    prospectScore: 65, priority: 'HIGH', status: 'CONTACTED',
    currentStep: 0, emailsSentInCampaign: 1, lastEmailAt: ago(35), stoppedReason: null },
  { id: 'p13', companyName: 'Garage Mécanique Bruneau', city: 'Toulouse', industry: 'Automobile',
    prospectScore: 61, priority: 'HIGH', status: 'CONTACTED',
    currentStep: 0, emailsSentInCampaign: 1, lastEmailAt: ago(40), stoppedReason: null },
]

const CAMP_PROSPECTS: Record<string, CampaignProspect[]> = {
  camp01: CAMP01_PROSPECTS,
  camp02: CAMP02_PROSPECTS,
  camp03: [],
  camp04: CAMP04_PROSPECTS,
}

export function getMockCampaignDetail(id: string): MockCampaignDetail | null {
  const campaign = MOCK_CAMPAIGNS.find(c => c.id === id)
  if (!campaign) return null
  return {
    ...campaign,
    prospects: CAMP_PROSPECTS[id] ?? [],
  }
}
