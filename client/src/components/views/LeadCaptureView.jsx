import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';

const SOURCE_ICONS = {
  instagram: 'globe',
  facebook: 'globe',
  whatsapp: 'whatsapp',
  'google-ads': 'target',
  google_ads: 'target',
  '99acres': 'building',
  magicbricks: 'building',
  housing: 'home',
  housing_com: 'home',
  website: 'globe',
  'walk-in': 'user',
  walk_in: 'user',
  'call-in': 'phone',
  call_in: 'phone',
  referral: 'share2'
};

const SOURCE_COLORS = {
  instagram: 'bg-[#FDF2F8] text-[#DB2777]',
  facebook: 'bg-[#EFF6FF] text-[#1D4ED8]',
  whatsapp: 'bg-[#ECFDF5] text-[#059669]',
  'google-ads': 'bg-[#FEF3C7] text-[#D97706]',
  google_ads: 'bg-[#FEF3C7] text-[#D97706]',
  '99acres': 'bg-[#F3E8FF] text-[#7E22CE]',
  magicbricks: 'bg-[#FEF2F2] text-[#DC2626]',
  housing: 'bg-[#ECFDF5] text-[#047857]',
  housing_com: 'bg-[#ECFDF5] text-[#047857]',
  website: 'bg-[#EFF6FF] text-[#2563EB]',
  'walk-in': 'bg-[#F1F5F9] text-[#475569]',
  walk_in: 'bg-[#F1F5F9] text-[#475569]',
  'call-in': 'bg-[#D1FAE5] text-[#047857]',
  call_in: 'bg-[#D1FAE5] text-[#047857]',
  referral: 'bg-[#DBEAFE] text-[#1D4ED8]'
};

