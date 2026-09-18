import React, { useState } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';

export default function ScheduleVisitModal({ leadId = null, onClose }) {
  const { leads, projects, scheduleSiteVisit } = useCRM();
  const { user } = useAuth();

  const [selectedLeadId, setSelectedLeadId] = useState(leadId || leads[0]?.id || 1);
  const [projectId, setProjectId] = useState(projects[0]?.id || 1);
  const [scheduledDate, setScheduledDate] = useState('Tomorrow, 11:00 AM');
  const [attendedBy, setAttendedBy] = useState(user.name);
  const [nextAction, setNextAction] = useState('Show sample flat and discuss payment options');

  const handleSubmit = (e) => {
    e.preventDefault();
    scheduleSiteVisit({
      contactId: Number(selectedLeadId),
      projectId: Number(projectId),
      scheduledDate,
      attendedBy,
      duration: '45 min',
      nextAction
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white border border-[#E2E8F0] rounded-[20px] shadow-2xl w-full max-w-[460px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="font-display font-bold text-[16px] text-[#0F172A]">Schedule Site Visit</div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#475569] p-1">
            <Icon name="x" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Select Lead</label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none bg-white"
            >
              {leads.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.phone})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Project Development</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none bg-white"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.loc})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Date &amp; Time</label>
              <input
                type="text"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                placeholder="e.g. Saturday, 3:00 PM"
                className="w-full px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Assigned Executive</label>
              <input
                type="text"
                value={attendedBy}
                onChange={(e) => setAttendedBy(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Visit Agenda / Action</label>
            <textarea
              rows={2}
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              className="w-full px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none bg-[#F8FAFC] resize-none"
            />
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
              Confirm Visit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
