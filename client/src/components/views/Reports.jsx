import React from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';

function fmtINR(val) {
  if (!val) return '₹0';
  if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + ' Cr';
  if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + ' L';
  return '₹' + Number(val).toLocaleString('en-IN');
}

export default function Reports() {
  const { reportsData, leads } = useCRM();

  const forecast = reportsData?.forecast || {
    weightedPipeline: 0,
    totalPipeline: 0,
    wonRevenue: 0,
    quarterTarget: 50000000,
    progressPct: 0
  };

  const funnel = reportsData?.funnel || [
    { stage: 'new', count: 0, value: 0 },
    { stage: 'contacted', count: 0, value: 0 },
    { stage: 'qualified', count: 0, value: 0 },
    { stage: 'negotiation', count: 0, value: 0 },
    { stage: 'won', count: 0, value: 0 }
  ];

  const lossReasons = reportsData?.lossReasons || [];

  const velocity = reportsData?.dealVelocity || [
    { stage: 'New to Contacted', avgDays: 0 },
    { stage: 'Contacted to Qualified', avgDays: 0 },
    { stage: 'Qualified to Site Visit', avgDays: 0 },
    { stage: 'Site Visit to Negotiation', avgDays: 0 },
    { stage: 'Negotiation to Closed Won', avgDays: 0 }
  ];

  const maxFunnelCount = Math.max(...funnel.map(f => f.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <div className="font-display font-extrabold text-[28px] tracking-tight text-[#0F172A]">
          Reports &amp; Sales Forecast
        </div>
        <div className="text-[#64748B] text-[14px] mt-0.5">
          Executive performance metrics, revenue projections, stage velocity, and conversion analysis.
        </div>
      </div>

      {/* Revenue Forecast Card */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="font-display font-bold text-[16px] text-[#0F172A]">Q3 Revenue Forecast</div>
            <div className="text-[12.4px] text-[#64748B]">Weighted probability model against quarterly targets</div>
          </div>
          <span className="tag-pill bg-[#DBEAFE] text-[#1D4ED8] font-bold text-[11px]">
            Target: {fmtINR(forecast.quarterTarget)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px]">
            <div className="text-[11px] font-semibold text-[#64748B] mb-1">Closed Revenue (Won)</div>
            <div className="font-display font-extrabold text-[24px] text-[#059669]">
              {fmtINR(forecast.wonRevenue)}
            </div>
          </div>
          <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px]">
            <div className="text-[11px] font-semibold text-[#64748B] mb-1">Weighted Pipeline Expected</div>
            <div className="font-display font-extrabold text-[24px] text-[#2563EB]">
              {fmtINR(forecast.weightedPipeline)}
            </div>
          </div>
          <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px]">
            <div className="text-[11px] font-semibold text-[#64748B] mb-1">Total Pipeline in Play</div>
            <div className="font-display font-extrabold text-[24px] text-[#0F172A]">
              {fmtINR(forecast.totalPipeline)}
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[12px] font-semibold text-[#475569] mb-1.5">
            <span>Progress Toward Target ({forecast.progressPct}%)</span>
            <span>{fmtINR(forecast.wonRevenue)} of {fmtINR(forecast.quarterTarget)}</span>
          </div>
          <div className="h-3 rounded-full bg-[#E2E8F0] overflow-hidden">
            <div
              className="h-full rounded-full gradient-bg transition-all duration-500"
              style={{ width: `${Math.min(100, forecast.progressPct)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Conversion Funnel & Loss Reasons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Conversion Funnel */}
        <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
          <div className="font-display font-bold text-[16px] text-[#0F172A] mb-1">Conversion Funnel</div>
          <div className="text-[12.4px] text-[#64748B] mb-4">Volume progression through pipeline stages</div>

          <div className="space-y-3">
            {funnel.map((item, idx) => (
              <div key={item.stage}>
                <div className="flex justify-between text-[12.5px] font-semibold mb-1">
                  <span className="uppercase text-[#334155]">{item.stage}</span>
                  <span className="font-mono text-[#0F172A]">
                    {item.count} leads · {fmtINR(item.value)}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-[#E2E8F0] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#2563EB] transition-all duration-300"
                    style={{ width: `${Math.round((item.count / maxFunnelCount) * 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Loss Reasons Distribution */}
        <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
          <div className="font-display font-bold text-[16px] text-[#0F172A] mb-1">Loss Reason Distribution</div>
          <div className="text-[12.4px] text-[#64748B] mb-4">Key objections and drop-off factors</div>

          <div className="space-y-3">
            {lossReasons.map(lr => (
              <div key={lr.reason} className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[10px]">
                <span className="text-[13px] font-medium text-[#0F172A]">{lr.reason}</span>
                <span className="font-mono font-bold text-[13px] text-[#DC2626]">
                  {lr.count} lead{lr.count > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stage Velocity */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
        <div className="font-display font-bold text-[16px] text-[#0F172A] mb-1">Deal Velocity</div>
        <div className="text-[12.4px] text-[#64748B] mb-4">Average duration spent per stage before transition</div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {velocity.map(v => (
            <div key={v.stage} className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] text-center">
              <div className="font-display font-extrabold text-[22px] text-[#2563EB] mb-0.5">
                {v.avgDays} <span className="text-[12px] font-normal text-[#64748B]">days</span>
              </div>
              <div className="text-[11px] font-semibold text-[#475569]">{v.stage}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
