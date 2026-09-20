import React, { useState } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';

const TYPE_OPTIONS = ['Residential', 'Commercial', 'Villas', 'Plots', 'Mixed-Use'];
const COMMON_CONFIGS = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', 'Penthouse', 'Office', 'Shop', 'Villa'];

export default function AddProjectModal({ onClose }) {
  const { addProject } = useCRM();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [type, setType] = useState('Residential');
  const [loc, setLoc] = useState('');
  const [selectedConfigs, setSelectedConfigs] = useState(['2 BHK', '3 BHK']);
  const [customConfig, setCustomConfig] = useState('');
  const [priceMin, setPriceMin] = useState(4500000);
  const [priceMax, setPriceMax] = useState(9000000);
  const [totalUnits, setTotalUnits] = useState(60);
  const [available, setAvailable] = useState(45);
  const [possession, setPossession] = useState('Dec 2026');

  const toggleConfig = (cfg) => {
    setSelectedConfigs(prev =>
      prev.includes(cfg) ? prev.filter(c => c !== cfg) : [...prev, cfg]
    );
  };

  const handleAddCustomConfig = () => {
    if (customConfig.trim() && !selectedConfigs.includes(customConfig.trim())) {
      setSelectedConfigs(prev => [...prev, customConfig.trim()]);
      setCustomConfig('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Project name is required.');
    if (!loc.trim()) return setError('Location is required.');
    if (selectedConfigs.length === 0) return setError('Please select at least one configuration.');
    
    if (Number(priceMin) < 0 || Number(priceMax) < 0) {
      return setError('Prices cannot be negative.');
    }
    if (Number(priceMax) < Number(priceMin)) {
      return setError('Max price cannot be less than Min price.');
    }
    
    if (Number(totalUnits) < 1) return setError('Total units must be at least 1.');
    if (Number(available) < 0) return setError('Available units cannot be negative.');
    if (Number(available) > Number(totalUnits)) {
      return setError('Available units cannot exceed total units.');
    }

    setLoading(true);
    await addProject({
      name: name.trim(),
      type,
      loc: loc.trim(),
      configs: selectedConfigs.length > 0 ? selectedConfigs : ['2 BHK'],
      priceMin: Number(priceMin) || 4500000,
      priceMax: Number(priceMax) || 8500000,
      totalUnits: Number(totalUnits) || 24,
      available: Number(available) || Number(totalUnits) || 24,
      possession: possession.trim() || 'Ready to move'
    });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white border border-[#E2E8F0] rounded-[20px] shadow-2xl w-full max-w-[540px] max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <div className="font-display font-bold text-[17px] text-[#0F172A]">Add New Development Project</div>
            <div className="text-[12px] text-[#64748B]">Create project and live unit inventory</div>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#475569] p-1 rounded-lg">
            <Icon name="x" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Project Name & Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11.8px] font-semibold text-[#334155] mb-1">
                Project Name <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Skyline Heights"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10"
              />
            </div>
            <div>
              <label className="block text-[11.8px] font-semibold text-[#334155] mb-1">
                Property Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none focus:border-[#2563EB] bg-white"
              >
                {TYPE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-[11.8px] font-semibold text-[#334155] mb-1">
              Location / Area <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Bopal, Ahmedabad"
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10"
            />
          </div>

          {/* Configurations */}
          <div>
            <label className="block text-[11.8px] font-semibold text-[#334155] mb-1.5">
              Available Configurations
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_CONFIGS.map(cfg => {
                const isSelected = selectedConfigs.includes(cfg);
                return (
                  <button
                    type="button"
                    key={cfg}
                    onClick={() => toggleConfig(cfg)}
                    className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold transition-all ${
                      isSelected
                        ? 'bg-[#2563EB] text-white'
                        : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                    }`}
                  >
                    {isSelected ? `✓ ${cfg}` : `+ ${cfg}`}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Other config (e.g. 5 BHK Duplex)"
                value={customConfig}
                onChange={(e) => setCustomConfig(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-[8px] border border-[#E2E8F0] text-[12px] outline-none focus:border-[#2563EB]"
              />
              <button
                type="button"
                onClick={handleAddCustomConfig}
                className="px-3 py-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] text-[12px] font-semibold rounded-[8px]"
              >
                Add
              </button>
            </div>
          </div>

          {/* Price Range */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11.8px] font-semibold text-[#334155] mb-1">
                Min Price (₹)
              </label>
              <input
                type="number"
                step="50000"
                min="0"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#CBD5E1] text-[13px] font-mono outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-[11.8px] font-semibold text-[#334155] mb-1">
                Max Price (₹)
              </label>
              <input
                type="number"
                step="50000"
                min="0"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#CBD5E1] text-[13px] font-mono outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          {/* Inventory Counts & Possession */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11.8px] font-semibold text-[#334155] mb-1">
                Total Units
              </label>
              <input
                type="number"
                min="1"
                value={totalUnits}
                onChange={(e) => setTotalUnits(e.target.value)}
                className="w-full px-3 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] font-mono outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-[11.8px] font-semibold text-[#334155] mb-1">
                Available Units
              </label>
              <input
                type="number"
                min="0"
                value={available}
                onChange={(e) => setAvailable(e.target.value)}
                className="w-full px-3 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] font-mono outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-[11.8px] font-semibold text-[#334155] mb-1">
                Possession
              </label>
              <input
                type="text"
                placeholder="e.g. Dec 2026"
                value={possession}
                onChange={(e) => setPossession(e.target.value)}
                className="w-full px-3 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          {/* Actions */}
          {error && (
            <div className="px-3 py-2.5 bg-[#FEE2E2] text-[#DC2626] text-[12px] font-semibold rounded-[8px] flex items-center gap-2">
              <Icon name="alerttriangle" size={15} />
              {error}
            </div>
          )}
          <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[13px] font-medium text-[#64748B] hover:text-[#334155]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:opacity-90 text-white text-[13px] font-semibold rounded-[10px] shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Icon name="plus" size={15} />
                  <span>Create Project</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
