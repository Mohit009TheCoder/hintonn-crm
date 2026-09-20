import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoginView from './components/views/LoginView';
import UserManagementView from './components/views/UserManagementView';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Views
import Overview from './components/views/Overview';
import CalendarView from './components/views/CalendarView';
import Pipeline from './components/views/Pipeline';
import Leads from './components/views/Leads';
import Projects from './components/views/Projects';
import WhatsAppView from './components/views/WhatsAppView';
import Calls from './components/views/Calls';
import Partners from './components/views/Partners';
import Automations from './components/views/Automations';
import Reports from './components/views/Reports';
import Analytics from './components/views/Analytics';
import SettingsView from './components/views/SettingsView';
import LeadCaptureView from './components/views/LeadCaptureView';
import LeadNurtureView from './components/views/LeadNurtureView';
import PostBookingView from './components/views/PostBookingView';
import TeamAnalyticsView from './components/views/TeamAnalyticsView';
import ReminderDashboard from './components/views/ReminderDashboard';

// Modals
import LeadDrawer from './components/modals/LeadDrawer';
import DialerModal from './components/modals/DialerModal';
import AddLeadModal from './components/modals/AddLeadModal';
import ScheduleVisitModal from './components/modals/ScheduleVisitModal';
import AddTaskModal from './components/modals/AddTaskModal';
import AiListingModal from './components/modals/AiListingModal';
import AddPartnerModal from './components/modals/AddPartnerModal';
import AiAssistantModal from './components/modals/AiAssistantModal';
import AddProjectModal from './components/modals/AddProjectModal';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-3 border-[#E2E8F0] border-t-[#2563EB] rounded-full animate-spin" />
      <div className="text-[13px] text-[#94A3B8] font-medium">Loading Hintonn AI...</div>
    </div>
  );
}

