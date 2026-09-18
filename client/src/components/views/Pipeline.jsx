import React, { useState } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';
import { useToast } from '../../shared/Toast';

function fmtINR(n) {
  if (!n) return '₹0';
  const abs = Math.abs(n);
  if (abs >= 10000000) return '₹' + (abs / 10000000).toFixed(2).replace(/\.00$/, '') + 'Cr';
  if (abs >= 100000) return '₹' + (abs / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
  return '₹' + Math.round(abs).toLocaleString('en-IN');
}

function healthOf(days = 0) {
  if (days <= 2) return { cls: 'bg-[#D1FAE5] text-[#047857]', label: 'On track' };
  if (days <= 7) return { cls: 'bg-[#FEF3C7] text-[#D97706]', label: 'At risk' };
  return { cls: 'bg-[#FEE2E2] text-[#DC2626]', label: 'Stalled' };
}

function srcBadge(source) {
  const iconMap = {
    'Facebook Ads': 'share2',
    'Instagram': 'share2',
    'Google Ads': 'target',
    '99acres': 'home',
    'MagicBricks': 'home',
    'Housing.com': 'home',
    'Website': 'globe',
    'WhatsApp': 'messagecircle',
    'Referral': 'users',
    'Walk-in': 'mappin',
    'Call-in': 'phone'
  };
  const iconName = iconMap[source] || 'globe';
  const isWa = source === 'WhatsApp';
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
        isWa ? 'bg-[#DBEAFE] border-[#BFDBFE] text-[#1D4ED8]' : 'bg-[#F1F5F9] border-[#E2E8F0] text-[#475569]'
      }`}
    >
      <Icon name={iconName} size={11} />
      <span>{source}</span>
    </span>
  );
}

const STAGES = [
  { id: 'new', name: 'New' },
  { id: 'contacted', name: 'Contacted' },
  { id: 'qualified', name: 'Qualified' },
  { id: 'negotiation', name: 'Negotiation' },
  { id: 'won', name: 'Won' },
  { id: 'lost', name: 'Lost' }
];

export default function Pipeline({ onSelectLead, onOpenDialer, onOpenAddLead }) {
  const { leads, updateLeadStage, autoUpdateAllStages, projects } = useCRM();
  const toast = useToast();

  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [lossModalLead, setLossModalLead] = useState(null);
  const [lossReason, setLossReason] = useState('Budget mismatch');
  const [summaryLead, setSummaryLead] = useState(null);
  const [summaryPosition, setSummaryPosition] = useState({ top: 0, left: 0 });
  const [stageMenuLeadId, setStageMenuLeadId] = useState(null);

  // Filter open active leads for metrics
  const openStages = ['new', 'contacted', 'qualified', 'negotiation'];
  const openLeads = leads.filter(l => openStages.includes(l.stage));
  const totalOpen = openLeads.reduce((s, l) => s + (l.value || 0), 0);
  const totalWeighted = openLeads.reduce(
    (s, l) => s + Math.round((l.value || 0) * ((l.dealProb || 50) / 100)),
    0
  );
  const totalOpenCount = openLeads.length;
  const avgLeadSize = totalOpenCount > 0 ? Math.round(totalOpen / totalOpenCount) : 0;

  // Move stage handler
  const handleMoveStage = (lead, targetStage) => {
    if (!lead || lead.stage === targetStage) return;
    setStageMenuLeadId(null);
    if (targetStage === 'lost') {
      setLossModalLead(lead);
    } else {
      updateLeadStage(lead.id, targetStage);
    }
  };

  const confirmLoss = () => {
    if (!lossModalLead) return;
    updateLeadStage(lossModalLead.id, 'lost', lossReason);
    setLossModalLead(null);
  };

  // Quick next stage progression
  const getNextStage = (currentStage) => {
    const order = ['new', 'contacted', 'qualified', 'negotiation', 'won'];
    const idx = order.indexOf(currentStage);
    return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
  };

  // Drag and Drop handlers
  const handleDragStart = (e, lead) => {
    setDraggedLeadId(lead.id);
    e.dataTransfer.setData('text/plain', String(lead.id));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageId) {
      setDragOverStage(stageId);
    }
  };

  const handleDragLeave = (e, stageId) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      if (dragOverStage === stageId) {
        setDragOverStage(null);
      }
    }
  };

  const handleDrop = (e, targetStage) => {
    e.preventDefault();
    setDragOverStage(null);
    const id = Number(e.dataTransfer.getData('text/plain')) || draggedLeadId;
    if (!id) return;
    const lead = leads.find(l => l.id === id);
    if (lead && lead.stage !== targetStage) {
      handleMoveStage(lead, targetStage);
    }
    setDraggedLeadId(null);
  };

  // Open AI Lead Summary Popover
  const handleOpenSummary = (e, lead) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    let left = rect.left - 270;
    if (left < 15) left = rect.right + 10;
    let top = rect.top;
    if (top + 200 > window.innerHeight) top = window.innerHeight - 220;

    setSummaryPosition({ top: Math.max(15, top), left: Math.max(15, left) });
    setSummaryLead(lead);
  };

  return (
    <div className="space-y-5">
      {/* Top Header matching original hintonn-crm.html */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="font-display font-extrabold text-[28px] tracking-tight text-[#0F172A]">
            Pipeline
          </div>
          <div className="text-[#64748B] text-[14px] mt-0.5">
            Drag a lead to move it between stages. Use the AI icon on a card for a quick summary.
          </div>
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
            <span>Add lead</span>
          </button>
        </div>
      </div>

      {/* Pipeline Stats Bar exactly matching screenshot */}
      <div className="flex items-center gap-8 py-1 flex-wrap">
        <div>
          <div className="text-[11.5px] text-[#94A3B8]">Open value</div>
          <div className="font-mono text-[16px] font-bold text-[#0F172A]">{fmtINR(totalOpen)}</div>
        </div>
        <div>
          <div className="text-[11.5px] text-[#94A3B8]">Weighted value</div>
          <div className="font-mono text-[16px] font-bold text-[#7E22CE]">
            {fmtINR(totalWeighted)}
          </div>
        </div>
        <div>
          <div className="text-[11.5px] text-[#94A3B8]">Open leads</div>
          <div className="font-mono text-[16px] font-bold text-[#0F172A]">{totalOpenCount}</div>
        </div>
        <div>
          <div className="text-[11.5px] text-[#94A3B8]">Avg. lead size</div>
          <div className="font-mono text-[16px] font-bold text-[#0F172A]">
            {fmtINR(avgLeadSize)}
          </div>
        </div>
      </div>

      {/* Horizontal Board Columns */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start">
        {STAGES.map(stage => {
          const stageLeads = leads.filter(l => l.stage === stage.id);
          const stageTotal = stageLeads.reduce((s, l) => s + (l.value || 0), 0);
          const stageWeighted = stageLeads.reduce(
            (s, l) => s + Math.round((l.value || 0) * ((l.dealProb || 50) / 100)),
            0
          );
          const isTargeted = dragOverStage === stage.id;

          return (
            <div
              key={stage.id}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={(e) => handleDragLeave(e, stage.id)}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`flex-shrink-0 w-[270px] rounded-[14px] p-1.5 transition-all duration-150 ${
                isTargeted
                  ? 'bg-[#EFF6FF] ring-2 ring-[#2563EB] shadow-sm'
                  : 'bg-transparent'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-1.5 pb-1">
                <span className="text-[13px] font-bold text-[#0F172A] flex items-center gap-1.5">
                  {stage.name}
                  <span className="text-[11px] text-[#94A3B8] font-semibold bg-[#F1F5F9] rounded-full px-1.5">
                    {stageLeads.length}
                  </span>
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#94A3B8] px-1.5 pb-0.5 font-medium">
                {fmtINR(stageTotal)}
              </div>
              <div className="text-[10.5px] font-mono text-[#7E22CE] px-1.5 pb-2 font-semibold">
                Weighted: {fmtINR(stageWeighted)}
              </div>

              {/* Drop Target Indicator */}
              {isTargeted && (
                <div className="border-2 border-dashed border-[#2563EB] bg-white/90 rounded-[10px] py-3 mb-2.5 text-center text-[12px] font-bold text-[#2563EB]">
                  Drop here to move to {stage.name}
                </div>
              )}

              {/* Cards Container */}
              <div className="space-y-2.5 min-h-[80px]">
                {stageLeads.length === 0 && !isTargeted && (
                  <div className="border border-dashed border-[#CBD5E1] rounded-[10px] p-6 text-center text-[12px] text-[#94A3B8]">
                    No leads in this stage
                  </div>
                )}
                {stageLeads.map(lead => {
                  const project = projects.find(p => p.id === lead.projectId);
                  const health = healthOf(lead.daysSince || 0);
                  const prob = lead.dealProb || 0;
                  const isBeingDragged = draggedLeadId === lead.id;
                  const nextStage = getNextStage(lead.stage);

                  return (
                    <div
                      key={lead.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, lead)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onSelectLead(lead.id)}
                      className={`lead-card bg-white border border-[#E2E8F0] rounded-[10px] p-3 shadow-xs hover:shadow-md hover:border-[#CBD5E1] cursor-grab active:cursor-grabbing transition-all select-none relative ${
                        isBeingDragged ? 'opacity-40 scale-[0.98]' : ''
                      }`}
                    >
                      {/* Lead Name */}
                      <div className="font-bold text-[13.3px] leading-tight text-[#0F172A]">
                        {lead.name}
                      </div>

                      {/* Project + Config */}
                      <div className="text-[11.6px] text-[#64748B] mt-0.5">
                        {project?.name || 'Ashray Project'} — {lead.config}
                      </div>

                      {/* Value */}
                      <div className="font-mono font-semibold text-[14px] my-1.5 text-[#0F172A]">
                        {fmtINR(lead.value)}
                      </div>

                      {/* Probability Bar */}
                      <div className="prob-bar mb-1.5">
                        <div className="prob-fill" style={{ width: `${prob}%` }}></div>
                      </div>

                      {/* Badges: Source & Health */}
                      <div className="flex items-center justify-between gap-1.5 flex-wrap mb-2">
                        {srcBadge(lead.source)}
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${health.cls}`}
                        >
                          {health.label}
                        </span>
                      </div>

                      {/* Bottom row: Rep + Quick Stage Switcher + AI Summary */}
                      <div className="flex items-center justify-between pt-1 border-t border-[#F8FAFC]">
                        <span className="text-[11.3px] text-[#94A3B8] truncate max-w-[90px]">
                          {lead.rep || 'Unassigned'}
                        </span>

                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* One-Click Quick Next Stage button */}
                          {nextStage && (
                            <button
                              onClick={() => handleMoveStage(lead, nextStage)}
                              className="text-[11px] font-semibold px-1.5 py-0.5 rounded-[5px] bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE] transition-colors"
                              title={`Quick move to ${nextStage}`}
                            >
                              → {nextStage.charAt(0).toUpperCase() + nextStage.slice(1)}
                            </button>
                          )}

                          {/* Quick Stage Dropdown Menu Toggle */}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setStageMenuLeadId(stageMenuLeadId === lead.id ? null : lead.id)
                              }
                              className="text-[11px] font-semibold px-1.5 py-0.5 rounded-[5px] border border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9] transition-colors"
                              title="Pick any stage"
                            >
                              ▾
                            </button>

                            {stageMenuLeadId === lead.id && (
                              <div className="absolute bottom-full right-0 mb-1 z-[150] w-36 bg-white border border-[#E2E8F0] rounded-[8px] shadow-xl py-1 text-[12px]">
                                <div className="px-2 py-1 text-[10.5px] font-bold text-[#94A3B8] uppercase">
                                  Move to stage
                                </div>
                                {STAGES.map(s => (
                                  <button
                                    key={s.id}
                                    onClick={() => handleMoveStage(lead, s.id)}
                                    className={`w-full text-left px-2.5 py-1 hover:bg-[#EFF6FF] hover:text-[#2563EB] font-medium flex items-center justify-between ${
                                      lead.stage === s.id ? 'text-[#2563EB] font-bold' : 'text-[#334155]'
                                    }`}
                                  >
                                    <span>{s.name}</span>
                                    {lead.stage === s.id && <span className="text-[10px]">●</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* AI Sparkle summary button */}
                          <button
                            onClick={(e) => handleOpenSummary(e, lead)}
                            className="w-[26px] h-[26px] rounded-[7px] bg-[#F3E8FF] text-[#9333EA] hover:bg-[#E9D5FF] flex items-center justify-center transition-colors"
                            title="AI Quick Summary"
                          >
                            <Icon name="sparkle" size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {stageLeads.length === 0 && !isTargeted && (
                  <div className="h-20 border border-dashed border-[#E2E8F0] rounded-[10px] flex items-center justify-center text-[12px] text-[#94A3B8]">
                    No leads in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Lead Summary Popover matching hintonn-crm.html */}
      {summaryLead && (
        <>
          <div
            className="fixed inset-0 z-[199]"
            onClick={() => setSummaryLead(null)}
          ></div>
          <div
            style={{ top: `${summaryPosition.top}px`, left: `${summaryPosition.left}px` }}
            className="fixed z-[200] w-[300px] bg-white border border-[#E2E8F0] rounded-[12px] shadow-2xl p-3.5"
          >
            <button
              onClick={() => setSummaryLead(null)}
              className="absolute top-2.5 right-2.5 text-[#94A3B8] hover:text-[#0F172A]"
            >
              <Icon name="x" size={14} />
            </button>

            <div className="flex items-center gap-1.5 text-[12.6px] font-bold text-[#9333EA] mb-2">
              <Icon name="sparkle" size={13} />
              <span>AI lead summary</span>
            </div>

            <div className="text-[12.5px] text-[#334155] leading-relaxed mb-3">
              <b>{summaryLead.name}</b> is interested in{' '}
              {projects.find(p => p.id === summaryLead.projectId)?.name || 'Project'} (
              {summaryLead.config}) with a budget of {fmtINR(summaryLead.value)}. Currently in{' '}
              <span className="font-semibold uppercase text-[#2563EB]">{summaryLead.stage}</span>{' '}
              stage with a fit score of <b>{summaryLead.score}%</b>.
              <div className="mt-1.5 text-[12px] text-[#64748B]">
                💡 <b>Next action:</b>{' '}
                {summaryLead.stage === 'new'
                  ? 'Initiate first response call or send brochure via WhatsApp.'
                  : summaryLead.stage === 'contacted'
                  ? 'Follow up to schedule a walkthrough site visit.'
                  : summaryLead.stage === 'qualified'
                  ? 'Confirm site visit feedback and prepare unit pricing.'
                  : 'Review commercial terms and close booking.'}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `${summaryLead.name} (${summaryLead.config}) - Stage: ${summaryLead.stage}, Budget: ${fmtINR(summaryLead.value)}`
                  );
                  toast('Summary copied to clipboard');
                  setSummaryLead(null);
                }}
                className="flex-1 text-[12px] font-semibold py-1.5 px-2 rounded-[8px] border border-[#CBD5E1] hover:bg-[#F1F5F9] transition-colors"
              >
                Copy
              </button>
              <button
                onClick={() => {
                  const id = summaryLead.id;
                  setSummaryLead(null);
                  onSelectLead(id);
                }}
                className="flex-1 text-[12px] font-semibold py-1.5 px-2 rounded-[8px] bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors"
              >
                View Lead
              </button>
            </div>
          </div>
        </>
      )}

      {/* Loss Reason Confirmation Modal */}
      {lossModalLead && (
        <div className="fixed inset-0 bg-[#0F172A]/50 z-[200] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-[16px] w-full max-w-[420px] shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="font-display font-bold text-[16px] text-[#DC2626]">
                Mark Lead as Lost
              </div>
              <button
                onClick={() => setLossModalLead(null)}
                className="text-[#94A3B8] hover:text-[#475569]"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <div className="text-[13px] text-[#475569]">
              Please record the reason why <b>{lossModalLead.name}</b> was not converted. This
              updates your conversion analytics and saves directly to the database.
            </div>

            <div>
              <label className="block text-[12px] font-bold text-[#475569] mb-1">Loss Reason</label>
              <select
                value={lossReason}
                onChange={(e) => setLossReason(e.target.value)}
                className="w-full text-[13px] p-2.5 rounded-[8px] border border-[#CBD5E1] bg-white text-[#0F172A] outline-none focus:border-[#DC2626]"
              >
                <option value="Budget mismatch">Budget mismatch</option>
                <option value="Chose competitor">Chose competitor</option>
                <option value="Project location unsuitable">Project location unsuitable</option>
                <option value="Postponed purchase">Postponed purchase / On hold</option>
                <option value="Unreachable / Invalid number">Unreachable / Invalid number</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setLossModalLead(null)}
                className="px-4 py-2 rounded-[8px] border border-[#CBD5E1] text-[13px] font-semibold text-[#475569] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                onClick={confirmLoss}
                className="px-4 py-2 rounded-[8px] bg-[#DC2626] text-[13px] font-semibold text-white hover:bg-[#B91C1C]"
              >
                Confirm Lost
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
