export const STAGES = [
  { id: 'new', name: 'New' },
  { id: 'contacted', name: 'Contacted' },
  { id: 'qualified', name: 'Qualified' },
  { id: 'negotiation', name: 'Negotiation' },
  { id: 'won', name: 'Won' },
  { id: 'lost', name: 'Lost' },
];

export const TEAM = [];

export const RAW_USERS = [
  { id: 1, name: 'Admin', email: 'admin@hintonn.com', phone: '+919999999999', role: 'admin', isActive: true }
];

export const RAW_PROJECTS = [
  { id: 1, name: 'Skyline Residences', type: 'Residential', loc: 'Bopal, Ahmedabad', configs: ['2 BHK', '3 BHK'], priceMin: 5800000, priceMax: 9500000, totalUnits: 240, available: 18, possession: 'Ready to move' },
  { id: 2, name: 'Horizon Heights', type: 'Residential', loc: 'South Bopal, Ahmedabad', configs: ['1 BHK', '2 BHK'], priceMin: 3200000, priceMax: 5400000, totalUnits: 180, available: 62, possession: 'Dec 2026' },
  { id: 3, name: 'Palm Meadows Villas', type: 'Villas', loc: 'Shela, Ahmedabad', configs: ['4 BHK'], priceMin: 14000000, priceMax: 19000000, totalUnits: 40, available: 6, possession: 'Ready to move' },
  { id: 4, name: 'Emerald Business Park', type: 'Commercial', loc: 'Prahladnagar, Ahmedabad', configs: ['Office', 'Shop'], priceMin: 4500000, priceMax: 21000000, totalUnits: 96, available: 71, possession: 'Mar 2027' },
  { id: 5, name: 'Vista Greens', type: 'Residential', loc: 'Thaltej, Ahmedabad', configs: ['2 BHK', '3 BHK'], priceMin: 7200000, priceMax: 11000000, totalUnits: 150, available: 24, possession: 'Ready to move' },
];

