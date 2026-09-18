import React, { useState, useEffect } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';

function fmtINR(val) {
  if (!val) return '₹0';
  if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + ' Cr';
  if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + ' L';
  return '₹' + Number(val).toLocaleString('en-IN');
}

function getConvColor(pct) {
  if (pct >= 10) return 'bg-[#D1FAE5] text-[#047857]';
  if (pct >= 5) return 'bg-[#FEF3C7] text-[#D97706]';
  return 'bg-[#FEE2E2] text-[#DC2626]';
}

const STAGE_COLORS = {
  new: '#94A3B8',
  contacted: '#2563EB',
  qualified: '#7E22CE',
  negotiation: '#D97706',
  won: '#059669',
  lost: '#DC2626'
};

function MiniBarChart({ distribution }) {
  if (!distribution) return null;
  const entries = Object.entries(distribution);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div className="flex items-end gap-1 h-[40px]">
      {entries.map(([stage, count]) => (
        <div key={stage} className="flex flex-col items-center flex-1">
          <div
            className="w-full rounded-t-[3px] transition-all"
            style={{
              height: `${Math.max(4, (count / max) * 36)}px`,
              backgroundColor: STAGE_COLORS[stage] || '#CBD5E1'
            }}
          />
          <div className="text-[8px] text-[#94A3B8] mt-0.5 capitalize">{stage.slice(0, 3)}</div>
        </div>
      ))}
    </div>
  );
}

