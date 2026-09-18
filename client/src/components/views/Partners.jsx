import React, { useState } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';

function fmtINR(val) {
  if (!val) return '₹0';
  if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + ' Cr';
  if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + ' L';
  return '₹' + Number(val).toLocaleString('en-IN');
}

export default function Partners({ onOpenAddPartner }) {
  const { partners, partnerStats } = useCRM();
  const [partnerFilter, setPartnerFilter] = useState('all');

  const filteredPartners = partners.filter(p => {
    if (partnerFilter === 'broker') return p.type === 'broker';
    if (partnerFilter === 'digital') return p.type === 'digital';
    if (partnerFilter === 'referral') return p.type === 'referral';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="font-display font-extrabold text-[28px] tracking-tight text-[#0F172A]">
            Channel Partners &amp; Brokers
          </div>
          <div className="text-[#64748B] text-[14px] mt-0.5">
            Manage external real estate brokers, digital affiliates, referral commissions, and deal payouts.
          </div>
        </div>

        <button
          onClick={onOpenAddPartner}
          className="flex items-center gap-1.5 bg-[#2563EB] text-white font-semibold text-[13.4px] px-4 py-2.5 rounded-[10px] hover:bg-[#1D4ED8] transition-all shadow-sm"
        >
          <Icon name="plus" size={16} />
          <span>Add Partner</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Partners', value: partners.length, color: '#2563EB' },
          { label: 'Leads Referred', value: partnerStats.totalReferred ?? 0, color: '#059669' },
          { label: 'Deals Closed', value: partnerStats.totalDeals ?? 0, color: '#9333EA' },
          { label: 'Total Commission', value: fmtINR(partnerStats.totalCommission ?? 0), color: '#D97706' }
        ].map((s, i) => (
          <div key={i} className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-4 text-center">
            <div className="font-display font-extrabold text-[26px] mb-0.5" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-[12px] text-[#64748B] font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Partner Table Container */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="font-display font-bold text-[16px] text-[#0F172A]">Registered Brokers &amp; Partners</div>
          <div className="flex gap-1.5">
            {[
              { id: 'all', label: 'All Partners' },
              { id: 'broker', label: 'Brokers' },
              { id: 'digital', label: 'Digital' },
              { id: 'referral', label: 'Referrals' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setPartnerFilter(f.id)}
                className={`text-[12px] font-semibold px-3 py-1 rounded-full border transition-all ${
                  partnerFilter === f.id
                    ? 'bg-[#2563EB] text-white border-[#2563EB]'
                    : 'border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="text-[11.5px] font-semibold text-[#94A3B8] border-b border-[#E2E8F0] bg-[#FAFBFC]">
                <th className="px-4 py-3">Partner &amp; Company</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Referred Leads</th>
                <th className="px-4 py-3">Deals Closed</th>
                <th className="px-4 py-3">Revenue Closed</th>
                <th className="px-4 py-3">Commission Earned</th>
                <th className="px-4 py-3">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-[13.5px] text-[#94A3B8]">
                    No channel partners registered yet. Click "Add Partner" to register one.
                  </td>
                </tr>
              ) : (
                filteredPartners.map(p => (
                  <tr key={p.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-[#0F172A]">{p.name}</div>
                      <div className="text-[11.5px] text-[#64748B]">{p.company}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="tag-pill bg-[#F3E8FF] text-[#7E22CE] text-[10px] uppercase font-bold">
                        {p.type}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-[12px]">
                      <div className="text-[#0F172A] font-mono">{p.phone}</div>
                      <div className="text-[#94A3B8] text-[11px]">{p.email}</div>
                    </td>

                    <td className="px-4 py-3.5 font-mono font-bold text-[#2563EB]">
                      {p.leadsReferred || 0}
                    </td>

                    <td className="px-4 py-3.5 font-mono font-bold text-[#059669]">
                      {p.dealsClosed || 0}
                    </td>

                    <td className="px-4 py-3.5 font-mono font-bold text-[#0F172A]">
                      {fmtINR(p.totalRevenue || 0)}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-[#D97706]">{fmtINR(p.commissionEarned || 0)}</div>
                      <div className="text-[10px] text-[#94A3B8]">({p.commissionRate || 1.5}% rate)</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center text-[#F59E0B]">
                        {Array.from({ length: p.rating || 5 }).map((_, i) => (
                          <Icon key={i} name="star" size={12} className="fill-[#F59E0B]" />
                        ))}
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
