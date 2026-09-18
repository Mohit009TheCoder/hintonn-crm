/**
 * WhatsApp Automation Message Templates
 * Stage-wise messages with project/lead personalization.
 * Each template has: text, delayHours (from stage entry), condition
 */

export const MESSAGE_TEMPLATES = {
  // ── NEW LEAD: Welcome + Project Info ──────────────────────────────────────
  new: [
    {
      id: 'new_welcome',
      delayHours: 0,   // Send immediately on lead creation
      label: 'Welcome & Project Info',
      template: (lead, project) => {
        const first = lead.name.split(' ')[0];
        const priceStr = fmtPrice(project.priceMin);
        return [
          `Hi ${first}! 👋 Thank you for your interest in *${project.name}* by Ashray Group.`,
          ``,
          `We have *${lead.config}* options starting from *${priceStr}* at ${project.loc}.`,
          `Possession: *${project.possession}*`,
          ``,
          `Would you like to schedule a site visit this week? Reply *YES* and we'll arrange everything for you! 🏠`
        ].join('\n');
      }
    },
    {
      id: 'new_followup_24h',
      delayHours: 24,
      label: '24h Follow-up (no response)',
      condition: (lead) => !lead.repliedAt, // Only if no reply
      template: (lead, project) => {
        const first = lead.name.split(' ')[0];
        return [
          `Hi ${first}, just checking in! 😊`,
          ``,
          `We noticed you showed interest in *${project.name}* — ${lead.config}.`,
          `We currently have *${project.available} units* available with special pricing.`,
          ``,
          `Would you like me to share the floor plan or schedule a quick call?`,
          `Reply *CALL* for a callback or *PLAN* for the floor plan. 📋`
        ].join('\n');
      }
    }
  ],

  // ── CONTACTED: Nurture + Engagement ───────────────────────────────────────
  contacted: [
    {
      id: 'contacted_engage',
      delayHours: 0,   // Send when stage changes to contacted
      label: 'Engagement Message',
      template: (lead, project) => {
        const first = lead.name.split(' ')[0];
        return [
          `Hi ${first}! Thank you for connecting with us. 🙏`,
          ``,
          `Regarding *${project.name}* — we'd love to show you the property in person.`,
          `We have a *special offer* this month on ${lead.config} units.`,
          ``,
          `📅 What day works best for your site visit?`,
          `We can also arrange a *virtual tour* if you prefer.`
        ].join('\n');
      }
    },
    {
      id: 'contacted_nudge_12h',
      delayHours: 12,
      label: '12h Nudge',
      condition: (lead) => !lead.repliedAt,
      template: (lead, project) => {
        const first = lead.name.split(' ')[0];
        return [
          `Hi ${first}, quick update! 📢`,
          ``,
          `*${project.name}* has been getting a lot of interest this week.`,
          `Only *${project.available} units* of ${lead.config} remaining.`,
          ``,
          `Shall I hold a unit for you? Reply *HOLD* to reserve. 🏡`
        ].join('\n');
      }
    },
    {
      id: 'contacted_nudge_24h',
      delayHours: 24,
      label: '24h Urgency',
      condition: (lead) => !lead.repliedAt,
      template: (lead, project) => {
        const first = lead.name.split(' ')[0];
        return [
          `Hi ${first}, following up on *${project.name}*.`,
          ``,
          `We have a *limited-time payment plan* available:`,
          `✅ 10% booking amount`,
          `✅ Easy EMI options`,
          `✅ No pre-payment penalty`,
          ``,
          `Would you like more details? Reply *YES* or call us at +91 79 4000 1234. 📞`
        ].join('\n');
      }
    }
  ],

  // ── QUALIFIED: Site Visit Push ────────────────────────────────────────────
  qualified: [
    {
      id: 'qualified_visit',
      delayHours: 0,
      label: 'Site Visit Invitation',
      template: (lead, project) => {
        const first = lead.name.split(' ')[0];
        return [
          `Great news, ${first}! 🎉`,
          ``,
          `Based on your preferences, *${project.name}* is a perfect match for you.`,
          `We'd love to arrange a *personalized site visit* for you.`,
          ``,
          `🏠 What you'll see:`,
          `• Sample flat with ${lead.config} layout`,
          `• Amenities tour (Gym, Pool, Garden)`,
          `• Neighborhood walkthrough`,
          ``,
          `📅 Reply with your preferred date and time!`
        ].join('\n');
      }
    },
    {
      id: 'qualified_nudge_12h',
      delayHours: 12,
      label: '12h Visit Reminder',
      condition: (lead) => !lead.repliedAt,
      template: (lead, project) => {
        const first = lead.name.split(' ')[0];
        return [
          `Hi ${first}! Just a reminder about *${project.name}*. 📋`,
          ``,
          `We can arrange a visit at your convenience — even on weekends.`,
          `Our team will pick you up and drop you back. 🚗`,
          ``,
          `Reply *VISIT* to schedule now!`
        ].join('\n');
      }
    },
    {
      id: 'qualified_nudge_24h',
      delayHours: 24,
      label: '24h Exclusive Offer',
      condition: (lead) => !lead.repliedAt,
      template: (lead, project) => {
        const first = lead.name.split(' ')[0];
        return [
          `Hi ${first}, exciting update! 🌟`,
          ``,
          `We have an *exclusive early-bird offer* for ${lead.config} at *${project.name}*:`,
          `💰 Special price for this month only`,
          `🎁 Free modular kitchen upgrade`,
          `📋 Flexible payment schedule`,
          ``,
          `This offer expires soon. Shall I send you the details?`
        ].join('\n');
      }
    }
  ],

  // ── NEGOTIATION: Closing Push ─────────────────────────────────────────────
  negotiation: [
    {
      id: 'negotiate_offer',
      delayHours: 0,
      label: 'Negotiation Offer',
      template: (lead, project) => {
        const first = lead.name.split(' ')[0];
        const valStr = fmtPrice(lead.value);
        return [
          `Hi ${first}, great news! 🎊`,
          ``,
          `We've prepared a *special offer* for your ${lead.config} at *${project.name}*:`,
          `💰 Offer price: *${valStr}*`,
          `📋 Includes all registration charges`,
          `🔑 Ready for immediate possession`,
          ``,
          `This is a *limited-time offer*. Shall I proceed with the booking?`,
          `Reply *BOOK* to confirm or *CALL* to discuss further.`
        ].join('\n');
      }
    },
    {
      id: 'negotiate_urgency_12h',
      delayHours: 12,
      label: '12h Urgency',
      condition: (lead) => !lead.repliedAt,
      template: (lead, project) => {
        const first = lead.name.split(' ')[0];
        return [
          `Hi ${first}, just following up on the offer for *${project.name}*. ⏰`,
          ``,
          `We have *2 other buyers* interested in the same unit.`,
          `To secure your unit, we need your confirmation by *tomorrow*.`,
          ``,
          `Would you like to discuss the terms? I'm available on call anytime. 📞`
        ].join('\n');
      }
    },
    {
      id: 'negotiate_final_24h',
      delayHours: 24,
      label: '24h Final Offer',
      condition: (lead) => !lead.repliedAt,
      template: (lead, project) => {
        const first = lead.name.split(' ')[0];
        return [
          `Hi ${first}, this is my final follow-up on *${project.name}*. 📢`,
          ``,
          `We're offering a *₹2L additional discount* if you book this week.`,
          `This is our *best offer* and won't be available after Friday.`,
          ``,
          `📞 Call me at +91 79 4000 1234 to discuss.`,
          `Or reply *DONE* if you'd like to proceed with booking. 🏠`
        ].join('\n');
      }
    }
  ],

  // ── WON: Thank You + Onboarding ──────────────────────────────────────────
  won: [
    {
      id: 'won_thankyou',
      delayHours: 0,
      label: 'Booking Confirmation',
      template: (lead, project) => {
        const first = lead.name.split(' ')[0];
        return [
          `Congratulations ${first}! 🎉🎊`,
          ``,
          `Welcome to the *Ashray Group* family!`,
          `Your booking for *${lead.config}* at *${project.name}* is confirmed.`,
          ``,
          `📋 Next Steps:`,
          `1️⃣ Document verification (our team will contact you)`,
          `2️⃣ Payment schedule will be shared within 24 hours`,
          `3️⃣ Site visit for unit inspection`,
          ``,
          `Thank you for choosing us! We're excited to hand over your dream home. 🏠`
        ].join('\n');
      }
    }
  ],

  // ── LOST: Win-Back Attempt ────────────────────────────────────────────────
  lost: [
    {
      id: 'lost_winback',
      delayHours: 0,
      label: 'Win-Back Offer',
      template: (lead, project) => {
        const first = lead.name.split(' ')[0];
        return [
          `Hi ${first}, we hope you're doing well! 🙏`,
          ``,
          `We understand things didn't work out earlier, but we wanted to share some updates:`,
          ``,
          `🆕 *${project.name}* now has new ${lead.config} options`,
          `💰 Special pricing for returning customers`,
          `📋 Flexible payment plans available`,
          ``,
          `If you're still looking, we'd love to help. Reply *YES* if interested! 🏡`
        ].join('\n');
      }
    }
  ]
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtPrice(val) {
  if (!val) return '₹0';
  if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + ' Cr';
  if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + ' L';
  return '₹' + val.toLocaleString('en-IN');
}

/**
 * Get the next message to send for a lead based on stage + time elapsed.
 * @param {object} lead - The lead object
 * @param {object} project - The project object
 * @param {number} hoursInStage - Hours since lead entered current stage
 * @param {number} remindersSent - Number of reminders already sent in this stage
 * @returns {{ text: string, templateId: string, label: string } | null}
 */
export function getNextMessage(lead, project, hoursInStage, remindersSent) {
  const templates = MESSAGE_TEMPLATES[lead.stage];
  if (!templates || templates.length === 0) return null;

  const safeProject = project || {
    id: lead?.projectId || 1,
    name: lead?.projectName || lead?.project || 'Ashray Group Properties',
    type: 'Residential',
    loc: 'Ahmedabad',
    configs: [lead?.config || '2 BHK'],
    priceMin: 5000000,
    priceMax: 10000000,
    totalUnits: 100,
    available: 10,
    possession: 'Ready to move'
  };

  // Find the next template that matches the delay and hasn't been sent yet
  for (const tmpl of templates) {
    // Check if this template was already sent
    const alreadySent = (lead.automationLog || []).some(
      log => log.templateId === tmpl.id
    );
    if (alreadySent) continue;

    // Check delay condition
    if (hoursInStage >= tmpl.delayHours) {
      // Check custom condition (e.g., no reply check)
      if (tmpl.condition && !tmpl.condition(lead)) continue;

      const text = tmpl.template(lead, safeProject);
      return { text, templateId: tmpl.id, label: tmpl.label };
    }
  }

  return null;
}

/**
 * Determine if automation should be active for a lead.
 * Stops for: won, lost stages
 */
export function isAutomationActive(lead) {
  return !['won', 'lost'].includes(lead.stage);
}
