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
    label: 'Medios y Periodismo',
    subcategories: [
      { value: 'print-media', label: 'Prensa Escrita' },
      { value: 'digital-media', label: 'Medios Digitales' },
      { value: 'tv-radio', label: 'TV y Radio' },
      { value: 'investigative-journalism', label: 'Periodismo de Investigación' },
      { value: 'photojournalism', label: 'Fotoperiodismo' },
      { value: 'podcasts', label: 'Podcasts y Audio' },
      { value: 'foreign-correspondents', label: 'Corresponsales Extranjeros' },
    ],
  },
  {
    value: 'technology',
    label: 'Tecnología',
    subcategories: [
      { value: 'software-development', label: 'Desarrollo de Software' },
      { value: 'artificial-intelligence', label: 'Inteligencia Artificial' },
      { value: 'cybersecurity', label: 'Ciberseguridad' },
      { value: 'fintech', label: 'Fintech' },
      { value: 'hardware', label: 'Hardware e IoT' },
      { value: 'startups', label: 'Startups e Innovación' },
      { value: 'saas', label: 'SaaS y Cloud' },
    ],
  },
  {
    value: 'legal-advocacy',
    label: 'Legal y Defensa',
    subcategories: [
      { value: 'law-firms', label: 'Despachos de Abogados' },
      { value: 'human-rights', label: 'Derechos Humanos' },
      { value: 'consumer-protection', label: 'Protección al Consumidor' },
      { value: 'environmental-law', label: 'Derecho Ambiental' },
      { value: 'corporate-law', label: 'Derecho Corporativo' },
      { value: 'criminal-defense', label: 'Defensa Penal' },
      { value: 'civil-rights', label: 'Derechos Civiles' },
    ],
  },
  {
    value: 'finance-business',
    label: 'Finanzas y Negocios',
    subcategories: [
      { value: 'banking', label: 'Banca' },
      { value: 'investment', label: 'Inversión y Gestión de Activos' },
      { value: 'consulting', label: 'Consultoría de Gestión' },
      { value: 'insurance', label: 'Seguros' },
      { value: 'real-estate', label: 'Inmobiliaria' },
      { value: 'venture-capital', label: 'Capital de Riesgo' },
      { value: 'accounting', label: 'Contabilidad y Auditoría' },
    ],
  },
  {
    value: 'government-institutions',
    label: 'Gobierno e Instituciones',
    subcategories: [
      { value: 'public-administration', label: 'Administración Pública' },
      { value: 'international-organizations', label: 'Organizaciones Internacionales' },
      { value: 'regulatory-bodies', label: 'Organismos Reguladores' },
      { value: 'political-parties', label: 'Partidos Políticos' },
      { value: 'embassies', label: 'Embajadas y Consulados' },
      { value: 'local-government', label: 'Gobierno Local' },
    ],
  },
  {
    value: 'healthcare',
    label: 'Salud',
    subcategories: [
      { value: 'hospitals', label: 'Hospitales y Clínicas' },
      { value: 'pharma', label: 'Investigación y Farmacia' },
      { value: 'mental-health', label: 'Salud Mental' },
      { value: 'public-health', label: 'Salud Pública y Política' },
      { value: 'biotech', label: 'Biotecnología' },
      { value: 'medical-devices', label: 'Dispositivos Médicos' },
    ],
  },
  {
    value: 'education-research',
    label: 'Educación e Investigación',
    subcategories: [
      { value: 'universities', label: 'Universidades y Academia' },
      { value: 'think-tanks', label: 'Think Tanks' },
      { value: 'research-institutes', label: 'Institutos de Investigación' },
      { value: 'k12-schools', label: 'Colegios e Institutos' },
      { value: 'edtech', label: 'EdTech y Educación Online' },
      { value: 'scientific-publishers', label: 'Editoriales Científicas' },
    ],
  },
  {
    value: 'environment',
    label: 'Medio Ambiente y Sostenibilidad',
    subcategories: [
      { value: 'environmental-ngos', label: 'ONGs Medioambientales' },
      { value: 'renewable-energy', label: 'Energías Renovables' },
      { value: 'climate-change', label: 'Organizaciones de Cambio Climático' },
      { value: 'conservation', label: 'Conservación y Fauna' },
      { value: 'sustainability-consulting', label: 'Consultoría de Sostenibilidad' },
      { value: 'circular-economy', label: 'Economía Circular' },
    ],
  },
  {
    value: 'culture-entertainment',
    label: 'Cultura y Entretenimiento',
    subcategories: [
      { value: 'film-tv', label: 'Producción de Cine y TV' },
      { value: 'music', label: 'Industria Musical' },
      { value: 'publishing', label: 'Editoriales y Libros' },
      { value: 'art-galleries', label: 'Galerías de Arte y Museos' },
      { value: 'gaming', label: 'Videojuegos y eSports' },
      { value: 'sports', label: 'Deporte y Atletas' },
    ],
  },
  {
    value: 'social-npo',
    label: 'Social y Sin Ánimo de Lucro',
    subcategories: [
      { value: 'ngos', label: 'ONGs y Fundaciones' },
      { value: 'community-orgs', label: 'Organizaciones Comunitarias' },
      { value: 'social-enterprises', label: 'Empresas Sociales' },
      { value: 'activism', label: 'Activismo y Campañas' },
      { value: 'religious-orgs', label: 'Organizaciones Religiosas' },
      { value: 'humanitarian-aid', label: 'Ayuda Humanitaria' },
    ],
  },
]

export const CONTACT_LANGUAGES = [
  { value: 'any', label: 'Cualquier idioma' },
  { value: 'en', label: 'Inglés' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Francés' },
  { value: 'de', label: 'Alemán' },
  { value: 'pt', label: 'Portugués' },
  { value: 'it', label: 'Italiano' },
  { value: 'nl', label: 'Neerlandés' },
  { value: 'ru', label: 'Ruso' },
  { value: 'zh', label: 'Chino' },
  { value: 'ja', label: 'Japonés' },
  { value: 'ar', label: 'Árabe' },
  { value: 'ko', label: 'Coreano' },
  { value: 'sv', label: 'Sueco' },
  { value: 'pl', label: 'Polaco' },
  { value: 'tr', label: 'Turco' },
  { value: 'hi', label: 'Hindi' },
]

export const COUNTRIES = [
  { value: 'worldwide', label: 'Todo el mundo' },
  { value: 'us', label: 'Estados Unidos' },
  { value: 'uk', label: 'Reino Unido' },
  { value: 'es', label: 'España' },
  { value: 'de', label: 'Alemania' },
  { value: 'fr', label: 'Francia' },
  { value: 'it', label: 'Italia' },
  { value: 'ca', label: 'Canadá' },
  { value: 'au', label: 'Australia' },
  { value: 'br', label: 'Brasil' },
  { value: 'mx', label: 'México' },
  { value: 'ar', label: 'Argentina' },
  { value: 'nl', label: 'Países Bajos' },
  { value: 'se', label: 'Suecia' },
  { value: 'ch', label: 'Suiza' },
  { value: 'no', label: 'Noruega' },
  { value: 'pt', label: 'Portugal' },
  { value: 'pl', label: 'Polonia' },
  { value: 'jp', label: 'Japón' },
  { value: 'cn', label: 'China' },
  { value: 'in', label: 'India' },
  { value: 'ru', label: 'Rusia' },
  { value: 'za', label: 'Sudáfrica' },
  { value: 'eu', label: 'Unión Europea' },
  { value: 'latam', label: 'América Latina' },
  { value: 'apac', label: 'Asia Pacífico' },
]
