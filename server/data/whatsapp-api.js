/**
 * WhatsApp Cloud API — Direct Meta Integration
 *
 * Sends messages directly via the Meta WhatsApp Business Cloud API.
 * No n8n dependency. Handles both template and free-form text messages.
 *
 * Flow:
 *   CRM automation engine → this module → Meta Graph API → WhatsApp delivery
 *   Meta inbound webhook → /api/whatsapp/webhook → this module → CRM lead update
 */

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const GRAPH_URL = `https://graph.facebook.com/${API_VERSION}`;

/**
 * Check if the WhatsApp API is properly configured.
 */
export function isConfigured() {
  return !!(PHONE_NUMBER_ID && ACCESS_TOKEN);
}

/**
 * Get connection status info.
 */
export function getConnectionStatus() {
  return {
    configured: isConfigured(),
    phoneNumberId: PHONE_NUMBER_ID || null,
    apiVersion: API_VERSION,
    graphUrl: GRAPH_URL,
  };
}

// ── Sending Messages ────────────────────────────────────────────────────────

/**
 * Send a free-form text message (within 24h customer-initiated window).
 * @param {string} to — Recipient phone number (E.164 or 10-digit Indian)
 * @param {string} text — Message body
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendTextMessage(to, text) {
  if (!isConfigured()) {
    return { success: false, error: 'WhatsApp API not configured' };
  }

  const phone = normalizePhone(to);
  if (!phone) {
    return { success: false, error: `Invalid phone number: ${to}` };
  }

  try {
    const response = await fetch(`${GRAPH_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'text',
        text: { preview_url: false, body: text },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || `HTTP ${response.status}`;
      console.error(`❌ WhatsApp send failed: ${errMsg}`);
      return { success: false, error: errMsg };
    }

    const msgId = data?.messages?.[0]?.id;
    console.log(`✅ WhatsApp sent → ${phone} (msg: ${msgId})`);
    return { success: true, messageId: msgId };
  } catch (err) {
    console.error(`❌ WhatsApp send error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Send a template message (for first contact or after 24h window expiry).
 * @param {string} to — Recipient phone number
 * @param {string} templateName — Pre-approved Meta template name
 * @param {string} languageCode — Template language (default: 'en')
 * @param {Array<string>} params — Template body parameters ({{1}}, {{2}}, etc.)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendTemplateMessage(to, templateName, languageCode = 'en_US', params = []) {
  if (!isConfigured()) {
    return { success: false, error: 'WhatsApp API not configured' };
  }

  const phone = normalizePhone(to);
  if (!phone) {
    return { success: false, error: `Invalid phone number: ${to}` };
  }

  const bodyParams = params.length > 0
    ? params.map(p => ({ type: 'text', text: String(p) }))
    : undefined;

  const template = {
    name: templateName,
    language: { code: languageCode },
  };
  if (bodyParams) {
    template.components = [{ type: 'body', parameters: bodyParams }];
  }

  try {
    const response = await fetch(`${GRAPH_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'template',
        template,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || `HTTP ${response.status}`;
      console.error(`❌ WhatsApp template send failed: ${errMsg}`);
      return { success: false, error: errMsg };
    }

    const msgId = data?.messages?.[0]?.id;
    console.log(`✅ WhatsApp template sent → ${phone} (${templateName}, msg: ${msgId})`);
    return { success: true, messageId: msgId };
  } catch (err) {
    console.error(`❌ WhatsApp template send error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Send a message — automatically picks template vs text based on 24h window.
 * @param {string} to — Recipient phone
 * @param {string} text — Message body
 * @param {object} lead — Lead object (to check last inbound timestamp)
 * @param {string} templateName — Fallback template name for expired windows
 * @returns {Promise<{success: boolean, messageId?: string, method?: string, error?: string}>}
 */
