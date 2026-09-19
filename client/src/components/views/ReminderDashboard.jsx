import React, { useMemo } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';
import { useToast } from '../../shared/Toast';
import { getNextReminderInfo } from '../../utils/reminderLogic';

export default function ReminderDashboard({ onSelectLead }) {
  const { leads, authFetch, fetchLeads } = useCRM();
  const toast = useToast();

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

  // Compute metrics and enriched leads
  const { metrics, groupedLeads } = useMemo(() => {
    let totalSent = 0;
    let activeCount = 0;
    let next24h = 0;
    
    const enriched = leads.map(lead => {
      const log = lead.automationLog || [];
      const sentCount = log.filter(l => l.status === 'sent').length;
      totalSent += sentCount;
      
      const lastSentLog = [...log].reverse().find(l => l.status === 'sent');
      const reminderInfo = getNextReminderInfo(lead);
      
      if (!['won', 'lost'].includes(lead.stage) && !lead.automationPaused) {
        activeCount++;
      }

      if (reminderInfo.status === 'scheduled' || reminderInfo.status === 'overdue') {
        const timeDiff = reminderInfo.nextTime.getTime() - Date.now();
        if (timeDiff <= 24 * 60 * 60 * 1000) {
          next24h++;
        }
      }

      return {
        ...lead,
        sentCount,
        lastSentMessage: lastSentLog ? lastSentLog.label : 'None',
        reminderInfo
      };
    });

    const grouped = {
      new: enriched.filter(l => l.stage === 'new'),
      contacted: enriched.filter(l => l.stage === 'contacted'),
      qualified: enriched.filter(l => l.stage === 'qualified'),
      negotiation: enriched.filter(l => l.stage === 'negotiation')
    };

    return { metrics: { totalSent, activeCount, next24h }, groupedLeads: grouped };
  }, [leads]);

  const renderLeadRow = (lead) => {
    const { reminderInfo } = lead;
    const isPaused = lead.automationPaused;
    
    return (
      <tr key={lead.id} className="hover:bg-[#F8FAFC] transition-colors">
        <td className="px-5 py-3 cursor-pointer" onClick={() => onSelectLead && onSelectLead(lead.id)}>
          <div className="font-semibold text-[#0F172A]">{lead.name}</div>
          <div className="text-[11px] text-[#64748B] font-mono">{lead.phone}</div>
        </td>
        <td className="px-5 py-3">
          <span className="tag-pill bg-[#DBEAFE] text-[#1D4ED8] uppercase text-[10.5px]">
            {lead.stage}
          </span>
        </td>
        <td className="px-5 py-3">
          <div className="text-[12px] font-medium text-[#475569]">
            {lead.sentCount > 0 ? (
              <span className="text-[#059669] flex items-center gap-1">
                <Icon name="checkcircle" size={12} /> {lead.sentCount} sent
              </span>
            ) : '0 sent'}
          </div>
          <div className="text-[11px] text-[#64748B] truncate max-w-[150px]" title={lead.lastSentMessage}>
            Last: {lead.lastSentMessage}
          </div>
        </td>
        <td className="px-5 py-3">
          {isPaused ? (
            <span className="tag-pill bg-[#F1F5F9] text-[#64748B] text-[10px]">PAUSED</span>
          ) : reminderInfo.status === 'scheduled' || reminderInfo.status === 'overdue' ? (
            <div>
              <div className="text-[12px] font-semibold text-[#0F172A] truncate max-w-[180px]">
                {reminderInfo.nextMessage}
              </div>
              <div className={`text-[11px] font-mono ${reminderInfo.status === 'overdue' ? 'text-[#DC2626] font-bold' : 'text-[#2563EB]'}`}>
                {reminderInfo.status === 'overdue' ? 'Due now' : reminderInfo.nextTime.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ) : reminderInfo.status === 'completed' ? (
            <span className="tag-pill bg-[#D1FAE5] text-[#059669] text-[10px]">ALL SENT</span>
          ) : (
            <span className="text-[#94A3B8] text-[12px]">—</span>
          )}
        </td>
        <td className="px-5 py-3 text-right">
          <div className="flex items-center justify-end gap-1.5">
            {isPaused ? (
              <button
                onClick={() => handlePauseLead(lead.id, false)}
                className="text-[11px] font-semibold text-[#059669] hover:bg-[#ECFDF5] px-2 py-1 rounded-[6px] transition-all border border-transparent hover:border-[#059669]"
              >
                Resume
              </button>
            ) : (
              <button
                onClick={() => handlePauseLead(lead.id, true)}
                className="text-[11px] font-semibold text-[#D97706] hover:bg-[#FEF3C7] px-2 py-1 rounded-[6px] transition-all border border-transparent hover:border-[#D97706]"
              >
                Pause
              </button>
            )}
            
            <button
              onClick={() => handleTriggerLead(lead.id)}
              disabled={reminderInfo.status !== 'scheduled' && reminderInfo.status !== 'overdue'}
              className="text-[11px] font-semibold text-[#2563EB] hover:bg-[#EFF6FF] px-2 py-1 rounded-[6px] transition-all border border-transparent hover:border-[#2563EB] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-transparent"
              title="Force send next message"
            >
              Send Next
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const renderStageSection = (title, leadsList) => {
    if (!leadsList || leadsList.length === 0) return null;
    return (
      <div className="mb-8 last:mb-0">
        <h3 className="font-display font-bold text-[15px] text-[#0F172A] mb-3 px-1">{title} Stage</h3>
        <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px] text-left">
              <thead>
                <tr className="text-[11.5px] font-semibold text-[#94A3B8] border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <th className="px-5 py-3">Lead</th>
                  <th className="px-5 py-3">Stage</th>
                  <th className="px-5 py-3">History</th>
                  <th className="px-5 py-3">Next Scheduled Reminder</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-[13px]">
                {leadsList.map(renderLeadRow)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="font-display font-extrabold text-[28px] tracking-tight text-[#0F172A]">
            Reminders Dashboard
          </div>
          <div className="text-[#64748B] text-[14px] mt-0.5">
            Stage-wise view of past and upcoming automated reminders.
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-base bg-white border border-[#E2E8F0] rounded-[14px] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="checkcircle" size={16} className="text-[#059669]" />
            <span className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wider">Total Sent</span>
          </div>
          <div className="font-display font-extrabold text-[24px] text-[#0F172A]">{metrics.totalSent}</div>
        </div>
        <div className="card-base bg-[#F0FDF4] border border-[#BBF7D0] rounded-[14px] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="zap" size={16} className="text-[#047857]" />
            <span className="text-[12px] font-semibold text-[#065F46] uppercase tracking-wider">Active Sequences</span>
          </div>
          <div className="font-display font-extrabold text-[24px] text-[#065F46]">{metrics.activeCount} leads</div>
        </div>
        <div className="card-base bg-[#EFF6FF] border border-[#BFDBFE] rounded-[14px] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="clock" size={16} className="text-[#1D4ED8]" />
            <span className="text-[12px] font-semibold text-[#1E3A8A] uppercase tracking-wider">Due in 24h</span>
          </div>
          <div className="font-display font-extrabold text-[24px] text-[#1E3A8A]">{metrics.next24h} messages</div>
        </div>
      </div>

      {/* Stage Sections */}
      <div>
        {renderStageSection('New', groupedLeads.new)}
        {renderStageSection('Contacted', groupedLeads.contacted)}
        {renderStageSection('Qualified', groupedLeads.qualified)}
        {renderStageSection('Negotiation', groupedLeads.negotiation)}

        {leads.filter(l => ['new', 'contacted', 'qualified', 'negotiation'].includes(l.stage)).length === 0 && (
          <div className="text-center py-12 card-base bg-white border border-[#E2E8F0] rounded-[16px]">
            <div className="text-[#94A3B8] mb-2"><Icon name="inbox" size={32} /></div>
            <div className="text-[14px] font-semibold text-[#475569]">No active leads in pipeline</div>
            <div className="text-[13px] text-[#94A3B8]">Leads will appear here as they enter the nurture stages.</div>
          </div>
        )}
      </div>
    </div>
  );
}