export const RAW_CONTACTS = [
  {
    id: 1, name: 'Meera Joshi', phone: '+91 98250 11234', source: 'Facebook Ads', projectId: 1, config: '3 BHK', value: 8500000, stage: 'new', createdMinutesAgo: 4, reminderHoursAgo: 0.07, rep: null, score: 62,
    tags: ['high-budget'],
    notes: [{ id: 1, text: 'Called, left a voicemail — very interested in 3 BHK', author: 'Rohan Mehta', time: '2 hours ago' }],
    timeline: [
      { type: 'call', text: 'Initial discovery call', time: '3 days ago', icon: 'phone' },
      { type: 'whatsapp', text: 'Sent project brochure', time: '2 days ago', icon: 'messagecircle' },
      { type: 'email', text: 'Follow-up email with floor plans', time: '1 day ago', icon: 'mail' }
    ],
    dealProb: 65, expectedClose: 'Oct 2026', lossReason: null,
    preferences: { bedrooms: '3 BHK', locations: ['Bopal', 'Thaltej'], amenities: ['Gym', 'Pool'], budgetRange: [7000000, 10000000] },
    documents: [{ name: 'Pancard copy', type: 'ID', date: 'Sep 10' }, { name: 'Income proof', type: 'Financial', date: 'Sep 12' }],
    commission: { rate: 2, earned: 0 }
  },
  {
    id: 2, name: 'Rajesh Patel', phone: '+91 99250 44521', source: '99acres', projectId: 2, config: '2 BHK', value: 4800000, stage: 'new', createdMinutesAgo: 9, reminderHoursAgo: 0.15, rep: null, score: 58,
    tags: ['site-visit-scheduled'],
    notes: [{ id: 1, text: 'Budget confirmed at 48L, looking for ready-to-move', author: 'Ananya Iyer', time: '1 hour ago' }],
    timeline: [{ type: 'call', text: 'Intro call from 99acres inquiry', time: '9 min ago', icon: 'phone' }],
    dealProb: 45, expectedClose: 'Nov 2026', lossReason: null,
    preferences: { bedrooms: '2 BHK', locations: ['South Bopal'], amenities: ['Parking', 'Garden'], budgetRange: [4000000, 5500000] },
    documents: [], commission: { rate: 2, earned: 0 }
  },
  {
    id: 3, name: 'Kavita Shah', phone: '+91 97250 88123', source: 'WhatsApp', projectId: 5, config: '3 BHK', value: 9500000, stage: 'contacted', daysSince: 0, reminderHoursAgo: 26, rep: 'Ananya Iyer', score: 74,
    tags: ['high-budget', 'hot-lead'],
    notes: [{ id: 1, text: 'Very keen on Vista Greens, wants to visit this week', author: 'Ananya Iyer', time: '3 hours ago' }],
    timeline: [
      { type: 'whatsapp', text: 'Inbound WhatsApp inquiry', time: '2 days ago', icon: 'messagecircle' },
      { type: 'call', text: 'Explained project details', time: '1 day ago', icon: 'phone' },
      { type: 'site-visit', text: 'Site visit scheduled for Friday', time: '4 hours ago', icon: 'mappin' }
    ],
    dealProb: 70, expectedClose: 'Oct 2026', lossReason: null,
    preferences: { bedrooms: '3 BHK', locations: ['Thaltej', 'Bopal'], amenities: ['Gym', 'Pool', 'Clubhouse'], budgetRange: [8000000, 11000000] },
    documents: [{ name: 'Aadhaar copy', type: 'ID', date: 'Sep 11' }], commission: { rate: 2, earned: 0 }
  },
  {
    id: 4, name: 'Vikram Solanki', phone: '+91 98980 33210', source: 'Google Ads', projectId: 3, config: '4 BHK', value: 16000000, stage: 'qualified', daysSince: 1, reminderHoursAgo: 40, rep: 'Karan Thakkar', score: 81, siteVisit: 'Tomorrow, 11:00 AM',
    tags: ['high-budget', 'investor', 'nri'],
    notes: [
      { id: 1, text: 'NRI investor, looking for premium villas', author: 'Karan Thakkar', time: '5 hours ago' },
      { id: 2, text: 'Shared ROI analysis document', author: 'Karan Thakkar', time: '1 day ago' }
    ],
    timeline: [
      { type: 'call', text: 'Detailed requirements call', time: '5 days ago', icon: 'phone' },
      { type: 'email', text: 'Sent floor plans and pricing', time: '4 days ago', icon: 'mail' },
      { type: 'site-visit', text: 'First site visit completed', time: '2 days ago', icon: 'mappin' },
      { type: 'whatsapp', text: 'Follow-up on site visit feedback', time: '1 day ago', icon: 'messagecircle' }
    ],
    dealProb: 80, expectedClose: 'Sep 2026', lossReason: null,
    preferences: { bedrooms: '4 BHK', locations: ['Shela'], amenities: ['Garden', 'Pool', 'Security'], budgetRange: [14000000, 20000000] },
    documents: [{ name: 'Passport copy', type: 'ID', date: 'Sep 8' }, { name: 'NRI certificate', type: 'Financial', date: 'Sep 9' }, { name: 'Bank statement', type: 'Financial', date: 'Sep 10' }],
    commission: { rate: 1.5, earned: 0 }
  },
  {
    id: 5, name: 'Priyanka Desai', phone: '+91 96380 77654', source: 'Instagram', projectId: 1, config: '2 BHK', value: 6200000, stage: 'qualified', daysSince: 2, reminderHoursAgo: 10, rep: 'Simran Kaur', score: 69,
    tags: ['site-visit-scheduled'], notes: [],
    timeline: [{ type: 'whatsapp', text: 'DM inquiry on Instagram', time: '5 days ago', icon: 'messagecircle' }, { type: 'call', text: 'Qualification call — budget confirmed', time: '3 days ago', icon: 'phone' }],
    dealProb: 55, expectedClose: 'Nov 2026', lossReason: null,
    preferences: { bedrooms: '2 BHK', locations: ['Bopal'], amenities: ['Gym'], budgetRange: [5500000, 7000000] },
    documents: [], commission: { rate: 2, earned: 0 }
  },
  {
    id: 6, name: 'Amit Trivedi', phone: '+91 90990 12987', source: 'MagicBricks', projectId: 4, config: 'Office', value: 7800000, stage: 'negotiation', daysSince: 3, reminderHoursAgo: 72, rep: 'Rohan Mehta', score: 88,
    tags: ['hot-lead', 'ready-to-move'],
    notes: [{ id: 1, text: 'Negotiating 5% discount on office space', author: 'Rohan Mehta', time: '1 day ago' }],
    timeline: [
      { type: 'call', text: 'Initial inquiry from MagicBricks', time: '10 days ago', icon: 'phone' },
      { type: 'site-visit', text: 'Visited Emerald Business Park', time: '7 days ago', icon: 'mappin' },
      { type: 'email', text: 'Sent commercial lease terms', time: '5 days ago', icon: 'mail' },
      { type: 'call', text: 'Negotiation call — requested discount', time: '3 days ago', icon: 'phone' }
    ],
    dealProb: 75, expectedClose: 'Sep 2026', lossReason: null,
    preferences: { bedrooms: 'Office', locations: ['Prahladnagar'], amenities: ['Parking', 'Security', 'Power backup'], budgetRange: [7000000, 9000000] },
    documents: [{ name: 'Company PAN', type: 'ID', date: 'Sep 5' }, { name: 'GST certificate', type: 'Financial', date: 'Sep 6' }],
    commission: { rate: 2, earned: 0 }
  },
  {
    id: 7, name: 'Neha Chauhan', phone: '+91 88660 45123', source: 'Housing.com', projectId: 2, config: '1 BHK', value: 3400000, stage: 'negotiation', daysSince: 6, reminderHoursAgo: 150, rep: 'Ananya Iyer', score: 52,
    tags: ['financing'], notes: [],
    timeline: [
      { type: 'call', text: 'Inbound from Housing.com', time: '14 days ago', icon: 'phone' },
      { type: 'site-visit', text: 'Site visit done', time: '10 days ago', icon: 'mappin' },
      { type: 'whatsapp', text: 'Sent revised quote', time: '7 days ago', icon: 'messagecircle' }
    ],
    dealProb: 40, expectedClose: 'Dec 2026', lossReason: null,
    preferences: { bedrooms: '1 BHK', locations: ['South Bopal'], amenities: ['Parking'], budgetRange: [3000000, 4000000] },
    documents: [{ name: 'Pancard copy', type: 'ID', date: 'Sep 3' }], commission: { rate: 2, earned: 0 }
  },
  {
    id: 8, name: 'Sanjay Rathod', phone: '+91 99789 66210', source: 'Referral', projectId: 3, config: '4 BHK', value: 18000000, stage: 'won', daysSince: 0, reminderHoursAgo: 200, rep: 'Karan Thakkar', score: 95,
    tags: ['high-budget', 'repeat-buyer'],
    notes: [{ id: 1, text: 'Booked Palm Meadows 4 BHK villa!', author: 'Karan Thakkar', time: '2 hours ago' }],
    timeline: [
      { type: 'call', text: 'Referral from existing client', time: '20 days ago', icon: 'phone' },
      { type: 'site-visit', text: 'VIP site tour', time: '15 days ago', icon: 'mappin' },
      { type: 'meeting', text: 'Booking meeting completed', time: '2 hours ago', icon: 'users' }
    ],
    dealProb: 100, expectedClose: 'Sep 2026', lossReason: null,
    preferences: { bedrooms: '4 BHK', locations: ['Shela'], amenities: ['Garden', 'Pool', 'Security', 'Smart home'], budgetRange: [15000000, 20000000] },
    documents: [{ name: 'Pancard copy', type: 'ID', date: 'Aug 28' }, { name: 'Income proof', type: 'Financial', date: 'Aug 29' }, { name: 'Booking form', type: 'Legal', date: 'Sep 15' }],
    commission: { rate: 1.5, earned: 270000 }
  },
  {
    id: 9, name: 'Bhavna Pandya', phone: '+91 97230 55871', source: 'Walk-in', projectId: 5, config: '3 BHK', value: 10500000, stage: 'lost', daysSince: 14, reminderHoursAgo: 340, rep: 'Devika Shah', score: 24,
    tags: [], notes: [],
    timeline: [{ type: 'call', text: 'Walk-in at sales office', time: '20 days ago', icon: 'mappin' }, { type: 'whatsapp', text: 'Sent comparison sheet', time: '18 days ago', icon: 'messagecircle' }],
    dealProb: 0, expectedClose: null, lossReason: 'Chose competitor',
    preferences: { bedrooms: '3 BHK', locations: ['Thaltej', 'SG Highway'], amenities: ['Pool', 'Garden'], budgetRange: [9000000, 12000000] },
    documents: [], commission: { rate: 2, earned: 0 }
  },
  {
    id: 10, name: 'Dhruv Mehta', phone: '+91 98240 90876', source: 'Call-in', projectId: 1, config: '3 BHK', value: 9000000, stage: 'contacted', daysSince: 1, reminderHoursAgo: 20, rep: 'Rohan Mehta', score: 66,
    tags: ['high-budget'], notes: [],
    timeline: [{ type: 'call', text: 'Cold call inquiry', time: '2 days ago', icon: 'phone' }, { type: 'whatsapp', text: 'Sent brochure and pricing', time: '1 day ago', icon: 'messagecircle' }],
    dealProb: 50, expectedClose: 'Nov 2026', lossReason: null,
    preferences: { bedrooms: '3 BHK', locations: ['Bopal'], amenities: ['Gym', 'Pool'], budgetRange: [8000000, 10000000] },
    documents: [], commission: { rate: 2, earned: 0 }
  },
  {
    id: 11, name: 'Ritu Agarwal', phone: '+91 96010 23456', source: 'Facebook Ads', projectId: 4, config: 'Shop', value: 5200000, stage: 'new', createdMinutesAgo: 22, reminderHoursAgo: 0.37, rep: null, score: 47,
    tags: ['investor'], notes: [],
    timeline: [{ type: 'whatsapp', text: 'Facebook ad click-through inquiry', time: '22 min ago', icon: 'messagecircle' }],
    dealProb: 35, expectedClose: 'Dec 2026', lossReason: null,
    preferences: { bedrooms: 'Shop', locations: ['Prahladnagar'], amenities: ['Parking'], budgetRange: [4000000, 6000000] },
    documents: [], commission: { rate: 2, earned: 0 }
  },
  {
    id: 12, name: 'Manish Bhatt', phone: '+91 90540 78901', source: 'Google Ads', projectId: 2, config: '2 BHK', value: 5000000, stage: 'new', createdMinutesAgo: 2, reminderHoursAgo: 0.03, rep: null, score: 71,
    tags: ['hot-lead'], notes: [],
    timeline: [{ type: 'whatsapp', text: 'Google Ads inquiry — ready to buy', time: '2 min ago', icon: 'messagecircle' }],
    dealProb: 60, expectedClose: 'Oct 2026', lossReason: null,
    preferences: { bedrooms: '2 BHK', locations: ['South Bopal', 'Bopal'], amenities: ['Gym', 'Parking'], budgetRange: [4000000, 6000000] },
    documents: [], commission: { rate: 2, earned: 0 }
  },
  {
    id: 13, name: 'Foram Vyas', phone: '+91 98980 11223', source: '99acres', projectId: 5, config: '2 BHK', value: 7800000, stage: 'qualified', daysSince: 0, reminderHoursAgo: 8, rep: 'Simran Kaur', score: 77, siteVisit: 'Today, 4:00 PM',
    tags: ['site-visit-scheduled', 'hot-lead'],
    notes: [{ id: 1, text: 'Very excited about Vista Greens, wants to see the sample flat', author: 'Simran Kaur', time: '3 hours ago' }],
    timeline: [{ type: 'call', text: 'Inquiry from 99acres listing', time: '3 days ago', icon: 'phone' }, { type: 'site-visit', text: 'Site visit confirmed for today 4PM', time: '3 hours ago', icon: 'mappin' }],
    dealProb: 70, expectedClose: 'Oct 2026', lossReason: null,
    preferences: { bedrooms: '2 BHK', locations: ['Thaltej'], amenities: ['Gym', 'Pool', 'Garden'], budgetRange: [7000000, 9000000] },
    documents: [{ name: 'Aadhaar copy', type: 'ID', date: 'Sep 13' }], commission: { rate: 2, earned: 0 }
  },
  {
    id: 14, name: 'Ketan Oza', phone: '+91 99099 55432', source: 'Website', projectId: 1, config: '3 BHK', value: 8800000, stage: 'contacted', daysSince: 2, reminderHoursAgo: 30, rep: 'Devika Shah', score: 60,
    tags: [], notes: [],
    timeline: [{ type: 'whatsapp', text: 'Website form submission', time: '4 days ago', icon: 'messagecircle' }, { type: 'email', text: 'Sent project details email', time: '3 days ago', icon: 'mail' }],
    dealProb: 45, expectedClose: 'Nov 2026', lossReason: null,
    preferences: { bedrooms: '3 BHK', locations: ['Bopal', 'Thaltej'], amenities: ['Gym'], budgetRange: [7500000, 9500000] },
    documents: [], commission: { rate: 2, earned: 0 }
  },
  {
    id: 15, name: 'Alpa Nair', phone: '+91 97370 20099', source: 'Instagram', projectId: 3, config: '4 BHK', value: 15000000, stage: 'new', createdMinutesAgo: 45, reminderHoursAgo: 0.75, rep: null, score: 83,
    tags: ['high-budget', 'nri'], notes: [],
    timeline: [{ type: 'whatsapp', text: 'Instagram DM inquiry for Palm Meadows', time: '45 min ago', icon: 'messagecircle' }],
    dealProb: 55, expectedClose: 'Nov 2026', lossReason: null,
    preferences: { bedrooms: '4 BHK', locations: ['Shela'], amenities: ['Garden', 'Pool', 'Smart home'], budgetRange: [13000000, 18000000] },
    documents: [], commission: { rate: 1.5, earned: 0 }
  },
  {
    id: 16, name: 'Ritu Agarwal (Duplicate)', phone: '+91 96010 23456', source: 'Google Ads', projectId: 4, config: 'Shop', value: 5200000, stage: 'new', createdMinutesAgo: 12, reminderHoursAgo: 0.2, rep: null, score: 47, duplicateOf: 11,
    tags: ['investor'], notes: [],
    timeline: [{ type: 'whatsapp', text: 'Google Ads click-through', time: '12 min ago', icon: 'messagecircle' }],
    dealProb: 35, expectedClose: 'Dec 2026', lossReason: null,
    preferences: { bedrooms: 'Shop', locations: ['Prahladnagar'], amenities: ['Parking'], budgetRange: [4000000, 6000000] },
    documents: [], commission: { rate: 2, earned: 0 }
  }
];

