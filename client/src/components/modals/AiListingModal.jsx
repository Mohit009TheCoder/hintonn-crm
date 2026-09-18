import React, { useState, useEffect } from 'react';
import { Icon } from '../../shared/Icons';
import { useToast } from '../../shared/Toast';
import { useCRM } from '../../context/CRMContext';

export default function AiListingModal({ project, onClose }) {
  const toast = useToast();
  const { authFetch } = useCRM();
  const [displayText, setDisplayText] = useState('');
  const [fullText, setFullText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!project || !authFetch) return;
    async function loadListing() {
      try {
        const res = await authFetch(`/api/projects/${project.id}/ai-listing`, { method: 'POST' });
        const data = await res.json();
        if (data.success && data.data.listing) {
          setFullText(data.data.listing);
          let idx = 0;
          const text = data.data.listing;
          const interval = setInterval(() => {
            if (idx < text.length) {
              setDisplayText(text.substring(0, idx + 1));
              idx++;
            } else {
              clearInterval(interval);
              setIsTyping(false);
            }
          }, 12);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadListing();
  }, [project]);

  if (!project) return null;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText).then(() => toast('Listing text copied to clipboard!'));
    }
  };

  const handleShare = () => {
    toast('Listing shared via WhatsApp Business');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white border border-[#E2E8F0] rounded-[20px] shadow-2xl w-full max-w-[480px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <span className="text-[#9333EA]"><Icon name="sparkle" size={18} /></span>
            <span className="font-display font-bold text-[15px] text-[#0F172A]">AI Property Listing Generator</span>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#475569] p-1">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="px-5 py-4 max-h-[380px] overflow-y-auto bg-[#FAFBFC]">
          <div className="listing-typing whitespace-pre-wrap leading-relaxed text-[13px] text-[#334155] font-sans">
            {displayText}
            {isTyping && <span className="cursor"></span>}
          </div>
        </div>

        <div className="flex gap-2.5 px-5 py-4 border-t border-[#E2E8F0] bg-white">
          <button
            onClick={handleCopy}
            className="flex-1 text-[13px] font-semibold px-4 py-2.5 rounded-[10px] border border-[#CBD5E1] hover:bg-[#F1F5F9] flex items-center justify-center gap-1.5 transition-all"
          >
            <Icon name="copy" size={15} />
            <span>Copy Text</span>
          </button>
          <button
            onClick={handleShare}
            className="flex-1 text-[13px] font-semibold px-4 py-2.5 rounded-[10px] bg-[#059669] text-white hover:bg-[#047857] flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <Icon name="messagecircle" size={15} />
            <span>Share on WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