export async function sendMessage(to, text, lead = null, templateName = 'hello_world') {
  // Check 24h messaging window
  const lastInbound = lead?.lastInboundAt ? new Date(lead.lastInboundAt) : null;
  const now = new Date();
  const hoursSinceInbound = lastInbound ? (now - lastInbound) / (1000 * 60 * 60) : Infinity;

  if (hoursSinceInbound <= 24) {
    // Within 24h window — send free-form text
    const result = await sendTextMessage(to, text);
    return { ...result, method: 'text' };
  }

  // 24h window expired — need to use a template
  // Try with first 3 lines of text as template params
  const params = extractTemplateParams(text);
  const result = await sendTemplateMessage(to, templateName, 'en_US', params);

  if (result.success) {
    return { ...result, method: 'template' };
  }

  // Template failed (maybe not approved yet) — try free-form anyway
  // Meta will reject if truly outside window, but worth a try
  const fallback = await sendTextMessage(to, text);
  return { ...fallback, method: fallback.success ? 'text_fallback' : 'failed' };
}

// ── Webhook Verification ────────────────────────────────────────────────────

/**
 * Handle Meta webhook verification challenge.
 * Called when Meta first registers the webhook URL.
 * @param {object} req — Express request
 * @param {object} res — Express response
 * @returns {boolean} true if verification was handled
 */
export function handleWebhookVerification(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified by Meta');
    res.status(200).send(challenge);
    return true;
  }

  console.warn('⚠️  WhatsApp webhook verification failed');
  res.status(403).json({ error: 'Verification failed' });
  return true; // handled (with error)
}

// ── Inbound Message Processing ──────────────────────────────────────────────

/**
 * Parse incoming WhatsApp webhook payload from Meta.
 * @param {object} body — Raw webhook body
 * @returns {Array<{phone: string, name: string, text: string, timestamp: string, type: string}>}
 */
export function parseInboundWebhook(body) {
  const messages = [];

  try {
    const entries = body?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const value = change?.value;
        if (!value || change.field !== 'messages') continue;

        const contacts = value.contacts || [];
        const waMessages = value.messages || [];

        for (const msg of waMessages) {
          const contact = contacts.find(c => c.wa_id === msg.from) || {};

          let text = '';
          let type = msg.type || 'unknown';

          if (msg.text) {
            text = msg.text.body || '';
          } else if (msg.image) {
            text = '[Image]';
          } else if (msg.video) {
            text = '[Video]';
          } else if (msg.document) {
            text = '[Document]';
          } else if (msg.audio) {
            text = '[Audio]';
          } else if (msg.sticker) {
            text = '[Sticker]';
          } else if (msg.interactive) {
            text = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '[Interactive]';
            type = 'interactive';
          }

          messages.push({
            phone: msg.from,
            name: contact.profile?.name || '',
            text,
            timestamp: msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : new Date().toISOString(),
            type,
            messageId: msg.id,
          });
        }

        // Also capture delivery/read status updates
        const statuses = value.statuses || [];
        for (const status of statuses) {
          messages.push({
            phone: status.id, // This is the message ID, not phone
            type: 'status',
            status: status.status, // 'sent', 'delivered', 'read', 'failed'
            messageId: status.id,
            timestamp: status.timestamp ? new Date(Number(status.timestamp) * 1000).toISOString() : new Date().toISOString(),
          });
        }
      }
    }
  } catch (err) {
    console.error('❌ Webhook parse error:', err.message);
  }

  return messages;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalize an Indian phone number to format Meta expects.
 * Input: "+91 79 4000 1234", "917940001234", "7940001234"
 * Output: "917940001234" (no +, no spaces, with country code)
 */
function normalizePhone(phone) {
  if (!phone) return null;

  // Remove all non-digits
  let digits = phone.replace(/\D/g, '');

  // Indian numbers: if 10 digits, prepend 91
  if (digits.length === 10) {
    digits = '91' + digits;
  }

  // If starts with 0, remove it and prepend 91
  if (digits.startsWith('0') && digits.length === 11) {
    digits = '91' + digits.slice(1);
  }

  // Must be 12 digits (91 + 10 digit number) for Indian numbers
  if (digits.length === 12) {
    return digits;
  }

  // Accept any valid length (might be non-Indian)
  if (digits.length >= 10) {
    return digits;
  }

  return null;
}

/**
 * Extract template parameters from a message body.
 * Takes the first meaningful lines and uses them as {{1}}, {{2}}, etc.
 */
function extractTemplateParams(text) {
  if (!text) return [];

  // Split into meaningful chunks (max 10 params per Meta limit)
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  return lines.slice(0, 10);
}

export { normalizePhone, GRAPH_URL };
