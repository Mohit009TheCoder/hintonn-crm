import React from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';

function fmtINR(val) {
  if (!val) return '₹0';
  if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + ' Cr';
  if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + ' L';
  return '₹' + Number(val).toLocaleString('en-IN');
}

export default function Analytics() {
  const { reportsData } = useCRM();

  const sourceROI = reportsData?.sourceROI || [];
  const leaderboard = reportsData?.leaderboard || [];

  return (
    <div className="space-y-6">
      <div>
        <div className="font-display font-extrabold text-[28px] tracking-tight text-[#0F172A]">
          Analytics &amp; Leaderboard
        </div>
        <div className="text-[#64748B] text-[14px] mt-0.5">
          Acquisition channel ROI, marketing efficiency, and executive sales rankings.
        </div>
      </div>

      {/* Marketing Source ROI Table */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
        <div className="font-display font-bold text-[16px] text-[#0F172A] mb-1">Marketing Source Performance &amp; ROI</div>
        <div className="text-[12.4px] text-[#64748B] mb-4">Lead volume, deal closures, and conversion rates across platforms</div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="text-[11.5px] font-semibold text-[#94A3B8] border-b border-[#E2E8F0] bg-[#FAFBFC]">
                <th className="px-4 py-3">Lead Source</th>
                <th className="px-4 py-3">Total Leads</th>
                <th className="px-4 py-3">Pipeline Value</th>
                <th className="px-4 py-3">Deals Won</th>
                <th className="px-4 py-3">Closed Revenue</th>
                <th className="px-4 py-3">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {sourceROI.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-[13px] text-[#94A3B8]">
                    No marketing channel records yet.
                  </td>
                </tr>
              ) : (
                sourceROI.map(src => (
                  <tr key={src.source} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">{src.source}</td>
                    <td className="px-4 py-3 font-mono font-bold text-[#2563EB]">{src.leads}</td>
                    <td className="px-4 py-3 font-mono">{fmtINR(src.pipelineValue)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-[#059669]">{src.dealsClosed}</td>
                    <td className="px-4 py-3 font-mono font-bold text-[#0F172A]">{fmtINR(src.closedRevenue)}</td>
                    <td className="px-4 py-3">
                      <span className={`tag-pill font-bold ${src.conversionRate > 0 ? 'bg-[#D1FAE5] text-[#047857]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                        {src.conversionRate}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agent Leaderboard Table */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
        <div className="font-display font-bold text-[16px] text-[#0F172A] mb-1">Sales Team Leaderboard</div>
        <div className="text-[12.4px] text-[#64748B] mb-4">Rep closed revenue, active pipelines, and commissions earned</div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="text-[11.5px] font-semibold text-[#94A3B8] border-b border-[#E2E8F0] bg-[#FAFBFC]">
                <th className="px-4 py-3">Sales Executive</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Active Pipeline</th>
                <th className="px-4 py-3">Deals Won</th>
                <th className="px-4 py-3">Closed Revenue</th>
                <th className="px-4 py-3">Commission Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-[13px] text-[#94A3B8]">
                    No sales rep activity recorded yet.
                  </td>
                </tr>
              ) : (
                leaderboard.map(agent => (
                  <tr key={agent.name} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold text-[#0F172A] flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#9333EA] text-white flex items-center justify-center font-bold text-[11px]">
                        {agent.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span>{agent.name}</span>
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">{agent.role}</td>
                    <td className="px-4 py-3 font-mono font-bold text-[#2563EB]">{agent.activeLeads} leads</td>
                    <td className="px-4 py-3 font-mono font-bold text-[#059669]">{agent.dealsWon}</td>
                    <td className="px-4 py-3 font-mono font-bold text-[#0F172A]">{fmtINR(agent.closedRevenue)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-[#D97706]">{fmtINR(agent.commissionEarned)}</td>
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
