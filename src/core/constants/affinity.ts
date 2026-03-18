export interface AffinitySubcategory {
  value: string
  label: string
}

export interface AffinityCategory {
  value: string
  label: string
  subcategories: AffinitySubcategory[]
}

export const AFFINITY_CATEGORIES: AffinityCategory[] = [
  {
    value: 'media-journalism',
    label: 'Media & Journalism',
    subcategories: [
      { value: 'print-media', label: 'Print Media' },
      { value: 'digital-media', label: 'Digital Media' },
      { value: 'tv-radio', label: 'TV & Radio' },
      { value: 'investigative-journalism', label: 'Investigative Journalism' },
      { value: 'photojournalism', label: 'Photojournalism' },
      { value: 'podcasts', label: 'Podcasts & Audio' },
      { value: 'foreign-correspondents', label: 'Foreign Correspondents' },
    ],
  },
  {
    value: 'technology',
    label: 'Technology',
    subcategories: [
      { value: 'software-development', label: 'Software Development' },
      { value: 'artificial-intelligence', label: 'Artificial Intelligence' },
      { value: 'cybersecurity', label: 'Cybersecurity' },
      { value: 'fintech', label: 'Fintech' },
      { value: 'hardware', label: 'Hardware & IoT' },
      { value: 'startups', label: 'Startups & Innovation' },
      { value: 'saas', label: 'SaaS & Cloud' },
    ],
  },
  {
    value: 'legal-advocacy',
    label: 'Legal & Advocacy',
    subcategories: [
      { value: 'law-firms', label: 'Law Firms' },
      { value: 'human-rights', label: 'Human Rights' },
      { value: 'consumer-protection', label: 'Consumer Protection' },
      { value: 'environmental-law', label: 'Environmental Law' },
      { value: 'corporate-law', label: 'Corporate Law' },
      { value: 'criminal-defense', label: 'Criminal Defense' },
      { value: 'civil-rights', label: 'Civil Rights' },
    ],
  },
  {
    value: 'finance-business',
    label: 'Finance & Business',
    subcategories: [
      { value: 'banking', label: 'Banking' },
      { value: 'investment', label: 'Investment & Asset Management' },
      { value: 'consulting', label: 'Management Consulting' },
      { value: 'insurance', label: 'Insurance' },
      { value: 'real-estate', label: 'Real Estate' },
      { value: 'venture-capital', label: 'Venture Capital' },
      { value: 'accounting', label: 'Accounting & Audit' },
    ],
  },
  {
    value: 'government-institutions',
    label: 'Government & Institutions',
    subcategories: [
      { value: 'public-administration', label: 'Public Administration' },
      { value: 'international-organizations', label: 'International Organizations' },
      { value: 'regulatory-bodies', label: 'Regulatory Bodies' },
      { value: 'political-parties', label: 'Political Parties' },
      { value: 'embassies', label: 'Embassies & Consulates' },
      { value: 'local-government', label: 'Local Government' },
    ],
  },
  {
    value: 'healthcare',
    label: 'Healthcare',
    subcategories: [
      { value: 'hospitals', label: 'Hospitals & Clinics' },
      { value: 'pharma', label: 'Research & Pharma' },
      { value: 'mental-health', label: 'Mental Health' },
      { value: 'public-health', label: 'Public Health & Policy' },
      { value: 'biotech', label: 'Biotechnology' },
      { value: 'medical-devices', label: 'Medical Devices' },
    ],
  },
  {
    value: 'education-research',
    label: 'Education & Research',
    subcategories: [
      { value: 'universities', label: 'Universities & Academia' },
      { value: 'think-tanks', label: 'Think Tanks' },
      { value: 'research-institutes', label: 'Research Institutes' },
      { value: 'k12-schools', label: 'K-12 Schools' },
      { value: 'edtech', label: 'EdTech & Online Learning' },
      { value: 'scientific-publishers', label: 'Scientific Publishers' },
    ],
  },
  {
    value: 'environment',
    label: 'Environment & Sustainability',
    subcategories: [
      { value: 'environmental-ngos', label: 'Environmental NGOs' },
      { value: 'renewable-energy', label: 'Renewable Energy' },
      { value: 'climate-change', label: 'Climate Change Organizations' },
      { value: 'conservation', label: 'Conservation & Wildlife' },
      { value: 'sustainability-consulting', label: 'Sustainability Consulting' },
      { value: 'circular-economy', label: 'Circular Economy' },
    ],
  },
  {
    value: 'culture-entertainment',
    label: 'Culture & Entertainment',
    subcategories: [
      { value: 'film-tv', label: 'Film & TV Production' },
      { value: 'music', label: 'Music Industry' },
      { value: 'publishing', label: 'Publishing & Books' },
      { value: 'art-galleries', label: 'Art Galleries & Museums' },
      { value: 'gaming', label: 'Gaming & eSports' },
      { value: 'sports', label: 'Sports & Athletes' },
    ],
  },
  {
    value: 'social-npo',
    label: 'Social & Non-Profit',
    subcategories: [
      { value: 'ngos', label: 'NGOs & Foundations' },
      { value: 'community-orgs', label: 'Community Organizations' },
      { value: 'social-enterprises', label: 'Social Enterprises' },
      { value: 'activism', label: 'Activism & Campaigns' },
      { value: 'religious-orgs', label: 'Religious Organizations' },
      { value: 'humanitarian-aid', label: 'Humanitarian Aid' },
    ],
  },
]

export const CONTACT_LANGUAGES = [
  { value: 'any', label: 'Any Language' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian' },
  { value: 'nl', label: 'Dutch' },
  { value: 'ru', label: 'Russian' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'ko', label: 'Korean' },
  { value: 'sv', label: 'Swedish' },
  { value: 'pl', label: 'Polish' },
  { value: 'tr', label: 'Turkish' },
  { value: 'hi', label: 'Hindi' },
]

export const COUNTRIES = [
  { value: 'worldwide', label: 'Worldwide' },
  { value: 'us', label: 'United States' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'es', label: 'Spain' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'it', label: 'Italy' },
  { value: 'ca', label: 'Canada' },
  { value: 'au', label: 'Australia' },
  { value: 'br', label: 'Brazil' },
  { value: 'mx', label: 'Mexico' },
  { value: 'ar', label: 'Argentina' },
  { value: 'nl', label: 'Netherlands' },
  { value: 'se', label: 'Sweden' },
  { value: 'ch', label: 'Switzerland' },
  { value: 'no', label: 'Norway' },
  { value: 'pt', label: 'Portugal' },
  { value: 'pl', label: 'Poland' },
  { value: 'jp', label: 'Japan' },
  { value: 'cn', label: 'China' },
  { value: 'in', label: 'India' },
  { value: 'ru', label: 'Russia' },
  { value: 'za', label: 'South Africa' },
  { value: 'eu', label: 'European Union' },
  { value: 'latam', label: 'Latin America' },
  { value: 'apac', label: 'Asia Pacific' },
]
