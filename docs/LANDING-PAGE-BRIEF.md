# Velosphere CRM — landing page design brief

Use this document to design a public marketing site that matches the **live product** at [velospherecrm.com](https://velospherecrm.com). The product in-app is branded **Velosphere**: an enterprise real-estate lead CRM with assignment, attendance, and pipeline control in one workspace.

Live login: `https://velospherecrm.com/login`  
Logo file: `velo-crm-frontend/velo-crm-fe/public/velo-logo.png`

---

## 1. Product in one sentence

**Velosphere CRM is a multi-tenant operations console for real-estate sales teams** — it owns the lead pipeline, assigns work by team, and runs attendance / HR in the same product.

Not a generic “contacts CRM”. It is built for brokerages and site-sales teams that import large lead lists, push them through a stage funnel, and need managers to see who is working and who is available.

### Positioning (from the login screen)

> Enterprise real estate lead CRM — assignment, attendance, and pipeline control in one workspace.

Three login-screen claims (reuse these):

1. **Team-scoped lead ownership** — Managers assign, agents work their book.
2. **Import to pipeline** — Batch intake with live balance tracking.
3. **Role-aware access** — Admin, manager, and agent views stay separated.

### Who it is for

- Real-estate developers, channel partners, and brokerage sales floors
- Superadmins (org owners), managers (team leads), agents (users)
- India-first (timezone Asia/Kolkata, INR seat plans, RERA/GST/PAN on company profile)

---

## 2. Feature map (everything the product actually does)

### Leads and pipeline

- Lead list with search, filters, pagination
- Create a lead; open a lead detail
- Stages: **Incoming → Prospect → Opportunity → Unqualified / Booked / Lost**
- Priority: **Hot / Warm / Cold**
- Notes, activities, follow-ups / tasks
- Campaign + project on the lead
- Phone, email, city, requirement, budget, source
- Team and owner assignment
- Mark opened, closed without action, lost reason
- Custom fields (tenant-defined)
- Assignment rules (source / project / campaign → team, round-robin style strategies)

### Dashboard and performance

- Funnel by stage
- Leads by source, team, owner
- Trend charts
- Unassigned count, booked / lost
- Open and missed follow-ups
- Import job health
- Attendance snapshot (present / absent / half-day)
- Agent home: my assigned leads, open tasks, my attendance

### Imports and exports

- Excel/CSV import for leads (also site-visit / follow-up import types)
- Field mapping, header row, re-engage / reassign existing
- Lead **quota / balance** (plan lead limit minus used)
- Export jobs (filtered lists)
- Reassign leads in bulk (manager / superadmin)

### Teams and users

- Roles: **SUPERADMIN**, **MANAGER**, **USER** (agent)
- Departments and teams
- Seat quota by subscription plan
- Add people from **HRMS first**, then grant CRM login
- Team membership and team managers
- Impersonation (ops) and session refresh

### HR, attendance, leave, documents

- **HRMS**: employee profiles (even without a CRM login), then grant login
- Attendance heartbeat, present / half-day / full-day rules
- Availability (week-day calendar)
- Leave requests and approvals
- Employee documents (expiry-aware)

### Company and branding

- Company profile: phone, email, website, address, PAN, GST, **RERA**
- White-label: product name + primary / secondary / accent / sidebar colors
- Plans (INR, monthly list price):

| Plan | Seats | Lead quota | Price (INR / mo) |
|------|------:|-----------:|-----------------:|
| Team 15 | 15 | 25,000 | 9,999 |
| Team 30 | 30 | 50,000 | 19,999 |
| Team 50 | 50 | 100,000 | 34,999 |
| Enterprise 75+ | 100 | 250,000 | 59,999 |

All plans include company branding. Higher tiers add imports/exports/reassign, white-label, priority support, dedicated onboarding.

### Multi-tenant security

- Each company is an isolated tenant
- JWT access + httpOnly refresh cookie
- Light / dark theme
- Notifications

**Do not market** internal demo emails (`@acme.local`) on the landing page.

---

## 3. Visual theme (match the CRM, do not invent a teal SaaS look)

The product comment in CSS is explicit: **muted steel / slate, no logo teal, no neon**.

### Colour — light (default app)

| Token | Hex | Use on landing |
|-------|-----|----------------|
| Navy / ink | `#1C1F26` | Hero left panel, headlines, footer |
| Navy muted | `#2A303C` | Hover, secondary dark surfaces |
| Primary steel | `#3D5A80` | Buttons, links, badges, “Sign in” kicker |
| Primary dark | `#2C4260` | Button press |
| Primary muted | `#E4EAF1` | Soft chips, feature icon wells |
| Page grey | `#F1F3F5` | Page background |
| Surface | `#F7F8FA` | Subtle sections |
| Raised / cards | `#FFFFFF` | Cards, nav, forms |
| Border | `#D5DAE1` | Hairline borders |
| Muted text | `#6B7280` | Body secondary |
| Success | `#2F6F4E` | Booked / positive |
| Warning | `#9A6700` | Warm / caution |
| Danger | `#A33B3B` | Lost / error |

Login glow: `rgba(61, 90, 128, 0.22)` — a **soft steel bloom**, not a neon gradient splash.

### Colour — dark (optional landing toggle)

Near-black `#0C0E13` / `#080A0E`, steel highlight `#7A9BBF`, text `#E8EAEF`. Use if you add a dark hero that mimics the login **brand plane**.

### Type

- **UI / landing:** IBM Plex Sans (400 / 500 / 600 / 700)
- **Data / codes:** IBM Plex Mono
- Headlines: tight tracking, bold, large (login uses ~48–54px)
- Kickers: 10–11px, **uppercase**, letter-spacing `0.16em–0.22em`, steel/primary
- Body: 15px, relaxed, white/70 on dark, `#6B7280` on light

### Shape and motion

- Radius: **small** (`rounded-md` / `rounded-lg`) — enterprise, not pill-startup
- Shadow: very light (`0 1px 2px` + soft 8–20px). Dark mode: almost no border glow
- Icons: **Lucide** line icons (Users, Building2, ShieldCheck, LayoutDashboard)
- Logo: square mark with a thin ring, sitting on navy
- Login layout to echo: **50/50 split** — dark brand plane left, light form right
- Subtle **grid mask** on the dark plane (already in the app)

### Voice

- Short, operational, confident
- Words that fit: *pipeline, assignment, quota, console, workspace, ownership*
- Words that do **not** fit: *unlock your potential, AI-powered magic, disrupt*

---

## 4. Recommended landing page structure

1. **Nav** — logo + Velosphere, links (Product, Pipeline, HR, Pricing), **Sign in** (steel outline), **Book a demo** (filled `#3D5A80`)
2. **Hero** — split like the login screen: left navy “Operations console”, right product screenshot or dashboard mock (light tables, steel badges)
3. **Proof strip** — stages Incoming → Booked; Hot / Warm / Cold
4. **Features** — 6 tiles: Leads, Assignment, Imports, Attendance, HRMS, White-label
5. **Roles** — Superadmin / Manager / Agent columns
6. **Pricing** — four plans from the table above (INR)
7. **Security / tenant** — one short band
8. **Footer** — velospherecrm.com, Sign in

Primary CTA: **Sign in** → `https://velospherecrm.com/login`  
Secondary: contact / demo (you add the form later)

### Hero copy you can use

**Kicker:** Operations console  
**H1:** Pipeline, people, and attendance in one CRM.  
**Sub:** Built for real-estate sales floors. Import thousands of leads, assign by team, and see who is working — without leaving the console.

---

## 5. Prompt for Claude / Cursor (paste as-is)

```text
Design a production marketing landing page for Velosphere.

Product: enterprise multi-tenant real-estate lead CRM. Not a generic contacts app.
Live app: https://velospherecrm.com  Login: /login
Tone: operational, India real-estate sales floors, IBM Plex Sans, muted steel/slate.

Colours (do not use teal or neon):
- Ink/navy #1C1F26
- Primary steel #3D5A80
- Page #F1F3F5
- Cards #FFFFFF
- Border #D5DAE1
- Muted text #6B7280
- Success #2F6F4E, warning #9A6700, danger #A33B3B
- Dark hero glow rgba(61,90,128,0.22)

Layout: desktop split hero like a console (dark left brand plane + light right product UI). Tight radii, Lucide-style line icons, uppercase tracked kickers.

Sections: nav, hero, stage funnel strip, 6 features (leads/assignment/imports/attendance/HRMS/white-label), 3 roles, 4 INR plans (Team 15 ₹9,999 / 15 seats / 25k leads; Team 30 ₹19,999 / 30 / 50k; Team 50 ₹34,999 / 50 / 100k; Enterprise 75+ ₹59,999 / 100 / 250k), footer with Sign in.

Primary button: Sign in → https://velospherecrm.com/login
Do not mention demo emails. Logo is a square mark on navy.
Make it feel like Bloomberg-for-brokers, not a Dribbble startup template.
```

---

## 6. Do / don’t

**Do**

- Steal the login split, kicker type, and steel primary
- Show a **table + badges** mock (that is the actual UI)
- Mention lead quota and seats (how this product is sold)

**Don’t**

- Teal / cyan / purple gradient SaaS templates
- Huge rounded blobs, glassmorphism overload, stock “handshake in office”
- Calling it “AI CRM” unless you later ship that
- Indexing private app routes (`/leads`, `/admin`, `/hrms`) on the marketing site