export const RAW_CALLS = [
  { id: 1, contactId: 1, type: 'outgoing', duration: '3:42', time: 'Today, 10:30 AM', rep: 'Rohan Mehta', notes: 'Discussed 3 BHK pricing for Skyline Residences', talkTime: 222 },
  { id: 2, contactId: 2, type: 'incoming', duration: '5:18', time: 'Today, 11:15 AM', rep: 'Ananya Iyer', notes: 'Rajesh confirmed budget for 2 BHK at Horizon Heights', talkTime: 318 },
  { id: 3, contactId: 3, type: 'outgoing', duration: '2:05', time: 'Today, 9:45 AM', rep: 'Ananya Iyer', notes: 'Scheduled site visit for Vista Greens Friday', talkTime: 125 },
  { id: 4, contactId: 4, type: 'outgoing', duration: '8:33', time: 'Yesterday, 4:20 PM', rep: 'Karan Thakkar', notes: 'NRI investor call — detailed requirements for Palm Meadows', talkTime: 513 },
  { id: 5, contactId: 5, type: 'missed', duration: '0:00', time: 'Yesterday, 2:10 PM', rep: 'Simran Kaur', notes: 'No answer — left voicemail', talkTime: 0 },
  { id: 6, contactId: 6, type: 'outgoing', duration: '4:15', time: 'Today, 10:00 AM', rep: 'Rohan Mehta', notes: 'Negotiation discussion — 5% discount request', talkTime: 255 },
  { id: 7, contactId: 7, type: 'outgoing', duration: '1:48', time: '2 days ago, 11:30 AM', rep: 'Ananya Iyer', notes: 'Re-engage call — Neha still interested but budget tight', talkTime: 108 },
  { id: 8, contactId: 8, type: 'incoming', duration: '6:22', time: 'Today, 8:30 AM', rep: 'Karan Thakkar', notes: 'Sanjay called to confirm booking — very excited!', talkTime: 382 },
  { id: 9, contactId: 10, type: 'outgoing', duration: '3:10', time: 'Today, 11:00 AM', rep: 'Rohan Mehta', notes: 'Discussed 3 BHK options, scheduled site visit', talkTime: 190 },
  { id: 10, contactId: 11, type: 'missed', duration: '0:00', time: 'Today, 9:00 AM', rep: null, notes: 'Missed call from new Facebook lead', talkTime: 0 },
  { id: 11, contactId: 12, type: 'outgoing', duration: '2:30', time: 'Today, 10:15 AM', rep: null, notes: 'Welcome call — Manish very interested in Horizon Heights', talkTime: 150 },
  { id: 12, contactId: 13, type: 'outgoing', duration: '4:45', time: 'Yesterday, 3:30 PM', rep: 'Simran Kaur', notes: 'Confirmed today site visit for Vista Greens', talkTime: 285 },
  { id: 13, contactId: 14, type: 'outgoing', duration: '1:55', time: '2 days ago, 2:00 PM', rep: 'Devika Shah', notes: 'Sent brochure follow-up call for Skyline 3 BHK', talkTime: 115 },
  { id: 14, contactId: 15, type: 'missed', duration: '0:00', time: 'Today, 7:45 AM', rep: null, notes: 'Missed call — NRI from Instagram, needs callback', talkTime: 0 },
  { id: 15, contactId: 1, type: 'incoming', duration: '2:20', time: 'Yesterday, 5:00 PM', rep: 'Rohan Mehta', notes: 'Meera called back — wants to visit Saturday', talkTime: 140 },
  { id: 16, contactId: 3, type: 'outgoing', duration: '1:30', time: '2 days ago, 10:00 AM', rep: 'Ananya Iyer', notes: 'Initial WhatsApp follow-up call for Kavita', talkTime: 90 },
  { id: 17, contactId: 6, type: 'incoming', duration: '7:15', time: '3 days ago, 3:00 PM', rep: 'Rohan Mehta', notes: 'Amit Trivedi called — wants lease terms clarified', talkTime: 435 },
  { id: 18, contactId: 4, type: 'outgoing', duration: '3:50', time: '4 days ago, 11:00 AM', rep: 'Karan Thakkar', notes: 'Sent ROI analysis — Vikram impressed', talkTime: 230 },
  { id: 19, contactId: 8, type: 'outgoing', duration: '5:00', time: '5 days ago, 2:00 PM', rep: 'Karan Thakkar', notes: 'Final negotiation call before booking', talkTime: 300 },
  { id: 20, contactId: 9, type: 'outgoing', duration: '2:10', time: '6 days ago, 4:00 PM', rep: 'Devika Shah', notes: 'Last attempt to re-engage Bhavna — went to competitor', talkTime: 130 },
  { id: 21, contactId: 2, type: 'outgoing', duration: '1:45', time: 'Yesterday, 10:30 AM', rep: 'Ananya Iyer', notes: 'Quick check-in call for Rajesh site visit', talkTime: 105 },
  { id: 22, contactId: 5, type: 'outgoing', duration: '3:20', time: '3 days ago, 1:00 PM', rep: 'Simran Kaur', notes: 'Qualification call — Priyanka confirmed budget', talkTime: 200 },
  { id: 23, contactId: 10, type: 'incoming', duration: '2:50', time: '2 days ago, 9:30 AM', rep: 'Rohan Mehta', notes: 'Dhruv called asking about amenities', talkTime: 170 },
  { id: 24, contactId: 11, type: 'outgoing', duration: '2:15', time: 'Today, 12:00 PM', rep: 'Rohan Mehta', notes: 'Called Ritu Agarwal back — interested in shop at Emerald', talkTime: 135 },
  { id: 25, contactId: 15, type: 'outgoing', duration: '4:30', time: 'Today, 1:00 PM', rep: 'Karan Thakkar', notes: 'Detailed call with Alpa Nair about Palm Meadows investment', talkTime: 270 }
];

