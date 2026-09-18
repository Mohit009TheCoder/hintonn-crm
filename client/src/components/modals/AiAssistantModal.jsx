import React, { useState } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';

export default function AiAssistantModal({ onClose, onSelectLead }) {
  const { leads, projects, tasks } = useCRM();

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am your Hintonn AI sales co-pilot. I can analyze your pipeline, highlight overdue inquiries, find inventory matches, and draft responses. How can I help you right now?'
    }
  ]);
  const [input, setInput] = useState('');

  const quickPrompts = [
    'Show overdue leads',
    'Summarize high budget buyers',
    'Inventory status for Skyline',
    'Site visits for today'
  ];

  const handleSend = (textToSend = input) => {
    const query = textToSend.trim();
    if (!query) return;

    const userMsg = { role: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      let reply = '';
      const qLower = query.toLowerCase();

      if (qLower.includes('overdue')) {
        const overdue = leads.filter(l => l.stage === 'new');
        reply = `You currently have ${overdue.length} new leads that need immediate response. Most critical: ${overdue.slice(0, 2).map(l => l.name).join(' & ')}.`;
      } else if (qLower.includes('budget') || qLower.includes('high')) {
        const high = leads.filter(l => (l.value || 0) >= 10000000);
        reply = `Found ${high.length} high-ticket buyers (> ₹1.0 Cr). Top buyers include ${high.map(l => `${l.name} (${(l.value / 10000000).toFixed(1)} Cr)`).join(', ')}.`;
      } else if (qLower.includes('skyline') || qLower.includes('inventory')) {
        const p = projects.find(pr => pr.name.includes('Skyline')) || projects[0];
        reply = `${p.name} currently has ${p.available} of ${p.totalUnits} units available (${Math.round((p.available / p.totalUnits) * 100)}% vacancy). Ready to move possession.`;
      } else {
        reply = `I reviewed your pipeline: you have ${leads.length} active leads across 5 projects with ₹${(leads.reduce((s, l) => s + (l.value || 0), 0) / 10000000).toFixed(1)} Cr total pipeline value. 3 site visits scheduled this week.`;
      }

      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white border border-[#E2E8F0] rounded-[20px] shadow-2xl w-full max-w-[520px] h-[580px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#9333EA] text-white flex items-center justify-center shadow-sm">
              <Icon name="sparkle" size={16} />
            </div>
            <div>
              <div className="font-display font-bold text-[15px] text-[#0F172A]">Ask Hintonn AI</div>
              <div className="text-[11px] text-[#64748B]">Real estate intelligence &amp; automation</div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#475569] p-1">
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAFBFC]">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`max-w-[86%] p-3.5 rounded-[14px] text-[13px] leading-relaxed ${
                m.role === 'user'
                  ? 'ml-auto bg-[#2563EB] text-white rounded-tr-[3px]'
                  : 'bg-white border border-[#E2E8F0] text-[#0F172A] rounded-tl-[3px] shadow-sm'
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>

        {/* Quick prompt chips */}
        <div className="p-2 border-t border-[#E2E8F0] bg-[#F8FAFC] flex gap-1.5 overflow-x-auto">
          {quickPrompts.map(p => (
            <button
              key={p}
              onClick={() => handleSend(p)}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white border border-[#CBD5E1] text-[#475569] hover:border-[#2563EB] whitespace-nowrap transition-all"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="p-3 border-t border-[#E2E8F0] bg-white flex gap-2">
          <input
            type="text"
            placeholder="Ask about leads, projects, schedules, or write a pitch..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 px-3.5 py-2.5 rounded-[10px] border border-[#CBD5E1] text-[13px] outline-none focus:border-[#2563EB]"
          />
          <button
            onClick={() => handleSend()}
            className="px-4 py-2.5 rounded-[10px] bg-[#2563EB] text-white font-semibold text-[13px] hover:bg-[#1D4ED8]"
          >
            <Icon name="send" size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
