import React, { useState, useEffect } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';

function fmtINR(val) {
  if (!val) return '₹0';
  if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + ' Cr';
  if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + ' L';
  return '₹' + Number(val).toLocaleString('en-IN');
}

const STATUS_STYLES = {
  paid: 'bg-[#D1FAE5] text-[#047857]',
  due: 'bg-[#DBEAFE] text-[#1D4ED8]',
  pending: 'bg-[#F1F5F9] text-[#64748B]',
  overdue: 'bg-[#FEE2E2] text-[#DC2626]',
  collected: 'bg-[#D1FAE5] text-[#047857]',
  missing: 'bg-[#FEE2E2] text-[#DC2626]',
  'on-track': 'bg-[#D1FAE5] text-[#047857]'
};

function KpiCard({ label, value, icon, color = '#2563EB', sub }) {
  return (
    <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: color + '14' }}>
          <Icon name={icon} size={18} className="" style={{ color }} />
        </div>
        <div className="text-[12px] font-semibold text-[#64748B]">{label}</div>
      </div>
      <div className="font-display font-extrabold text-[24px] text-[#0F172A]">{value}</div>
      {sub && <div className="text-[11.5px] text-[#94A3B8] mt-0.5">{sub}</div>}
    </div>
  );
}

function MilestoneTimeline({ milestones, onMarkPaid }) {
  if (!milestones || milestones.length === 0) {
    return <div className="text-[12.5px] text-[#94A3B8] py-3">No milestones configured.</div>;
  }

  return (
    <div className="ml-4 border-l-2 border-[#E2E8F0] pl-5 space-y-4 py-2">
      {milestones.map((m, idx) => {
        const isOverdue = m.status === 'overdue';
        const isPaid = m.status === 'paid';
        return (
          <div key={m.id || idx} className="relative">
            <div className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 ${isPaid ? 'bg-[#059669] border-[#059669]' : isOverdue ? 'bg-[#DC2626] border-[#DC2626]' : 'bg-white border-[#CBD5E1]'}`} />
            <div className={`p-3 rounded-[10px] border ${isOverdue ? 'border-[#FECACA] bg-[#FEF2F2]' : 'border-[#E2E8F0] bg-[#F8FAFC]'}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="text-[13px] font-semibold text-[#0F172A]">{m.name}</div>
                <span className={`tag-pill font-bold text-[10.5px] ${STATUS_STYLES[m.status] || STATUS_STYLES.pending}`}>
                  {m.status?.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-[12px] text-[#64748B]">
                  {m.percentage}% · {fmtINR(m.amount)}
                  {m.dueDate && <span className="ml-2">· Due: {new Date(m.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                </div>
                {(m.status === 'due' || m.status === 'overdue') && (
                  <button
                    onClick={() => onMarkPaid(m.id)}
                    className="text-[11px] font-bold px-3 py-1 rounded-[8px] bg-[#059669] text-white hover:bg-[#047857] transition-colors"
                  >
                    Mark Paid
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WonLeadRow({ lead, onMarkPaid, onMarkDocCollected, onSelectLead }) {
  const [expanded, setExpanded] = useState(false);
  const collected = lead.milestonesPaid || 0;
  const total = lead.milestones?.length || 1;
  const pct = Math.round((collected / total) * 100);
  const nextMilestone = lead.milestones?.find(m => m.status === 'due' || m.status === 'overdue');
  const isOverdue = lead.milestones?.some(m => m.status === 'overdue');

  return (
    <div className={`border rounded-[12px] ${isOverdue ? 'border-[#FECACA]' : 'border-[#E2E8F0]'} bg-white`}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#F8FAFC] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#059669] to-[#2563EB] text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0">
            {lead.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="min-w-0">
            <button
              onClick={(e) => { e.stopPropagation(); onSelectLead?.(lead.leadId); }}
              className="text-[13.5px] font-semibold text-[#0F172A] hover:text-[#2563EB] truncate block text-left"
            >
              {lead.name}
            </button>
            <div className="text-[11.5px] text-[#64748B]">{lead.project}</div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-6 text-center">
          <div className="w-[100px]">
            <div className="text-[12px] font-semibold text-[#64748B]">Deal Value</div>
            <div className="text-[14px] font-bold font-mono text-[#0F172A]">{fmtINR(lead.dealValue)}</div>
          </div>
          <div className="w-[140px]">
            <div className="text-[12px] font-semibold text-[#64748B] mb-1">Collection</div>
            <div className="h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
              <div className="h-full rounded-full bg-[#059669] transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-[11px] text-[#64748B] mt-0.5">{pct}% collected</div>
          </div>
          <div className="w-[120px]">
            <div className="text-[12px] font-semibold text-[#64748B]">Next Milestone</div>
            {nextMilestone ? (
              <div>
                <div className="text-[13px] font-semibold text-[#0F172A]">{fmtINR(nextMilestone.amount)}</div>
                <div className={`text-[10.5px] font-bold ${isOverdue ? 'text-[#DC2626]' : 'text-[#2563EB]'}`}>
                  {isOverdue ? 'OVERDUE' : nextMilestone.name}
                </div>
              </div>
            ) : (
              <div className="text-[12px] text-[#059669] font-semibold">All Paid</div>
            )}
          </div>
          <div>
            <span className={`tag-pill font-bold text-[10.5px] ${isOverdue ? STATUS_STYLES.overdue : STATUS_STYLES['on-track']}`}>
              {isOverdue ? 'OVERDUE' : 'ON TRACK'}
            </span>
          </div>
        </div>

        <Icon
          name={expanded ? 'chevrondown' : 'chevronright'}
          size={16}
          className="text-[#94A3B8] ml-3 flex-shrink-0"
        />
      </div>

      {expanded && (
        <div className="border-t border-[#E2E8F0] px-4 pb-4 pt-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Milestones */}
            <div>
              <div className="text-[13px] font-bold text-[#0F172A] mb-2 flex items-center gap-1.5">
                <Icon name="clock" size={14} className="text-[#2563EB]" />
                Payment Milestones
              </div>
              <MilestoneTimeline
                milestones={lead.milestones}
                onMarkPaid={(mId) => onMarkPaid(lead.leadId, mId)}
              />
            </div>
            {/* Documents */}
            <div>
              <div className="text-[13px] font-bold text-[#0F172A] mb-2 flex items-center gap-1.5">
                <Icon name="filetext" size={14} className="text-[#7E22CE]" />
                Document Status
              </div>
              {lead.documents && lead.documents.length > 0 ? (
                <div className="space-y-2">
                  {lead.documents.map((doc, idx) => (
                    <div key={doc.id || idx} className="flex items-center justify-between p-2.5 rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC]">
                      <div className="flex items-center gap-2">
                        <Icon
                          name={doc.collected ? 'checkcircle' : 'alerttriangle'}
                          size={15}
                          className={doc.collected ? 'text-[#059669]' : 'text-[#DC2626]'}
                        />
                        <span className="text-[12.5px] text-[#334155]">{doc.name}</span>
                      </div>
                      {!doc.collected && (
                        <button
                          onClick={() => onMarkDocCollected(lead.leadId, doc.id)}
                          className="text-[10.5px] font-bold px-2.5 py-1 rounded-[6px] bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors"
                        >
                          Mark Collected
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="text-[11.5px] text-[#64748B] mt-1">
                    {lead.documents.filter(d => d.collected).length} of {lead.documents.length} collected
                  </div>
                </div>
              ) : (
                <div className="text-[12.5px] text-[#94A3B8] py-3">No documents tracked.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PostBookingView({ onSelectLead }) {
  const { postBookingSummary, overduePayments, docMissing, leads, fetchPostBooking, fetchOverduePayments, fetchDocMissing, markMilestonePaid, markDocCollected } = useCRM();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchPostBooking?.(), fetchOverduePayments?.(), fetchDocMissing?.()]);
      setLoading(false);
    };
    load();
  }, [fetchPostBooking, fetchOverduePayments, fetchDocMissing]);

  const summary = postBookingSummary || {
    totalValue: 0,
    totalPaid: 0,
    totalPending: 0,
    overdueCount: 0,
    collectionRate: 0,
    wonLeads: []
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Icon name="loader" size={24} className="text-[#2563EB] animate-spin" />
        <span className="ml-3 text-[14px] text-[#64748B]">Loading post-booking data…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="font-display font-extrabold text-[28px] tracking-tight text-[#0F172A]">
          Post-Booking Management
        </div>
        <div className="text-[#64748B] text-[14px] mt-0.5">
          Track payment milestones, documents, and handover for closed deals.
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard label="Total Revenue Booked" value={fmtINR(summary.totalValue)} icon="trendingup" color="#2563EB" />
        <KpiCard label="Total Collected" value={fmtINR(summary.totalPaid)} icon="checkcircle" color="#059669" />
        <KpiCard label="Total Pending" value={fmtINR(summary.totalPending)} icon="clock" color="#D97706" />
        <KpiCard label="Overdue Payments" value={summary.leads ? summary.leads.reduce((s, l) => s + (l.overdueCount || 0), 0) : 0} icon="alerttriangle" color="#DC2626" />
        <KpiCard label="Collection Rate" value={`${summary.totalValue > 0 ? Math.round((summary.totalPaid / summary.totalValue) * 100) : 0}%`} icon="barchart" color="#7E22CE" />
      </div>

      {/* Overdue Alerts */}
      {overduePayments && overduePayments.length > 0 && (
        <div className="card-base bg-white border border-[#FECACA] rounded-[16px] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="alerttriangle" size={18} className="text-[#DC2626]" />
            <div className="font-display font-bold text-[16px] text-[#DC2626]">Overdue Payment Alerts</div>
            <span className="tag-pill bg-[#FEE2E2] text-[#DC2626] font-bold text-[10.5px]">{overduePayments.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {overduePayments.map((item, idx) => (
              <div key={idx} className="p-3 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-semibold text-[#0F172A]">{item.leadName}</div>
                  <div className="text-[12px] text-[#64748B]">{item.milestoneName} · {fmtINR(item.amount)}</div>
                  <div className="text-[11px] text-[#DC2626] font-semibold mt-0.5">
                    Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                  </div>
                </div>
                <button
                  onClick={() => markMilestonePaid?.(item.leadId, item.milestoneId)}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-[8px] bg-[#DC2626] text-white hover:bg-[#B91C1C] transition-colors"
                >
                  Mark Paid
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Won Leads Payment Table */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
        <div className="font-display font-bold text-[16px] text-[#0F172A] mb-1">Won Leads — Payment Tracking</div>
        <div className="text-[12.4px] text-[#64748B] mb-4">Milestone progress, document status, and collection tracking per deal</div>

        <div className="space-y-3">
          {summary.leads && summary.leads.length > 0 ? (
            summary.leads.map((lead, idx) => (
              <WonLeadRow
                key={lead.leadId || idx}
                lead={lead}
                onMarkPaid={markMilestonePaid}
                onMarkDocCollected={markDocCollected}
                onSelectLead={onSelectLead}
              />
            ))
          ) : (
            <div className="text-center py-10 text-[13px] text-[#94A3B8]">
              No won deals with post-booking tracking yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
