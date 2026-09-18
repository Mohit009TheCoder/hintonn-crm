import React, { useState } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';

export default function AddTaskModal({ onClose }) {
  const { addTask, leads } = useCRM();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [contactId, setContactId] = useState('');
  const [type, setType] = useState('follow-up');
  const [priority, setPriority] = useState('medium');
  const [due, setDue] = useState('Today, 5:00 PM');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTask({
      title: title.trim(),
      contactId: contactId ? Number(contactId) : null,
      type,
      priority,
      due,
      assignee: user.name,
      description: description.trim()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white border border-[#E2E8F0] rounded-[20px] shadow-2xl w-full max-w-[450px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="font-display font-bold text-[16px] text-[#0F172A]">Add Task / Follow-Up</div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#475569] p-1">
            <Icon name="x" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Task Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Call Kavita for floor plan feedback"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Related Lead (Optional)</label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full px-3 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none bg-white"
              >
                <option value="">None / General</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Task Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none bg-white"
              >
                <option value="follow-up">Follow-up Call</option>
                <option value="site-visit">Site Visit Prep</option>
                <option value="document">Send Document</option>
                <option value="meeting">Meeting</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Due Date / Time</label>
              <input
                type="text"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                placeholder="e.g. Today, 4:00 PM"
                className="w-full px-3.5 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none bg-white"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details..."
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
              Save Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
