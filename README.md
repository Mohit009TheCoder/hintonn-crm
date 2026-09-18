# Hintonn AI — Lead Automation & Real Estate CRM System

A full-stack, real-world working CRM system designed for modern real estate developers, brokerage firms, and sales teams. Converted from the monolithic prototype into a modular, production-ready full-stack application with an Express REST API, persistent file storage, and a responsive React frontend.

---

## 🌟 Key System Features

1. **Dashboard & Executive Overview**
   - Live greeting with response SLA monitoring (15-min SLA violation alerts).
   - Real-time KPI metrics (New Leads, Response Time, Won Deals MTD, Active Pipeline Value) with trend sparklines.
   - Today's Agenda aggregating scheduled client site visits and follow-up calls.
   - Stage funnel distribution and AI-driven recommendations.

2. **Unified Multi-Channel Inbox**
   - WhatsApp Business chat threads with inbound and outbound message history.
   - Lead switcher with quick filters (*All Leads*, *Unread*, *Follow-ups*).
   - AI-assisted message drafting (*WhatsApp Nudge* and *Formal Email* generators).
   - One-click Digital Brochure sharing with delivery tracking.

3. **Deal Pipeline Kanban**
   - 6 configurable stages: `New`, `Contacted`, `Qualified`, `Negotiation`, `Won`, and `Lost`.
   - Live stage summaries with deal counts and total pipeline values.
   - Dynamic move-stage selectors with automated probability adjustment.
   - Loss reason modal capturing buyer objections (*Budget mismatch*, *Chose competitor*, etc.).

4. **Leads Management & Smart Directory**
   - Multi-tag filtering (*Hot Leads*, *High Budget*, *Site Visit Scheduled*, *Investors*, *NRI Buyers*).
   - Instant search across name, phone number, and project interest.
   - Sortable columns (*Name*, *Budget*, *AI Fit Score*).
   - Deep slide-in Lead Drawer with 5 tabs: **Overview**, **Activity Timeline**, **Notes**, **Deal & Documents**, and **WhatsApp**.

5. **Projects & Floor Unit Inventory Matrix**
   - 5 pre-configured residential and commercial developments.
   - Budget & bedroom preference matching calculating matching buyers per project.
   - Interactive unit grid manager: toggle floor units between **Available**, **Locked** (with expiry date), and **Sold**.
   - AI Property Listing generator with real-time typewriter effect, clipboard copy, and WhatsApp sharing.

6. **Automated WhatsApp Cadence & Reminder Engine**
   - Broadcast campaigns manager with delivery, open, and response rate analytics.
   - Official Meta WhatsApp Business Cloud API connection status.
   - Smart reminder cadence: 24h first inactivity check-in, then 12h follow-ups; auto-pauses when moved to Negotiation or Lost.
   - Interactive simulation clock controls (`+12h`, `+24h`, `Run Check Now`) to test automated nurture sequences in real-time.

7. **Voice Calls & 1-Click Outbound Dialer**
   - Floating dialer popover with live duration timer, pulsing connected indicator, and call notes capture.
   - Automated logging of call duration and notes directly into the lead's history.
   - Agent call performance leaderboard and 7-day daily call volume charts.

8. **Channel Partner & Broker Portal**
   - Broker and digital affiliate registry with 5-star quality ratings.
   - Live tracking of referred leads, closed deals, total revenue, and commission earned.

9. **Reports & Sales Forecasting**
   - Revenue forecasting models comparing closed revenue, weighted pipeline, and quarterly targets.
   - Deal velocity tracking measuring average days spent per stage.
   - Marketing source ROI comparison (Facebook, Google, 99acres, MagicBricks, Instagram, Referral).

---

## 🏗️ Architecture & Technology Stack

