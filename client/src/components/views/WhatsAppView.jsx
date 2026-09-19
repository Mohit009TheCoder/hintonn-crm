import React, { useState, useEffect } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';
import { useToast } from '../../shared/Toast';

export default function WhatsAppView() {
  const { broadcasts, createBroadcast, leads, fetchLeads, authFetch } = useCRM();
  const toast = useToast();

  const [showBroadcastForm, setShowBroadcastForm] = useState(false);
  const [bcName, setBcName] = useState('');
  const [bcSegment, setBcSegment] = useState('All Leads');
  const [bcMessage, setBcMessage] = useState('Hi {{name}}! Exclusive open house at {{project}} this weekend. Reply YES to reserve your slot.');
  const [automationStatus, setAutomationStatus] = useState(null);
  const [automationLogs, setAutomationLogs] = useState([]);

  // Fetch automation status from backend
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const fetcher = authFetch || fetch;
        const res = await fetcher('/api/webhooks/status');
        const data = await res.json();
        if (data.success) setAutomationStatus(data.data);
      } catch (e) {
        console.error('Failed to fetch automation status', e);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Collect automation logs from all leads
  useEffect(() => {
    const logs = [];
    leads.forEach(lead => {
      (lead.automationLog || []).forEach(log => {
        logs.push({
          ...log,
          leadId: lead.id,
          leadName: lead.name,
          leadStage: lead.stage
        });
      });
    });
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setAutomationLogs(logs.slice(0, 50)); // Last 50 entries
  }, [leads]);

  const handleCreateBroadcast = (status = 'sent') => {
    if (!bcName.trim() || !bcMessage.trim()) return;
    createBroadcast({
      name: bcName.trim(),
      segment: bcSegment,
      message: bcMessage.trim(),
      status
    });
    setBcName('');
    setShowBroadcastForm(false);
  };

  const handlePauseLead = async (leadId, pause) => {
    try {
      const fetcher = authFetch || fetch;
      const res = await fetcher(`/api/webhooks/pause/${leadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pause })
      });
      const data = await res.json();
      if (data.success) {
        toast(data.message);
        fetchLeads();
      }
    } catch (e) {
      toast('Failed to update automation');
    }
  };

  const handleTriggerLead = async (leadId) => {
    try {
      const fetcher = authFetch || fetch;
      const res = await fetcher(`/api/webhooks/trigger/${leadId}`, { method: 'POST' });
      const data = await res.json();
      toast(data.message);
      fetchLeads();
    } catch (e) {
      toast('Failed to trigger automation');
    }
  };

  // Leads with active automation
  const activeLeads = leads.filter(l => !['won', 'lost'].includes(l.stage) && !l.automationPaused);
  const pausedLeads = leads.filter(l => l.automationPaused);
  const totalSent = automationLogs.filter(l => l.status === 'sent').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="font-display font-extrabold text-[28px] tracking-tight text-[#0F172A]">
          WhatsApp &amp; Automation Engine
        </div>
        <div className="text-[#64748B] text-[14px] mt-0.5 max-w-[700px]">
          Automated nurture campaigns, direct Meta API integration, and stage-aware reminder cadences.
        </div>
      </div>

      {/* Automation Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          {
            label: 'WhatsApp API',
            value: automationStatus?.configured ? 'Connected' : 'Disconnected',
            color: automationStatus?.configured ? 'text-[#059669]' : 'text-[#DC2626]',
            bg: automationStatus?.configured ? 'bg-[#D1FAE5]' : 'bg-[#FEE2E2]',
            icon: 'zap'
          },
          {
            label: 'Active Automations',
            value: String(automationStatus?.activeLeads || activeLeads.length),
            color: 'text-[#2563EB]',
            bg: 'bg-[#DBEAFE]',
            icon: 'sparkle'
          },
          {
            label: 'Paused (Human Takeover)',
            value: String(automationStatus?.pausedLeads || pausedLeads.length),
            color: 'text-[#D97706]',
            bg: 'bg-[#FEF3C7]',
            icon: 'pause'
          },
          {
            label: 'Messages Sent',
            value: String(automationStatus?.totalMessagesSent || totalSent),
            color: 'text-[#7E22CE]',
            bg: 'bg-[#F3E8FF]',
            icon: 'messagecircle'
          }
        ].map((card, i) => (
          <div key={i} className="bg-white border border-[#E2E8F0] rounded-[16px] p-[18px] card-base">
            <div className="flex items-center gap-2 mb-2">
              <span className={card.color}><Icon name={card.icon} size={14} /></span>
              <span className="text-[12px] text-[#64748B] font-medium">{card.label}</span>
            </div>
            <div className={`font-display font-extrabold text-[24px] tracking-tight ${card.color}`}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Meta API Info */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center ${automationStatus?.configured ? 'bg-[#D1FAE5] text-[#059669]' : 'bg-[#FEE2E2] text-[#DC2626]'}`}>
            <Icon name="zap" size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[14px] text-[#0F172A]">Meta Cloud API Integration</span>
              <span className={`tag-pill text-[10px] ${automationStatus?.configured ? 'bg-[#D1FAE5] text-[#047857]' : 'bg-[#FEE2E2] text-[#DC2626]'}`}>
                {automationStatus?.configured ? 'ACTIVE' : 'OFFLINE'}
              </span>
            </div>
            <div className="text-[11.8px] text-[#64748B]">
              Mode: {automationStatus?.mode === 'direct_meta_api' ? 'Direct Meta API' : 'Unknown'}
              {automationStatus?.phoneNumberId ? ` · Phone ID: ${automationStatus.phoneNumberId}` : ''}
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${automationStatus?.configured ? 'text-[#059669] bg-[#D1FAE5]' : 'text-[#DC2626] bg-[#FEE2E2]'}`}>
            {automationStatus?.configured ? '● Engine Running' : '● Missing API credentials'}
          </span>
        </div>
      </div>

      {/* Broadcast Campaigns */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="font-display font-bold text-[16px] text-[#0F172A]">Broadcast Campaigns</div>
            <div className="text-[12.4px] text-[#64748B]">Targeted WhatsApp blasts with deliverability tracking</div>
          </div>
          <button
            onClick={() => setShowBroadcastForm(!showBroadcastForm)}
            className="flex items-center gap-1.5 bg-[#2563EB] text-white font-semibold text-[13px] px-3.5 py-2 rounded-[10px] hover:bg-[#1D4ED8] transition-all shadow-sm"
          >
            <Icon name="plus" size={15} />
            <span>Create Broadcast</span>
          </button>
        </div>

        {showBroadcastForm && (
          <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] mb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Campaign Name</label>
                <input type="text" placeholder="e.g. Navratri Festival Special" value={bcName} onChange={(e) => setBcName(e.target.value)} className="w-full px-3.5 py-2 rounded-[8px] border border-[#CBD5E1] text-[13px] outline-none bg-white" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Target Segment</label>
                <select value={bcSegment} onChange={(e) => setBcSegment(e.target.value)} className="w-full px-3 py-2 rounded-[8px] border border-[#CBD5E1] text-[13px] outline-none bg-white">
                  <option value="All Leads">All Leads</option>
                  <option value="New Leads">All New Leads</option>
                  <option value="Qualified Leads">Qualified Leads</option>
                  <option value="High Budget">High Budget Buyers</option>
                  <option value="Site Visit Ready">Site Visit Ready</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Message Template</label>
              <textarea rows={3} value={bcMessage} onChange={(e) => setBcMessage(e.target.value)} className="w-full px-3.5 py-2 rounded-[8px] border border-[#CBD5E1] text-[13px] outline-none bg-white resize-none" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowBroadcastForm(false)} className="text-[12.5px] font-semibold px-3 py-1.5 rounded-[8px] border border-[#CBD5E1] hover:bg-white">Cancel</button>
              <button onClick={() => handleCreateBroadcast('sent')} className="text-[12.5px] font-semibold px-4 py-1.5 rounded-[8px] bg-[#2563EB] text-white hover:bg-[#1D4ED8]">Send Blast Now</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {broadcasts.length === 0 ? (
            <div className="text-center py-8 text-[13px] text-[#94A3B8] bg-[#FAFBFC] border border-[#E2E8F0] rounded-[12px]">
              No broadcast campaigns created yet. Click "Create Broadcast" to start a campaign.
            </div>
          ) : (
            broadcasts.map(bc => (
              <div key={bc.id} className="p-4 bg-[#FAFBFC] border border-[#E2E8F0] rounded-[12px]">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-bold text-[14px] text-[#0F172A]">{bc.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="tag-pill bg-[#F3E8FF] text-[#7E22CE] text-[10.5px]">{bc.segment}</span>
                      <span className={`tag-pill text-[10.5px] ${bc.status === 'sent' ? 'bg-[#D1FAE5] text-[#047857]' : 'bg-[#DBEAFE] text-[#1D4ED8]'}`}>{bc.status}</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-[#94A3B8] font-mono">{bc.sentAt || bc.scheduledAt || 'Recent'}</div>
                </div>
                {bc.status === 'sent' && (
                  <div className="grid grid-cols-4 gap-2">
                    {[{ label: 'Sent', val: bc.sentCount, color: '#2563EB' }, { label: 'Delivered', val: bc.deliveredCount, color: '#059669' }, { label: 'Read', val: bc.readCount, color: '#9333EA' }, { label: 'Replied', val: bc.repliedCount, color: '#D97706' }].map(s => (
                      <div key={s.label} className="text-center p-2 bg-white rounded-[8px] border border-[#E2E8F0]">
                        <span className="font-mono font-bold text-[16px] block" style={{ color: s.color }}>{s.val}</span>
                        <span className="text-[10px] text-[#64748B]">{s.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Active Automation Leads */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <div className="font-bold text-[14px] text-[#0F172A]">Automation Status by Lead</div>
            <div className="text-[12px] text-[#64748B]">Real-time automation state for each lead</div>
          </div>
          <span className="text-[11px] font-mono text-[#94A3B8]">{activeLeads.length} active · {pausedLeads.length} paused</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="text-[11.5px] font-semibold text-[#94A3B8] border-b border-[#E2E8F0] bg-[#FAFBFC]">
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Messages Sent</th>
                <th className="px-4 py-3">Last Message</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {leads.filter(l => !['won', 'lost'].includes(l.stage)).map(l => {
                const sentCount = (l.automationLog || []).filter(a => a.status === 'sent').length;
                const lastLog = (l.automationLog || []).slice(-1)[0];
                const isActive = !l.automationPaused;

                return (
                  <tr key={l.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">{l.name}</td>
                    <td className="px-4 py-3">
                      <span className="tag-pill bg-[#DBEAFE] text-[#1D4ED8] uppercase text-[10px]">{l.stage}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[#2563EB]">{sentCount}</td>
                    <td className="px-4 py-3 text-[#64748B] text-[12px] max-w-[200px] truncate">
                      {lastLog ? lastLog.label : 'No messages yet'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`tag-pill text-[10px] ${isActive ? 'bg-[#D1FAE5] text-[#047857]' : 'bg-[#FEF3C7] text-[#D97706]'}`}>
                        {isActive ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleTriggerLead(l.id)}
                          className="text-[11px] font-semibold px-2 py-1 rounded-[6px] bg-[#DBEAFE] text-[#1D4ED8] hover:bg-[#BFDBFE]"
                          title="Trigger now"
                        >
                          Send
                        </button>
                        <button
                          onClick={() => handlePauseLead(l.id, !l.automationPaused)}
                          className={`text-[11px] font-semibold px-2 py-1 rounded-[6px] ${isActive ? 'bg-[#FEF3C7] text-[#D97706] hover:bg-[#FDE68A]' : 'bg-[#D1FAE5] text-[#047857] hover:bg-[#A7F3D0]'}`}
                        >
                          {isActive ? 'Pause' : 'Resume'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Automation Activity Log */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
        <div className="font-display font-bold text-[15.5px] text-[#0F172A] mb-1">Automation Activity Log</div>
        <div className="text-[12.4px] text-[#64748B] mb-3">Live feed of automated messages triggered by the engine</div>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {automationLogs.length === 0 ? (
            <div className="text-center py-8 text-[#94A3B8] text-[13px]">
              No automation messages yet. Messages will appear here when the engine sends WhatsApp nudges.
            </div>
          ) : (
            automationLogs.map((log, i) => (
              <div key={i} className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[10px] flex items-center justify-between text-[12.5px]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={log.status === 'sent' ? 'text-[#059669]' : 'text-[#DC2626]'}>
                    <Icon name={log.status === 'sent' ? 'checkcircle' : 'alerttriangle'} size={14} />
                  </span>
                  <span className="text-[#0F172A] font-medium truncate">
                    <b>{log.leadName}</b> ({log.leadStage}) — {log.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`tag-pill text-[9px] ${log.status === 'sent' ? 'bg-[#D1FAE5] text-[#047857]' : 'bg-[#FEE2E2] text-[#DC2626]'}`}>
                    {log.status}
                  </span>
                  <span className="font-mono text-[11px] text-[#94A3B8]">
                    {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
