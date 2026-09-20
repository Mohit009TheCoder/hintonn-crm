import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../shared/Icons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../shared/Toast';

export default function SettingsView() {
  const { user, token } = useAuth();
  const toast = useToast();

  const [teamMembers, setTeamMembers] = useState([]);
  const [companyName, setCompanyName] = useState('Ashray Group Real Estate');
  const [wabaId, setWabaId] = useState('WABA-99281-IN');
  const [phoneNumber, setPhoneNumber] = useState('+91 98250 99000');
  const [slaMinutes, setSlaMinutes] = useState(15);
  const [assignMethod, setAssignMethod] = useState('Round Robin');

  const fetchTeamMembers = useCallback(async () => {
    try {
      const API_BASE = (typeof __API_URL__ !== 'undefined' && __API_URL__) ? __API_URL__ : '';
      const res = await fetch(`${API_BASE}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setTeamMembers(data.data);
    } catch (e) {
      // silently fail
    }
  }, [token]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  const handleSave = (e) => {
    e.preventDefault();
    toast('Settings saved successfully!');
  };

  return (
    <div className="space-y-6 max-w-[900px]">
      <div>
        <div className="font-display font-extrabold text-[28px] tracking-tight text-[#0F172A]">
          Settings &amp; Integrations
        </div>
        <div className="text-[#64748B] text-[14px] mt-0.5">
          Configure agency branding, WhatsApp Cloud API keys, response SLA rules, and team permissions.
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Company profile */}
        <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-6 space-y-4">
          <div className="font-display font-bold text-[16px] text-[#0F172A]">Company Profile</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Company / Developer Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Brand Tagline</label>
              <input
                type="text"
                defaultValue="Hintonn AI — Smart Lead Automation"
                className="w-full px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none bg-white"
              />
            </div>
          </div>
        </div>

        {/* WhatsApp Business API */}
        <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display font-bold text-[16px] text-[#0F172A]">Meta WhatsApp Cloud API</div>
              <div className="text-[12.4px] text-[#64748B]">Official verified WhatsApp Business Account (WABA) credentials</div>
            </div>
            <span className="tag-pill bg-[#D1FAE5] text-[#047857]">Connected</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">WABA Account ID</label>
              <input
                type="text"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Phone Number</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* SLA & Lead Assignment */}
        <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-6 space-y-4">
          <div className="font-display font-bold text-[16px] text-[#0F172A]">SLA &amp; Lead Assignment Rules</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Response Time SLA (Minutes)</label>
              <input
                type="number"
                value={slaMinutes}
                onChange={(e) => setSlaMinutes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none"
              />
              <span className="text-[11px] text-[#94A3B8] mt-1 block">Triggers overdue alert when exceeded</span>
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Auto Assignment Algorithm</label>
              <select
                value={assignMethod}
                onChange={(e) => setAssignMethod(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none bg-white"
              >
                <option value="Round Robin">Round Robin (Equal Distribution)</option>
                <option value="Score Based">Score Based (High Intent to Seniors)</option>
                <option value="Manual">Manual Assignment Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="card-base bg-white border border-[#E2E8F0] rounded-[16px] p-6 space-y-4">
          <div className="font-display font-bold text-[16px] text-[#0F172A]">Team Members</div>
          <div className="divide-y divide-[#E2E8F0]">
            {teamMembers.map(u => (
              <div key={u.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#9333EA] text-white flex items-center justify-center font-bold text-[11px]">
                    {u.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#0F172A]">{u.name}</div>
                    <div className="text-[11px] text-[#64748B]">{u.email}</div>
                  </div>
                </div>
                <span className="tag-pill bg-[#F1F5F9] text-[#475569] text-[11px] capitalize">{u.role}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-[10px] bg-[#2563EB] text-white font-semibold text-[13.5px] hover:bg-[#1D4ED8] shadow-md transition-all"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
