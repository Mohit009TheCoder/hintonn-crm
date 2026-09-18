import React, { useState, useMemo } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';

function fmtINR(val) {
  if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + ' Cr';
  if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + ' L';
  return '₹' + Number(val).toLocaleString('en-IN');
}

const SOURCE_ICONS = {
  instagram: 'globe',
  facebook: 'globe',
  whatsapp: 'whatsapp',
  'google-ads': 'target',
  '99acres': 'building',
  magicbricks: 'building',
  housing: 'home',
  website: 'globe',
  'walk-in': 'user',
  'call-in': 'phone',
  referral: 'share2'
};

const SOURCE_LABELS = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  'google-ads': 'Google Ads',
  '99acres': '99acres',
  magicbricks: 'MagicBricks',
  housing: 'Housing.com',
  website: 'Website',
  'walk-in': 'Walk-in',
  'call-in': 'Call-in',
  referral: 'Referral'
};

export default function Leads({ onSelectLead, onOpenDialer, onOpenAddLead }) {
  const { leads, duplicateLeads, projects, autoUpdateAllStages, triggerManualNurtureStep, fetchDuplicateLeads } = useCRM();

  React.useEffect(() => {
    if (fetchDuplicateLeads) fetchDuplicateLeads();
  }, [fetchDuplicateLeads]);

  const [activeTab, setActiveTab] = React.useState('main'); // 'main' or 'duplicates'
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('all');
  const [activeStage, setActiveStage] = useState('all');
  const [activeSource, setActiveSource] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  const smartListChips = [
    { id: 'all', label: 'All Leads' },
    { id: 'hot-lead', label: '🔥 Hot Leads' },
    { id: 'high-budget', label: '💎 High Budget' },
    { id: 'site-visit-scheduled', label: '📍 Site Visit Scheduled' },
    { id: 'investor', label: '💼 Investors' },
    { id: 'nri', label: '✈️ NRI Buyers' },
    { id: 'ready-to-move', label: 'Ready to Move' },
    { id: 'sla-violation', label: '🚨 SLA Violation' },
    { id: 'unassigned', label: '👤 Unassigned' },
    { id: 'new-today', label: '✨ New Today' }
  ];

  const stages = [
    { id: 'all', label: 'All Stages' },
    { id: 'new', label: 'New' },
    { id: 'contacted', label: 'Contacted' },
    { id: 'qualified', label: 'Qualified' },
    { id: 'negotiation', label: 'Negotiation' },
    { id: 'won', label: 'Won' },
    { id: 'lost', label: 'Lost' }
  ];

  // Collect unique sources from leads
  const availableSources = useMemo(() => {
    const sources = new Set();
    leads.forEach(l => { if (l.source) sources.add(l.source); });
    return Array.from(sources).sort();
  }, [leads]);

  // Filtering
  let filtered = leads.filter(l => {
    if (activeTag !== 'all') {
      if (activeTag === 'sla-violation' && !(l.stage === 'new' && !l.rep)) return false;
      if (activeTag === 'unassigned' && l.rep) return false;
      if (activeTag === 'new-today' && (!l.createdAt || new Date(l.createdAt).toDateString() !== new Date().toDateString())) return false;
      if (!['sla-violation', 'unassigned', 'new-today'].includes(activeTag) && (!l.tags || !l.tags.includes(activeTag))) return false;
    }
    if (activeStage !== 'all' && l.stage !== activeStage) return false;
    if (activeSource !== 'all' && l.source !== activeSource) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = l.name && l.name.toLowerCase().includes(q);
      const matchPhone = l.phone && l.phone.includes(q);
      const proj = projects.find(p => p.id === l.projectId);
      const matchProj = proj && proj.name.toLowerCase().includes(q);
      return matchName || matchPhone || matchProj;
    }
    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    let diff = 0;
    if (sortBy === 'name') diff = a.name.localeCompare(b.name);
    else if (sortBy === 'value') diff = (a.value || 0) - (b.value || 0);
    else if (sortBy === 'score') diff = (a.score || 0) - (b.score || 0);
    return sortAsc ? diff : -diff;
  });

  const toggleSort = (col) => {
    if (sortBy === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(col);
      setSortAsc(false);
    }
  };

  const scoreColor = (s) => (s >= 75 ? '#059669' : s >= 50 ? '#2563EB' : '#D97706');

  const toggleSelectLead = (id, e) => {
    e.stopPropagation();
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setShowBulkActions(next.size > 0);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === filtered.length) {
      setSelectedLeads(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedLeads(new Set(filtered.map(l => l.id)));
      setShowBulkActions(true);
    }
  };

  const responseStatusColor = (status) => {
    if (status === 'responded') return 'bg-[#D1FAE5] text-[#047857]';
    if (status === 'pending') return 'bg-[#FEE2E2] text-[#DC2626]';
    if (status === 'delayed') return 'bg-[#FEF3C7] text-[#D97706]';
    if (status === 'violated') return 'bg-[#FEE2E2] text-[#DC2626]';
    return 'bg-[#F1F5F9] text-[#94A3B8]';
  };

  const nurtureStatusColor = (status) => {
    if (status === 'in-sequence') return 'bg-[#DBEAFE] text-[#1D4ED8]';
    if (status === 'paused') return 'bg-[#FEF3C7] text-[#D97706]';
    return 'bg-[#F1F5F9] text-[#94A3B8]';
  };

  const startNurture = async (leadId) => {
    try {
      if (triggerManualNurtureStep) {
        await triggerManualNurtureStep(leadId);
      }
    } catch (e) {
      console.error('Failed to start nurture', e);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="font-display font-extrabold text-[28px] tracking-tight text-[#0F172A]">
            Leads Directory
          </div>
          <div className="text-[#64748B] text-[14px] mt-0.5">
            Complete database of potential buyers, property preferences, and AI fit scoring.
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#F1F5F9] p-1 rounded-[12px] border border-[#E2E8F0]">
          <button
            onClick={() => setActiveTab('main')}
            className={`px-4 py-2 rounded-[8px] text-[13px] font-semibold transition-all ${
              activeTab === 'main' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            Main Database
          </button>
          <button
            onClick={() => setActiveTab('duplicates')}
            className={`px-4 py-2 rounded-[8px] text-[13px] font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'duplicates' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            Duplicates Queue
            {(duplicateLeads?.length || 0) > 0 && (
              <span className="bg-[#DC2626] text-white text-[10px] px-1.5 py-0.5 rounded-full">{duplicateLeads.length}</span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => autoUpdateAllStages(false)}
            className="flex items-center gap-1.5 bg-white text-[#334155] border border-[#CBD5E1] font-semibold text-[13px] px-3.5 py-2.5 rounded-[10px] hover:bg-[#F8FAFC] transition-all shadow-sm"
            title="Scan database interactions and automatically promote lead stages"
          >
            <Icon name="zap" size={15} className="text-[#D97706]" />
            <span>Auto-Update Stages</span>
          </button>

          <button
            onClick={onOpenAddLead}
            className="flex items-center gap-1.5 bg-[#2563EB] text-white font-semibold text-[13.4px] px-4 py-2.5 rounded-[10px] hover:bg-[#1D4ED8] transition-all shadow-sm"
          >
            <Icon name="plus" size={16} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {activeTab === 'duplicates' ? (
        <div className="bg-white border border-[#E2E8F0] rounded-[16px] overflow-hidden">
          <div className="p-5 border-b border-[#E2E8F0]">
            <h3 className="font-display font-bold text-[16px]">Filtered Duplicates</h3>
            <p className="text-[13px] text-[#64748B]">Leads matching existing phone numbers caught by the system.</p>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[12px] font-semibold text-[#64748B]">
                <th className="p-4">Name</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Source</th>
                <th className="p-4">Message</th>
                <th className="p-4">Captured</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[13px]">
              {!duplicateLeads || duplicateLeads.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-[#94A3B8]">No duplicates captured yet.</td></tr>
              ) : duplicateLeads.map(d => (
                <tr key={d.id} className="hover:bg-[#F8FAFC]">
                  <td className="p-4 font-semibold">{d.name}</td>
                  <td className="p-4">
                    <div>{d.phone}</div>
                    <div className="text-[11px] text-[#94A3B8]">{d.email}</div>
                  </td>
                  <td className="p-4">{d.source}</td>
                  <td className="p-4 text-[#64748B] max-w-[200px] truncate" title={d.message}>{d.message || '—'}</td>
                  <td className="p-4 text-[#64748B]">{new Date(d.createdAt || d.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {/* Smart List Chips */}
      <div className="flex gap-2 flex-wrap items-center">
        {smartListChips.map(chip => (
          <button
            key={chip.id}
            onClick={() => setActiveTag(chip.id)}
            className={`smart-list-chip ${activeTag === chip.id ? 'active' : ''}`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Source Filter Chips */}
      {availableSources.length > 0 && (
        <div className="flex gap-1.5 flex-wrap items-center">
          <button
            onClick={() => setActiveSource('all')}
            className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
              activeSource === 'all'
                ? 'bg-[#0F172A] text-white border-[#0F172A]'
                : 'border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]'
            }`}
          >
            All Sources
          </button>
          {availableSources.map(src => (
            <button
              key={src}
              onClick={() => setActiveSource(src)}
              className={`flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                activeSource === src
                  ? 'bg-[#0F172A] text-white border-[#0F172A]'
                  : 'border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]'
              }`}
            >
              <Icon name={SOURCE_ICONS[src] || 'globe'} size={12} />
              {SOURCE_LABELS[src] || src}
            </button>
          ))}
        </div>
      )}

      {/* Filter Row: Search & Stage Chips */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="search-input flex items-center gap-2 border border-[#CBD5E1] rounded-[10px] px-3.5 py-2 w-[280px]">
          <Icon name="search" size={15} className="text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Filter by name, phone or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none w-full text-[13px]"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {stages.map(st => (
            <button
              key={st.id}
              onClick={() => setActiveStage(st.id)}
              className={`text-[12px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                activeStage === st.id
                  ? 'bg-[#2563EB] text-white border-[#2563EB]'
                  : 'border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && selectedLeads.size > 0 && (
        <div className="flex items-center gap-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[10px] px-4 py-2.5">
          <span className="text-[13px] font-semibold text-[#1D4ED8]">
            {selectedLeads.size} lead{selectedLeads.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex-1" />
          <button className="text-[12px] font-semibold text-[#475569] bg-white border border-[#CBD5E1] px-3 py-1.5 rounded-[8px] hover:bg-[#F8FAFC] transition-all">
            Assign Rep
          </button>
          <button className="text-[12px] font-semibold text-[#475569] bg-white border border-[#CBD5E1] px-3 py-1.5 rounded-[8px] hover:bg-[#F8FAFC] transition-all">
            Add Tags
          </button>
          <button className="text-[12px] font-semibold text-[#2563EB] bg-white border border-[#BFDBFE] px-3 py-1.5 rounded-[8px] hover:bg-[#EFF6FF] transition-all">
            Start Nurture
          </button>
          <button
            onClick={() => { setSelectedLeads(new Set()); setShowBulkActions(false); }}
            className="text-[12px] text-[#94A3B8] hover:text-[#475569] transition-colors"
          >
            <Icon name="x" size={15} />
          </button>
        </div>
      )}

      {/* Leads Table */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="leads-table w-full border-collapse min-w-[1200px] text-left">
            <thead>
              <tr className="text-[11.5px] font-semibold text-[#94A3B8] border-b border-[#E2E8F0]">
                <th className="px-3 py-3.5 w-8">
                  <input
                    type="checkbox"
                    checked={selectedLeads.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-[#CBD5E1] accent-[#2563EB]"
                  />
                </th>
                <th onClick={() => toggleSort('name')} className="px-4 py-3.5 cursor-pointer hover:text-[#0F172A]">
                  Lead {sortBy === 'name' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="px-4 py-3.5">Source</th>
                <th className="px-4 py-3.5">Tags</th>
                <th className="px-4 py-3.5">Project Interest</th>
                <th onClick={() => toggleSort('value')} className="px-4 py-3.5 cursor-pointer hover:text-[#0F172A]">
                  Budget {sortBy === 'value' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="px-4 py-3.5">Stage</th>
                <th className="px-4 py-3.5">Response</th>
                <th className="px-4 py-3.5">Assigned Rep</th>
                <th className="px-4 py-3.5">Nurture</th>
                <th onClick={() => toggleSort('score')} className="px-4 py-3.5 cursor-pointer hover:text-[#0F172A]">
                  AI Score {sortBy === 'score' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[13px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="12" className="text-center py-10 text-[13.5px] text-[#94A3B8]">
                    No leads found. Click "Add Lead" to create a new lead.
                  </td>
                </tr>
              ) : (
                filtered.map(l => {
                  const project = projects.find(p => p.id === l.projectId);
                  return (
                    <tr
                      key={l.id}
                      onClick={() => onSelectLead(l.id)}
                      className={`cursor-pointer hover:bg-[#F8FAFC] transition-colors ${selectedLeads.has(l.id) ? 'bg-[#EFF6FF]' : ''}`}
                    >
                      <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedLeads.has(l.id)}
                          onChange={(e) => toggleSelectLead(l.id, e)}
                          className="w-3.5 h-3.5 rounded border-[#CBD5E1] accent-[#2563EB]"
                        />
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-[#0F172A]">{l.name}</div>
                        <div className="text-[11.5px] text-[#64748B] font-mono">{l.phone}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        {l.source ? (
                          <div className="flex items-center gap-1.5">
                            <Icon name={SOURCE_ICONS[l.source] || 'globe'} size={13} className="text-[#64748B]" />
                            <span className="text-[12px] text-[#475569]">{SOURCE_LABELS[l.source] || l.source}</span>
                          </div>
                        ) : (
                          <span className="text-[12px] text-[#94A3B8]">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(l.tags || []).map(t => (
                            <span
                              key={t}
                              className={`tag-pill text-[10px] ${
                                t === 'sla-violation' ? 'bg-[#FEE2E2] text-[#DC2626]' :
                                t === 'unassigned' ? 'bg-[#FEF3C7] text-[#D97706]' :
                                t === 'new-today' ? 'bg-[#D1FAE5] text-[#047857]' :
                                'bg-[#F1F5F9] text-[#475569]'
                              }`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-medium text-[#0F172A]">{project?.name || 'General Inquiry'}</div>
                        <div className="text-[11px] text-[#94A3B8]">{l.config || '—'}</div>
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-[#0F172A]">
                        {fmtINR(l.value)}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="tag-pill bg-[#DBEAFE] text-[#1D4ED8] uppercase text-[10.5px]">
                          {l.stage}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${responseStatusColor(l.rep ? 'responded' : (l.stage === 'new' ? 'pending' : 'responded'))}`}>
                          {l.rep ? 'responded' : (l.stage === 'new' ? 'pending' : 'responded')}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-[12px]">
                        {l.rep ? (
                          <span className="text-[#475569]">{l.rep}</span>
                        ) : (
                          <span className="text-[#DC2626] italic">Unassigned</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${l.nurturePaused ? 'bg-[#FEF3C7] text-[#D97706]' : 'bg-[#F1F5F9] text-[#94A3B8]'}`}>
                          {l.nurturePaused ? 'paused' : 'none'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold" style={{ color: scoreColor(l.score || 0) }}>
                            {l.score || 0}%
                          </span>
                          <div className="w-12 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${l.score || 0}%`, backgroundColor: scoreColor(l.score || 0) }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenDialer(l)}
                            className="w-7 h-7 rounded-[6px] bg-[#D1FAE5] text-[#047857] hover:bg-[#A7F3D0] flex items-center justify-center transition-all"
                            title="Call Lead"
                          >
                            <Icon name="phone" size={13} />
                          </button>
                          <button
                            onClick={() => startNurture(l.id)}
                            className="w-7 h-7 rounded-[6px] bg-[#FEF3C7] text-[#D97706] hover:bg-[#FDE68A] flex items-center justify-center transition-all"
                            title="Start Nurture"
                          >
                            <Icon name="send" size={13} />
                          </button>
                          <button
                            onClick={() => onSelectLead(l.id)}
                            className="w-7 h-7 rounded-[6px] bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE] flex items-center justify-center transition-all"
                            title="View Details"
                          >
                            <Icon name="arrowright" size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
