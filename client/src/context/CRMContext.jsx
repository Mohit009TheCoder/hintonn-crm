import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from '../shared/Toast';
import { useAuth } from './AuthContext';

const CRMContext = createContext(null);

// In production (Vercel), use the Railway backend URL.
// In dev, Vite proxies /api/* to localhost:5001 automatically.
const API_BASE = (typeof __API_URL__ !== 'undefined' && __API_URL__) ? __API_URL__ : '';

export function CRMProvider({ children }) {
  const toast = useToast();
  const { token, logout } = useAuth();

  const authFetch = useCallback(
    async (url, options = {}) => {
      // Prepend API_BASE so requests hit Railway in production
      const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
      const res = await fetch(fullUrl, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });
      // Handle token expiry gracefully
      if (res.status === 401) {
        logout();
        throw new Error('Session expired');
      }
      return res;
    },
    [token, logout]
  );


  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskStats, setTaskStats] = useState({ overdue: 0, today: 0, thisWeek: 0, completed: 0 });
  const [siteVisits, setSiteVisits] = useState([]);
  const [siteVisitStats, setSiteVisitStats] = useState({});
  const [broadcasts, setBroadcasts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [partnerStats, setPartnerStats] = useState({});
  const [calls, setCalls] = useState([]);
  const [callStats, setCallStats] = useState({});
  const [agentPerf, setAgentPerf] = useState([]);
  const [simulation, setSimulation] = useState({ simulatedHour: 0, logs: [], leads: [] });
  const [notifications, setNotifications] = useState([]);
  const [reportsData, setReportsData] = useState(null);
  const [leadSources, setLeadSources] = useState([]);
  const [slaViolations, setSlaViolations] = useState([]);
  const [nurtureSequences, setNurtureSequences] = useState([]);
  const [nurtureActive, setNurtureActive] = useState([]);
  const [nurtureAnalytics, setNurtureAnalytics] = useState(null);
  const [captureStats, setCaptureStats] = useState(null);
  const [postBookingSummary, setPostBookingSummary] = useState(null);
  const [duplicateLeads, setDuplicateLeads] = useState([]);
  const [overduePayments, setOverduePayments] = useState([]);
  const [teamRepPerformance, setTeamRepPerformance] = useState([]);
  const [repSourceMatrix, setRepSourceMatrix] = useState(null);
  const [sourceEffectiveness, setSourceEffectiveness] = useState([]);
  const [docMissing, setDocMissing] = useState([]);

  const fetchLeads = useCallback(async (params = {}) => {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await authFetch(`/api/leads${query ? '?' + query : ''}`);
      const data = await res.json();
      if (data.success) setLeads(data.data);
    } catch (e) {
      console.error('Failed to fetch leads', e);
    }
  }, [authFetch]);

  const fetchDuplicateLeads = useCallback(async () => {
    try {
      const res = await authFetch('/api/leads/duplicates');
      const data = await res.json();
      if (data.success) setDuplicateLeads(data.data);
    } catch (e) {
      console.error('Failed to fetch duplicate leads', e);
    }
  }, [authFetch]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await authFetch('/api/projects');
      const data = await res.json();
      if (data.success) setProjects(data.data);
    } catch (e) {
      console.error('Failed to fetch projects', e);
    }
  }, [authFetch]);

  const fetchTasks = useCallback(async (filter = 'all') => {
    try {
      const res = await authFetch(`/api/tasks?filter=${filter}`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.data);
        if (data.stats) setTaskStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to fetch tasks', e);
    }
  }, [authFetch]);

  const fetchSiteVisits = useCallback(async () => {
    try {
      const res = await authFetch('/api/site-visits');
      const data = await res.json();
      if (data.success) {
        setSiteVisits(data.data);
        setSiteVisitStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to fetch site visits', e);
    }
  }, [authFetch]);

  const fetchWhatsApp = useCallback(async () => {
    try {
      const [bcRes, simRes] = await Promise.all([
        authFetch('/api/whatsapp/broadcasts'),
        authFetch('/api/whatsapp/simulation')
      ]);
      const bcData = await bcRes.json();
      const simData = await simRes.json();
      if (bcData.success) setBroadcasts(bcData.data);
      if (simData.success) setSimulation(simData.data);
    } catch (e) {
      console.error('Failed to fetch WhatsApp state', e);
    }
  }, [authFetch]);

  const fetchCalls = useCallback(async (filter = 'all') => {
    try {
      const res = await authFetch(`/api/calls?filter=${filter}`);
      const data = await res.json();
      if (data.success) {
        setCalls(data.data);
        setCallStats(data.stats);
        setAgentPerf(data.agentPerf || []);
      }
    } catch (e) {
      console.error('Failed to fetch calls', e);
    }
  }, [authFetch]);

  const fetchPartners = useCallback(async () => {
    try {
      const res = await authFetch('/api/partners');
      const data = await res.json();
      if (data.success) {
        setPartners(data.data);
        setPartnerStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to fetch partners', e);
    }
  }, [authFetch]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await authFetch('/api/settings');
      const data = await res.json();
      if (data.success && data.data.notifications) {
        setNotifications(data.data.notifications);
      }
    } catch (e) {
      console.error('Failed to fetch settings', e);
    }
  }, [authFetch]);

  const fetchReports = useCallback(async () => {
    try {
      const res = await authFetch('/api/reports/summary');
      const data = await res.json();
      if (data.success) setReportsData(data.data);
    } catch (e) {
      console.error('Failed to fetch reports', e);
    }
  }, [authFetch]);

  const fetchLeadSources = useCallback(async () => {
    try {
      const res = await authFetch('/api/lead-capture/sources');
      const data = await res.json();
      if (data.success) setLeadSources(data.data);
    } catch (e) {
      console.error('Failed to fetch lead sources', e);
    }
  }, [authFetch]);

  const fetchSlaViolations = useCallback(async () => {
    try {
      const res = await authFetch('/api/lead-capture/sla');
      const data = await res.json();
      if (data.success) setSlaViolations(data.data?.violations || data.data || []);
    } catch (e) {
      console.error('Failed to fetch SLA violations', e);
    }
  }, [authFetch]);

  const fetchCaptureStats = useCallback(async () => {
    try {
      const res = await authFetch('/api/lead-capture/stats');
      const data = await res.json();
      if (data.success) setCaptureStats(data.data);
    } catch (e) {
      console.error('Failed to fetch capture stats', e);
    }
  }, [authFetch]);

  const fetchNurtureSequences = useCallback(async () => {
    try {
      const res = await authFetch('/api/nurture/sequences');
      const data = await res.json();
      if (data.success) setNurtureSequences(data.data);
    } catch (e) {
      console.error('Failed to fetch nurture sequences', e);
    }
  }, [authFetch]);

  const fetchNurtureActive = useCallback(async () => {
    try {
      const res = await authFetch('/api/nurture/active');
      const data = await res.json();
      if (data.success) setNurtureActive(data.data);
    } catch (e) {
      console.error('Failed to fetch active nurture', e);
    }
  }, [authFetch]);

  const fetchNurtureAnalytics = useCallback(async () => {
    try {
      const res = await authFetch('/api/nurture/analytics');
      const data = await res.json();
      if (data.success) setNurtureAnalytics(data.data);
    } catch (e) {
      console.error('Failed to fetch nurture analytics', e);
    }
  }, [authFetch]);

  const fetchPostBooking = useCallback(async () => {
    try {
      const res = await authFetch('/api/post-booking/summary');
      const data = await res.json();
      if (data.success) setPostBookingSummary(data.data);
    } catch (e) {
      console.error('Failed to fetch post-booking summary', e);
    }
  }, [authFetch]);

  const fetchOverduePayments = useCallback(async () => {
    try {
      const res = await authFetch('/api/post-booking/overdue');
      const data = await res.json();
      if (data.success) setOverduePayments(data.data);
    } catch (e) {
      console.error('Failed to fetch overdue payments', e);
    }
  }, [authFetch]);

  const fetchTeamRepPerformance = useCallback(async () => {
    try {
      const res = await authFetch('/api/team-analytics/rep-performance');
      const data = await res.json();
      if (data.success) setTeamRepPerformance(data.data);
    } catch (e) {
      console.error('Failed to fetch team rep performance', e);
    }
  }, [authFetch]);

  const fetchRepSourceMatrix = useCallback(async () => {
    try {
      const res = await authFetch('/api/team-analytics/rep-source-matrix');
      const data = await res.json();
      if (data.success) setRepSourceMatrix(data.data);
    } catch (e) {
      console.error('Failed to fetch rep source matrix', e);
    }
  }, [authFetch]);

  const fetchSourceEffectiveness = useCallback(async () => {
    try {
      const res = await authFetch('/api/team-analytics/source-effectiveness');
      const data = await res.json();
      if (data.success) setSourceEffectiveness(data.data);
    } catch (e) {
      console.error('Failed to fetch source effectiveness', e);
    }
  }, [authFetch]);

  const fetchDocMissing = useCallback(async () => {
    try {
      const res = await authFetch('/api/documents/missing');
      const data = await res.json();
      if (data.success) setDocMissing(data.data);
    } catch (e) {
      console.error('Failed to fetch missing documents', e);
    }
  }, [authFetch]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchLeads(),
      fetchProjects(),
      fetchTasks(),
      fetchSiteVisits(),
      fetchWhatsApp(),
      fetchCalls(),
      fetchPartners(),
      fetchSettings(),
      fetchReports(),
      fetchLeadSources(),
      fetchSlaViolations(),
      fetchCaptureStats(),
      fetchNurtureSequences(),
      fetchNurtureActive(),
      fetchNurtureAnalytics(),
      fetchPostBooking(),
      fetchOverduePayments(),
      fetchTeamRepPerformance(),
      fetchRepSourceMatrix(),
      fetchSourceEffectiveness(),
      fetchDocMissing()
    ]);
    setLoading(false);
  }, [fetchLeads, fetchProjects, fetchTasks, fetchSiteVisits, fetchWhatsApp, fetchCalls, fetchPartners, fetchSettings, fetchReports, fetchLeadSources, fetchSlaViolations, fetchCaptureStats, fetchNurtureSequences, fetchNurtureActive, fetchNurtureAnalytics, fetchPostBooking, fetchOverduePayments, fetchTeamRepPerformance, fetchRepSourceMatrix, fetchSourceEffectiveness, fetchDocMissing]);

  useEffect(() => {
    if (token) {
      refreshAll();
      // Automatically keep lead stages in database synced with interactions
      const interval = setInterval(() => {
        autoUpdateAllStages(true);
      }, 60000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Lead mutations
  const addLead = async (leadData) => {
    try {
      const res = await authFetch('/api/leads', {
        method: 'POST',
        body: JSON.stringify(leadData)
      });
      const data = await res.json();
      if (data.success) {
        setLeads(prev => [data.data, ...prev]);
        toast(data.isDuplicate ? 'Lead created (Duplicate phone detected!)' : 'Lead created successfully');
        fetchProjects();
        return data.data;
      }
    } catch (e) {
      toast('Failed to create lead');
    }
  };

  const updateLead = async (id, patch) => {
    try {
      const res = await authFetch(`/api/leads/${id}`, {
        method: 'PUT',
        body: JSON.stringify(patch)
      });
      const data = await res.json();
      if (data.success) {
        setLeads(prev => prev.map(l => (l.id === id ? data.data : l)));
        return data.data;
      }
    } catch (e) {
      toast('Failed to update lead');
    }
  };

  const updateLeadStage = async (id, stage, lossReason = null, dealProb = undefined) => {
    // Optimistic instant UI update for buttery smooth drag-and-drop
    setLeads(prev => prev.map(l => {
      if (l.id === id) {
        const defaultProb = stage === 'won' ? 100 : stage === 'lost' ? 0 : stage === 'negotiation' ? 75 : stage === 'qualified' ? 65 : stage === 'contacted' ? 45 : 35;
        return {
          ...l,
          stage,
          lossReason: stage === 'lost' ? (lossReason || l.lossReason) : null,
          dealProb: dealProb !== undefined ? dealProb : defaultProb
        };
      }
      return l;
    }));
    toast(`Moved to ${stage.toUpperCase()}`);

    try {
      const res = await authFetch(`/api/pipeline/${id}/stage`, {
        method: 'PUT',
        body: JSON.stringify({ stage, lossReason, dealProb })
      });
      const data = await res.json();
      if (data.success) {
        setLeads(prev => prev.map(l => (l.id === id ? data.data : l)));
        fetchReports();
        return data.data;
      }
    } catch (e) {
      console.error('Failed to update stage in database', e);
      toast('Failed to save stage to database');
      fetchLeads();
    }
  };

  const autoUpdateAllStages = async (silent = false) => {
    try {
      const res = await authFetch('/api/leads/auto-update-stages', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        if (data.updatedCount > 0) {
          await fetchLeads();
          await fetchReports();
          if (!silent) {
            toast(`⚡ Database auto-updated ${data.updatedCount} lead stage(s) based on interactions!`);
          }
        } else if (!silent) {
          toast('All lead stages are already synchronized with interactions');
        }
        return data;
      }
    } catch (e) {
      console.error('Auto-update lead stages failed', e);
      if (!silent) toast('Failed to auto-update stages');
    }
  };

  const addLeadNote = async (id, text, author = 'Rohan Mehta') => {
    try {
      const res = await authFetch(`/api/leads/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ text, author })
      });
      const data = await res.json();
      if (data.success) {
        setLeads(prev => prev.map(l => (l.id === id ? data.data : l)));
        toast('Note added');
        return data.data;
      }
    } catch (e) {
      toast('Failed to add note');
    }
  };

  const sendLeadBrochure = async (id) => {
    try {
      const res = await authFetch(`/api/leads/${id}/send-brochure`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setLeads(prev => prev.map(l => (l.id === id ? data.lead : l)));
        toast('Brochure sent via WhatsApp');
        fetchProjects();
        return data.data;
      }
    } catch (e) {
      toast('Failed to send brochure');
    }
  };

  // Units
  const updateUnitStatus = async (projectId, unitId, status, lockedFor = null, lockedExpiry = null) => {
    try {
      const res = await authFetch(`/api/projects/${projectId}/units/${unitId}`, {
        method: 'PUT',
        body: JSON.stringify({ status, lockedFor, lockedExpiry })
      });
      const data = await res.json();
      if (data.success) {
        fetchProjects();
        toast(`Unit updated to ${status.toUpperCase()}`);
      }
    } catch (e) {
      toast('Failed to update unit');
    }
  };

  // Tasks
  const addTask = async (taskData) => {
    try {
      const res = await authFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData)
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => [data.data, ...prev]);
        toast('Task added');
        fetchTasks();
      }
    } catch (e) {
      toast('Failed to add task');
    }
  };

  const updateTask = async (id, patch) => {
    try {
      const res = await authFetch(`/api/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(patch)
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.map(t => (t.id === id ? data.data : t)));
        fetchTasks();
      }
    } catch (e) {
      toast('Failed to update task');
    }
  };

  // Site visits
  const scheduleSiteVisit = async (visitData) => {
    try {
      const res = await authFetch('/api/site-visits', {
        method: 'POST',
        body: JSON.stringify(visitData)
      });
      const data = await res.json();
      if (data.success) {
        setSiteVisits(prev => [data.data, ...prev]);
        fetchLeads();
        fetchSiteVisits();
        toast('Site visit scheduled');
      }
    } catch (e) {
      toast('Failed to schedule visit');
    }
  };

  const updateSiteVisit = async (id, patch) => {
    try {
      const res = await authFetch(`/api/site-visits/${id}`, {
        method: 'PUT',
        body: JSON.stringify(patch)
      });
      const data = await res.json();
      if (data.success) {
        fetchSiteVisits();
        fetchLeads();
        fetchReports();
        toast('Site visit updated');
      }
    } catch (e) {
      toast('Failed to update site visit');
    }
  };

  // Calls
  const logCall = async (callData) => {
    try {
      const res = await authFetch('/api/calls', {
        method: 'POST',
        body: JSON.stringify(callData)
      });
      const data = await res.json();
      if (data.success) {
        fetchCalls();
        fetchLeads();
        toast('Call logged successfully');
      }
    } catch (e) {
      toast('Failed to log call');
    }
  };

  // WhatsApp
  const sendWhatsAppMessage = async (contactId, text) => {
    try {
      const res = await authFetch('/api/whatsapp/send', {
        method: 'POST',
        body: JSON.stringify({ contactId, text })
      });
      const data = await res.json();
      if (data.success) {
        fetchLeads();
        toast('Message sent via WhatsApp');
        return data.data;
      }
    } catch (e) {
      toast('Failed to send WhatsApp message');
    }
  };

  const createBroadcast = async (broadcastData) => {
    try {
      const res = await authFetch('/api/whatsapp/broadcasts', {
        method: 'POST',
        body: JSON.stringify(broadcastData)
      });
      const data = await res.json();
      if (data.success) {
        setBroadcasts(prev => [data.data, ...prev]);
        toast('Broadcast campaign created');
      }
    } catch (e) {
      toast('Failed to create broadcast');
    }
  };

  const advanceSimulation = async (hours) => {
    try {
      const res = await authFetch('/api/whatsapp/simulation/advance', {
        method: 'POST',
        body: JSON.stringify({ hours })
      });
      const data = await res.json();
      if (data.success) {
        fetchWhatsApp();
        fetchLeads();
        toast(`Simulation advanced +${hours}h (${data.data.triggeredCount} nudges sent)`);
      }
    } catch (e) {
      toast('Failed to advance simulation');
    }
  };

  const resetSimulation = async () => {
    try {
      const res = await authFetch('/api/whatsapp/simulation/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchWhatsApp();
        fetchLeads();
        toast('Simulation reset');
      }
    } catch (e) {
      toast('Failed to reset simulation');
    }
  };

  // Projects
  const addProject = async (projectData) => {
    try {
      const res = await authFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify(projectData)
      });
      const data = await res.json();
      if (data.success) {
        setProjects(prev => [data.data, ...prev]);
        toast('Project created successfully');
        return { success: true, data: data.data };
      } else {
        toast(data.message || 'Failed to create project');
        return { success: false, message: data.message };
      }
    } catch (e) {
      toast('Failed to create project');
      return { success: false, message: e.message };
    }
  };

  // Partners
  const addPartner = async (partnerData) => {
    try {
      const res = await authFetch('/api/partners', {
        method: 'POST',
        body: JSON.stringify(partnerData)
      });
      const data = await res.json();
      if (data.success) {
        setPartners(prev => [data.data, ...prev]);
        fetchPartners();
        toast('Channel partner added');
      }
    } catch (e) {
      toast('Failed to add partner');
    }
  };

  const markNotificationsRead = async () => {
    try {
      await authFetch('/api/settings/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const captureLead = async (leadData) => {
    try {
      const res = await authFetch('/api/lead-capture/webhook', {
        method: 'POST',
        body: JSON.stringify(leadData)
      });
      const data = await res.json();
      if (data.success) {
        fetchLeads();
        fetchLeadSources();
        fetchCaptureStats();
        toast('Lead captured successfully');
        return data.data;
      }
    } catch (e) {
      toast('Failed to capture lead');
    }
  };

  const createNurtureSequence = async (seqData) => {
    try {
      const res = await authFetch('/api/nurture/sequences', {
        method: 'POST',
        body: JSON.stringify(seqData)
      });
      const data = await res.json();
      if (data.success) {
        setNurtureSequences(prev => [data.data, ...prev]);
        toast('Nurture sequence created');
        return data.data;
      }
    } catch (e) {
      toast('Failed to create nurture sequence');
    }
  };

  const pauseNurture = async (leadId) => {
    try {
      const res = await authFetch(`/api/nurture/pause/${leadId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setNurtureActive(prev => prev.map(n => n.leadId === leadId ? { ...n, status: 'paused' } : n));
        toast('Nurture paused');
      }
    } catch (e) {
      toast('Failed to pause nurture');
    }
  };

  const resumeNurture = async (leadId) => {
    try {
      const res = await authFetch(`/api/nurture/resume/${leadId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setNurtureActive(prev => prev.map(n => n.leadId === leadId ? { ...n, status: 'active' } : n));
        toast('Nurture resumed');
      }
    } catch (e) {
      toast('Failed to resume nurture');
    }
  };

  const markMilestonePaid = async (leadId, milestoneId) => {
    try {
      const res = await authFetch(`/api/post-booking/${leadId}/milestones/${milestoneId}`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (data.success) {
        fetchPostBooking();
        fetchOverduePayments();
        toast('Milestone marked as paid');
      }
    } catch (e) {
      toast('Failed to mark milestone paid');
    }
  };

  const triggerManualNurtureStep = async (leadId) => {
    try {
      const res = await authFetch(`/api/nurture/manual-step/${leadId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast('Nurture step executed');
        fetchLeads();
      }
      return data;
    } catch (e) {
      toast('Failed to execute nurture step');
    }
  };

  const markDocCollected = async (leadId, docId) => {
    try {
      const res = await authFetch(`/api/documents/collect/${leadId}/${docId}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        fetchPostBooking();
        fetchDocMissing();
        toast('Document marked as collected');
      }
    } catch (e) {
      toast('Failed to mark document collected');
    }
  };

  return (
    <CRMContext.Provider
      value={{
        loading,
        leads,
        projects,
        tasks,
        taskStats,
        siteVisits,
        siteVisitStats,
        broadcasts,
        partners,
        partnerStats,
        calls,
        callStats,
        agentPerf,
        simulation,
        notifications,
        reportsData,
        leadSources,
        slaViolations,
        nurtureSequences,
        nurtureActive,
        nurtureAnalytics,
        captureStats,
        postBookingSummary,
        overduePayments,
        teamRepPerformance,
        sourceEffectiveness,
        docMissing,
        duplicateLeads,
        refreshAll,
        fetchLeads,
        fetchDuplicateLeads,
        fetchTasks,
        fetchCalls,
        fetchLeadSources,
        fetchSlaViolations,
        fetchCaptureStats,
        fetchNurtureSequences,
        fetchNurtureActive,
        fetchNurtureAnalytics,
        fetchPostBooking,
        fetchOverduePayments,
        fetchTeamRepPerformance,
        fetchRepSourceMatrix,
        fetchSourceEffectiveness,
        fetchDocMissing,
        addLead,
        updateLead,
        updateLeadStage,
        autoUpdateAllStages,
        addLeadNote,
        sendLeadBrochure,
        updateUnitStatus,
        addTask,
        updateTask,
        scheduleSiteVisit,
        updateSiteVisit,
        logCall,
        sendWhatsAppMessage,
        createBroadcast,
        advanceSimulation,
        resetSimulation,
        addProject,
        addPartner,
        markNotificationsRead,
        captureLead,
        createNurtureSequence,
        pauseNurture,
        resumeNurture,
        triggerManualNurtureStep,
        markMilestonePaid,
        markDocCollected,
        authFetch
      }}
    >
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM() {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error('useCRM must be used within CRMProvider');
  return ctx;
}