function RepCard({ rep }) {
  return (
    <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5 hover:border-[#CBD5E1] transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2563EB] to-[#9333EA] text-white flex items-center justify-center font-bold text-[12px] flex-shrink-0">
          {rep.name?.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <div className="text-[14px] font-bold text-[#0F172A]">{rep.name}</div>
          <div className="text-[11.5px] text-[#64748B]">{rep.role || 'Sales Executive'}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-2.5 bg-[#F8FAFC] rounded-[10px] border border-[#E2E8F0]">
          <div className="text-[10.5px] font-semibold text-[#64748B]">Total Leads</div>
          <div className="font-display font-extrabold text-[18px] text-[#2563EB]">{rep.totalLeads}</div>
        </div>
        <div className="p-2.5 bg-[#F8FAFC] rounded-[10px] border border-[#E2E8F0]">
          <div className="text-[10.5px] font-semibold text-[#64748B]">Won Deals</div>
          <div className="font-display font-extrabold text-[18px] text-[#059669]">{rep.wonDeals}</div>
        </div>
        <div className="p-2.5 bg-[#F8FAFC] rounded-[10px] border border-[#E2E8F0]">
          <div className="text-[10.5px] font-semibold text-[#64748B]">Conversion</div>
          <div className={`font-display font-extrabold text-[18px] ${(rep.totalLeads > 0 ? Math.round((rep.wonDeals / rep.totalLeads) * 100) : 0) >= 10 ? 'text-[#059669]' : (rep.totalLeads > 0 ? Math.round((rep.wonDeals / rep.totalLeads) * 100) : 0) >= 5 ? 'text-[#D97706]' : 'text-[#DC2626]'}`}>
            {rep.totalLeads > 0 ? Math.round((rep.wonDeals / rep.totalLeads) * 100) : 0}%
          </div>
        </div>
        <div className="p-2.5 bg-[#F8FAFC] rounded-[10px] border border-[#E2E8F0]">
          <div className="text-[10.5px] font-semibold text-[#64748B]">Avg Response</div>
          <div className="font-display font-extrabold text-[18px] text-[#0F172A]">{rep.avgResponseMin || '—'}m</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-semibold text-[#64748B]">Revenue Generated</div>
        <div className="font-mono font-bold text-[14px] text-[#0F172A]">{fmtINR(rep.revenue || 0)}</div>
      </div>

      <div className="border-t border-[#E2E8F0] pt-3">
        <div className="text-[10.5px] font-semibold text-[#64748B] mb-2">Stage Distribution</div>
        <MiniBarChart distribution={rep.pipeline || {}} />
      </div>
    </div>
  );
}

export default function TeamAnalyticsView({ onSelectLead }) {
  const {
    teamRepPerformance, repSourceMatrix, sourceEffectiveness,
    fetchTeamRepPerformance, fetchRepSourceMatrix, fetchSourceEffectiveness
  } = useCRM();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchTeamRepPerformance?.(), fetchRepSourceMatrix?.(), fetchSourceEffectiveness?.()]);
      setLoading(false);
    };
    load();
  }, [fetchTeamRepPerformance, fetchRepSourceMatrix, fetchSourceEffectiveness]);

  const reps = teamRepPerformance || [];
  const matrix = repSourceMatrix || { reps: [], sources: [], data: {} };
  const sources = sourceEffectiveness || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Icon name="loader" size={24} className="text-[#2563EB] animate-spin" />
        <span className="ml-3 text-[14px] text-[#64748B]">Loading team analytics…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="font-display font-extrabold text-[28px] tracking-tight text-[#0F172A]">
          Team Performance Analytics
        </div>
        <div className="text-[#64748B] text-[14px] mt-0.5">
          Per-rep, per-source conversion intelligence.
        </div>
      </div>

      {/* Rep Performance Cards */}
      <div>
        <div className="font-display font-bold text-[16px] text-[#0F172A] mb-1">Rep Performance</div>
        <div className="text-[12.4px] text-[#64748B] mb-4">Individual sales rep metrics, conversion rates, and pipeline activity</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reps.length > 0 ? (
            reps.map((rep, idx) => <RepCard key={rep.name || idx} rep={rep} />)
          ) : (
            <div className="col-span-full text-center py-10 text-[13px] text-[#94A3B8]">
              No rep performance data available yet.
            </div>
          )}
        </div>
      </div>

      {/* Rep × Source Conversion Matrix */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
        <div className="font-display font-bold text-[16px] text-[#0F172A] mb-1">Rep × Source Conversion Matrix</div>
        <div className="text-[12.4px] text-[#64748B] mb-4">Cross-reference of rep performance by lead acquisition channel</div>

        <div className="overflow-x-auto">
          {matrix.reps && matrix.reps.length > 0 ? (
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="text-[11.5px] font-semibold text-[#94A3B8] border-b border-[#E2E8F0] bg-[#FAFBFC]">
                  <th className="px-4 py-3">Rep</th>
                  {matrix.sources?.map(src => (
                    <th key={src} className="px-4 py-3 text-center">{src}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {matrix.reps.map(rep => (
                  <tr key={rep} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">{rep}</td>
                    {matrix.sources?.map(src => {
                      const cell = matrix.data?.[rep]?.[src] || { leads: 0, won: 0, pct: 0 };
                      return (
                        <td key={src} className="px-4 py-3 text-center">
                          <div className="font-mono font-bold text-[13px] text-[#0F172A]">{cell.leads}/{cell.won}</div>
                          <span className={`inline-block mt-0.5 tag-pill font-bold text-[10.5px] ${getConvColor(cell.pct)}`}>
                            {cell.pct}%
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-[13px] text-[#94A3B8]">
              No rep × source data available yet.
            </div>
          )}
        </div>
      </div>

      {/* Source Effectiveness Ranking */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
        <div className="font-display font-bold text-[16px] text-[#0F172A] mb-1">Source Effectiveness Ranking</div>
        <div className="text-[12.4px] text-[#64748B] mb-4">Lead source ROI, conversion rates, and cost per acquisition</div>

        <div className="overflow-x-auto">
          {sources.length > 0 ? (
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="text-[11.5px] font-semibold text-[#94A3B8] border-b border-[#E2E8F0] bg-[#FAFBFC]">
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Total Leads</th>
                  <th className="px-4 py-3">Conversion Rate</th>
                  <th className="px-4 py-3">Avg Deal Value</th>
                  <th className="px-4 py-3">Cost / Acquisition</th>
                  <th className="px-4 py-3">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {sources.map((src, idx) => (
                  <tr key={src.source || idx} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold text-[#0F172A] flex items-center gap-2">
                      <Icon name="globe" size={14} className="text-[#64748B]" />
                      {src.source}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[#2563EB]">{src.totalLeads}</td>
                    <td className="px-4 py-3">
                      <span className={`tag-pill font-bold text-[10.5px] ${getConvColor(src.conversionRate)}`}>
                        {src.conversionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">{fmtINR(src.avgDealValue)}</td>
                    <td className="px-4 py-3 font-mono">{fmtINR(src.costPerAcquisition)}</td>
                    <td className="px-4 py-3">
                      <span className={`tag-pill font-bold text-[10.5px] ${src.roi >= 3 ? 'bg-[#D1FAE5] text-[#047857]' : src.roi >= 1 ? 'bg-[#FEF3C7] text-[#D97706]' : 'bg-[#FEE2E2] text-[#DC2626]'}`}>
                        {src.roi}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-[13px] text-[#94A3B8]">
              No source effectiveness data available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
