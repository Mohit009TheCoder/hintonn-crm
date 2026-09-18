import React, { useState, useEffect } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';
import { useToast } from '../../shared/Toast';

export default function Automations() {
  const { leads, fetchLeads, authFetch } = useCRM();
  const toast = useToast();
  const [automationStatus, setAutomationStatus] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const fetcher = authFetch || fetch;
        const res = await fetcher('/api/webhooks/status');
        const data = await res.json();
        if (data.success) setAutomationStatus(data.data);
      } catch (e) { /* ignore */ }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // Compute real stats from leads
  const totalSent = leads.reduce((sum, l) => sum + (l.automationLog || []).filter(a => a.status === 'sent').length, 0);
  const totalFailed = leads.reduce((sum, l) => sum + (l.automationLog || []).filter(a => a.status === 'failed').length, 0);
  const activeLeads = leads.filter(l => !['won', 'lost'].includes(l.stage) && !l.automationPaused);
  const pausedLeads = leads.filter(l => l.automationPaused);
  const repliedLeads = leads.filter(l => l.repliedAt);

  // Automation rules based on real engine
  const rules = [
    {
      id: 1,
      title: 'Instant WhatsApp Welcome',
      trigger: 'New lead created in system',
      action: 'Send personalized welcome message with project details via n8n webhook',
      enabled: true,
      executions: leads.reduce((sum, l) => sum + (l.automationLog || []).filter(a => a.templateId?.startsWith('new_')).length, 0),
      icon: 'messagecircle',
      color: '#2563EB'
    },
    {
      id: 2,
      title: '24h Follow-up (No Reply)',
      trigger: 'Lead in New stage, no reply after 24 hours',
      action: 'Send follow-up nudge with project highlights and call-to-action',
      enabled: true,
      executions: leads.reduce((sum, l) => sum + (l.automationLog || []).filter(a => a.templateId?.includes('24h')).length, 0),
      icon: 'clock',
      color: '#D97706'
    },
    {
      id: 3,
      title: '12h Cadence Reminder',
      trigger: 'Lead in Contacted/Qualified stage, no reply after 12h',
      action: 'Send urgency message with limited availability and special offers',
      enabled: true,
      executions: leads.reduce((sum, l) => sum + (l.automationLog || []).filter(a => a.templateId?.includes('12h')).length, 0),
      icon: 'refresh',
      color: '#9333EA'
    },
    {
      id: 4,
      title: 'Stage-Change Automation',
      trigger: 'Lead stage updated (manual or automatic)',
      action: 'Send stage-appropriate message (site visit invite, negotiation offer, etc.)',
      enabled: true,
      executions: leads.reduce((sum, l) => sum + (l.automationLog || []).filter(a => a.templateId?.includes('visit') || a.templateId?.includes('offer') || a.templateId?.includes('engage')).length, 0),
      icon: 'zap',
      color: '#059669'
    },
    {
      id: 5,
      title: 'Won/Lost Auto-Stop',
      trigger: 'Lead moves to Won or Lost stage',
      action: 'Send final message (thank you or win-back) and stop all automation',
      enabled: true,
      executions: leads.reduce((sum, l) => sum + (l.automationLog || []).filter(a => a.templateId?.startsWith('won_') || a.templateId?.startsWith('lost_')).length, 0),
      icon: 'checkcircle',
      color: '#7E22CE'
    },
    {
      id: 6,
      title: 'Human Takeover Pause',
      trigger: 'Lead sends a WhatsApp reply',
      action: 'Pause automation, mark as human-handled until rep resumes',
      enabled: true,
      executions: repliedLeads.length,
      icon: 'users',
      color: '#DC2626'
    }
  ];

  // Stage-wise message templates
  const stageTemplates = [
    { stage: 'New', templates: ['Welcome + Project Info', '24h Follow-up'], delay: '0h → 24h' },
    { stage: 'Contacted', templates: ['Engagement Message', '12h Nudge', '24h Urgency'], delay: '0h → 12h → 24h' },
    { stage: 'Qualified', templates: ['Site Visit Invitation', '12h Visit Reminder', '24h Exclusive Offer'], delay: '0h → 12h → 24h' },
    { stage: 'Negotiation', templates: ['Special Offer', '12h Urgency', '24h Final Offer'], delay: '0h → 12h → 24h' },
    { stage: 'Won', templates: ['Booking Confirmation + Onboarding'], delay: '0h (final)' },
    { stage: 'Lost', templates: ['Win-Back Offer'], delay: '0h (final)' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="font-display font-extrabold text-[28px] tracking-tight text-[#0F172A]">
          Automations &amp; AI Workflow Engine
        </div>
        <div className="text-[#64748B] text-[14px] mt-0.5 max-w-[650px]">
          Real-time WhatsApp automation powered by n8n webhooks with stage-aware cadence engine.
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {[
          { label: 'Total Sent', value: String(totalSent), color: 'text-[#2563EB]', bg: 'bg-[#DBEAFE]', icon: 'messagecircle' },
          { label: 'Failed', value: String(totalFailed), color: 'text-[#DC2626]', bg: 'bg-[#FEE2E2]', icon: 'alerttriangle' },
          { label: 'Active Leads', value: String(activeLeads.length), color: 'text-[#059669]', bg: 'bg-[#D1FAE5]', icon: 'sparkle' },
          { label: 'Paused', value: String(pausedLeads.length), color: 'text-[#D97706]', bg: 'bg-[#FEF3C7]', icon: 'pause' },
          { label: 'Replied', value: String(repliedLeads.length), color: 'text-[#7E22CE]', bg: 'bg-[#F3E8FF]', icon: 'checkcircle' }
        ].map((card, i) => (
          <div key={i} className="bg-white border border-[#E2E8F0] rounded-[16px] p-[18px] card-base">
            <div className="flex items-center gap-2 mb-2">
              <span className={card.color}><Icon name={card.icon} size={14} /></span>
              <span className="text-[11px] text-[#64748B] font-medium">{card.label}</span>
            </div>
            <div className={`font-display font-extrabold text-[24px] tracking-tight ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Visual Rule Flow Banner */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-6">
        <div className="font-display font-bold text-[16px] text-[#0F172A] mb-1">WhatsApp Automation Flow</div>
        <div className="text-[12.4px] text-[#64748B] mb-5">End-to-end automation sequence triggered on every lead</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[
            { step: '01', title: 'Lead Created', desc: 'Meta, Portals, Website, Walk-in' },
            { step: '02', title: 'Welcome Message', desc: 'Instant WhatsApp via n8n webhook' },
            { step: '03', title: 'Stage Cadence', desc: '12h/24h nudges based on stage' },
            { step: '04', title: 'Human Takeover', desc: 'Auto-pauses when lead replies' },
            { step: '05', title: 'Won/Lost Close', desc: 'Final message, automation stops' }
          ].map((s, idx) => (
            <div key={s.step} className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] relative">
              <div className="text-[10px] font-bold text-[#2563EB] font-mono mb-1">STEP {s.step}</div>
              <div className="font-bold text-[13.5px] text-[#0F172A]">{s.title}</div>
              <div className="text-[11.5px] text-[#64748B] mt-0.5">{s.desc}</div>
              {idx < 4 && (
                <div className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 text-[#94A3B8]">→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Active Workflow Rules */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-display font-bold text-[16px] text-[#0F172A]">Active Automation Rules</div>
            <div className="text-[12.4px] text-[#64748B]">Real-time automation engine rules</div>
          </div>
          <span className="tag-pill bg-[#D1FAE5] text-[#047857] text-[10px]">
            {automationStatus?.schedulerRunning ? 'SCHEDULER ACTIVE' : 'SCHEDULER OFFLINE'}
          </span>
        </div>

        <div className="space-y-3">
          {rules.map(r => (
            <div key={r.id} className="p-4 bg-[#FAFBFC] border border-[#E2E8F0] rounded-[12px] flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: r.color + '15', color: r.color }}>
                  <Icon name={r.icon} size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-[14px] text-[#0F172A]">{r.title}</span>
                    <span className="tag-pill bg-[#D1FAE5] text-[#047857] text-[10px]">ACTIVE</span>
                  </div>
                  <div className="text-[12.5px] text-[#475569]"><strong className="text-[#0F172A]">When:</strong> {r.trigger}</div>
                  <div className="text-[12.5px] text-[#64748B]"><strong className="text-[#0F172A]">Then:</strong> {r.action}</div>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <div className="font-mono font-bold text-[16px] text-[#2563EB]">{r.executions}</div>
                <div className="text-[10px] text-[#94A3B8]">Executed</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stage-wise Message Templates */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0]">
          <div className="font-bold text-[14px] text-[#0F172A]">Stage-wise Message Templates</div>
          <div className="text-[12px] text-[#64748B]">Messages sent automatically based on lead stage and timing</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="text-[11.5px] font-semibold text-[#94A3B8] border-b border-[#E2E8F0] bg-[#FAFBFC]">
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Cadence</th>
                <th className="px-4 py-3">Message Templates</th>
                <th className="px-4 py-3">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {stageTemplates.map(row => {
                const sentCount = leads.reduce((sum, l) => {
                  return sum + (l.automationLog || []).filter(a => {
                    const tid = a.templateId || '';
                    if (row.stage === 'New') return tid.startsWith('new_');
                    if (row.stage === 'Contacted') return tid.startsWith('contacted_');
                    if (row.stage === 'Qualified') return tid.startsWith('qualified_');
                    if (row.stage === 'Negotiation') return tid.startsWith('negotiate_');
                    if (row.stage === 'Won') return tid.startsWith('won_');
                    if (row.stage === 'Lost') return tid.startsWith('lost_');
                    return false;
                  }).length;
                }, 0);

                return (
                  <tr key={row.stage} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3">
                      <span className="tag-pill bg-[#DBEAFE] text-[#1D4ED8] uppercase text-[10px] font-bold">{row.stage}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[#64748B]">{row.delay}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {row.templates.map(t => (
                          <span key={t} className="tag-pill bg-[#F1F5F9] text-[#475569] text-[10px]">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[#2563EB]">{sentCount}</td>
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
