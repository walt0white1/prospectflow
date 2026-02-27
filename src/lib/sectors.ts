// ── Secteurs d'activité — liste utilisée côté client et serveur ───────────────
// Séparé dans son propre fichier pour éviter d'importer Playwright/Node côté client.

export type Sector = {
  label: string
  osmKey: string
  osmValue: string
  /** Tags alternatifs si le tag principal retourne peu de résultats */
  altTags?: Array<{ key: string; value: string }>
}

export const SECTORS: Sector[] = [
  {
    label: 'Coiffeur',
    osmKey: 'shop',
    osmValue: 'hairdresser',
  },
  {
    label: 'Restaurant',
    osmKey: 'amenity',
    osmValue: 'restaurant',
    altTags: [{ key: 'amenity', value: 'fast_food' }],
  },
  {
    label: 'Boulangerie',
    osmKey: 'shop',
    osmValue: 'bakery',
  },
  {
    label: 'Pharmacie',
    osmKey: 'amenity',
    osmValue: 'pharmacy',
  },
  {
    label: 'Médecin / Médecine générale',
    osmKey: 'amenity',
    osmValue: 'doctors',
    altTags: [{ key: 'healthcare', value: 'doctor' }],
  },
  {
    label: 'Dentiste',
    osmKey: 'amenity',
    osmValue: 'dentist',
    altTags: [{ key: 'healthcare', value: 'dentist' }],
  },
  {
    label: 'Garage / Auto',
    osmKey: 'shop',
    osmValue: 'car_repair',
    altTags: [{ key: 'amenity', value: 'car_repair' }],
  },
  {
    label: 'Plombier',
    osmKey: 'craft',
    osmValue: 'plumber',
  },
  {
    label: 'Électricien',
    osmKey: 'craft',
    osmValue: 'electrician',
  },
  {
    label: 'Menuisier / Charpentier',
    osmKey: 'craft',
    osmValue: 'joiner',
    altTags: [{ key: 'craft', value: 'carpenter' }],
  },
  {
    label: 'Peintre en bâtiment',
    osmKey: 'craft',
    osmValue: 'painter',
  },
  {
    label: 'Architecte',
    osmKey: 'office',
    osmValue: 'architect',
  },
  {
    label: 'Agence immobilière',
    osmKey: 'office',
    osmValue: 'estate_agent',
    altTags: [{ key: 'shop', value: 'estate_agent' }],
  },
  {
    label: 'Avocat',
    osmKey: 'office',
    osmValue: 'lawyer',
  },
  {
    label: 'Comptable / Expert-comptable',
    osmKey: 'office',
    osmValue: 'accountant',
  },
  {
    label: 'Assurance',
    osmKey: 'office',
    osmValue: 'insurance',
  },
  {
    label: 'Banque',
    osmKey: 'amenity',
    osmValue: 'bank',
  },
  {
    label: 'Hôtel',
    osmKey: 'tourism',
    osmValue: 'hotel',
    altTags: [{ key: 'tourism', value: 'guest_house' }],
  },
  {
    label: 'Fleuriste',
    osmKey: 'shop',
    osmValue: 'florist',
  },
  {
    label: 'Opticien',
    osmKey: 'shop',
    osmValue: 'optician',
  },
  {
    label: 'Vétérinaire',
    osmKey: 'amenity',
    osmValue: 'veterinary',
    altTags: [{ key: 'healthcare', value: 'veterinary' }],
  },
  {
    label: 'Kinésithérapeute',
    osmKey: 'healthcare',
    osmValue: 'physiotherapist',
    altTags: [{ key: 'amenity', value: 'physiotherapist' }],
  },
  {
    label: 'Photographe',
    osmKey: 'shop',
    osmValue: 'photo_studio',
    altTags: [{ key: 'craft', value: 'photographer' }],
  },
  {
    label: 'Imprimerie',
    osmKey: 'craft',
    osmValue: 'printer',
    altTags: [{ key: 'shop', value: 'copyshop' }],
  },
  {
    label: 'Taxi / VTC',
    osmKey: 'amenity',
    osmValue: 'taxi',
  },
  {
    label: 'Pressing / Nettoyage',
    osmKey: 'shop',
    osmValue: 'dry_cleaning',
    altTags: [{ key: 'shop', value: 'laundry' }],
  },
  {
    label: 'Épicerie / Alimentation',
    osmKey: 'shop',
    osmValue: 'convenience',
    altTags: [{ key: 'shop', value: 'supermarket' }],
  },
  {
    label: 'Café / Bar',
    osmKey: 'amenity',
    osmValue: 'cafe',
    altTags: [{ key: 'amenity', value: 'bar' }],
  },
  {
    label: 'Pizzeria',
    osmKey: 'amenity',
    osmValue: 'restaurant',
    altTags: [{ key: 'cuisine', value: 'pizza' }],
  },
  {
    label: 'Maçon',
    osmKey: 'craft',
    osmValue: 'mason',
    altTags: [{ key: 'craft', value: 'construction' }],
  },
]

/** Retourne le secteur par sa valeur OSM (ex: 'hairdresser') */
export function getSectorByOsmValue(value: string): Sector | undefined {
  return SECTORS.find(s => s.osmValue === value)
}

/** Retourne le secteur par son label (insensible à la casse) */
export function getSectorByLabel(label: string): Sector | undefined {
  return SECTORS.find(s => s.label.toLowerCase() === label.toLowerCase())
}