export const RAW_BROCHURES = [
  { id: 1, contactId: 1, brochureName: 'Skyline Residences - 3 BHK Floor Plan', viewedAt: 'Today, 11:30 AM', duration: '1m 45s', pages: 4 },
  { id: 2, contactId: 1, brochureName: 'Skyline Residences - Pricing Sheet', viewedAt: 'Today, 11:32 AM', duration: '2m 10s', pages: 2 },
  { id: 3, contactId: 3, brochureName: 'Vista Greens - Master Plan', viewedAt: 'Yesterday, 3:00 PM', duration: '3m 20s', pages: 6 },
  { id: 4, contactId: 4, brochureName: 'Palm Meadows Villas - Premium Brochure', viewedAt: '2 days ago, 10:00 AM', duration: '5m 00s', pages: 12 },
  { id: 5, contactId: 6, brochureName: 'Emerald Business Park - Commercial Details', viewedAt: '5 days ago, 2:30 PM', duration: '2m 30s', pages: 8 },
  { id: 6, contactId: 2, brochureName: 'Horizon Heights - 2 BHK Floor Plan', viewedAt: 'Yesterday, 11:00 AM', duration: '1m 20s', pages: 3 },
  { id: 7, contactId: 5, brochureName: 'Skyline Residences - 2 BHK Floor Plan', viewedAt: '3 days ago, 4:00 PM', duration: '0m 45s', pages: 3 },
  { id: 8, contactId: 7, brochureName: 'Horizon Heights - 1 BHK Options', viewedAt: '7 days ago, 1:00 PM', duration: '1m 15s', pages: 2 },
  { id: 9, contactId: 8, brochureName: 'Palm Meadows Villas - Villa Walkthrough', viewedAt: '10 days ago, 9:00 AM', duration: '6m 30s', pages: 15 },
  { id: 10, contactId: 10, brochureName: 'Skyline Residences - 3 BHK Floor Plan', viewedAt: 'Yesterday, 4:00 PM', duration: '1m 50s', pages: 4 },
  { id: 11, contactId: 13, brochureName: 'Vista Greens - Sample Flat Photos', viewedAt: 'Today, 10:00 AM', duration: '2m 40s', pages: 8 },
  { id: 12, contactId: 14, brochureName: 'Skyline Residences - Amenities Guide', viewedAt: '3 days ago, 5:00 PM', duration: '0m 55s', pages: 4 },
  { id: 13, contactId: 3, brochureName: 'Vista Greens - 3 BHK Floor Plan', viewedAt: 'Today, 8:00 AM', duration: '2m 15s', pages: 4 },
  { id: 14, contactId: 15, brochureName: 'Palm Meadows Villas - Investment Guide', viewedAt: 'Today, 9:30 AM', duration: '3m 45s', pages: 10 },
  { id: 15, contactId: 6, brochureName: 'Emerald Business Park - Lease Terms', viewedAt: '3 days ago, 11:00 AM', duration: '4m 20s', pages: 6 },
  { id: 16, contactId: 12, brochureName: 'Horizon Heights - 2 BHK Floor Plan', viewedAt: 'Today, 10:30 AM', duration: '1m 10s', pages: 3 },
  { id: 17, contactId: 5, brochureName: 'Skyline Residences - Amenities Guide', viewedAt: 'Yesterday, 2:00 PM', duration: '1m 30s', pages: 5 },
  { id: 18, contactId: 10, brochureName: 'Skyline Residences - Virtual Tour Link', viewedAt: 'Today, 11:00 AM', duration: '3m 10s', pages: 1 }
];

