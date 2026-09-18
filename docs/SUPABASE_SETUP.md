# Supabase Setup Guide for Hintonn CRM

Hintonn CRM now supports **Supabase (PostgreSQL)** as its primary production database, with an automatic local persistent fallback.

---

## 🎯 Quick Start Overview

| Mode | How to Activate | Description |
|------|-----------------|-------------|
| **Local Persistent Mode** *(Active by default)* | No setup required. | Stores and persists all records in `server/data/local-db.json`. Pre-seeded with complete demo dataset. Full login, pipeline, and CRUD support. |
| **Supabase Cloud Mode** | Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `server/.env`. | Connects to your remote Supabase PostgreSQL database with automated table sync. |

---

## 🛠️ Step-by-Step Supabase Cloud Setup

### Step 1: Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Choose your organization, set a project name (e.g. `hintonn-crm`), set a database password, and choose your preferred region.
4. Click **Create new project** and wait ~1-2 minutes for provisioning.

---

### Step 2: Run the Database Schema Migration
1. In your Supabase Dashboard, click on **SQL Editor** in the left sidebar.
2. Click **New Query**.
3. Open the schema file located in this repository at:
   `server/scripts/supabase-schema.sql`
4. Copy the entire SQL contents and paste it into the Supabase SQL Editor.
5. Click **Run** (or press `Cmd + Enter`).
6. You should see `Success. No rows returned`. All 20 tables, indexes, and security policies are now created!

---

### Step 3: Copy Your API Credentials
1. In your Supabase Dashboard, click on **Project Settings** (gear icon) -> **API**.
2. Find the following values:
   - **Project URL** (e.g. `https://xyzabcdef.supabase.co`)
   - **service_role** secret key (under *Project API keys*)
   - **anon / public** key (optional, for client-side)
3. Open `server/.env` in your project and update the fields:
   ```env
   PORT=5001
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJh...your-service-role-key
   SUPABASE_ANON_KEY=eyJh...your-anon-key
   ```

---

### Step 4: Seed the Database
In your terminal, run:
```bash
npm run supabase:seed
```
This will automatically:
- Connect to your Supabase instance.
- Seed all 20 tables with projects, leads, stages, tasks, users, and templates.
- Hash passwords securely with bcrypt.

---

### Step 5: Test Connection & Start the CRM
To verify your connection at any time:
```bash
npm run supabase:test
```

Start the full stack application:
```bash
npm run dev
```

Open your browser at [http://localhost:5173](http://localhost:5173).

---

## 🔐 Default Demo Accounts

After seeding (or in local mode), you can log in with:

| Name | Role | Email | Password |
|------|------|-------|----------|
| Rohan Mehta | **Admin** | `rohan@ashraygroup.in` | `password123` |
| Ananya Iyer | **Manager** | `ananya@ashraygroup.in` | `password123` |
| Karan Thakkar | **Agent** | `karan@ashraygroup.in` | `password123` |
| Simran Kaur | **Agent** | `simran@ashraygroup.in` | `password123` |
| Devika Shah | **Viewer** | `devika@ashraygroup.in` | `password123` |
