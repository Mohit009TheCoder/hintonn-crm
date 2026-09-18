import React, { useState } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';

export default function Calls({ onOpenDialer }) {
  const { calls, callStats, agentPerf, leads } = useCRM();
  const [callFilter, setCallFilter] = useState('all');

  const filteredCalls = calls.filter(c => {
    if (callFilter === 'outgoing') return c.type === 'outgoing';
    if (callFilter === 'incoming') return c.type === 'incoming';
    if (callFilter === 'missed') return c.type === 'missed';
    if (callFilter === 'today') return c.time && c.time.includes('Today');
    if (callFilter === 'week') return c.time && (c.time.includes('Today') || c.time.includes('Yesterday') || c.time.includes('days ago'));
    return true;
  });

  const dailyVolumes = [
    { day: 'Mon', v: 0 },
    { day: 'Tue', v: 0 },
    { day: 'Wed', v: 0 },
    { day: 'Thu', v: 0 },
    { day: 'Fri', v: 0 },
    { day: 'Sat', v: 0 },
    { day: 'Sun', v: 0 }
  ];
  const maxV = Math.max(...dailyVolumes.map(d => d.v), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="font-display font-extrabold text-[28px] tracking-tight text-[#0F172A]">
            Calls &amp; AI Dialer
          </div>
          <div className="text-[#64748B] text-[14px] mt-0.5">
            Voice interactions, connect rates, automated talk-time metrics, and 1-click outbound dialer.
          </div>
        </div>

        {leads[0] && (
          <button
            onClick={() => onOpenDialer(leads[0])}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#059669] text-white font-semibold text-[13px] hover:bg-[#047857] shadow-sm transition-all"
          >
            <Icon name="phone" size={16} />
            <span>Launch Quick Dialer</span>
          </button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Calls Today', value: callStats.callsToday ?? 0, color: '#2563EB' },
          { label: 'Avg Talk Time', value: callStats.avgTalkTime || '0:00', color: '#059669' },
          { label: 'Missed Calls', value: callStats.missedCalls ?? 0, color: '#DC2626' },
          { label: 'Connect Rate', value: callStats.connectRate || '0%', color: '#9333EA' }
        ].map((s, i) => (
          <div key={i} className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-4 text-center">
            <div className="font-display font-extrabold text-[28px] mb-0.5" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-[12px] text-[#64748B] font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts & Agent Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Daily Call Volume Chart */}
        <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
          <div className="font-display font-bold text-[15.5px] text-[#0F172A] mb-0.5">Daily Call Volume</div>
          <div className="text-[12.4px] text-[#64748B] mb-3">Last 7 days performance</div>

          <div className="h-[160px] w-full flex items-end justify-between gap-3 pt-6 px-2">
            {dailyVolumes.map(d => {
              const barH = Math.round((d.v / maxV) * 110);
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="font-mono text-[10.5px] font-bold text-[#64748B]">{d.v}</span>
                  <div
                    className="w-full rounded-t-[6px] gradient-bg opacity-85 transition-all hover:opacity-100 cursor-pointer"
                    style={{ height: `${barH}px` }}
                  ></div>
                  <span className="text-[11px] font-semibold text-[#94A3B8]">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agent Call Performance */}
        <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
          <div className="font-display font-bold text-[15.5px] text-[#0F172A] mb-0.5">Agent Call Performance</div>
          <div className="text-[12.4px] text-[#64748B] mb-3">Talk time and connect metrics per rep</div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12.5px]">
              <thead>
                <tr className="text-[11px] font-semibold text-[#94A3B8] border-b border-[#E2E8F0]">
                  <th className="py-2.5">Agent</th>
                  <th className="py-2.5">Total Calls</th>
                  <th className="py-2.5">Avg Talk Time</th>
                  <th className="py-2.5">Connect Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {agentPerf.map(agent => (
                  <tr key={agent.name} className="hover:bg-[#F8FAFC]">
                    <td className="py-2 font-semibold text-[#0F172A]">{agent.name}</td>
                    <td className="py-2 font-mono">{agent.totalCalls}</td>
                    <td className="py-2 font-mono">{agent.avgTalkTime}</td>
                    <td className="py-2">
                      <span className="tag-pill bg-[#D1FAE5] text-[#047857] text-[10px]">
                        {agent.connectRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Call History Table */}
      <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="font-display font-bold text-[16px] text-[#0F172A]">Call History &amp; Logs</div>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'All' },
              { id: 'outgoing', label: 'Outgoing' },
              { id: 'incoming', label: 'Incoming' },
              { id: 'missed', label: 'Missed' },
              { id: 'today', label: 'Today' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setCallFilter(f.id)}
                className={`text-[12px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                  callFilter === f.id
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
                <th className="px-4 py-3">Lead Contact</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Representative</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-[13px] text-[#94A3B8]">
                    No call records found.
                  </td>
                </tr>
              ) : (
                filteredCalls.map(c => {
                  const lead = leads.find(l => l.id === c.contactId);
                  return (
                    <tr key={c.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3 font-semibold text-[#0F172A]">
                        {lead?.name || 'Inbound Prospect'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`tag-pill text-[10.5px] ${
                            c.type === 'missed'
                              ? 'bg-[#FEE2E2] text-[#DC2626]'
                              : c.type === 'incoming'
                              ? 'bg-[#D1FAE5] text-[#047857]'
                              : 'bg-[#DBEAFE] text-[#1D4ED8]'
                          }`}
                        >
                          {c.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[12.5px]">{c.duration || '0:00'}</td>
                      <td className="px-4 py-3 text-[12px] text-[#64748B]">{c.time || 'Recent'}</td>
                      <td className="px-4 py-3 font-medium text-[#475569]">{c.rep || '—'}</td>
                      <td className="px-4 py-3 text-[12px] text-[#64748B] max-w-[240px] truncate">
                        {c.notes || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
