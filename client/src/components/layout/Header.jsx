import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../../shared/Icons';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';

const ROLE_BADGE_COLORS = {
  admin: 'bg-[#FEE2E2] text-[#DC2626]',
  manager: 'bg-[#F3E8FF] text-[#7E22CE]',
  agent: 'bg-[#DBEAFE] text-[#1D4ED8]',
  viewer: 'bg-[#F1F5F9] text-[#64748B]',
};

export default function Header({ currentView, onToggleSidebar, onSelectLead, onViewChange, onOpenAiModal }) {
  const { user, logout, token } = useAuth();
  const { notifications, markNotificationsRead } = useCRM();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);

  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const notifRef = useRef(null);
  const avatarRef = useRef(null);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setShowSearchBox(false);
        setShowNotif(false);
        setShowAvatarMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSearchBox(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setShowAvatarMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live search debounced
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const API_BASE = (typeof __API_URL__ !== 'undefined' && __API_URL__) ? __API_URL__ : '';
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.data);
          setShowSearchBox(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-16 flex-shrink-0 flex items-center gap-3 px-5 bg-white border-b border-[#E2E8F0] sticky top-0 z-20">
      {/* Mobile Hamburger */}
      <button
        onClick={onToggleSidebar}
        className="md:hidden w-9 h-9 flex items-center justify-center rounded-[10px] hover:bg-[#F1F5F9] text-[#475569]"
      >
        <Icon name="menu" size={20} />
      </button>

      {/* Global Search Bar */}
      <div ref={searchContainerRef} className="relative flex-1 max-w-[420px]">
        <div className="search-input flex items-center gap-2 border border-[#E2E8F0] rounded-[10px] px-3.5 py-2 focus-within:border-[#CBD5E1]">
          <Icon name="search" size={16} className="text-[#94A3B8]" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search leads, phone or project"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchResults) setShowSearchBox(true); }}
            className="bg-transparent outline-none w-full text-[13.4px] placeholder:text-[#94A3B8]"
            autoComplete="off"
          />
          <span className="text-[11px] font-mono text-[#94A3B8] bg-white border border-[#E2E8F0] rounded px-1.5 py-0.5">
            /
          </span>
        </div>

        {/* Search Results Dropdown */}
        {showSearchBox && searchResults && (
          <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-[#E2E8F0] rounded-[12px] shadow-2xl z-50 overflow-hidden max-h-[420px] overflow-y-auto">
            {/* Leads */}
            {searchResults.leads.length > 0 && (
              <div className="p-2 border-b border-[#E2E8F0]">
                <div className="text-[10.5px] font-bold uppercase text-[#94A3B8] px-2.5 py-1">Leads</div>
                {searchResults.leads.map(l => (
                  <button
                    key={l.id}
                    onClick={() => {
                      onSelectLead(l.id);
                      setShowSearchBox(false);
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-[8px] hover:bg-[#F8FAFC] text-left"
                  >
                    <div>
                      <div className="text-[13px] font-semibold text-[#0F172A]">{l.name}</div>
                      <div className="text-[11px] text-[#64748B]">{l.phone} · {l.config}</div>
                    </div>
                    <span className="tag-pill bg-[#DBEAFE] text-[#1D4ED8] uppercase text-[10px]">{l.stage}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Projects */}
            {searchResults.projects.length > 0 && (
              <div className="p-2 border-b border-[#E2E8F0]">
                <div className="text-[10.5px] font-bold uppercase text-[#94A3B8] px-2.5 py-1">Projects</div>
                {searchResults.projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onViewChange('projects');
                      setShowSearchBox(false);
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-[8px] hover:bg-[#F8FAFC] text-left"
                  >
                    <div className="text-[13px] font-semibold text-[#0F172A]">{p.name}</div>
                    <div className="text-[11px] text-[#64748B]">{p.loc}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Partners */}
            {searchResults.partners.length > 0 && (
              <div className="p-2 border-b border-[#E2E8F0]">
                <div className="text-[10.5px] font-bold uppercase text-[#94A3B8] px-2.5 py-1">Channel Partners</div>
                {searchResults.partners.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onViewChange('partners');
                      setShowSearchBox(false);
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-[8px] hover:bg-[#F8FAFC] text-left"
                  >
                    <div className="text-[13px] font-semibold text-[#0F172A]">{p.name}</div>
                    <div className="text-[11px] text-[#64748B]">{p.company}</div>
                  </button>
                ))}
              </div>
            )}

            {searchResults.leads.length === 0 && searchResults.projects.length === 0 && searchResults.partners.length === 0 && (
              <div className="p-4 text-center text-[12.5px] text-[#94A3B8]">
                No matching leads, projects, or partners found.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1"></div>

      {/* Action buttons */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenAiModal}
          className="flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-2 rounded-[10px] bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF] hover:bg-[#E9D5FF] transition-all"
        >
          <Icon name="sparkle" size={15} className="text-[#9333EA]" />
          <span>Ask Hintonn</span>
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => {
              setShowNotif(!showNotif);
              if (!showNotif && unreadCount > 0) markNotificationsRead();
            }}
            className="w-9 h-9 rounded-[10px] flex items-center justify-center hover:bg-[#F1F5F9] text-[#475569] relative transition-all"
          >
            <Icon name="bell" size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full bg-[#DC2626] border border-white"></span>
            )}
          </button>

          {showNotif && (
            <div className="absolute top-[calc(100%+10px)] right-0 w-[320px] bg-white border border-[#E2E8F0] rounded-[12px] shadow-2xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E2E8F0] font-bold text-[13.5px] flex items-center justify-between">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[11px] font-semibold text-[#2563EB] bg-[#DBEAFE] px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="divide-y divide-[#E2E8F0] max-h-[300px] overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} className="p-3 hover:bg-[#F8FAFC]">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-[12.6px] text-[#0F172A]">{n.title}</span>
                      <span className="text-[10px] text-[#94A3B8]">{n.time}</span>
                    </div>
                    <div className="text-[11.8px] text-[#64748B]">{n.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Avatar Menu */}
        <div ref={avatarRef} className="relative">
          <button
            onClick={() => setShowAvatarMenu(!showAvatarMenu)}
            className="w-9 h-9 rounded-full overflow-hidden focus:ring-2 focus:ring-[#2563EB]/40 transition-all"
          >
            <div className="w-full h-full bg-gradient-to-br from-[#2563EB] to-[#9333EA] text-white flex items-center justify-center text-[11px] font-bold">
              {user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U'}
            </div>
          </button>

          {showAvatarMenu && (
            <div className="absolute top-[calc(100%+10px)] right-0 w-[250px] bg-white border border-[#E2E8F0] rounded-[12px] shadow-2xl z-50 overflow-hidden p-2">
              <div className="px-3 py-2 border-b border-[#E2E8F0] mb-1">
                <div className="font-bold text-[13.2px] text-[#0F172A]">{user?.name}</div>
                <div className="text-[11.5px] text-[#64748B]">{user?.email}</div>
                <span className={`inline-block mt-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full capitalize ${ROLE_BADGE_COLORS[user?.role] || ROLE_BADGE_COLORS.viewer}`}>
                  {user?.role}
                </span>
              </div>
              <button
                onClick={() => {
                  onViewChange('settings');
                  setShowAvatarMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium text-[#334155] hover:bg-[#F1F5F9] text-left"
              >
                <Icon name="settings" size={16} className="text-[#94A3B8]" />
                <span>Settings</span>
              </button>
              <button
                onClick={() => {
                  logout();
                  setShowAvatarMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium text-[#DC2626] hover:bg-[#FEE2E2] text-left"
              >
                <Icon name="logout" size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
