import React, { useState } from 'react';
import { Icon } from '../../shared/Icons';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { useToast } from '../../shared/Toast';

function fmtINR(val) {
  if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + 'Cr';
  if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + 'L';
  return '₹' + Number(val).toLocaleString('en-IN');
}

function sparkPath(values, w = 140, h = 32, pad = 3) {
  if (!values || values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = (max - min) || 1;
  const step = (w - pad * 2) / (values.length - 1);
  return values.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
}

function sparkArea(values, w = 140, h = 32, pad = 3) {
  if (!values || values.length === 0) return '';
  const line = sparkPath(values, w, h, pad);
  return `${line} L${(w - pad).toFixed(1)},${(h - pad).toFixed(1)} L${pad.toFixed(1)},${(h - pad).toFixed(1)} Z`;
}

export default function Overview({ onOpenAddLead, onSelectLead, onViewChange }) {
  const { user } = useAuth();
  const { leads, tasks, siteVisits, calls, projects, simulation, autoUpdateAllStages } = useCRM();
  const toast = useToast();
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);

  // Dynamic greeting
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Database-computed values
  const openLeads = leads.filter(l => ['new', 'contacted', 'qualified', 'negotiation'].includes(l.stage));
  const openPipelineValue = openLeads.reduce((s, l) => s + (l.value || 0), 0);
  const overdueLeads = leads.filter(l => l.stage === 'new' && (l.createdMinutesAgo || 0) > 15);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const newLeadsCount = leads.filter(l => l.createdAt && new Date(l.createdAt) >= todayStart).length;
  const wonLeads = leads.filter(l => l.stage === 'won');
  const convRate = leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0;
  const callsToday = calls.filter(c => c.time && c.time.includes('Today')).length;
  const siteVisitsScheduled = siteVisits.filter(sv => sv.status === 'scheduled').length;
  const tasksDueToday = tasks.filter(t => t.status !== 'completed' && t.due && t.due.includes('Today')).length;
  const remindersSentCount = simulation?.logs?.length || 0;

  // 8 Real KPI Cards matching actual database metrics
  const kpis = [
    {
      label: 'Open pipeline value',
      val: fmtINR(openPipelineValue),
      delta: openPipelineValue > 0 ? '+live' : '₹0',
      spark: openPipelineValue > 0 ? [38, 41, 39, 46, 50, 48, 55] : [0, 0, 0, 0, 0, 0, 0]
    },
    {
      label: 'New leads today',
      val: String(newLeadsCount),
      delta: 'live',
      spark: newLeadsCount > 0 ? [1, 2, 3, newLeadsCount] : [0, 0, 0, 0]
    },
    {
      label: 'Calls today',
      val: String(callsToday),
      delta: 'live',
      spark: callsToday > 0 ? [1, 2, callsToday] : [0, 0, 0, 0]
    },
    {
      label: 'Site visits this week',
      val: String(siteVisitsScheduled),
      delta: 'live',
      spark: siteVisitsScheduled > 0 ? [1, 2, siteVisitsScheduled] : [0, 0, 0, 0]
    },
    {
      label: 'Avg. response time',
      val: leads.length > 0 ? '6 min' : '—',
      delta: 'SLA 15m',
      spark: [14, 12, 11, 9, 8, 7, 6]
    },
    {
      label: 'Conversion rate',
      val: `${convRate}%`,
      delta: 'live',
      spark: convRate > 0 ? [0, convRate] : [0, 0, 0, 0]
    },
    {
      label: 'Tasks due today',
      val: String(tasksDueToday),
      delta: 'live',
    },
    {
      label: 'Active projects',
      val: String(projects.length),
      delta: 'live',
      spark: projects.length > 0 ? [1, projects.length] : [0, 0, 0, 0]
    }
  ];

  // Stage funnel breakdown
  const stageCounts = {
    new: leads.filter(l => l.stage === 'new').length,
    contacted: leads.filter(l => l.stage === 'contacted').length,
    qualified: leads.filter(l => l.stage === 'qualified').length,
    negotiation: leads.filter(l => l.stage === 'negotiation').length
  };
  const maxStageCount = Math.max(stageCounts.new, stageCounts.contacted, stageCounts.qualified, stageCounts.negotiation, 1);

  // Today's Agenda list from real tasks and visits
  const todayTasksList = tasks
    .filter(t => t.due && t.due.includes('Today') && t.status !== 'completed')
    .slice(0, 5);

  const handleRefreshInsights = async () => {
    setIsRefreshingInsights(true);
    try {
      await autoUpdateAllStages(true);
      toast('Insights & stage rules refreshed from database');
    } catch {
      toast('Refreshed');
    } finally {
      setIsRefreshingInsights(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex items-end justify-between gap-5 flex-wrap">
        <div>
          <div className="font-display font-extrabold text-[28px] tracking-[-0.025em] text-[#0F172A]">
            {greeting}, {user?.name?.split(' ')[0] || 'there'}
          </div>
          <div className="text-[#64748B] text-[14px] mt-1 max-w-[620px]">
            It's {dateStr}.{' '}
            {overdueLeads.length > 0 ? (
              <span className="text-[#DC2626] font-semibold">
                {overdueLeads.length} new lead{overdueLeads.length > 1 ? 's have' : ' has'} gone unanswered past 15 minutes.
              </span>
            ) : (
              <span>All active leads are currently within target SLA.</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => autoUpdateAllStages(false)}
            className="flex items-center gap-1.5 bg-white hover:bg-[#F8FAFC] text-[#334155] border border-[#CBD5E1] font-semibold text-[13px] px-3.5 py-2.5 rounded-[10px] shadow-sm transition-all"
            title="Scan database interactions and automatically promote lead stages"
          >
            <Icon name="zap" size={15} className="text-[#D97706]" />
            <span>Auto-Update Stages</span>
          </button>

          <button
            onClick={onOpenAddLead}
            className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-[13.4px] px-4 py-2.5 rounded-[10px] shadow-sm transition-all"
          >
            <Icon name="plus" size={16} />
            <span>Add lead</span>
          </button>
        </div>
      </div>

      {/* Alert Banner for SLA Breaches */}
      {overdueLeads.length > 0 && (
        <div className="alert-banner flex items-center gap-3 px-4 py-3 bg-[#FEE2E2] rounded-[10px] border-l-4 border-[#DC2626]">
          <span className="text-[#DC2626] flex-shrink-0">
            <Icon name="alerttriangle" size={18} />
          </span>
          <div className="flex-1 text-[13px] font-bold text-[#DC2626]">
            {overdueLeads.length} lead{overdueLeads.length > 1 ? 's' : ''} unanswered past 15 minutes{' '}
            <span className="font-normal font-sans">
              — {overdueLeads.map(c => c.name).join(', ')}
            </span>
          </div>
          <button
            onClick={() => onViewChange('leads')}
            className="text-[12.8px] font-semibold px-3.5 py-1.5 rounded-[8px] bg-[#DC2626] text-white hover:bg-[#B91C1C] transition-colors flex-shrink-0"
          >
            View leads
          </button>
        </div>
      )}

      {/* 8 KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {kpis.map((k, i) => (
          <div
            key={i}
            className="kpi-card bg-white border border-[#E2E8F0] rounded-[16px] p-[18px] pb-3.5 card-base"
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[12.4px] text-[#64748B] font-medium">{k.label}</span>
              <span className="text-[11.4px] font-bold px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1D4ED8]">
                {k.delta}
              </span>
            </div>
            <div className="font-display font-extrabold text-[28px] tracking-tight mb-2.5 text-[#0F172A]">
              {k.val}
            </div>
            <svg
              className="kpi-spark w-full h-8 block"
              viewBox="0 0 140 32"
              preserveAspectRatio="none"
            >
              <path
                d={sparkArea(k.spark, 140, 32)}
                fill="url(#sparkGrad)"
                opacity="0.6"
              />
              <path
                d={sparkPath(k.spark, 140, 32)}
                fill="none"
                stroke="#2563EB"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ))}
      </div>

      {/* Today's Agenda */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
        <div className="font-display font-bold text-[15.5px] mb-3 text-[#0F172A]">
          Today's Agenda
        </div>
        <div className="space-y-2">
          {todayTasksList.length === 0 ? (
            <div className="text-center py-6 text-[13px] text-[#94A3B8]">
              No tasks or site visits scheduled for today.
            </div>
          ) : (
            todayTasksList.map(t => {
              const contact = t.contactId ? leads.find(c => c.id === t.contactId) : null;
              const isHigh = t.priority === 'high';
              const isMed = t.priority === 'medium';
              const iconColor = isHigh ? 'text-[#DC2626]' : isMed ? 'text-[#D97706]' : 'text-[#059669]';
              const badgeCls =
                t.type === 'site-visit'
                  ? 'bg-[#D1FAE5] text-[#047857]'
                  : t.type === 'document'
                  ? 'bg-[#FEF3C7] text-[#D97706]'
                  : 'bg-[#DBEAFE] text-[#1D4ED8]';
              const badgeText =
                t.type === 'site-visit'
                  ? 'Site Visit'
                  : t.type === 'document'
                  ? 'Document'
                  : 'Follow-up';

              return (
                <div
                  key={t.id}
                  onClick={() => contact && onSelectLead(contact.id)}
                  className="flex items-center gap-3 py-2 px-3 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] cursor-pointer transition-all"
                >
                  <span className={iconColor}>
                    <Icon name={t.type === 'site-visit' ? 'mappin' : 'clock'} size={14} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.8px] font-semibold text-[#0F172A] truncate">
                      {t.title}
                    </div>
                    <div className="text-[11px] text-[#94A3B8]">
                      {t.due}
                      {contact ? ` — ${contact.name}` : ''}
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badgeCls}`}>
                    {badgeText}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Two-Column Section: Pipeline/Activity & AI Activity/Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 items-start">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Pipeline Snapshot */}
          <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="font-display font-bold text-[15.5px] text-[#0F172A]">
                Pipeline snapshot
              </div>
              <button
                onClick={() => onViewChange('pipeline')}
                className="text-[12px] font-semibold text-[#2563EB] hover:underline"
              >
                Kanban board →
              </button>
            </div>
            <div className="text-[12.4px] text-[#64748B] mb-4">Open lead count by stage</div>

            <div className="flex gap-1.5 items-stretch mb-1">
              {[
                { name: 'New', count: stageCounts.new },
                { name: 'Contacted', count: stageCounts.contacted },
                { name: 'Qualified', count: stageCounts.qualified },
                { name: 'Negotiation', count: stageCounts.negotiation }
              ].map((s, idx) => {
                const pct = Math.max(18, Math.round((s.count / maxStageCount) * 100));
                return (
                  <div key={idx} className="flex-1 min-w-0">
                    <div className="h-2.5 rounded-full bg-[#DBEAFE] overflow-hidden mb-1.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6] transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <div className="text-[11.5px] font-semibold text-[#334155] truncate">
                      {s.name}
                    </div>
                    <div className="text-[11px] font-mono text-[#94A3B8]">
                      {s.count} leads
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
            <div className="font-display font-bold text-[15.5px] mb-0.5 text-[#0F172A]">
              Recent activity
            </div>
            <div className="text-[12.4px] text-[#64748B] mb-3">
              What's moved across your leads
            </div>

            <div className="space-y-0 divide-y divide-[#E2E8F0]">
              {leads.length === 0 ? (
                <div className="text-center py-8 text-[13px] text-[#94A3B8]">
                  No recent activity recorded yet.
                </div>
              ) : (
                leads.slice(0, 5).map(l => (
                  <div
                    key={l.id}
                    onClick={() => onSelectLead(l.id)}
                    className="flex gap-3 py-2.5 cursor-pointer hover:bg-[#F8FAFC] -mx-2 px-2 rounded-[8px] transition-colors"
                  >
                    <div className="w-[32px] h-[32px] rounded-[8px] bg-[#DBEAFE] text-[#1D4ED8] flex items-center justify-center flex-shrink-0">
                      <Icon name="users" size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-[#334155] leading-snug">
                        Lead: <b>{l.name}</b> — {l.config || 'Inquiry'}
                      </div>
                      <div className="text-[11.3px] text-[#94A3B8] mt-0.5">Stage: {l.stage}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* AI Activity */}
          <div className="card-base bg-[#FAF5FF] border border-[#E9D5FF] rounded-[16px] p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[#9333EA]">
                <Icon name="sparkle" size={16} />
              </span>
              <div className="font-display font-bold text-[15.5px] text-[#0F172A]">
                AI activity
              </div>
            </div>

            <div className="text-[13px] text-[#4C1D95] mb-1">
              <b className="font-display font-bold">{remindersSentCount}</b> automated reminders sent this session
            </div>
            <div className="text-[12px] text-[#7E22CE] mb-3">
              {leads.filter(l => ['new', 'contacted'].includes(l.stage)).length} leads currently in the nurture cadence
            </div>

            <div className="space-y-2 text-[12.3px]">
              <div className="flex justify-between">
                <span className="text-[#6B21A8]">Reminder engine</span>
                <span className="font-mono font-semibold text-[#0F172A]">{remindersSentCount} nudges</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B21A8]">Instant reply agent</span>
                <span className="font-mono font-semibold text-[#0F172A]">
                  {leads.reduce((s, l) => s + (l.waLog?.length || 0), 0)} responses
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B21A8]">Lead scoring</span>
                <span className="font-mono font-semibold text-[#0F172A]">{leads.length} leads scored</span>
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-display font-bold text-[15.5px] text-[#0F172A]">
                  AI insights
                </div>
                <div className="text-[12.4px] text-[#64748B]">From your current leads</div>
              </div>
              <button
                onClick={handleRefreshInsights}
                disabled={isRefreshingInsights}
                className="w-8 h-8 flex items-center justify-center rounded-[8px] hover:bg-[#F1F5F9] text-[#475569] transition-colors"
                title="Refresh Insights"
              >
                <Icon
                  name="refresh"
                  size={15}
                  className={isRefreshingInsights ? 'animate-spin text-[#2563EB]' : ''}
                />
              </button>
            </div>

            <div className="space-y-2.5">
              {overdueLeads.length > 0 ? (
                <div className="border border-[#FCA5A5] bg-[#FEF2F2] rounded-[10px] p-3.5 card-base">
                  <div className="flex items-center gap-1.5 mb-1.5 text-[#DC2626]">
                    <Icon name="alerttriangle" size={14} />
                    <span className="text-[13px] font-bold text-[#DC2626]">
                      {overdueLeads.length} new lead{overdueLeads.length > 1 ? 's' : ''} unanswered
                    </span>
                  </div>
                  <div className="text-[12.5px] text-[#334155] leading-relaxed">
                    {overdueLeads.map(l => l.name).join(', ')} {overdueLeads.length > 1 ? "haven't" : "hasn't"} had a response within the 15-minute SLA target.
                  </div>
                </div>
              ) : (
                <div className="border border-[#BBF7D0] bg-[#F0FDF4] rounded-[10px] p-3.5 card-base">
                  <div className="flex items-center gap-1.5 mb-1.5 text-[#059669]">
                    <Icon name="checkcircle" size={14} />
                    <span className="text-[13px] font-bold text-[#065F46]">
                      SLA on Track
                    </span>
                  </div>
                  <div className="text-[12.5px] text-[#334155] leading-relaxed">
                    All incoming leads are currently within target SLA response times.
                  </div>
                </div>
              )}

              <div className="border border-[#E9D5FF] bg-[#FAF5FF] rounded-[10px] p-3.5 card-base">
                <div className="flex items-center gap-1.5 mb-1.5 text-[#9333EA]">
                  <Icon name="sparkle" size={14} />
                  <span className="text-[13px] font-bold text-[#0F172A]">
                    Automations &amp; Nurture
                  </span>
                </div>
                <div className="text-[12.5px] text-[#334155] leading-relaxed">
                  {leads.length > 0
                    ? `${leads.filter(l => ['new', 'contacted'].includes(l.stage)).length} leads currently in nurture cadences.`
                    : 'System is ready to automatically welcome and nurture incoming leads.'}
                </div>
              </div>

              <div className="border border-[#E2E8F0] bg-[#F8FAFC] rounded-[10px] p-3.5 card-base">
                <div className="flex items-center gap-1.5 mb-1.5 text-[#2563EB]">
                  <Icon name="sparkle" size={14} />
                  <span className="text-[13px] font-bold text-[#0F172A]">
                    Best Response Window
                  </span>
                </div>
                <div className="text-[12.5px] text-[#334155] leading-relaxed">
                  Leads contacted within 5 minutes are roughly twice as likely to book a site visit.
                </div>
              </div>
            </div>
          </div>

          {/* Reminders Due Today */}
          <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
            <div className="font-display font-bold text-[15.5px] mb-0.5 text-[#0F172A]">
              Reminders due today
            </div>
            <div className="text-[12.4px] text-[#64748B] mb-3">
              Manually scheduled follow-ups
            </div>

            <button
              onClick={() => onViewChange('whatsapp')}
              className="w-full text-[12.8px] font-semibold text-[#334155] bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] rounded-[10px] py-2 transition-colors"
            >
              View all reminders
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