export const RAW_PARTNERS = [
  { id: 1, name: 'Vimal Shah', company: 'Shah Realty Consultants', phone: '+91 98250 10001', email: 'vimal@shahrealty.in', type: 'broker', leadsReferred: 28, dealsClosed: 7, totalRevenue: 52000000, commissionRate: 1.5, commissionEarned: 780000, status: 'active', joinDate: 'Jan 2025', lastActive: 'Today', rating: 5 },
  { id: 2, name: 'Pooja Mehta', company: 'Mehta Properties', phone: '+91 99250 20002', email: 'pooja@mehtaprops.com', type: 'broker', leadsReferred: 19, dealsClosed: 4, totalRevenue: 34000000, commissionRate: 1.5, commissionEarned: 510000, status: 'active', joinDate: 'Mar 2025', lastActive: 'Yesterday', rating: 4 },
  { id: 3, name: 'Arjun Desai', company: 'Digital Realty Ads', phone: '+91 97250 30003', email: 'arjun@digitalrealtyads.in', type: 'digital', leadsReferred: 45, dealsClosed: 3, totalRevenue: 22000000, commissionRate: 2.0, commissionEarned: 440000, status: 'active', joinDate: 'Feb 2025', lastActive: 'Today', rating: 4 },
  { id: 4, name: 'Nisha Patel', company: 'Patel & Associates', phone: '+91 98980 40004', email: 'nisha@patelassoc.com', type: 'broker', leadsReferred: 15, dealsClosed: 5, totalRevenue: 41000000, commissionRate: 1.5, commissionEarned: 615000, status: 'active', joinDate: 'Dec 2024', lastActive: '2 days ago', rating: 5 },
  { id: 5, name: 'Rajiv Kumar', company: 'Kumar Homes', phone: '+91 90990 50005', email: 'rajiv@kumarhomes.in', type: 'referral', leadsReferred: 8, dealsClosed: 2, totalRevenue: 16000000, commissionRate: 1.0, commissionEarned: 160000, status: 'active', joinDate: 'Jun 2025', lastActive: '3 days ago', rating: 3 },
  { id: 6, name: 'Sneha Joshi', company: 'Smart Leads Digital', phone: '+91 96380 60006', email: 'sneha@smartleads.io', type: 'digital', leadsReferred: 52, dealsClosed: 2, totalRevenue: 14000000, commissionRate: 2.5, commissionEarned: 350000, status: 'active', joinDate: 'Apr 2025', lastActive: 'Today', rating: 4 },
  { id: 7, name: 'Manoj Trivedi', company: 'Trivedi Realty', phone: '+91 97370 70007', email: 'manoj@trivedirealty.com', type: 'broker', leadsReferred: 11, dealsClosed: 3, totalRevenue: 27000000, commissionRate: 1.5, commissionEarned: 405000, status: 'inactive', joinDate: 'Jan 2025', lastActive: '2 weeks ago', rating: 3 },
  { id: 8, name: 'Deepa Nair', company: 'Nair Referral Network', phone: '+91 98240 80008', email: 'deepa@nairnetwork.in', type: 'referral', leadsReferred: 6, dealsClosed: 1, totalRevenue: 9500000, commissionRate: 1.0, commissionEarned: 95000, status: 'active', joinDate: 'Jul 2025', lastActive: '5 days ago', rating: 3 },
  { id: 9, name: 'Amit Saxena', company: 'Saxena Properties', phone: '+91 99099 90009', email: 'amit@saxenaprops.com', type: 'broker', leadsReferred: 22, dealsClosed: 6, totalRevenue: 48000000, commissionRate: 1.5, commissionEarned: 720000, status: 'active', joinDate: 'Nov 2024', lastActive: 'Today', rating: 5 },
  { id: 10, name: 'Kavita Rao', company: 'LeadGen Pro', phone: '+91 88660 10010', email: 'kavita@leadgenpro.in', type: 'digital', leadsReferred: 38, dealsClosed: 1, totalRevenue: 8000000, commissionRate: 2.0, commissionEarned: 160000, status: 'inactive', joinDate: 'May 2025', lastActive: '3 weeks ago', rating: 2 }
];

export const RAW_BROADCASTS = [
  { id: 1, name: 'New Year Offer Blast', segment: 'All New Leads', message: 'Hi {{name}}! 🎉 New Year special at {{project}} — {{config}} starting at {{price}}. Book before Jan 31 for exclusive benefits!', status: 'sent', sentCount: 145, deliveredCount: 142, readCount: 98, repliedCount: 12, scheduledAt: null, sentAt: 'Jan 5, 10:00 AM' },
  { id: 2, name: 'Site Visit Invitation', segment: 'Qualified Leads', message: 'Hi {{name}}! We\'d love to have you visit {{project}} this weekend. See your dream {{config}} in person! Reply YES to confirm.', status: 'sent', sentCount: 67, deliveredCount: 65, readCount: 52, repliedCount: 18, scheduledAt: null, sentAt: 'Sep 10, 9:00 AM' },
  { id: 3, name: 'Price Drop Alert - Horizon', segment: 'All Leads', message: 'Great news {{name}}! Prices at {{project}} just dropped. {{config}} now available from {{price}}. Limited units — call now!', status: 'sent', sentCount: 89, deliveredCount: 87, readCount: 71, repliedCount: 8, scheduledAt: null, sentAt: 'Sep 8, 11:00 AM' },
  { id: 4, name: 'Weekend Open House', segment: 'Site Visit Ready', message: 'Hi {{name}}! Join us for an exclusive open house at {{project}} this Saturday, 10 AM - 6 PM. Refreshments on us! 🏠', status: 'scheduled', sentCount: 0, deliveredCount: 0, readCount: 0, repliedCount: 0, scheduledAt: 'Sep 20, 9:00 AM', sentAt: null },
  { id: 5, name: 'Inventory Clearance', segment: 'High Budget', message: '{{name}}, we have only {{config}} units left at {{project}}. Premium pricing locked for early birds. Want me to reserve one?', status: 'sent', sentCount: 34, deliveredCount: 33, readCount: 28, repliedCount: 6, scheduledAt: null, sentAt: 'Sep 12, 2:00 PM' },
  { id: 6, name: 'Festive Season Wishes', segment: 'All Leads', message: 'Happy Navratri {{name}}! 🪔 Wishing you prosperity. Special festive offers at {{project}} — {{config}} with exciting benefits!', status: 'draft', sentCount: 0, deliveredCount: 0, readCount: 0, repliedCount: 0, scheduledAt: null, sentAt: null },
  { id: 7, name: 'Ready Stock Alert', segment: 'New Today', message: '{{name}}, we just released new {{config}} units at {{project}}. First-come pricing available. Want details?', status: 'draft', sentCount: 0, deliveredCount: 0, readCount: 0, repliedCount: 0, scheduledAt: null, sentAt: null }
];