```
hintonn-crm/
├── server/                    # Node.js + Express REST API (port 5001)
│   ├── server.js              # Server entry — inits Firebase, starts Express
│   ├── service-account.json   # Firebase Admin credentials (gitignored)
│   ├── .env                   # FIRESTORE_EMULATOR_HOST, FIREBASE_PROJECT_ID
│   ├── data/
│   │   ├── firestore.js       # Firestore persistence engine (emulator + cloud)
│   │   ├── db.js              # Re-exports from firestore.js (backward compat)
│   │   └── seedData.js        # Comprehensive initial real estate dataset
│   ├── scripts/
│   │   └── seed.js            # Seeds all data into Firestore (emulator or cloud)
│   └── routes/                # 10 entity routers (leads, pipeline, projects, etc.)
├── client/                    # Vite + React 18 Single Page Application
│   ├── vite.config.js         # API proxying to backend
│   ├── tailwind.config.js     # Custom design system tokens
│   └── src/
│       ├── context/           # AuthContext & CRMContext data providers
│       ├── components/layout/ # Header & Sidebar navigation
│       ├── components/views/  # 13 dedicated business views
│       └── components/modals/ # LeadDrawer, Dialer, AddLead, AiListing, etc.
├── firebase.json              # Firebase emulator config (Firestore on port 8082)
├── firestore.rules            # Firestore security rules
├── .firebaserc                # Firebase project binding (demo-hintonn-crm)
└── package.json               # Root orchestrator with concurrently
```

- **Backend**: Node.js, Express, Morgan, CORS, Firebase Admin SDK v14.
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Custom SVG Icons, JetBrains Mono font.
- **Database**: Google Cloud Firestore (local emulator for dev, cloud for production).
- **Data Flow**: Server loads all Firestore collections into memory cache on startup → routes read from cache synchronously → mutations write to both cache and Firestore.

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm run install:all
```

### 2. Start the Firebase Emulator (local dev)

Requires Java 21+ (`brew install openjdk`):

```bash
# Terminal 1: Firestore emulator
npm run emulator
```

The emulator runs on `localhost:8082` with a UI at `http://localhost:4000`.

### 3. Seed Demo Data

```bash
# Terminal 2: Seed Firestore with all demo data
npm run seed
```

This writes 124 documents (16 leads, 5 projects, 25 calls, 10 partners, etc.) into the emulator.

### 4. Run the Application

```bash
# Starts backend (port 5001) + frontend (port 5173)
npm run dev
```

Open **`http://localhost:5173`** to access the CRM.

> **Note**: Emulator data is ephemeral — it clears when the emulator restarts. Re-run `npm run seed` after each emulator restart.

### Production (Cloud Firestore)

To switch from emulator to cloud Firestore:
1. Upgrade to Blaze plan in Firebase Console
2. Create a Firestore database in the Firebase Console
3. Remove `FIRESTORE_EMULATOR_HOST` from `server/.env`
4. Run `npm run seed` to seed cloud Firestore

---

## 📡 REST API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/leads` | `GET`, `POST` | Retrieve leads (filters: `q`, `stage`, `tag`, `sort`) or register a new lead |
| `/api/leads/:id` | `GET`, `PUT`, `DELETE` | View, update, or delete a lead |
| `/api/leads/:id/notes` | `POST` | Add a note to lead history |
| `/api/leads/:id/send-brochure` | `POST` | Send brochure via WhatsApp |
| `/api/pipeline` | `GET` | Retrieve pipeline board data and stage metrics |
| `/api/pipeline/:id/stage` | `PUT` | Transition lead stage (records probability & loss reason) |
| `/api/projects` | `GET` | List all 5 projects with vacancy and unit matrices |
| `/api/projects/:id/units/:unitId` | `PUT` | Update unit status (`available`, `locked`, `sold`) |
| `/api/projects/:id/ai-listing` | `POST` | Generate marketing listing text with AI |
| `/api/tasks` | `GET`, `POST`, `PUT` | Manage task checklist and agenda |
| `/api/site-visits` | `GET`, `POST`, `PUT` | Schedule property walkthroughs and log feedback |
| `/api/whatsapp/threads/:id` | `GET` | Retrieve conversation thread |
| `/api/whatsapp/send` | `POST` | Send WhatsApp message |
| `/api/whatsapp/broadcasts` | `GET`, `POST` | Manage marketing blasts and view deliverability |
| `/api/whatsapp/simulation/advance` | `POST` | Advance simulation clock (`+12h`, `+24h`) and trigger automated nudges |
| `/api/calls` | `GET`, `POST` | View call records or log call from the 1-click dialer |
| `/api/partners` | `GET`, `POST`, `PUT` | Manage channel partners and commission payouts |
| `/api/reports/summary` | `GET` | Revenue forecasts, funnels, velocity, and channel ROI |
| `/api/search?q=...` | `GET` | Global cross-entity search across leads, projects, partners, and tasks |
# hintonn-crm
