import React, { useState, useEffect } from 'react';
import { Icon } from '../../shared/Icons';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';

export default function DialerModal({ contact, onClose }) {
  const { logCall } = useCRM();
  const { user } = useAuth();

  const [callState, setCallState] = useState('ready'); // ready, in-progress, completed
  const [seconds, setSeconds] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    let timer = null;
    if (callState === 'in-progress') {
      timer = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState]);

  if (!contact) return null;

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleStartCall = () => {
    setCallState('in-progress');
    setSeconds(0);
  };

  const handleEndCall = () => {
    setCallState('completed');
    const duration = formatTimer(seconds);
    logCall({
      contactId: contact.id,
      type: 'outgoing',
      duration,
      rep: user.name,
      notes: notes.trim() || 'Quick call discussion',
      talkTime: seconds
    });
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white border border-[#E2E8F0] rounded-[20px] shadow-2xl w-[360px] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {callState === 'in-progress' && <div className="dialer-pulse"></div>}
            <span className="font-display font-bold text-[14px] text-[#0F172A]">
              {callState === 'ready' && 'Ready to call'}
              {callState === 'in-progress' && 'Call in progress...'}
              {callState === 'completed' && 'Call logged!'}
            </span>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#475569] p-1">
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 text-center">
          <div className="font-bold text-[16px] text-[#0F172A] mb-1">{contact.name}</div>
          <div className="font-mono font-bold text-[24px] tracking-wider text-[#2563EB] mb-3">
            {contact.phone}
          </div>

          <div className="dialer-timer mb-4">{formatTimer(seconds)}</div>

          <div className="mb-4 text-left">
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Call Notes</label>
            <textarea
              rows={2}
              placeholder="Record discussion outcomes, questions, or next steps..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-[10px] border border-[#CBD5E1] text-[12.5px] outline-none bg-[#F8FAFC] focus:bg-white resize-none"
            />
          </div>

          <div className="flex gap-2.5">
            {callState === 'ready' && (
              <button
                onClick={handleStartCall}
                className="w-full text-[13.5px] font-semibold px-4 py-2.5 rounded-[12px] bg-[#059669] text-white hover:bg-[#047857] flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <Icon name="phone" size={16} />
                <span>Start Call</span>
              </button>
            )}
            {callState === 'in-progress' && (
              <button
                onClick={handleEndCall}
                className="w-full text-[13.5px] font-semibold px-4 py-2.5 rounded-[12px] bg-[#DC2626] text-white hover:bg-[#B91C1C] flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <Icon name="phone" size={16} />
                <span>End &amp; Log Call</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
