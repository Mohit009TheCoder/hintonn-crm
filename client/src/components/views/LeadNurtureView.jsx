import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';

const CHANNEL_ICONS = {
  whatsapp: 'whatsapp',
  sms: 'messagecircle',
  email: 'mail',
  call: 'phone'
};

export default function LeadNurtureView({ onSelectLead }) {
  const { authFetch } = useCRM();
  const [sequences, setSequences] = useState([]);
  const [activeNurture, setActiveNurture] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSeq, setExpandedSeq] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSeq, setNewSeq] = useState({ name: '', description: '', steps: [{ delay: '1d', channel: 'whatsapp', template: '' }] });

  const fetchData = useCallback(async () => {
    if (!authFetch) return;
    setLoading(true);
    try {
      const [seqRes, activeRes, analyticsRes] = await Promise.all([
        authFetch('/api/nurture/sequences').then(r => r.json()).catch(() => ({ success: false, data: [] })),
        authFetch('/api/nurture/active').then(r => r.json()).catch(() => ({ success: false, data: [] })),
        authFetch('/api/nurture/analytics').then(r => r.json()).catch(() => ({ success: false, data: null }))
      ]);
      if (seqRes.success) setSequences(seqRes.data);
      if (activeRes.success) setActiveNurture(activeRes.data);
      if (analyticsRes.success) setAnalytics(analyticsRes.data);
    } catch (e) {
      console.error('Failed to fetch nurture data', e);
    }
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSequenceStatus = async (seqId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      await authFetch(`/api/nurture/sequences/${seqId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      setSequences(prev => prev.map(s => s.id === seqId ? { ...s, status: newStatus } : s));
    } catch (e) {
      console.error('Failed to toggle sequence', e);
    }
  };

  const pauseLeadNurture = async (leadId) => {
    try {
      await authFetch(`/api/nurture/pause/${leadId}`, { method: 'POST' });
      setActiveNurture(prev => prev.map(n => n.leadId === leadId ? { ...n, status: 'paused' } : n));
    } catch (e) {
      console.error('Failed to pause nurture', e);
    }
  };

  const resumeLeadNurture = async (leadId) => {
    try {
      await authFetch(`/api/nurture/resume/${leadId}`, { method: 'POST' });
      setActiveNurture(prev => prev.map(n => n.leadId === leadId ? { ...n, status: 'active' } : n));
    } catch (e) {
      console.error('Failed to resume nurture', e);
    }
  };

  const addStep = () => {
    setNewSeq(prev => ({
      ...prev,
      steps: [...prev.steps, { delay: '1d', channel: 'whatsapp', template: '' }]
    }));
  };

  const removeStep = (idx) => {
    setNewSeq(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== idx)
    }));
  };

  const updateStep = (idx, field, value) => {
    setNewSeq(prev => ({
      ...prev,
      steps: prev.steps.map((s, i) => i === idx ? { ...s, [field]: value } : s)
    }));
  };

  const createSequence = async () => {
    try {
      const res = await authFetch('/api/nurture/sequences', {
        method: 'POST',
        body: JSON.stringify(newSeq)
      });
      const data = await res.json();
      if (data.success) {
        setSequences(prev => [data.data, ...prev]);
        setShowCreateForm(false);
        setNewSeq({ name: '', description: '', steps: [{ delay: '1d', channel: 'whatsapp', template: '' }] });
      }
    } catch (e) {
      console.error('Failed to create sequence', e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="loader" size={24} className="text-[#2563EB] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="font-display font-extrabold text-[28px] tracking-tight text-[#0F172A]">
            Lead Nurture Engine
          </div>
          <div className="text-[#64748B] text-[14px] mt-0.5">
            Automated drip campaigns to convert leads through every stage.
          </div>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-1.5 bg-[#2563EB] text-white font-semibold text-[13.4px] px-4 py-2.5 rounded-[10px] hover:bg-[#1D4ED8] transition-all shadow-sm"
        >
          <Icon name="plus" size={16} />
          <span>Create Sequence</span>
        </button>
      </div>

      {/* Nurture Analytics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Nurtured', value: analytics?.overview?.uniqueLeads ?? 0, icon: 'users', color: 'text-[#2563EB]' },
          { label: 'Nurture Conversion', value: (analytics?.overview?.conversionRate ?? 0) + '%', icon: 'target', color: 'text-[#059669]' },
          { label: 'Active Sequences', value: sequences.filter(s => s.status === 'active').length, icon: 'clock', color: 'text-[#D97706]' },
          { label: 'Active Nurtures', value: analytics?.overview?.activeNurtures ?? 0, icon: 'star', color: 'text-[#7E22CE]' },
          { label: 'Messages Sent', value: analytics?.overview?.totalMessages ?? 0, icon: 'send', color: 'text-[#047857]' }
        ].map((kpi, i) => (
          <div key={i} className="card-base bg-white border border-[#E2E8F0] rounded-[14px] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon name={kpi.icon} size={15} className={kpi.color} />
              <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">{kpi.label}</span>
            </div>
            <div className="font-display font-extrabold text-[20px] text-[#0F172A] truncate">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Create Sequence Form */}
      {showCreateForm && (
        <div className="card-base bg-white border border-[#2563EB] rounded-[16px] p-5">
          <div className="font-display font-bold text-[15px] text-[#0F172A] mb-4">New Nurture Sequence</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Sequence Name</label>
              <input
                type="text"
                value={newSeq.name}
                onChange={(e) => setNewSeq(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. New Lead Welcome Series"
                className="w-full border border-[#CBD5E1] rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#475569] mb-1 block">Description</label>
              <input
                type="text"
                value={newSeq.description}
                onChange={(e) => setNewSeq(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the sequence"
                className="w-full border border-[#CBD5E1] rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] font-semibold text-[#475569]">Steps</label>
              <button onClick={addStep} className="text-[12px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1">
                <Icon name="plus" size={13} /> Add Step
              </button>
            </div>
            <div className="space-y-2">
              {newSeq.steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[8px] px-3 py-2">
                  <span className="text-[11px] font-bold text-[#94A3B8] w-6">{idx + 1}.</span>
                  <input
                    type="text"
                    value={step.delay}
                    onChange={(e) => updateStep(idx, 'delay', e.target.value)}
                    placeholder="Delay (e.g. 1d, 2h)"
                    className="w-20 border border-[#CBD5E1] rounded-[6px] px-2 py-1.5 text-[12px] outline-none focus:border-[#2563EB]"
                  />
                  <select
                    value={step.channel}
                    onChange={(e) => updateStep(idx, 'channel', e.target.value)}
                    className="border border-[#CBD5E1] rounded-[6px] px-2 py-1.5 text-[12px] outline-none focus:border-[#2563EB] bg-white"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                    <option value="call">Call</option>
                  </select>
                  <input
                    type="text"
                    value={step.template}
                    onChange={(e) => updateStep(idx, 'template', e.target.value)}
                    placeholder="Message template..."
                    className="flex-1 border border-[#CBD5E1] rounded-[6px] px-2 py-1.5 text-[12px] outline-none focus:border-[#2563EB]"
                  />
                  {newSeq.steps.length > 1 && (
                    <button onClick={() => removeStep(idx)} className="text-[#94A3B8] hover:text-[#DC2626] transition-colors">
                      <Icon name="x" size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-[13px] font-semibold text-[#475569] px-4 py-2 rounded-[8px] hover:bg-[#F1F5F9] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={createSequence}
              disabled={!newSeq.name.trim()}
              className="bg-[#2563EB] text-white font-semibold text-[13px] px-5 py-2 rounded-[8px] hover:bg-[#1D4ED8] transition-all disabled:opacity-40"
            >
              Create Sequence
            </button>
          </div>
        </div>
      )}

      {/* Sequence Cards */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
        <div className="font-display font-bold text-[15px] text-[#0F172A] mb-4">Nurture Sequences</div>
        {sequences.length === 0 ? (
          <div className="text-center py-8 text-[13.5px] text-[#94A3B8]">
            No sequences yet. Create your first nurture sequence to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sequences.map(seq => (
              <div key={seq.id} className="border border-[#E2E8F0] rounded-[12px] p-4 hover:border-[#CBD5E1] transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[14px] text-[#0F172A]">{seq.name}</div>
                    <div className="text-[12px] text-[#64748B] mt-0.5 line-clamp-2">{seq.description || 'No description'}</div>
                  </div>
                  <button
                    onClick={() => toggleSequenceStatus(seq.id, seq.status)}
                    className={`flex-shrink-0 ml-2 w-10 h-5 rounded-full relative transition-colors ${
                      seq.status === 'active' ? 'bg-[#059669]' : 'bg-[#CBD5E1]'
                    }`}
                    title={seq.status === 'active' ? 'Pause sequence' : 'Activate sequence'}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      seq.status === 'active' ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
                <div className="flex items-center gap-4 text-[11.5px] text-[#64748B] mb-3">
                  <span>{seq.stepsCount ?? seq.steps?.length ?? 0} steps</span>
                  <span>{seq.activeLeads ?? 0} active leads</span>
                  <span>{seq.conversionRate ?? '0%'} conversion</span>
                </div>
                <button
                  onClick={() => setExpandedSeq(expandedSeq === seq.id ? null : seq.id)}
                  className="text-[12px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 transition-all"
                >
                  <Icon name={expandedSeq === seq.id ? 'chevrondown' : 'chevronright'} size={13} />
                  Edit Steps
                </button>
                {expandedSeq === seq.id && seq.steps && (
                  <div className="mt-3 space-y-1.5 border-t border-[#E2E8F0] pt-3">
                    {seq.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[12px]">
                        <span className="w-5 h-5 rounded-full bg-[#F1F5F9] text-[10px] font-bold flex items-center justify-center text-[#475569]">{idx + 1}</span>
                        <Icon name={CHANNEL_ICONS[step.channel] || 'messagecircle'} size={13} className="text-[#64748B]" />
                        <span className="text-[#475569]">{step.channel}</span>
                        <span className="text-[#94A3B8]">·</span>
                        <span className="text-[#94A3B8]">{step.delay}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Nurture Pipeline */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0]">
          <div className="font-display font-bold text-[15px] text-[#0F172A]">Active Nurture Pipeline</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px] text-left">
            <thead>
              <tr className="text-[11.5px] font-semibold text-[#94A3B8] border-b border-[#E2E8F0]">
                <th className="px-5 py-3">Lead</th>
                <th className="px-5 py-3">Sequence</th>
                <th className="px-5 py-3">Progress</th>
                <th className="px-5 py-3">Next Message</th>
                <th className="px-5 py-3">Stage</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[13px]">
              {activeNurture.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-[13.5px] text-[#94A3B8]">
                    No leads currently in nurture sequences.
                  </td>
                </tr>
              ) : (
                activeNurture.map((n, i) => (
                  <tr key={n.leadId || i} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-5 py-3 cursor-pointer" onClick={() => n.leadId && onSelectLead(n.leadId)}>
                      <div className="font-semibold text-[#0F172A]">{n.leadName || 'Unknown'}</div>
                      <div className="text-[11px] text-[#64748B] font-mono">{n.phone || '—'}</div>
                    </td>
                    <td className="px-5 py-3 text-[12px] font-medium text-[#475569]">{n.sequenceName || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[100px] h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#2563EB] rounded-full"
                            style={{ width: `${n.progress ?? 0}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-[#64748B]">{n.completedSteps ?? 0}/{n.totalSteps ?? 0}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[12px] text-[#64748B]">{n.lastActivity ? new Date(n.lastActivity).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="px-5 py-3">
                      <span className="tag-pill bg-[#DBEAFE] text-[#1D4ED8] uppercase text-[10.5px]">
                        {n.stage || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {n.isPaused ? (
                          <button
                            onClick={() => resumeLeadNurture(n.leadId)}
                            className="text-[11px] font-semibold text-[#059669] hover:bg-[#ECFDF5] px-2 py-1 rounded-[6px] transition-all"
                            title="Resume"
                          >
                            Resume
                          </button>
                        ) : (
                          <button
                            onClick={() => pauseLeadNurture(n.leadId)}
                            className="text-[11px] font-semibold text-[#D97706] hover:bg-[#FEF3C7] px-2 py-1 rounded-[6px] transition-all"
                            title="Pause"
                          >
                            Pause
                          </button>
                        )}
                        <button
                          className="text-[11px] font-semibold text-[#475569] hover:bg-[#F1F5F9] px-2 py-1 rounded-[6px] transition-all"
                          title="Skip Step"
                        >
                          Skip
                        </button>
                        <button
                          className="text-[11px] font-semibold text-[#2563EB] hover:bg-[#EFF6FF] px-2 py-1 rounded-[6px] transition-all"
                          title="Send Now"
                        >
                          Send Now
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