export const RAW_SITE_VISITS = [
  { id: 1, contactId: 3, projectId: 5, scheduledDate: 'Sep 19, 11:00 AM', status: 'scheduled', outcome: null, feedback: '', attendedBy: 'Ananya Iyer', duration: '45 min', nextAction: 'Show sample flat, highlight amenities' },
  { id: 2, contactId: 4, projectId: 3, scheduledDate: 'Sep 17, 10:00 AM', status: 'scheduled', outcome: null, feedback: '', attendedBy: 'Karan Thakkar', duration: '60 min', nextAction: 'VIP villa tour with floor plans' },
  { id: 3, contactId: 13, projectId: 5, scheduledDate: 'Sep 16, 4:00 PM', status: 'scheduled', outcome: null, feedback: '', attendedBy: 'Simran Kaur', duration: '45 min', nextAction: 'Show Vista Greens sample flat' },
  { id: 4, contactId: 6, projectId: 4, scheduledDate: 'Sep 9, 11:00 AM', status: 'completed', outcome: 'Interested', feedback: 'Very impressed with office space layout. Wants to negotiate on pricing for corner unit.', attendedBy: 'Rohan Mehta', duration: '55 min', nextAction: 'Send revised commercial lease quote' },
  { id: 5, contactId: 7, projectId: 2, scheduledDate: 'Sep 6, 2:00 PM', status: 'completed', outcome: 'Needs Follow-up', feedback: 'Liked the 1 BHK but concerned about distance from workplace. Considering options.', attendedBy: 'Ananya Iyer', duration: '35 min', nextAction: 'Send location comparison document' },
  { id: 6, contactId: 8, projectId: 3, scheduledDate: 'Sep 1, 10:00 AM', status: 'completed', outcome: 'Booked', feedback: 'Loved the villa! Booked on the spot. VIP treatment appreciated.', attendedBy: 'Karan Thakkar', duration: '90 min', nextAction: 'Process booking documents' },
  { id: 7, contactId: 3, projectId: 5, scheduledDate: 'Sep 14, 3:00 PM', status: 'completed', outcome: 'Interested', feedback: 'Very excited about Vista Greens. Wants to see sample flat on next visit.', attendedBy: 'Ananya Iyer', duration: '40 min', nextAction: 'Schedule follow-up site visit' },
  { id: 8, contactId: 9, projectId: 5, scheduledDate: 'Sep 2, 11:00 AM', status: 'completed', outcome: 'Not Interested', feedback: 'Found a better deal with a competitor nearby. Price was the main factor.', attendedBy: 'Devika Shah', duration: '30 min', nextAction: 'No further action' },
  { id: 9, contactId: 5, projectId: 1, scheduledDate: 'Sep 20, 10:00 AM', status: 'scheduled', outcome: null, feedback: '', attendedBy: 'Simran Kaur', duration: '45 min', nextAction: 'Show Skyline 2 BHK options' },
  { id: 10, contactId: 2, projectId: 2, scheduledDate: 'Sep 18, 9:00 AM', status: 'scheduled', outcome: null, feedback: '', attendedBy: 'Ananya Iyer', duration: '40 min', nextAction: 'Horizon Heights 2 BHK walkthrough' },
  { id: 11, contactId: 10, projectId: 1, scheduledDate: 'Sep 17, 3:00 PM', status: 'scheduled', outcome: null, feedback: '', attendedBy: 'Rohan Mehta', duration: '45 min', nextAction: 'Skyline Residences 3 BHK tour' },
  { id: 12, contactId: 4, projectId: 3, scheduledDate: 'Aug 28, 10:00 AM', status: 'completed', outcome: 'Interested', feedback: 'First visit — very impressed with Palm Meadows. Wants another visit with family.', attendedBy: 'Karan Thakkar', duration: '75 min', nextAction: 'Schedule family visit' },
  { id: 13, contactId: 15, projectId: 3, scheduledDate: 'Sep 22, 11:00 AM', status: 'scheduled', outcome: null, feedback: '', attendedBy: 'Karan Thakkar', duration: '60 min', nextAction: 'NRI client — virtual tour + detailed investment analysis' },
  { id: 14, contactId: 1, projectId: 1, scheduledDate: 'Sep 21, 4:00 PM', status: 'scheduled', outcome: null, feedback: '', attendedBy: 'Rohan Mehta', duration: '45 min', nextAction: 'Show 3 BHK sample flat at Skyline' },
  { id: 15, contactId: 14, projectId: 1, scheduledDate: 'Sep 23, 3:00 PM', status: 'scheduled', outcome: null, feedback: '', attendedBy: 'Devika Shah', duration: '45 min', nextAction: 'Show Skyline 3 BHK options to Ketan' },
  { id: 16, contactId: 12, projectId: 2, scheduledDate: 'Sep 19, 10:00 AM', status: 'scheduled', outcome: null, feedback: '', attendedBy: 'Ananya Iyer', duration: '40 min', nextAction: 'Welcome walk-through for Manish at Horizon Heights' }
];

