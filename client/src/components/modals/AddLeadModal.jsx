import React, { useState } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';

export default function AddLeadModal({ onClose }) {
  const { addLead, projects } = useCRM();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [projectId, setProjectId] = useState(projects[0]?.id || 1);
  const [config, setConfig] = useState('2 BHK');
  const [value, setValue] = useState(6500000);
  const [source, setSource] = useState('Facebook Ads');
  const [tag, setTag] = useState('hot-lead');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    addLead({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      projectId: Number(projectId),
      config,
      value: Number(value),
      source,
      stage: 'new',
      rep: user.name,
      tags: [tag]
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white border border-[#E2E8F0] rounded-[20px] shadow-2xl w-full max-w-[480px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="font-display font-bold text-[16px] text-[#0F172A]">Add New Lead</div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#475569] p-1">
            <Icon name="x" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Joshi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Phone Number *</label>
              <input
                type="text"
                required
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Project Interest</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none bg-white"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Unit Configuration</label>
              <select
                value={config}
                onChange={(e) => setConfig(e.target.value)}
                className="w-full px-3 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none bg-white"
              >
                <option value="1 BHK">1 BHK</option>
                <option value="2 BHK">2 BHK</option>
                <option value="3 BHK">3 BHK</option>
                <option value="4 BHK">4 BHK</option>
                <option value="Office">Office</option>
                <option value="Shop">Shop</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Budget Value (₹)</label>
              <input
                type="number"
                step="500000"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none bg-white"
              >
                <option value="Facebook Ads">Facebook Ads</option>
                <option value="Google Ads">Google Ads</option>
                <option value="99acres">99acres</option>
                <option value="MagicBricks">MagicBricks</option>
                <option value="Instagram">Instagram</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Referral">Referral</option>
                <option value="Walk-in">Walk-in</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Primary Tag</label>
            <div className="flex flex-wrap gap-2">
              {['hot-lead', 'high-budget', 'investor', 'nri', 'ready-to-move'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-full border ${
                    tag === t ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'border-[#CBD5E1] text-[#475569]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] font-semibold text-[#475569] hover:bg-[#F1F5F9]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-[10px] bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-[#1D4ED8]"
            >
              Add Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
