import React, { useState } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';

export default function AddPartnerModal({ onClose }) {
  const { addPartner } = useCRM();

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState('broker');
  const [commissionRate, setCommissionRate] = useState(1.5);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !company.trim()) return;

    addPartner({
      name: name.trim(),
      company: company.trim(),
      phone: phone.trim(),
      email: email.trim(),
      type,
      commissionRate: Number(commissionRate)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white border border-[#E2E8F0] rounded-[20px] shadow-2xl w-full max-w-[450px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="font-display font-bold text-[16px] text-[#0F172A]">Add Channel Partner</div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#475569] p-1">
            <Icon name="x" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Partner Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Vimal Shah"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Agency / Company *</label>
              <input
                type="text"
                required
                placeholder="e.g. Shah Realty"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Phone</label>
              <input
                type="text"
                placeholder="+91 98250 10001"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Email</label>
              <input
                type="email"
                placeholder="vimal@shahrealty.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Partner Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none bg-white"
              >
                <option value="broker">Certified Broker</option>
                <option value="digital">Digital Affiliate</option>
                <option value="referral">Client Referral</option>
              </select>
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Commission Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none"
              />
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
              Register Partner
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
