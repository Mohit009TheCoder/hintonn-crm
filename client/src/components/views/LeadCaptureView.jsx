import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';

// ── Platform Definitions ─────────────────────────────────────────────────────

const PLATFORMS = [
  {
    id: '99acres',
    name: '99acres',
    category: 'Property Portals',
    color: '#7E22CE',
    bg: '#F3E8FF',
    icon: 'building',
    description: 'India\'s largest property portal',
    webhookSupported: true,
    setupSteps: [
      'Log into your 99acres developer account',
      'Go to Settings → Lead Delivery → Webhook',
      'Paste the webhook URL below',
      'Set Method: POST, Format: JSON',
      'Save and test with a dummy lead',
    ],
  },
  {
    id: 'magicbricks',
    name: 'MagicBricks',
    category: 'Property Portals',
    color: '#DC2626',
    bg: '#FEF2F2',
    icon: 'building',
    description: 'Premium real estate classifieds',
    webhookSupported: true,
    setupSteps: [
      'Login to MagicBricks property manager',
      'Navigate to Lead Management → API Integration',
      'Enter webhook URL in the endpoint field',
      'Select "Real-time delivery" mode',
      'Click Verify & Save',
    ],
  },
  {
    id: 'housing',
    name: 'Housing.com',
    category: 'Property Portals',
    color: '#047857',
    bg: '#ECFDF5',
    icon: 'home',
    description: 'AI-powered property search',
    webhookSupported: true,
    setupSteps: [
      'Access Housing.com PropTech Dashboard',
      'Go to Settings → Integrations → Webhooks',
      'Add new webhook endpoint URL',
      'Enable "Lead Created" event trigger',
      'Test the integration',
    ],
  },
  {
    id: 'facebook',
    name: 'Facebook Ads',
    category: 'Social & Ads',
    color: '#1D4ED8',
    bg: '#EFF6FF',
    icon: 'globe',
    description: 'Facebook & Instagram lead ads',
    webhookSupported: true,
    setupSteps: [
      'Open Facebook Business Suite → Ads Manager',
      'Go to Lead Ads → Lead Center → CRM Integration',
      'Click "Connect CRM" → Custom Webhook',
      'Enter webhook URL and verify token',
      'Map fields: full_name→name, phone_number→phone',
    ],
  },
  {
    id: 'instagram',
    name: 'Instagram Ads',
    category: 'Social & Ads',
    color: '#DB2777',
    bg: '#FDF2F8',
    icon: 'globe',
    description: 'Instagram lead generation forms',
    webhookSupported: true,
    setupSteps: [
      'Connect Instagram Business to Facebook page',
      'In Meta Business Suite → Leads Center',
      'Go to Integrations → CRM Webhooks',
      'Use same webhook URL as Facebook Ads',
      'Select Instagram as source in field mapping',
    ],
  },
  {
    id: 'google-ads',
    name: 'Google Ads',
    category: 'Social & Ads',
    color: '#D97706',
    bg: '#FEF3C7',
    icon: 'target',
    description: 'Google Lead Form extensions',
    webhookSupported: true,
    setupSteps: [
      'Open Google Ads → Assets → Lead Forms',
      'Edit your lead form asset',
      'Go to "Lead delivery" → Webhook',
      'Enter the webhook URL',
      'Map: Customer Name→name, Phone Number→phone',
      'Set Google Key for verification',
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    category: 'Messaging',
    color: '#059669',
    bg: '#ECFDF5',
    icon: 'whatsapp',
    description: 'WhatsApp Business API leads',
    webhookSupported: true,
    setupSteps: [
      'Get WhatsApp Business API access via Meta',
      'In Meta Developer Portal → Webhooks → messages',
      'Set callback URL to the webhook endpoint',
      'Subscribe to "messages" and "leads" events',
      'Parse inbound messages as lead inquiries',
    ],
  },
  {
    id: 'website',
    name: 'Website Form',
    category: 'Own Channels',
    color: '#2563EB',
    bg: '#EFF6FF',
    icon: 'globe',
    description: 'Contact/enquiry forms on your site',
    webhookSupported: true,
    setupSteps: [
      'Add form action to your HTML contact form',
      'Set form method="POST" action="{webhook_url}"',
      'Or use JavaScript fetch() to POST form data',
      'Ensure fields: name, phone, email, message',
      'Optional: include utm_source, utm_campaign',
    ],
  },
  {
    id: 'walk-in',
    name: 'Walk-In',
    category: 'Own Channels',
    color: '#475569',
    bg: '#F1F5F9',
    icon: 'user',
    description: 'Visitors at site office / model flat',
    webhookSupported: false,
    setupSteps: [
      'Use the "Add Lead" button on the Leads page',
      'Select "Walk-In" as the source',
      'Or POST directly to the webhook URL from a tablet app at site office',
    ],
  },
  {
    id: 'call-in',
    name: 'Call-In',
    category: 'Own Channels',
    color: '#047857',
    bg: '#D1FAE5',
    icon: 'phone',
    description: 'Inbound calls to your sales number',
    webhookSupported: true,
    setupSteps: [
      'Integrate with IVR/telephony system (e.g., Exotel, MyOperator)',
      'On call answered event, POST to webhook URL',
      'Include caller phone number as "phone" field',
      'Set source="call-in" in the payload',
    ],
  },
  {
    id: 'referral',
    name: 'Referral / CP',
    category: 'Own Channels',
    color: '#1D4ED8',
    bg: '#DBEAFE',
    icon: 'share2',
    description: 'Channel partners & referral network',
    webhookSupported: false,
    setupSteps: [
      'Use the "Add Lead" button on the Leads page',
      'Select "Referral" as the source',
      'Add referring partner name in the notes field',
      'Or build a CP portal that POSTs to the webhook',
    ],
  },
  {
    id: 'justdial',
    name: 'JustDial',
    category: 'Property Portals',
    color: '#EA580C',
    bg: '#FFF7ED',
    icon: 'phone',
    description: 'JustDial listing leads',
    webhookSupported: true,
    setupSteps: [
      'Login to JustDial Business Account',
      'Go to Leads → API Settings',
      'Enter webhook URL for real-time delivery',
      'Set authentication token if required',
      'Test with a JustDial test lead',
    ],
  },
];

const CATEGORIES = ['All', 'Property Portals', 'Social & Ads', 'Messaging', 'Own Channels'];

// ── Main Component ────────────────────────────────────────────────────────────

export default function LeadCaptureView({ onSelectLead }) {
  const { leads, leadSources, slaViolations, fetchLeadSources, fetchSlaViolations, fetchLeads, authFetch } = useCRM();

  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedPlatform, setExpandedPlatform] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [testForm, setTestForm] = useState({ name: '', phone: '', email: '', source: '99acres', message: '' });
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const API_BASE = BASE_URL.includes('3000') || BASE_URL.includes('5173') ? 'http://localhost:5001' : BASE_URL;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchLeadSources?.(),
        fetchSlaViolations?.(),
        fetchLeads?.(),
      ]);
    } catch (e) {
      console.error('Fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [fetchLeadSources, fetchSlaViolations, fetchLeads]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const recentLeads = useMemo(() =>
    [...(leads || [])].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 20),
    [leads]
  );

  const violationsList = useMemo(() => {
    if (Array.isArray(slaViolations)) return slaViolations;
    if (slaViolations?.violations) return slaViolations.violations;
    return [];
  }, [slaViolations]);

  const sourceCountMap = useMemo(() => {
    const map = {};
    (leads || []).forEach(l => {
      const s = (l.source || 'Website').toLowerCase().replace(/\s/g, '-');
      map[s] = (map[s] || 0) + 1;
    });
    return map;
  }, [leads]);

  const filteredPlatforms = useMemo(() =>
    activeCategory === 'All' ? PLATFORMS : PLATFORMS.filter(p => p.category === activeCategory),
    [activeCategory]
  );

  const copyUrl = (platformId) => {
    const url = `${API_BASE}/api/lead-capture/webhook/${platformId}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedId(platformId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sendTestLead = async () => {
    if (!testForm.name || !testForm.phone) {
      setTestResult({ success: false, message: 'Name and phone are required' });
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/lead-capture/webhook/${testForm.source}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testForm),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message,
        leadId: data.data?.lead?.id,
        score: data.data?.score,
        rep: data.data?.assignedRep,
        isDuplicate: data.data?.isDuplicate,
      });
      if (data.success) await fetchLeads?.();
    } catch (err) {
      setTestResult({ success: false, message: 'Connection failed: ' + err.message });
    } finally {
      setTestLoading(false);
    }
  };

  const leadsToday = useMemo(() => {
    const today = new Date().toDateString();
    return (leads || []).filter(l => l.createdAt && new Date(l.createdAt).toDateString() === today).length;
  }, [leads]);

  const leadsThisWeek = useMemo(() => {
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000);
    return (leads || []).filter(l => l.createdAt && new Date(l.createdAt) >= oneWeekAgo).length;
  }, [leads]);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="font-display font-extrabold text-[28px] tracking-tight text-[#0F172A]">
            Lead Capture Hub
          </div>
          <div className="text-[#64748B] text-[14px] mt-0.5">
            Connect every platform — zero missed leads, real-time capture.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 bg-[#D1FAE5] text-[#047857] text-[12px] font-bold px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
            {PLATFORMS.filter(p => p.webhookSupported).length} Platforms Active
          </span>
        </div>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Leads', value: (leads || []).length, icon: 'users', color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Today', value: leadsToday, icon: 'zap', color: '#059669', bg: '#ECFDF5' },
          { label: 'This Week', value: leadsThisWeek, icon: 'trendingup', color: '#7E22CE', bg: '#F3E8FF' },
          { label: 'SLA Violations', value: violationsList.length, icon: 'alerttriangle', color: violationsList.length > 0 ? '#DC2626' : '#059669', bg: violationsList.length > 0 ? '#FEF2F2' : '#ECFDF5' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white border border-[#E2E8F0] rounded-[14px] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: kpi.bg }}>
              <Icon name={kpi.icon} size={18} style={{ color: kpi.color }} />
            </div>
            <div>
              <div className="font-display font-extrabold text-[22px] text-[#0F172A] leading-none">{kpi.value}</div>
              <div className="text-[11px] text-[#94A3B8] font-semibold mt-0.5">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── SLA Violations ─────────────────────────────────────────── */}
      {violationsList.length > 0 && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[16px] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="alerttriangle" size={16} className="text-[#DC2626]" />
            <span className="font-bold text-[14px] text-[#DC2626]">⚠️ {violationsList.length} SLA Violations — Respond Immediately</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {violationsList.map((v, i) => (
              <div key={i} className="flex items-center justify-between bg-white border border-red-200 rounded-[10px] p-3">
                <div>
                  <div className="font-semibold text-[13px] text-[#0F172A]">{v.leadName}</div>
                  <div className="text-[11px] text-[#64748B]">{v.source} · {v.minutesSinceCreated}min waiting</div>
                </div>
                <button
                  onClick={() => v.leadId && onSelectLead(v.leadId)}
                  className="bg-[#DC2626] text-white text-[11px] font-semibold px-3 py-1.5 rounded-[8px] hover:bg-[#B91C1C] transition-all"
                >
                  Respond
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Platform Filter ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-[12px] font-semibold px-4 py-1.5 rounded-full transition-all ${
              activeCategory === cat
                ? 'bg-[#0F172A] text-white'
                : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Platform Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredPlatforms.map(platform => {
          const leadCount = sourceCountMap[platform.id] || sourceCountMap[platform.name?.toLowerCase()] || 0;
          const isExpanded = expandedPlatform === platform.id;
          const webhookUrl = `${API_BASE}/api/lead-capture/webhook/${platform.id}`;

          return (
            <div
              key={platform.id}
              className={`bg-white border rounded-[16px] overflow-hidden transition-all ${
                isExpanded ? 'border-[#2563EB] shadow-lg col-span-1 sm:col-span-2' : 'border-[#E2E8F0] hover:border-[#CBD5E1] hover:shadow-md'
              }`}
            >
              {/* Card Header */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-[10px] flex items-center justify-center"
                      style={{ background: platform.bg, color: platform.color }}
                    >
                      <Icon name={platform.icon} size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-[14px] text-[#0F172A]">{platform.name}</div>
                      <div className="text-[11px] text-[#94A3B8]">{platform.category}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {platform.webhookSupported ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#047857]">
                        ● Live
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#94A3B8]">
                        Manual
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[12px] text-[#64748B] mb-3">{platform.description}</div>

                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="font-display font-extrabold text-[20px] text-[#0F172A]">{leadCount}</div>
                    <div className="text-[10px] text-[#94A3B8]">Total Leads</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {platform.webhookSupported && (
                      <button
                        onClick={() => copyUrl(platform.id)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-[#2563EB] hover:bg-[#EFF6FF] px-2.5 py-1.5 rounded-[8px] transition-all border border-[#DBEAFE]"
                      >
                        <Icon name={copiedId === platform.id ? 'check' : 'copy'} size={12} />
                        {copiedId === platform.id ? 'Copied!' : 'Copy URL'}
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedPlatform(isExpanded ? null : platform.id)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-[#475569] hover:bg-[#F1F5F9] px-2.5 py-1.5 rounded-[8px] transition-all border border-[#E2E8F0]"
                    >
                      <Icon name="book" size={12} />
                      Setup
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Setup Guide */}
              {isExpanded && (
                <div className="border-t border-[#E2E8F0] p-4 bg-[#FAFBFC]">
                  {platform.webhookSupported && (
                    <div className="mb-4">
                      <div className="text-[11px] font-semibold text-[#64748B] mb-1.5">WEBHOOK URL</div>
                      <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-[8px] px-3 py-2">
                        <code className="text-[11px] font-mono text-[#2563EB] flex-1 truncate">
                          {webhookUrl}
                        </code>
                        <button
                          onClick={() => copyUrl(platform.id)}
                          className="flex-shrink-0 text-[#2563EB] hover:text-[#1D4ED8]"
                        >
                          <Icon name={copiedId === platform.id ? 'check' : 'copy'} size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    <div className="text-[11px] font-semibold text-[#64748B] mb-2">SETUP STEPS</div>
                    <ol className="space-y-1.5">
                      {platform.setupSteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-[12px] text-[#374151]">
                          <span
                            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
                            style={{ background: platform.color }}
                          >
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {platform.webhookSupported && (
                    <div className="mt-3 p-3 bg-[#EFF6FF] border border-[#DBEAFE] rounded-[8px]">
                      <div className="text-[11px] font-semibold text-[#1D4ED8] mb-1">📦 Expected Payload Format</div>
                      <code className="text-[10.5px] font-mono text-[#374151] whitespace-pre">{`{
  "name": "Ramesh Patel",
  "phone": "+919876543210",
  "email": "ramesh@gmail.com",
  "source": "${platform.id}",
  "config": "3 BHK",
  "budget": 8500000,
  "message": "Interested in Bopal project"
}`}</code>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Test Lead Sender ───────────────────────────────────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5">
        <div className="flex items-center gap-2 mb-1">
          <Icon name="zap" size={16} className="text-[#D97706]" />
          <div className="font-display font-bold text-[15px] text-[#0F172A]">Test Lead Capture</div>
        </div>
        <div className="text-[12px] text-[#64748B] mb-4">
          Send a test lead to verify any platform integration is working end-to-end.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-[11px] font-semibold text-[#64748B] mb-1 block">Lead Name *</label>
            <input
              value={testForm.name}
              onChange={e => setTestForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Ramesh Patel"
              className="w-full border border-[#E2E8F0] rounded-[8px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#FAFBFC]"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#64748B] mb-1 block">Phone *</label>
            <input
              value={testForm.phone}
              onChange={e => setTestForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="+919876543210"
              className="w-full border border-[#E2E8F0] rounded-[8px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#FAFBFC]"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#64748B] mb-1 block">Email</label>
            <input
              value={testForm.email}
              onChange={e => setTestForm(p => ({ ...p, email: e.target.value }))}
              placeholder="ramesh@gmail.com"
              className="w-full border border-[#E2E8F0] rounded-[8px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#FAFBFC]"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#64748B] mb-1 block">Simulate Platform</label>
            <select
              value={testForm.source}
              onChange={e => setTestForm(p => ({ ...p, source: e.target.value }))}
              className="w-full border border-[#E2E8F0] rounded-[8px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#FAFBFC]"
            >
              {PLATFORMS.filter(p => p.webhookSupported).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-[#64748B] mb-1 block">Message / Inquiry</label>
            <input
              value={testForm.message}
              onChange={e => setTestForm(p => ({ ...p, message: e.target.value }))}
              placeholder="Interested in 3 BHK at Bopal, budget 85L"
              className="w-full border border-[#E2E8F0] rounded-[8px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#2563EB] bg-[#FAFBFC]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={sendTestLead}
            disabled={testLoading}
            className="flex items-center gap-2 bg-[#0F172A] text-white font-semibold text-[13px] px-5 py-2.5 rounded-[10px] hover:bg-[#1E293B] transition-all disabled:opacity-60"
          >
            {testLoading ? (
              <><Icon name="loader" size={14} className="animate-spin" /> Sending...</>
            ) : (
              <><Icon name="send" size={14} /> Send Test Lead</>
            )}
          </button>

          {testResult && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-[12px] font-semibold ${
              testResult.success ? 'bg-[#D1FAE5] text-[#047857]' : 'bg-[#FEF2F2] text-[#DC2626]'
            }`}>
              <Icon name={testResult.success ? 'checkCircle' : 'xCircle'} size={14} />
              {testResult.success
                ? `✅ Lead #${testResult.leadId} created · Score: ${testResult.score} · Assigned: ${testResult.rep}${testResult.isDuplicate ? ' · ⚠️ Duplicate detected' : ''}`
                : `❌ ${testResult.message}`
              }
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Captures Table ──────────────────────────────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-[16px] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="font-display font-bold text-[15px] text-[#0F172A]">Recent Captures</div>
          <span className="text-[12px] font-semibold text-[#64748B] bg-[#F1F5F9] px-2.5 py-1 rounded-full">
            {recentLeads.length} shown
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[700px] text-left">
            <thead>
              <tr className="text-[11px] font-semibold text-[#94A3B8] border-b border-[#E2E8F0] bg-[#FAFBFC]">
                <th className="px-5 py-3">Lead</th>
                <th className="px-5 py-3">Platform</th>
                <th className="px-5 py-3">Captured</th>
                <th className="px-5 py-3">Assigned To</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[13px]">
              {recentLeads.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-[#94A3B8]">
                    <Icon name="inbox" size={32} className="mx-auto mb-2 text-[#CBD5E1]" />
                    <div className="font-semibold">No leads yet</div>
                    <div className="text-[12px] mt-1">Configure a platform or send a test lead above</div>
                  </td>
                </tr>
              ) : recentLeads.map((lead, i) => {
                const platform = PLATFORMS.find(p =>
                  p.id === (lead.source || '').toLowerCase().replace(/\s/g, '-') ||
                  p.name?.toLowerCase() === (lead.source || '').toLowerCase()
                );
                return (
                  <tr
                    key={lead.id || i}
                    onClick={() => lead.id && onSelectLead(lead.id)}
                    className="cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="font-semibold text-[#0F172A]">{lead.name}</div>
                      <div className="text-[11px] text-[#94A3B8] font-mono">{lead.phone}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {platform && (
                          <div
                            className="w-6 h-6 rounded-[6px] flex items-center justify-center"
                            style={{ background: platform.bg, color: platform.color }}
                          >
                            <Icon name={platform.icon} size={12} />
                          </div>
                        )}
                        <span className="text-[12px] font-medium text-[#475569]">{lead.source || 'Website'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[12px] text-[#64748B]">
                      {lead.createdAt
                        ? new Date(lead.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : 'Today'}
                    </td>
                    <td className="px-5 py-3 text-[12px]">
                      {lead.rep
                        ? <span className="text-[#475569]">{lead.rep}</span>
                        : <span className="text-[#DC2626] italic">Unassigned</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${lead.score || 0}%`,
                              background: (lead.score || 0) >= 70 ? '#059669' : (lead.score || 0) >= 50 ? '#D97706' : '#DC2626',
                            }}
                          />
                        </div>
                        <span className="text-[12px] font-bold text-[#0F172A]">{lead.score || 0}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                        lead.stage === 'won' ? 'bg-[#D1FAE5] text-[#047857]' :
                        lead.stage === 'lost' ? 'bg-[#FEF2F2] text-[#DC2626]' :
                        lead.stage === 'new' ? 'bg-[#EFF6FF] text-[#2563EB]' :
                        'bg-[#F1F5F9] text-[#475569]'
                      }`}>
                        {lead.stage || 'new'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
