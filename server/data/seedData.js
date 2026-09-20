export const STAGES = [
  { id: 'new', name: 'New' },
  { id: 'contacted', name: 'Contacted' },
  { id: 'qualified', name: 'Qualified' },
  { id: 'negotiation', name: 'Negotiation' },
  { id: 'won', name: 'Won' },
  { id: 'lost', name: 'Lost' },
];

export const TEAM = [];

export const RAW_USERS = [];

export const RAW_PROJECTS = [];

export const RAW_CONTACTS = [];

export const RAW_CALLS = [];

export const RAW_BROCHURES = [];

export const RAW_PARTNERS = [];

export const RAW_BROADCASTS = [];

export const RAW_SITE_VISITS = [];

export const RAW_TASKS = [];

export const SEQUENCES = [];

export const SETTINGS = {
  company: {
    name: 'Ashray Group Real Estate',
    brandName: 'Hintonn AI',
    website: 'https://ashraygroup.in',
    phone: '+91 79 4000 1234',
    address: 'Ashray House, SG Highway, Ahmedabad, Gujarat 380054'
  },
  whatsapp: {
    status: 'connected',
    wabaId: 'WABA-99281-IN',
    phoneNumber: '+91 98250 99000',
    qualityScore: 'High (Green)',
    dailyLimit: '10,000 conversations/day',
    webhookStatus: 'Active (200 OK)'
  },
  sla: {
    firstResponseMinutes: 15,
    firstNudgeHours: 24,
    cadenceHours: 12,
    autoAssignMethod: 'Round Robin'
  }
};

export const RAW_LEAD_SOURCES = [
  { id: 1, name: 'Instagram', icon: 'instagram', color: '#E1306C', webhookUrl: '/api/lead-capture/webhook', costPerLead: 45, active: true, category: 'social' },
  { id: 2, name: 'Facebook', icon: 'facebook', color: '#1877F2', webhookUrl: '/api/lead-capture/webhook', costPerLead: 40, active: true, category: 'social' },
  { id: 3, name: 'WhatsApp', icon: 'message-circle', color: '#25D366', webhookUrl: '/api/lead-capture/webhook', costPerLead: 5, active: true, category: 'messaging' },
  { id: 4, name: 'Google Ads', icon: 'search', color: '#4285F4', webhookUrl: '/api/lead-capture/webhook', costPerLead: 60, active: true, category: 'paid' },
  { id: 5, name: '99acres', icon: 'home', color: '#FF6600', webhookUrl: '/api/lead-capture/webhook', costPerLead: 35, active: true, category: 'portal' },
  { id: 6, name: 'MagicBricks', icon: 'building', color: '#0066CC', webhookUrl: '/api/lead-capture/webhook', costPerLead: 35, active: true, category: 'portal' },
  { id: 7, name: 'Housing.com', icon: 'building-2', color: '#00A699', webhookUrl: '/api/lead-capture/webhook', costPerLead: 30, active: true, category: 'portal' },
  { id: 8, name: 'Website', icon: 'globe', color: '#6366F1', webhookUrl: '/api/lead-capture/webhook', costPerLead: 10, active: true, category: 'organic' },
  { id: 9, name: 'Walk-in', icon: 'footprints', color: '#10B981', webhookUrl: null, costPerLead: 0, active: true, category: 'offline' },
  { id: 10, name: 'Call-in', icon: 'phone', color: '#F59E0B', webhookUrl: null, costPerLead: 0, active: true, category: 'offline' },
  { id: 11, name: 'Referral', icon: 'users', color: '#8B5CF6', webhookUrl: null, costPerLead: 0, active: true, category: 'organic' },
];

export const RAW_NURTURE_SEQUENCES = [];

export const RAW_MILESTONE_TEMPLATES = [
  { id: 'booking', name: 'Booking Amount', percentage: 10, trigger: 'On booking', order: 1 },
  { id: 'agreement', name: 'Agreement Execution', percentage: 15, trigger: 'Within 30 days of booking', order: 2 },
  { id: 'slab_1', name: '1st Slab Completion', percentage: 15, trigger: 'On structure milestone', order: 3 },
  { id: 'slab_2', name: '2nd Slab Completion', percentage: 15, trigger: 'On structure milestone', order: 4 },
  { id: 'slab_3', name: '3rd Slab Completion', percentage: 10, trigger: 'On structure milestone', order: 5 },
  { id: 'brickwork', name: 'Brickwork Complete', percentage: 10, trigger: 'On construction milestone', order: 6 },
  { id: 'plaster', name: 'Plastering Complete', percentage: 10, trigger: 'On construction milestone', order: 7 },
  { id: 'possession', name: 'Possession', percentage: 15, trigger: 'On handover', order: 8 },
];

export const RAW_PAYMENT_MILESTONES = [];

export function generateInitialProjects() {
  return RAW_PROJECTS.map(p => {
    const floors = p.type === 'Villas' ? 2 : (p.totalUnits > 200 ? 12 : (p.totalUnits > 100 ? 8 : 6));
    const unitsPerFloor = Math.ceil(p.totalUnits / floors);
    const units = [];
    const soldCount = p.totalUnits - p.available;
    let soldPlaced = 0;
    const lockCount = Math.floor(p.available * 0.15);
    let lockedPlaced = 0;

    for (let f = 1; f <= floors; f++) {
      for (let u = 1; u <= unitsPerFloor && units.length < p.totalUnits; u++) {
        const unitNum = f * 100 + u;
        let status = 'available';
        if (soldPlaced < soldCount) {
          status = 'sold';
          soldPlaced++;
        } else if (lockedPlaced < lockCount) {
          status = 'locked';
          lockedPlaced++;
        }
        const lockedFor = status === 'locked' ? (RAW_CONTACTS[Math.floor(Math.random() * RAW_CONTACTS.length)].id) : null;
        const lockedExpiry = status === 'locked' ? 'Sep 25, 2026' : null;
        const config = p.configs[(u - 1) % p.configs.length];
        units.push({
          id: units.length + 1,
          number: String(unitNum),
          floor: f,
          type: config,
          status,
          lockedFor,
          lockedExpiry
        });
      }
    }
    return { ...p, units };
  });
}