export default function App() {
  const { user, authLoading, can } = useAuth();
  const [currentView, setCurrentView] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modals state
  const [activeDrawerLeadId, setActiveDrawerLeadId] = useState(null);
  const [activeDialerLead, setActiveDialerLead] = useState(null);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isScheduleVisitOpen, setIsScheduleVisitOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [activeAiListingProject, setActiveAiListingProject] = useState(null);
  const [isAddPartnerOpen, setIsAddPartnerOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);

  // Show loading spinner while checking auth
  if (authLoading) return <LoginLoadingFallback />;

  // Not authenticated → show login
  if (!user) return <LoginView />;

  const handleOpenAddLead = () => {
    if (can('leads', 'create')) setIsAddLeadOpen(true);
  };

  const handleOpenAddPartner = () => {
    if (can('partners', 'create')) setIsAddPartnerOpen(true);
  };

  const handleOpenAddTask = () => {
    if (can('tasks', 'create')) setIsAddTaskOpen(true);
  };

  const handleOpenScheduleVisit = () => {
    if (can('leads', 'update')) setIsScheduleVisitOpen(true);
  };

  const handleOpenAddProject = () => {
    if (can('projects', 'create')) setIsAddProjectOpen(true);
  };

  // Authenticated → show main app
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Navigation Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={(view) => setCurrentView(view)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 min-w-0 flex flex-col md:ml-[248px]">
        <Header
          currentView={currentView}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onSelectLead={(id) => setActiveDrawerLeadId(id)}
          onViewChange={(view) => setCurrentView(view)}
          onOpenAiModal={() => setIsAiAssistantOpen(true)}
        />

        <main className="w-full mx-auto px-5 md:px-8 py-6 pb-20 max-w-[1400px]">
          {currentView === 'overview' && (
            <Overview
              onOpenAddLead={handleOpenAddLead}
              onSelectLead={(id) => setActiveDrawerLeadId(id)}
              onViewChange={(v) => setCurrentView(v)}
            />
          )}

          {currentView === 'calendar' && (
            <CalendarView
              onOpenAddTask={handleOpenAddTask}
              onOpenScheduleVisit={handleOpenScheduleVisit}
              onSelectLead={(id) => setActiveDrawerLeadId(id)}
            />
          )}

          {currentView === 'pipeline' && (
            <Pipeline
              onSelectLead={(id) => setActiveDrawerLeadId(id)}
              onOpenDialer={(lead) => setActiveDialerLead(lead)}
              onOpenAddLead={handleOpenAddLead}
            />
          )}

          {currentView === 'leads' && (
            <Leads
              onSelectLead={(id) => setActiveDrawerLeadId(id)}
              onOpenDialer={(lead) => setActiveDialerLead(lead)}
              onOpenAddLead={handleOpenAddLead}
            />
          )}

          {currentView === 'projects' && (
            <Projects
              onOpenAiListing={(project) => setActiveAiListingProject(project)}
              onViewChange={(v) => setCurrentView(v)}
              onOpenAddProject={handleOpenAddProject}
            />
          )}

          {currentView === 'automations' && <Automations />}

          {currentView === 'whatsapp' && <WhatsAppView />}

          {currentView === 'calls' && (
            <Calls onOpenDialer={(lead) => setActiveDialerLead(lead)} />
          )}

          {currentView === 'partners' && (
            <Partners onOpenAddPartner={handleOpenAddPartner} />
          )}

          {/* Reports: restricted from agent */}
          {currentView === 'reports' && (
            can('reports', 'read') ? <Reports /> : <div className="p-8 text-center text-[#64748B]">Access restricted for your role.</div>
          )}

          {/* Analytics: restricted from agent */}
          {currentView === 'analytics' && (
            can('analytics', 'read') ? <Analytics /> : <div className="p-8 text-center text-[#64748B]">Access restricted for your role.</div>
          )}

          {/* Settings: Admin & Manager only */}
          {currentView === 'settings' && (
            can('settings', 'read') ? <SettingsView /> : <div className="p-8 text-center text-[#64748B]">Access restricted for your role.</div>
          )}

          {currentView === 'lead-capture' && (
            <LeadCaptureView onSelectLead={(id) => setActiveDrawerLeadId(id)} />
          )}

          {currentView === 'nurture' && (
            <LeadNurtureView onSelectLead={(id) => setActiveDrawerLeadId(id)} />
          )}

          {currentView === 'reminders' && (
            <ReminderDashboard onSelectLead={(id) => setActiveDrawerLeadId(id)} />
          )}

          {/* Post-booking & team analytics: restricted from agent */}
          {currentView === 'post-booking' && (
            can('reports', 'read') ? <PostBookingView onSelectLead={(id) => setActiveDrawerLeadId(id)} /> : <div className="p-8 text-center text-[#64748B]">Access restricted for your role.</div>
          )}

          {currentView === 'team-analytics' && (
            can('analytics', 'read') ? <TeamAnalyticsView onSelectLead={(id) => setActiveDrawerLeadId(id)} /> : <div className="p-8 text-center text-[#64748B]">Access restricted for your role.</div>
          )}

          {/* User Management: Admin only */}
          {currentView === 'users' && (
            can('users', 'read') ? <UserManagementView /> : <div className="p-8 text-center text-[#64748B]">Access restricted for your role.</div>
          )}
        </main>
      </div>

      {/* Interactive Floating / Sliding Modals */}
      {activeDrawerLeadId && (
        <LeadDrawer
          leadId={activeDrawerLeadId}
          onClose={() => setActiveDrawerLeadId(null)}
          onOpenDialer={(lead) => {
            setActiveDrawerLeadId(null);
            setActiveDialerLead(lead);
          }}
        />
      )}

      {activeDialerLead && (
        <DialerModal
          contact={activeDialerLead}
          onClose={() => setActiveDialerLead(null)}
        />
      )}

      {isAddLeadOpen && (
        <AddLeadModal onClose={() => setIsAddLeadOpen(false)} />
      )}

      {isScheduleVisitOpen && (
        <ScheduleVisitModal onClose={() => setIsScheduleVisitOpen(false)} />
      )}

      {isAddTaskOpen && (
        <AddTaskModal onClose={() => setIsAddTaskOpen(false)} />
      )}

      {activeAiListingProject && (
        <AiListingModal
          project={activeAiListingProject}
          onClose={() => setActiveAiListingProject(null)}
        />
      )}

      {isAddPartnerOpen && (
        <AddPartnerModal onClose={() => setIsAddPartnerOpen(false)} />
      )}

      {isAddProjectOpen && (
        <AddProjectModal onClose={() => setIsAddProjectOpen(false)} />
      )}

      {isAiAssistantOpen && (
        <AiAssistantModal
          onClose={() => setIsAiAssistantOpen(false)}
          onSelectLead={(id) => {
            setIsAiAssistantOpen(false);
            setActiveDrawerLeadId(id);
          }}
        />
      )}
    </div>
  );
}

function LoginLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-[3px] border-[#E2E8F0] border-t-[#2563EB] rounded-full animate-spin" />
      <div className="text-[13px] text-[#94A3B8] font-medium">Loading Hintonn AI...</div>
    </div>
  );
}
