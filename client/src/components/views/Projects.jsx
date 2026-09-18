import React, { useState } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';

function fmtINR(val) {
  if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + ' Cr';
  if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + ' L';
  return '₹' + Number(val).toLocaleString('en-IN');
}

export default function Projects({ onOpenAiListing, onViewChange }) {
  const { projects, updateUnitStatus } = useCRM();

  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);

  const toggleUnits = (pId) => {
    setExpandedProjectId(prev => (prev === pId ? null : pId));
    setSelectedUnit(null);
  };

  const handleUnitClick = (pId, unit) => {
    setSelectedUnit({ ...unit, projectId: pId });
  };

  const handleUpdateUnit = (status) => {
    if (!selectedUnit) return;
    updateUnitStatus(
      selectedUnit.projectId,
      selectedUnit.id,
      status,
      status === 'locked' ? 1 : null,
      status === 'locked' ? 'Sep 30, 2026' : null
    );
    setSelectedUnit(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="font-display font-extrabold text-[28px] tracking-tight text-[#0F172A]">
          Projects &amp; Inventory
        </div>
        <div className="text-[#64748B] text-[14px] mt-0.5">
          Live developments tracking, floor-by-floor unit grids, and instant AI property listings.
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.length === 0 ? (
          <div className="col-span-full text-center py-12 text-[13.5px] text-[#94A3B8] bg-white border border-[#E2E8F0] rounded-[16px]">
            No projects registered yet.
          </div>
        ) : (
          projects.map(p => {
            const soldPct = Math.round(((p.totalUnits - p.available) / p.totalUnits) * 100);
            const isExpanded = expandedProjectId === p.id;

            return (
              <div
                key={p.id}
                className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="tag-pill bg-[#DBEAFE] text-[#1D4ED8] font-bold">
                      {p.type}
                    </span>
                    <span className="text-[11px] font-semibold text-[#059669]">
                      {p.possession}
                    </span>
                  </div>

                  <div className="font-display font-bold text-[18px] text-[#0F172A]">{p.name}</div>
                  <div className="text-[12px] text-[#64748B] mb-3 flex items-center gap-1">
                    <Icon name="mappin" size={12} className="text-[#94A3B8]" />
                    <span>{p.loc}</span>
                  </div>

                  <div className="font-mono font-bold text-[16px] text-[#2563EB] mb-2.5">
                    {fmtINR(p.priceMin)} – {fmtINR(p.priceMax)}
                  </div>

                  <div className="flex justify-between text-[11.8px] text-[#475569] mb-1.5">
                    <span>{p.configs?.join(' · ')}</span>
                    <span>{p.available} of {p.totalUnits} available</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 rounded-full bg-[#E2E8F0] overflow-hidden mb-3.5">
                    <div
                      className="h-full rounded-full bg-[#059669] transition-all duration-300"
                      style={{ width: `${soldPct}%` }}
                    ></div>
                  </div>

                  {/* Matched leads badge */}
                  <div className="flex items-center gap-2 mb-3.5 bg-[#F3E8FF] border border-[#E9D5FF] rounded-[10px] px-3 py-2">
                    <Icon name="users" size={15} className="text-[#9333EA]" />
                    <div className="text-[12px]">
                      <span className="font-bold text-[#7E22CE]">{p.matchedLeadCount || 0} matched leads</span>{' '}
                      <span className="text-[#64748B] text-[11px]">(budget &amp; config fit)</span>
                    </div>
                  </div>
                </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
                <div className="flex gap-2">
                  <button
                    onClick={() => onOpenAiListing(p)}
                    className="flex-1 text-[12.5px] font-semibold px-3 py-2 rounded-[8px] bg-[#FAF5FF] text-[#7E22CE] border border-[#E9D5FF] hover:bg-[#F3E8FF] flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Icon name="sparkle" size={13} />
                    <span>AI Listing</span>
                  </button>
                  <button
                    onClick={() => toggleUnits(p.id)}
                    className={`flex-1 text-[12.5px] font-semibold px-3 py-2 rounded-[8px] border transition-all ${
                      isExpanded
                        ? 'bg-[#2563EB] text-white border-[#2563EB]'
                        : 'border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    {isExpanded ? 'Hide Units' : 'Manage Units'}
                  </button>
                </div>

                {/* Units Matrix Expanded */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-[#E2E8F0] space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#D1FAE5]"></span> Available</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#FEF3C7]"></span> Locked</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#FEE2E2]"></span> Sold</span>
                      </div>
                    </div>

                    <div className="unit-grid max-h-[180px] overflow-y-auto p-1 bg-[#F8FAFC] rounded-[10px] border border-[#E2E8F0]">
                      {(p.units || []).map(u => (
                        <div
                          key={u.id}
                          onClick={() => handleUnitClick(p.id, u)}
                          className={`unit-cell ${
                            u.status === 'available'
                              ? 'unit-available'
                              : u.status === 'locked'
                              ? 'unit-locked'
                              : 'unit-sold'
                          }`}
                          title={`Unit ${u.number} (${u.type}) - ${u.status.toUpperCase()}`}
                        >
                          {u.number}
                        </div>
                      ))}
                    </div>

                    {/* Unit Modifier Popover */}
                    {selectedUnit && selectedUnit.projectId === p.id && (
                      <div className="p-3 bg-white border border-[#CBD5E1] rounded-[10px] shadow-lg text-[12px] space-y-2">
                        <div className="flex items-center justify-between font-bold text-[#0F172A]">
                          <span>Unit {selectedUnit.number} ({selectedUnit.type})</span>
                          <span className="capitalize text-[11px] font-semibold">{selectedUnit.status}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleUpdateUnit('available')}
                            className="flex-1 py-1 rounded bg-[#D1FAE5] text-[#047857] font-semibold text-[11px] hover:bg-[#A7F3D0]"
                          >
                            Mark Available
                          </button>
                          <button
                            onClick={() => handleUpdateUnit('locked')}
                            className="flex-1 py-1 rounded bg-[#FEF3C7] text-[#92400E] font-semibold text-[11px] hover:bg-[#FDE68A]"
                          >
                            Lock Unit
                          </button>
                          <button
                            onClick={() => handleUpdateUnit('sold')}
                            className="flex-1 py-1 rounded bg-[#FEE2E2] text-[#DC2626] font-semibold text-[11px] hover:bg-[#FECACA]"
                          >
                            Mark Sold
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        }))}
      </div>
    </div>
  );
}