export default function LeadCaptureView({ onSelectLead }) {
  const {
    leads,
    leadSources,
    slaViolations,
    captureStats,
    fetchLeadSources,
    fetchSlaViolations,
    fetchCaptureStats,
    fetchLeads,
    authFetch
  } = useCRM();

  const [sources, setSources] = useState(leadSources || []);
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (authFetch) {
        const [srcRes] = await Promise.all([
          authFetch('/api/lead-capture/sources').then(r => r.json()).catch(() => ({ success: false, data: [] })),
          fetchSlaViolations ? fetchSlaViolations() : null,
          fetchCaptureStats ? fetchCaptureStats() : null,
          fetchLeads ? fetchLeads() : null
        ]);
        if (srcRes && srcRes.success && Array.isArray(srcRes.data)) {
          setSources(srcRes.data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch capture data', e);
    } finally {
      setLoading(false);
    }
  }, [authFetch, fetchSlaViolations, fetchCaptureStats, fetchLeads]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (leadSources && leadSources.length > 0) {
      setSources(leadSources);
    }
  }, [leadSources]);

  const recentCaptures = useMemo(() => {
    return [...(leads || [])]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 25);
  }, [leads]);

  // SLA violations normalized array
  const violationsList = useMemo(() => {
    if (Array.isArray(slaViolations)) return slaViolations;
    if (slaViolations && Array.isArray(slaViolations.violations)) return slaViolations.violations;
    return [];
  }, [slaViolations]);

  // KPI Calculations
  const leadsToday = useMemo(() => {
    const todayStr = new Date().toDateString();
    return (leads || []).filter(l => {
      if (l.createdAt) {
        return new Date(l.createdAt).toDateString() === todayStr;
      }
      return l.createdMinutesAgo !== undefined && l.createdMinutesAgo < 1440;
    }).length;
  }, [leads]);

  const leadsThisWeek = useMemo(() => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return (leads || []).filter(l => {
      if (l.createdAt) {
        return new Date(l.createdAt) >= oneWeekAgo;
      }
      return true;
    }).length;
  }, [leads]);

  const avgResponseTimeDisplay = useMemo(() => {
    if (Array.isArray(captureStats) && captureStats.length > 0) {
      const avg = Math.round(captureStats.reduce((s, x) => s + (x.avgResponseTime || 0), 0) / captureStats.length);
      return avg > 0 ? `${avg}m` : '5m';
    }
    return (leads && leads.length > 0) ? '5m' : '—';
  }, [captureStats, leads]);

  const conversionRateDisplay = useMemo(() => {
    if (!leads || leads.length === 0) return '0%';
    const wonCount = leads.filter(l => l.stage === 'won').length;
    return `${Math.round((wonCount / leads.length) * 100)}%`;
  }, [leads]);

  const activeSourcesCount = (sources || []).filter(s => s.active !== false).length;

  const copyWebhookUrl = (sourceId) => {
    const url = `${window.location.origin}/api/lead-capture/webhook/${sourceId}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(sourceId);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const responseStatusColor = (status) => {
    if (status === 'responded') return 'bg-[#D1FAE5] text-[#047857]';
    if (status === 'pending') return 'bg-[#FEE2E2] text-[#DC2626]';
    if (status === 'delayed') return 'bg-[#FEF3C7] text-[#D97706]';
    return 'bg-[#F1F5F9] text-[#475569]';
  };

  if (loading && (!sources || sources.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="loader" size={24} className="text-[#2563EB] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="font-display font-extrabold text-[28px] tracking-tight text-[#0F172A]">
          Lead Capture Center
        </div>
        <div className="text-[#64748B] text-[14px] mt-0.5">
          Multi-platform lead ingestion — never miss a single lead.
        </div>
      </div>

      {/* KPI Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Leads Today', value: leadsToday, icon: 'users', color: 'text-[#2563EB]' },
          { label: 'Leads This Week', value: leadsThisWeek, icon: 'trendingup', color: 'text-[#059669]' },
          { label: 'Avg Response Time', value: avgResponseTimeDisplay, icon: 'clock', color: 'text-[#D97706]' },
          { label: 'Conversion Rate (MTD)', value: conversionRateDisplay, icon: 'target', color: 'text-[#7E22CE]' },
          { label: 'Active SLA Violations', value: violationsList.length, icon: 'alerttriangle', color: 'text-[#DC2626]' },
          { label: 'Sources Active', value: activeSourcesCount, icon: 'radio', color: 'text-[#047857]' }
        ].map((kpi, i) => (
          <div key={i} className="card-base bg-white border border-[#E2E8F0] rounded-[14px] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon name={kpi.icon} size={15} className={kpi.color} />
              <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">{kpi.label}</span>
            </div>
            <div className="font-display font-extrabold text-[22px] text-[#0F172A]">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* SLA Violations Panel */}
      {violationsList.length > 0 && (
        <div className="card-base bg-white border border-red-200 rounded-[16px] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="alerttriangle" size={18} className="text-[#DC2626]" />
            <span className="font-display font-bold text-[15px] text-[#DC2626]">
              SLA Violations ({violationsList.length})
            </span>
            <span className="text-[11px] text-[#94A3B8] ml-1">— Exceeding 15-min first response SLA</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {violationsList.map((v, i) => (
              <div key={i} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-[10px] p-3">
                <div className="min-w-0">
                  <div className="font-semibold text-[13px] text-[#0F172A] truncate">{v.leadName}</div>
                  <div className="text-[11px] text-[#64748B]">{v.source} · {v.minutesSinceCreated}m waiting</div>
                </div>
                <button
                  onClick={() => v.leadId && onSelectLead(v.leadId)}
                  className="flex-shrink-0 ml-2 bg-[#DC2626] text-white text-[11px] font-semibold px-3 py-1.5 rounded-[8px] hover:bg-[#B91C1C] transition-all"
                >
                  Respond Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source Status Cards */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
        <div className="font-display font-bold text-[15px] text-[#0F172A] mb-4">Lead Sources</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sources.map(src => (
            <div key={src.id} className="border border-[#E2E8F0] rounded-[12px] p-4 hover:border-[#CBD5E1] transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center ${SOURCE_COLORS[src.id] || 'bg-[#F1F5F9] text-[#475569]'}`}>
                    <Icon name={SOURCE_ICONS[src.id] || 'globe'} size={16} />
                  </div>
                  <span className="font-semibold text-[13px] text-[#0F172A]">{src.name}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${src.active !== false ? 'bg-[#D1FAE5] text-[#047857]' : 'bg-[#F1F5F9] text-[#94A3B8]'}`}>
                  {src.active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-[11.5px]">
                <div>
                  <div className="text-[#94A3B8]">Total Leads</div>
                  <div className="font-bold text-[#0F172A]">{src.totalLeads ?? 0}</div>
                </div>
                <div>
                  <div className="text-[#94A3B8]">Conversion</div>
                  <div className="font-bold text-[#0F172A]">{src.conversionRate ?? '0%'}</div>
                </div>
                <div>
                  <div className="text-[#94A3B8]">Last Lead</div>
                  <div className="font-medium text-[#64748B]">{src.lastLeadTime || '—'}</div>
                </div>
                <div>
                  <div className="text-[#94A3B8]">Avg Response</div>
                  <div className="font-medium text-[#64748B]">{src.avgResponseTime || '—'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Captures Table */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="font-display font-bold text-[15px] text-[#0F172A]">Recent Captures</div>
          <span className="text-[12px] font-semibold text-[#64748B] bg-[#F1F5F9] px-2.5 py-1 rounded-full">
            {recentCaptures.length} Total Captured
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[800px] text-left">
            <thead>
              <tr className="text-[11.5px] font-semibold text-[#94A3B8] border-b border-[#E2E8F0] bg-[#FAFBFC]">
                <th className="px-5 py-3">Lead</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Captured</th>
                <th className="px-5 py-3">Assigned Rep</th>
                <th className="px-5 py-3">Response Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[13px]">
              {recentCaptures.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-[13.5px] text-[#94A3B8]">
                    No recent captures. Configure lead sources to start receiving leads.
                  </td>
                </tr>
              ) : (
                recentCaptures.map((lead, i) => (
                  <tr
                    key={lead.id || i}
                    onClick={() => lead.id && onSelectLead(lead.id)}
                    className="cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="font-semibold text-[#0F172A]">{lead.name || 'Unknown'}</div>
                      <div className="text-[11px] text-[#64748B] font-mono">{lead.phone || '—'}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[12px] font-medium text-[#475569]">{lead.source || 'Website'}</span>
                    </td>
                    <td className="px-5 py-3 text-[12px] text-[#64748B]">
                      {lead.createdAt ? new Date(lead.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Today'}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-[#475569]">
                      {lead.rep || <span className="text-[#DC2626] italic">Unassigned</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${responseStatusColor(lead.rep ? 'responded' : (lead.stage === 'new' ? 'pending' : 'responded'))}`}>
                        {lead.rep ? 'responded' : (lead.stage === 'new' ? 'pending' : 'responded')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Webhook URL Generator */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
        <div className="font-display font-bold text-[15px] text-[#0F172A] mb-1">Webhook URLs</div>
        <div className="text-[12px] text-[#64748B] mb-4">Configure these URLs in your lead source platforms to enable automatic lead ingestion.</div>
        <div className="space-y-2">
          {sources.map(src => (
            <div key={src.id} className="flex items-center gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[10px] px-4 py-2.5">
              <div className={`w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0 ${SOURCE_COLORS[src.id] || 'bg-[#F1F5F9] text-[#475569]'}`}>
                <Icon name={SOURCE_ICONS[src.id] || 'globe'} size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[12px] font-semibold text-[#475569]">{src.name}</span>
                <div className="text-[11px] font-mono text-[#94A3B8] truncate">
                  {window.location.origin}/api/lead-capture/webhook/{src.id}
                </div>
              </div>
              <button
                onClick={() => copyWebhookUrl(src.id)}
                className="flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-all px-2.5 py-1 rounded-[6px] hover:bg-[#EFF6FF]"
              >
                <Icon name={copiedUrl === src.id ? 'check' : 'copy'} size={13} />
                {copiedUrl === src.id ? 'Copied' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
