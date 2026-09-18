import React, { useState, useEffect } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';

function fmtINR(val) {
  if (!val) return '₹0';
  if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + ' Cr';
  if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + ' L';
  return '₹' + Number(val).toLocaleString('en-IN');
}

export default function LeadDrawer({ leadId, onClose, onOpenDialer }) {
  const { leads, projects, siteVisits, updateLeadStage, addLeadNote, sendLeadBrochure, sendWhatsAppMessage } = useCRM();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [newNoteText, setNewNoteText] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isDraftingAi, setIsDraftingAi] = useState(false);
  const [aiDraft, setAiDraft] = useState('');

  const lead = leads.find(l => l.id === leadId);

  if (!lead) return null;

  const project = projects.find(p => p.id === lead.projectId) || projects[0] || {};
  const leadVisits = siteVisits.filter(sv => sv.contactId === lead.id);

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    addLeadNote(lead.id, newNoteText.trim(), user.name);
    setNewNoteText('');
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    sendWhatsAppMessage(lead.id, chatInput.trim());
    setChatInput('');
  };

  const handleAiDraft = () => {
    setIsDraftingAi(true);
    setAiDraft('');
    const first = lead.name.split(' ')[0];
    const draft = `Hi ${first}! Rohan here from Ashray Group. We just released new floor plans for ${project.name} (${lead.config}). Would you like to schedule a visit this Saturday?`;
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < draft.length) {
        setAiDraft(draft.substring(0, idx + 1));
        idx++;
      } else {
        clearInterval(interval);
        setIsDraftingAi(false);
      }
    }, 15);
  };

  const scoreColor = (s) => (s >= 75 ? '#059669' : s >= 50 ? '#2563EB' : '#D97706');

  return (
    <div className="fixed inset-0 z-[150] flex justify-end bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-[560px] bg-white h-full shadow-2xl flex flex-col animate-slide-left">
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#E2E8F0] flex items-start justify-between bg-white sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-display font-extrabold text-[20px] text-[#0F172A]">{lead.name}</span>
              <span className="tag-pill bg-[#DBEAFE] text-[#1D4ED8] uppercase text-[11px] font-bold">
                {lead.stage}
              </span>
            </div>
            <div className="text-[12.5px] text-[#64748B] flex items-center gap-3">
              <span>{lead.phone}</span>
              <span>·</span>
              <span>{project.name} ({lead.config})</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenDialer(lead)}
              className="w-9 h-9 rounded-[10px] bg-[#D1FAE5] text-[#047857] hover:bg-[#A7F3D0] flex items-center justify-center transition-all"
              title="Call Lead"
            >
              <Icon name="phone" size={16} />
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className="w-9 h-9 rounded-[10px] bg-[#DBEAFE] text-[#1D4ED8] hover:bg-[#BFDBFE] flex items-center justify-center transition-all"
              title="WhatsApp Chat"
            >
              <Icon name="messagecircle" size={16} />
            </button>
            <button onClick={onClose} className="w-9 h-9 rounded-[10px] hover:bg-[#F1F5F9] text-[#94A3B8] hover:text-[#475569] flex items-center justify-center">
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[#E2E8F0] px-5 bg-[#FAFBFC]">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'activity', label: 'Activity' },
            { id: 'notes', label: 'Notes', count: lead.notes?.length || 0 },
            { id: 'deal', label: 'Deal & Docs' },
            { id: 'chat', label: 'WhatsApp' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`drawer-tab flex items-center gap-1.5 ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#E2E8F0] text-[#475569]">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Quick Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] p-3.5">
                  <div className="text-[11px] font-semibold text-[#64748B] mb-1">Budget Value</div>
                  <div className="font-mono font-bold text-[18px] text-[#0F172A]">{fmtINR(lead.value)}</div>
                </div>
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] p-3.5">
                  <div className="text-[11px] font-semibold text-[#64748B] mb-1">AI Fit Score</div>
                  <div className="font-mono font-bold text-[18px]" style={{ color: scoreColor(lead.score || 60) }}>
                    {lead.score || 60}/100
                  </div>
                </div>
              </div>

              {/* Stage Selection */}
              <div>
                <label className="block text-[11.5px] font-semibold text-[#64748B] mb-1.5">Pipeline Stage</label>
                <div className="flex flex-wrap gap-1.5">
                  {['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost'].map(st => (
                    <button
                      key={st}
                      onClick={() => updateLeadStage(lead.id, st)}
                      className={`text-[11.5px] font-semibold px-3 py-1 rounded-full border transition-all ${
                        lead.stage === st
                          ? 'bg-[#2563EB] text-white border-[#2563EB]'
                          : 'border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      {st.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rep & Source */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-[#94A3B8] mb-1 font-semibold">Assigned Executive</div>
                  <div className="text-[13px] font-semibold text-[#0F172A]">{lead.rep || 'Rohan Mehta'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#94A3B8] mb-1 font-semibold">Acquisition Source</div>
                  <div className="text-[13px] font-medium text-[#475569]">{lead.source}</div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <div className="text-[11px] text-[#94A3B8] mb-1.5 font-semibold">Tags</div>
                <div className="flex flex-wrap gap-1.5">
                  {(lead.tags || []).map(t => (
                    <span key={t} className="tag-pill bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Property Preferences */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[14px] p-4">
                <div className="font-bold text-[13.5px] text-[#0F172A] mb-3">Buyer Preferences</div>
                <div className="grid grid-cols-2 gap-3 text-[12.5px] mb-3">
                  <div>
                    <span className="text-[#64748B]">Bedrooms:</span>{' '}
                    <span className="font-semibold text-[#0F172A]">{lead.preferences?.bedrooms || lead.config}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Locations:</span>{' '}
                    <span className="font-semibold text-[#0F172A]">{lead.preferences?.locations?.join(', ') || 'Ahmedabad'}</span>
                  </div>
                </div>
                {lead.preferences?.amenities && (
                  <div className="flex flex-wrap gap-1">
                    {lead.preferences.amenities.map(a => (
                      <span key={a} className="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-[#DBEAFE] text-[#1D4ED8]">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACTIVITY TAB */}
          {activeTab === 'activity' && (
            <div className="relative pl-2">
              <div className="timeline-line"></div>
              {(lead.timeline || []).map((item, idx) => (
                <div key={idx} className="timeline-item">
                  <div className="timeline-dot bg-[#DBEAFE] text-[#1D4ED8] z-10 border-2 border-white shadow-sm">
                    <Icon name={item.icon || 'phone'} size={10} />
                  </div>
                  <div className="text-[13px] font-medium text-[#0F172A]">{item.text}</div>
                  <div className="text-[11px] text-[#94A3B8] mt-0.5">{item.time}</div>
                </div>
              ))}
            </div>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <div>
              <div className="mb-4">
                <textarea
                  rows={3}
                  placeholder="Add a new note regarding customer meeting, price discussion..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-[10px] p-3 text-[13px] outline-none focus:bg-white focus:border-[#2563EB] resize-none"
                />
                <button
                  onClick={handleAddNote}
                  className="mt-2 text-[12.8px] font-semibold px-4 py-2 rounded-[10px] bg-[#2563EB] text-white hover:bg-[#1D4ED8] flex items-center gap-1.5"
                >
                  <Icon name="plus" size={14} />
                  <span>Add note</span>
                </button>
              </div>

              <div className="space-y-3">
                {(lead.notes || []).map(note => (
                  <div key={note.id} className="note-item">
                    <div className="text-[12.8px] text-[#0F172A] leading-relaxed">{note.text}</div>
                    <div className="text-[11px] text-[#94A3B8] mt-1">{note.author} · {note.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DEAL & DOCS TAB */}
          {activeTab === 'deal' && (
            <div className="space-y-5">
              {/* Deal Probability */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[12.4px] text-[#64748B] font-semibold">Deal Probability</span>
                  <span className="font-mono text-[14px] font-bold text-[#2563EB]">{lead.dealProb || 50}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-[#E2E8F0] overflow-hidden">
                  <div className="h-full rounded-full gradient-bg transition-all" style={{ width: `${lead.dealProb || 50}%` }}></div>
                </div>
              </div>

              {/* Commission calculation */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] p-3.5 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-[#94A3B8] font-semibold mb-1">Commission Rate</div>
                  <div className="font-mono text-[14px] font-bold text-[#0F172A]">{lead.commission?.rate || 2}%</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#94A3B8] font-semibold mb-1">Earned on Close</div>
                  <div className="font-mono text-[14px] font-bold text-[#059669]">
                    {fmtINR(lead.commission?.earned || Math.round((lead.value || 0) * 0.02))}
                  </div>
                </div>
              </div>

              {/* Brochure Action */}
              <div className="border border-[#E2E8F0] rounded-[12px] p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-[13px] text-[#0F172A]">Digital Brochure Activity</div>
                  <button
                    onClick={() => sendLeadBrochure(lead.id)}
                    className="text-[12px] font-semibold px-3 py-1.5 rounded-[8px] bg-[#DBEAFE] text-[#1D4ED8] hover:bg-[#BFDBFE] flex items-center gap-1"
                  >
                    <Icon name="send" size={12} />
                    <span>Send Brochure</span>
                  </button>
                </div>
                <div className="text-[12px] text-[#64748B]">
                  Send the {project.name} brochure and pricing sheet via WhatsApp to track open rates.
                </div>
              </div>

              {/* Site visits history */}
              <div>
                <div className="font-bold text-[13.5px] text-[#0F172A] mb-2">Site Visits</div>
                {leadVisits.length > 0 ? (
                  <div className="space-y-2">
                    {leadVisits.map(sv => (
                      <div key={sv.id} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[10px]">
                        <div className="flex items-center justify-between text-[12.5px] font-semibold mb-1">
                          <span>{sv.scheduledDate}</span>
                          <span className="tag-pill bg-[#D1FAE5] text-[#047857]">{sv.status}</span>
                        </div>
                        <div className="text-[11px] text-[#64748B]">Attended by {sv.attendedBy} · {sv.duration}</div>
                        {sv.feedback && <div className="text-[11.5px] text-[#334155] mt-1">"{sv.feedback}"</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[12px] text-[#94A3B8]">No site visits recorded yet.</div>
                )}
              </div>
            </div>
          )}

          {/* CHAT TAB */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[480px]">
              {/* Messages list */}
              <div className="flex-1 overflow-y-auto space-y-2.5 p-2 bg-[#F8FAFC] rounded-[12px] mb-3">
                <div className="max-w-[85%] self-end ml-auto px-3 py-2 rounded-[12px] rounded-tr-[3px] text-[12.6px] bg-[#EFF6FF] border border-[#BFDBFE] text-[#0F172A]">
                  Hi {lead.name.split(' ')[0]}, this is Rohan from Ashray Group — thanks for inquiring about {project.name}!
                  <div className="text-[9.5px] text-[#94A3B8] mt-1 text-right">3 days ago</div>
                </div>

                {(lead.waLog || []).map((msg, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] px-3 py-2 rounded-[12px] text-[12.6px] ${
                      msg.dir === 'in'
                        ? 'bg-white border border-[#E2E8F0] text-[#0F172A]'
                        : msg.auto
                        ? 'self-end ml-auto bg-[#F3E8FF] border border-[#E9D5FF] text-[#7E22CE]'
                        : 'self-end ml-auto bg-[#EFF6FF] border border-[#BFDBFE] text-[#0F172A]'
                    }`}
                  >
                    {msg.auto && (
                      <div className="text-[9.5px] font-bold text-[#7E22CE] mb-0.5 flex items-center gap-1">
                        <Icon name="sparkle" size={10} />
                        <span>AUTOMATED NUDGE</span>
                      </div>
                    )}
                    {msg.text}
                    <div className="text-[9.5px] text-[#94A3B8] mt-1 text-right">{msg.time}</div>
                  </div>
                ))}
              </div>

              {/* AI Assistant Generator */}
              <div className="mb-2">
                <button
                  onClick={handleAiDraft}
                  disabled={isDraftingAi}
                  className="text-[11.5px] font-semibold px-2.5 py-1 rounded-[8px] bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF] hover:bg-[#E9D5FF] flex items-center gap-1"
                >
                  <Icon name="sparkle" size={12} />
                  <span>Draft WhatsApp with AI</span>
                </button>
                {aiDraft && (
                  <div className="mt-1.5 p-2 bg-[#FAF5FF] border border-[#E9D5FF] rounded-[8px] text-[12px] text-[#475569] flex justify-between items-center">
                    <span>{aiDraft}</span>
                    <button
                      onClick={() => setChatInput(aiDraft)}
                      className="text-[11px] font-bold text-[#7E22CE] ml-2 hover:underline"
                    >
                      Use
                    </button>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a WhatsApp message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  className="flex-1 px-3 py-2 rounded-[10px] border border-[#CBD5E1] text-[12.8px] outline-none focus:border-[#2563EB]"
                />
                <button
                  onClick={handleSendChat}
                  className="px-4 py-2 rounded-[10px] bg-[#2563EB] text-white font-semibold text-[13px] hover:bg-[#1D4ED8]"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