export const RAW_TASKS = [
  { id: 1, contactId: 3, title: 'Follow up with Kavita Shah on site visit', type: 'follow-up', priority: 'high', due: 'Today, 2:00 PM', status: 'pending', assignee: 'Ananya Iyer', description: 'Confirm Friday site visit, send directions' },
  { id: 2, contactId: 4, title: 'Site visit prep for Vikram Solanki', type: 'site-visit', priority: 'high', due: 'Tomorrow, 10:00 AM', status: 'pending', assignee: 'Karan Thakkar', description: 'Prepare villa walkthrough, print floor plans' },
  { id: 3, contactId: 13, title: 'Site visit with Foram Vyas', type: 'site-visit', priority: 'high', due: 'Today, 4:00 PM', status: 'pending', assignee: 'Simran Kaur', description: 'Show Vista Greens sample flat, highlight amenities' },
  { id: 4, contactId: 6, title: 'Send updated commercial lease quote', type: 'document', priority: 'medium', due: 'Today, 5:00 PM', status: 'pending', assignee: 'Rohan Mehta', description: 'Revise 5% discount into formal quote for Amit Trivedi' },
  { id: 5, contactId: 7, title: 'Re-engage Neha Chauhan negotiation', type: 'follow-up', priority: 'medium', due: 'Tomorrow, 11:00 AM', status: 'pending', assignee: 'Ananya Iyer', description: 'Negotiation stalled 6 days, offer flexible payment plan' },
  { id: 6, contactId: null, title: 'Prepare monthly sales report', type: 'other', priority: 'medium', due: 'Sep 18', status: 'pending', assignee: 'Rohan Mehta', description: 'Compile September pipeline metrics and forecasts' },
  { id: 7, contactId: 8, title: 'Process Sanjay Rathod commission', type: 'commission', priority: 'low', due: 'Sep 18', status: 'pending', assignee: 'Karan Thakkar', description: 'Calculate and submit commission for Palm Meadows booking' },
  { id: 8, contactId: 1, title: 'Send Meera Joshi the brochure', type: 'document', priority: 'high', due: 'Today, 1:00 PM', status: 'completed', assignee: 'Rohan Mehta', description: 'Email Skyline Residences brochure with pricing sheet' },
  { id: 9, contactId: 12, title: 'Welcome call with Manish Bhatt', type: 'follow-up', priority: 'high', due: 'Today, 10:00 AM', status: 'completed', assignee: null, description: 'New lead from Google Ads, high intent score' },
  { id: 10, contactId: null, title: 'Team standup meeting', type: 'meeting', priority: 'low', due: 'Today, 9:30 AM', status: 'completed', assignee: 'Rohan Mehta', description: 'Weekly pipeline review with all executives' },
  { id: 11, contactId: 10, title: 'Call Dhruv Mehta for requirements', type: 'follow-up', priority: 'medium', due: 'Today, 3:00 PM', status: 'in-progress', assignee: 'Rohan Mehta', description: 'Discuss 3 BHK requirements and schedule site visit' },
  { id: 12, contactId: 14, title: 'Follow up with Ketan Oza', type: 'follow-up', priority: 'low', due: 'Sep 19', status: 'pending', assignee: 'Devika Shah', description: 'Check if brochure was received, gauge interest level' },
  { id: 13, contactId: 5, title: 'Schedule Priyanka Desai site visit', type: 'site-visit', priority: 'medium', due: 'Sep 17', status: 'pending', assignee: 'Simran Kaur', description: 'Coordinate Skyline Residences visit timing' },
  { id: 14, contactId: null, title: 'Update project inventory sheets', type: 'other', priority: 'low', due: 'Sep 20', status: 'pending', assignee: 'Rohan Mehta', description: 'Refresh available unit counts for all 5 projects' },
  { id: 15, contactId: 15, title: 'Initial call with Alpa Nair', type: 'follow-up', priority: 'high', due: 'Today, 11:30 AM', status: 'pending', assignee: null, description: 'NRI lead from Instagram, high budget, needs callback' },
  { id: 16, contactId: null, title: 'Review WhatsApp automation rules', type: 'other', priority: 'medium', due: 'Sep 17', status: 'pending', assignee: 'Rohan Mehta', description: 'Check reminder cadence effectiveness, adjust timing' },
  { id: 17, contactId: 2, title: 'Confirm Rajesh Patel site visit', type: 'site-visit', priority: 'medium', due: 'Tomorrow, 9:00 AM', status: 'pending', assignee: 'Ananya Iyer', description: 'Horizon Heights visit, prepare 2 BHK comparison' }
];

export const SEQUENCES = [
  { id: 1, name: 'Cold Lead Re-engagement', trigger: 'No reply after 48h', steps: 3, activeLeads: 8, status: 'active', messages: ['Hi {{name}}, checking if you had any questions regarding {{project}}?', 'Hey {{name}}, we have a special payment plan for {{config}} available this week.', 'Final follow up {{name}} — shall I keep your file active for {{project}}?'] },
  { id: 2, name: 'Post Site Visit Nurture', trigger: 'Site visit completed', steps: 4, activeLeads: 5, status: 'active', messages: ['Thank you for visiting {{project}} today! Here is the pricing breakdown.', 'Did you get a chance to discuss with family? Let me know if you want another look.', 'Unit availability update for {{config}} at {{project}}.'] },
  { id: 3, name: 'Brochure Viewed Follow-up', trigger: 'Brochure opened > 2 mins', steps: 2, activeLeads: 12, status: 'active', messages: ['Noticed you reviewed the floor plans for {{project}}! Would you like to see a video walkthrough?', 'Would this Saturday work for a quick 20-min visit?'] }
];

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

