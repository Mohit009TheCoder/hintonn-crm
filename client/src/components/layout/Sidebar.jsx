import React, { useState } from 'react';
import { HexLogo, Icon } from '../../shared/Icons';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';

const ROLE_BADGE_COLORS = {
  admin: 'bg-[#FEE2E2] text-[#DC2626]',
  manager: 'bg-[#F3E8FF] text-[#7E22CE]',
  agent: 'bg-[#DBEAFE] text-[#1D4ED8]',
  viewer: 'bg-[#F1F5F9] text-[#64748B]',
};

export default function Sidebar({ currentView, onViewChange, isOpen, onClose }) {
  const { user, logout, can } = useAuth();
  const { taskStats, leads } = useCRM();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Overdue leads count (> 15 mins unanswered)
  const overdueLeadsCount = leads.filter(l => l.stage === 'new' && (l.createdMinutesAgo || 0) > 15).length;

  const navItemsTop = [
    { id: 'overview', label: 'Overview', icon: 'grid' },
    { id: 'calendar', label: 'Site Visits', icon: 'calendar', badge: taskStats.today > 0 ? taskStats.today : null }
  ];

  const navItemsIntelligence = [
    { id: 'leads', label: 'Leads', icon: 'users', badge: overdueLeadsCount > 0 ? overdueLeadsCount : null, badgeColor: 'bg-[#DC2626] text-white' },
    { id: 'lead-capture', label: 'Lead Capture', icon: 'target' },
    { id: 'nurture', label: 'Lead Nurture', icon: 'send' },
    { id: 'pipeline', label: 'Pipeline', icon: 'columns' },
    { id: 'projects', label: 'Projects', icon: 'building' },
    { id: 'automations', label: 'Automations', icon: 'zap', isAi: true },
    { id: 'whatsapp', label: 'WhatsApp & Nurture', icon: 'messagecircle', isAi: true },
    { id: 'reminders', label: 'Reminders', icon: 'bell' },
    { id: 'calls', label: 'Calls', icon: 'headphones' },
    { id: 'partners', label: 'Channel Partners', icon: 'share2' }
  ];

  const navItemsInsights = [
    { id: 'reports', label: 'Reports', icon: 'filetext' },
    { id: 'analytics', label: 'Analytics', icon: 'barchart' },
    { id: 'post-booking', label: 'Post-Booking', icon: 'filetext' },
    { id: 'team-analytics', label: 'Team Analytics', icon: 'barchart' }
  ];

  const renderNavBtn = (item) => {
    const isActive = currentView === item.id;
    let cls = 'nav-item w-full flex items-center justify-between px-3 py-2 rounded-r-[10px] text-[13.3px] font-medium text-[#334155] cursor-pointer ';
    if (isActive) {
      cls += item.isAi ? 'nav-active-ai' : 'nav-active';
    }

    return (
      <button
        key={item.id}
        onClick={() => {
          onViewChange(item.id);
          if (onClose) onClose();
        }}
        className={cls}
      >
        <div className="flex items-center gap-2.5">
          <Icon name={item.icon} size={17} className={isActive ? (item.isAi ? 'text-[#9333EA]' : 'text-[#2563EB]') : 'text-[#64748B]'} />
          <span>{item.label}</span>
          {item.isAi && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#F3E8FF] text-[#7E22CE] ml-0.5">
              AI
            </span>
          )}
        </div>
        {item.badge && (
          <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-[#DBEAFE] text-[#1D4ED8]'}`}>
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-[248px] bg-white border-r border-[#E2E8F0] flex flex-col p-3.5 z-40 overflow-y-auto transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between px-2 pb-5 pt-1">
          <div className="flex items-center gap-2.5">
            <HexLogo size={28} />
            <div>
              <div className="font-display font-extrabold text-[16px] leading-none">
                Hintonn <span className="gradient-text">AI</span>
              </div>
              <div className="text-[10.5px] text-[#64748B] mt-0.5">Lead automation CRM</div>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="md:hidden text-[#94A3B8] p-1">
              <Icon name="x" size={18} />
            </button>
          )}
        </div>

        {/* Primary nav */}
        <nav className="space-y-1 mb-2">
          {navItemsTop.map(renderNavBtn)}
        </nav>

        <div className="text-[10.5px] font-semibold tracking-wider text-[#94A3B8] px-2.5 pt-3 pb-1.5 uppercase">
          Intelligence
        </div>
        <nav className="space-y-1 mb-2">
          {navItemsIntelligence.map(renderNavBtn)}
        </nav>

        {/* Insights: hidden for agents */}
        {(can('reports', 'read') || can('analytics', 'read')) && (
          <>
            <div className="text-[10.5px] font-semibold tracking-wider text-[#94A3B8] px-2.5 pt-3 pb-1.5 uppercase">
              Insights
            </div>
            <nav className="space-y-1 mb-2">
              {navItemsInsights.map(renderNavBtn)}
            </nav>
          </>
        )}

        {/* User Management - admin only */}
        {can('users', 'read') && (
          <nav className="space-y-1 mt-1">
            {renderNavBtn({ id: 'users', label: 'User Management', icon: 'users' })}
          </nav>
        )}

        {/* Settings - hidden for agent and viewer */}
        {can('settings', 'read') && (
          <nav className="space-y-1 mt-1">
            {renderNavBtn({ id: 'settings', label: 'Settings', icon: 'settings' })}
          </nav>
        )}

        {/* User profile with logout */}
        <div className="mt-auto pt-3 border-t border-[#E2E8F0] relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="sidebar-user w-full flex items-center justify-between p-2 rounded-[10px] text-left hover:bg-[#F1F5F9] transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-[32px] h-[32px] rounded-full bg-gradient-to-br from-[#2563EB] to-[#9333EA] text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                {user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U'}
              </div>
              <div className="min-w-0">
                <div className="text-[12.8px] font-semibold truncate text-[#0F172A]">{user?.name || 'User'}</div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full capitalize ${ROLE_BADGE_COLORS[user?.role] || ROLE_BADGE_COLORS.viewer}`}>
                    {user?.role || 'viewer'}
                  </span>
                </div>
              </div>
            </div>
            <span className="text-[10px] text-[#94A3B8]">⇄</span>
          </button>

          {showUserMenu && (
            <div className="absolute bottom-[calc(100%+8px)] left-0 w-full bg-white border border-[#E2E8F0] rounded-[12px] shadow-xl p-2 z-50">
              <div className="px-2.5 py-2 border-b border-[#E2E8F0] mb-1">
                <div className="text-[12.5px] font-bold text-[#0F172A]">{user?.name}</div>
                <div className="text-[11px] text-[#64748B]">{user?.email}</div>
              </div>
              {can('settings', 'read') && (
                <button
                  onClick={() => {
                    onViewChange('settings');
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-[12.5px] text-left hover:bg-[#F1F5F9] text-[#334155]"
                >
                  <Icon name="settings" size={14} className="text-[#94A3B8]" />
                  Settings
                </button>
              )}
              <button
                onClick={() => {
                  logout();
                  setShowUserMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-[12.5px] text-left hover:bg-[#FEE2E2] text-[#DC2626]"
              >
                <Icon name="logout" size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
