export const MESSAGE_TEMPLATES = {
  new: [
    { id: 'new_welcome', delayHours: 0, label: 'Welcome & Project Info' },
    { id: 'new_followup_24h', delayHours: 24, label: '24h Follow-up (no response)' }
  ],
  contacted: [
    { id: 'contacted_engage', delayHours: 0, label: 'Engagement Message' },
    { id: 'contacted_nudge_12h', delayHours: 12, label: '12h Nudge' },
    { id: 'contacted_nudge_24h', delayHours: 24, label: '24h Urgency' }
  ],
  qualified: [
    { id: 'qualified_visit', delayHours: 0, label: 'Site Visit Invitation' },
    { id: 'qualified_nudge_12h', delayHours: 12, label: '12h Visit Reminder' },
    { id: 'qualified_nudge_24h', delayHours: 24, label: '24h Exclusive Offer' }
  ],
  negotiation: [
    { id: 'negotiate_offer', delayHours: 0, label: 'Negotiation Offer' },
    { id: 'negotiate_urgency_12h', delayHours: 12, label: '12h Urgency' },
    { id: 'negotiate_final_24h', delayHours: 24, label: '24h Final Offer' }
  ],
  won: [
    { id: 'won_thankyou', delayHours: 0, label: 'Booking Confirmation' }
  ],
  lost: [
    { id: 'lost_winback', delayHours: 0, label: 'Win-Back Offer' }
  ]
};

export function getNextReminderInfo(lead) {
  if (['won', 'lost'].includes(lead.stage) || lead.automationPaused) {
    return { status: 'stopped', nextMessage: null, nextTime: null };
  }

  const templates = MESSAGE_TEMPLATES[lead.stage];
  if (!templates || templates.length === 0) {
    return { status: 'no_sequence', nextMessage: null, nextTime: null };
  }

  const stageEnteredTime = lead.stageEnteredAt ? new Date(lead.stageEnteredAt).getTime() : Date.now();

  // Filter templates that have already been sent
  const sentIds = (lead.automationLog || [])
    .filter(log => log.status === 'sent')
    .map(log => log.templateId);

  // Find the first template that hasn't been sent in this stage
  for (const tmpl of templates) {
    if (!sentIds.includes(tmpl.id)) {
      // Calculate exactly when it will be due
      const dueTime = stageEnteredTime + (tmpl.delayHours * 60 * 60 * 1000);
      
      return {
        status: dueTime <= Date.now() ? 'overdue' : 'scheduled',
        nextMessage: tmpl.label,
        nextTime: new Date(dueTime),
        templateId: tmpl.id
      };
    }
  }

  return { status: 'completed', nextMessage: 'Sequence complete', nextTime: null };
}