export const RAW_NURTURE_SEQUENCES = [
  {
    id: 1,
    name: 'New Lead Welcome',
    description: 'Welcome sequence for new leads — 5 steps over 7 days',
    trigger: 'Lead created',
    status: 'active',
    activeLeads: 0,
    steps: [
      { stepNumber: 1, delayHours: 0, messageType: 'whatsapp', channel: 'whatsapp', template: 'Hi {{name}}! 👋 Thank you for your interest in {{project}}. I\'m {{rep}} from Ashray Group. How can I help you today?' },
      { stepNumber: 2, delayHours: 2, messageType: 'whatsapp', channel: 'whatsapp', template: 'Hi {{name}}, I\'d love to share more details about {{config}} at {{project}}. Would you like me to send you the brochure and pricing?' },
      { stepNumber: 3, delayHours: 24, messageType: 'whatsapp', channel: 'whatsapp', template: 'Hi {{name}}! Just checking in — have you had a chance to review the {{project}} details? I\'m available for a quick call anytime.' },
      { stepNumber: 4, delayHours: 72, messageType: 'whatsapp', channel: 'whatsapp', template: 'Hi {{name}}, we have some exciting offers on {{config}} at {{project}} this week. Would you like to schedule a site visit?' },
      { stepNumber: 5, delayHours: 168, messageType: 'whatsapp', channel: 'whatsapp', template: 'Hi {{name}}, following up one last time. If you\'re still interested in {{project}}, I\'d be happy to assist. Otherwise, I\'ll keep your details for future opportunities.' },
    ],
  },
  {
    id: 2,
    name: 'Site Visit Follow-up',
    description: 'Follow-up after site visit — 4 steps over 5 days',
    trigger: 'Site visit completed',
    status: 'active',
    activeLeads: 0,
    steps: [
      { stepNumber: 1, delayHours: 0, messageType: 'whatsapp', channel: 'whatsapp', template: 'Hi {{name}}! Thank you for visiting {{project}} today. We hope you liked what you saw! Do you have any questions?' },
      { stepNumber: 2, delayHours: 24, messageType: 'whatsapp', channel: 'whatsapp', template: 'Hi {{name}}, did you get a chance to discuss {{project}} with your family? I\'d be happy to arrange another visit or share more details.' },
      { stepNumber: 3, delayHours: 72, messageType: 'whatsapp', channel: 'whatsapp', template: 'Hi {{name}}, quick update — we have limited {{config}} units remaining at {{project}}. Would you like to reserve one before they\'re gone?' },
      { stepNumber: 4, delayHours: 120, messageType: 'whatsapp', channel: 'whatsapp', template: 'Hi {{name}}, just a friendly reminder about {{project}}. If you\'re still considering, I can offer a special payment plan. Let me know!' },
    ],
  },
  {
    id: 3,
    name: 'Negotiation Re-engage',
    description: 'Re-engage leads in negotiation — 3 steps over 3 days',
    trigger: 'Stage: negotiation',
    status: 'active',
    activeLeads: 0,
    steps: [
      { stepNumber: 1, delayHours: 0, messageType: 'whatsapp', channel: 'whatsapp', template: 'Hi {{name}}, I wanted to follow up on our recent discussion about {{config}} at {{project}}. Have you had time to think it over?' },
      { stepNumber: 2, delayHours: 24, messageType: 'whatsapp', channel: 'whatsapp', template: 'Hi {{name}}, I\'ve spoken with my team and we can offer a special flexible payment plan for {{project}}. Would you like to discuss the details?' },
      { stepNumber: 3, delayHours: 72, messageType: 'whatsapp', channel: 'whatsapp', template: 'Hi {{name}}, this is my final follow-up regarding {{project}}. We\'d love to have you as part of the Ashray family. Can I call you today to finalize?' },
    ],
  },
  {
    id: 4,
    name: 'Lost Lead Win-back',
    description: 'Win back lost leads — 3 steps over 14 days',
    trigger: 'Stage: lost',
    status: 'active',
    activeLeads: 0,
    steps: [
      { stepNumber: 1, delayHours: 168, messageType: 'whatsapp', channel: 'whatsapp', template: 'Hi {{name}}, it\'s been a while since we last spoke. We have some exciting new developments at {{project}} that might interest you.' },
      { stepNumber: 2, delayHours: 240, messageType: 'whatsapp', channel: 'whatsapp', template: 'Hi {{name}}, we\'re running a special festive offer on {{config}} at {{project}}. Prices have never been better! Want to take another look?' },
      { stepNumber: 3, delayHours: 336, messageType: 'whatsapp', channel: 'whatsapp', template: 'Hi {{name}}, just checking in one more time. If your plans have changed, I\'d love to help you find your dream home at {{project}}. No pressure!' },
    ],
  },
  {
    id: 5,
    name: 'Post Booking Thank You',
    description: 'Thank you sequence after booking — 2 steps',
    trigger: 'Stage: won',
    status: 'active',
    activeLeads: 0,
    steps: [
      { stepNumber: 1, delayHours: 0, messageType: 'whatsapp', channel: 'whatsapp', template: 'Congratulations {{name}}! 🎉 Welcome to the Ashray family! Your {{config}} at {{project}} is confirmed. We\'ll be in touch with next steps.' },
      { stepNumber: 2, delayHours: 72, messageType: 'whatsapp', channel: 'whatsapp', template: 'Hi {{name}}, hope you\'re excited about your new home at {{project}}! If you know anyone looking for a property, we\'d appreciate a referral. Thank you for choosing Ashray Group!' },
    ],
  },
  {
    id: 6,
    name: 'High Budget VIP',
    description: 'VIP sequence for high-budget leads — 4 steps over 5 days',
    trigger: 'Budget > 1 Cr',
    status: 'active',
    activeLeads: 0,
    steps: [
      { stepNumber: 1, delayHours: 0, messageType: 'whatsapp', channel: 'whatsapp', template: 'Hi {{name}}! 👋 Welcome to Ashray Group\'s VIP client experience. I\'m {{rep}}, your dedicated luxury property consultant. How may I assist you today?' },
      { stepNumber: 2, delayHours: 2, messageType: 'whatsapp', channel: 'whatsapp', template: 'Hi {{name}}, I\'ve prepared a curated selection of premium properties for you, including {{project}}. Shall I send you a personalized presentation?' },
      { stepNumber: 3, delayHours: 48, messageType: 'whatsapp', channel: 'whatsapp', template: 'Hi {{name}}, I\'d love to arrange a private VIP tour of {{project}} at your convenience. We can also discuss exclusive pricing and payment flexibility.' },
      { stepNumber: 4, delayHours: 120, messageType: 'whatsapp', channel: 'whatsapp', template: 'Hi {{name}}, just following up on your interest in {{project}}. As a VIP client, you have access to our best units and priority booking. Shall we schedule a call?' },
    ],
  },
];

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

export const RAW_PAYMENT_MILESTONES = [
  { id: '8_booking', leadId: 8, milestoneId: 'booking', name: 'Booking Amount', percentage: 10, amount: 1800000, trigger: 'On booking', order: 1, status: 'paid', dueDate: 'Sep 15, 2026', paidAt: '2026-09-15T10:00:00.000Z' },
  { id: '8_agreement', leadId: 8, milestoneId: 'agreement', name: 'Agreement Execution', percentage: 15, amount: 2700000, trigger: 'Within 30 days of booking', order: 2, status: 'due', dueDate: 'Oct 15, 2026', paidAt: null },
  { id: '8_slab_1', leadId: 8, milestoneId: 'slab_1', name: '1st Slab Completion', percentage: 15, amount: 2700000, trigger: 'On structure milestone', order: 3, status: 'pending', dueDate: 'Nov 15, 2026', paidAt: null },
  { id: '8_slab_2', leadId: 8, milestoneId: 'slab_2', name: '2nd Slab Completion', percentage: 15, amount: 2700000, trigger: 'On structure milestone', order: 4, status: 'pending', dueDate: 'Dec 15, 2026', paidAt: null },
  { id: '8_slab_3', leadId: 8, milestoneId: 'slab_3', name: '3rd Slab Completion', percentage: 10, amount: 1800000, trigger: 'On structure milestone', order: 5, status: 'pending', dueDate: 'Jan 15, 2027', paidAt: null },
  { id: '8_brickwork', leadId: 8, milestoneId: 'brickwork', name: 'Brickwork Complete', percentage: 10, amount: 1800000, trigger: 'On construction milestone', order: 6, status: 'pending', dueDate: 'Feb 15, 2027', paidAt: null },
  { id: '8_plaster', leadId: 8, milestoneId: 'plaster', name: 'Plastering Complete', percentage: 10, amount: 1800000, trigger: 'On construction milestone', order: 7, status: 'pending', dueDate: 'Mar 15, 2027', paidAt: null },
  { id: '8_possession', leadId: 8, milestoneId: 'possession', name: 'Possession', percentage: 15, amount: 2700000, trigger: 'On handover', order: 8, status: 'pending', dueDate: 'Jun 15, 2027', paidAt: null },
];

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
