# FarmSense AI — Progress Tracker
> Paste this file at the start of any new chat so AI instantly knows what's done and what's next.
> Update checkboxes as you complete each step.

---

## 👤 My Role
**Member 2 — Node.js Backend Engineer**
Owns: `server/` folder
Stack: Node.js, Express.js, PostgreSQL, JWT, Socket.io

---

## 🏗️ Project Stack (Quick Reference)
```
React (port 5173)        → client/
Node.js (port 5000)      → server/        ← YOU ARE HERE
Django (port 8000)       → ai-engine/
Database: PostgreSQL (farmsense DB, postgres superuser)
OS: Windows
```

---

## ✅ Completed Steps

### Phase 1 — Django Setup ✅ COMPLETE
- [x] Django project created
- [x] 4 apps created (accounts, weather, crops, suggestions)
- [x] settings.py configured
- [x] urls.py in all 4 apps
- [x] middleware.py (X-Internal-Key protection)
- [x] PostgreSQL connected
- [x] Default Django migrations applied

### Phase 2 — Node.js Setup (IN PROGRESS)

- [x] Step 1 — All packages installed
- [x] Step 2 — Folder structure created
- [x] Step 3 — .env file created
- [x] Step 4 — db/schema.sql created + run in pgAdmin (9 tables)
- [x] Step 5 — config/db.js done (PostgreSQL connected)
- [x] Step 6 — index.js done (server running port 5000, health check OK)
- [x] Step 7 — middleware/auth.js
- [x] Step 8 — middleware/errorHandler.js
- [x] Step 9 — routes/auth.js
- [x] Step 10 — services/geocoder.js + routes/farm.js
- [ ] Step 11 — routes/fields.js                ⬅️ NEXT
- [ ] Step 12 — routes/alerts.js
- [ ] Step 13 — routes/suggestions.js
- [ ] Step 14 — routes/analysis.js
- [ ] Step 15 — routes/crops.js
- [ ] Step 16 — routes/weather.js
- [ ] Step 17 — routes/notifications.js
- [ ] Step 18 — services/geocoder.js
- [ ] Step 19 — services/aiEngineClient.js
- [ ] Step 20 — services/notifier.js
- [ ] Step 21 — services/scheduler.js

### Phase 3 — Auth Testing
- [ ] Mailtrap setup
- [ ] Register → verify email → login → logout tested in Postman

### Phase 4 — Farm Profile & Fields
- [ ] routes/farm.js + geocoder.js
- [ ] routes/fields.js
- [ ] Tested in Postman

### Phase 5 — Django AI Integration
- [ ] Django models + ML models done
- [ ] Node ↔ Django connection working

### Phase 6 — Notifications & Scheduling
- [ ] notifier.js + scheduler.js
- [ ] Daily cron job tested

### Phase 7 — Full Backend Testing
- [ ] All endpoints tested end-to-end

### Phase 8 — React Frontend
- [ ] Not started (Member 3)

### Phase 9 — Deployment
- [ ] Not started

---

## 📁 Current File Status

```
server/
├── config/
│   └── db.js                    ✅ DONE
├── middleware/
│   ├── auth.js                  ✅ DONE
│   └── errorHandler.js          ✅ DONE
├── routes/
│   ├── auth.js                  ✅ DONE
│   ├── farm.js                  ✅ DONE
│   ├── fields.js                ⬅️ NEXT (Step 11)
│   ├── alerts.js                ⬜ empty placeholder
│   ├── suggestions.js           ⬜ empty placeholder
│   ├── analysis.js              ⬜ empty placeholder
│   ├── crops.js                 ⬜ empty placeholder
│   ├── weather.js               ⬜ empty placeholder
│   └── notifications.js         ⬜ empty placeholder
├── services/
│   ├── aiEngineClient.js        ⬜ not started
│   ├── scheduler.js             ⬜ not started
│   ├── notifier.js              ⬜ not started
│   └── geocoder.js              ✅ DONE
├── db/
│   └── schema.sql               ✅ DONE
├── index.js                     ✅ DONE
├── package.json                 ✅ DONE
└── .env                         ✅ DONE
```

---

## 🗄️ Database Tables Status

```
Node.js tables (all created via schema.sql):
  ✅ users
     (+ is_email_verified, email_verify_token, email_verify_expires)
  ✅ login_history
  ✅ farms
  ✅ fields
  ✅ alerts
  ✅ ai_suggestions
  ✅ ai_analysis_results
  ✅ crop_comparison_results
  ✅ notification_preferences

Django tables (created by Django migrations):
  ✅ auth_user, auth_group, django_migrations, django_session

Django AI tables (not created yet):
  ⬜ crops
  ⬜ market_prices
  ⬜ weather_cache
```

---

## 🌐 API Routes Status

```
POST   /api/auth/register            ⬜
POST   /api/auth/login               ⬜
GET    /api/auth/me                  ⬜
GET    /api/auth/verify-email        ⬜
POST   /api/auth/resend-verification ⬜
POST   /api/auth/logout              ⬜
GET    /api/auth/login-history       ⬜
POST   /api/farm/setup               ⬜
GET    /api/farm/me                  ⬜
PUT    /api/farm/update              ⬜
GET    /api/farm/profile-status      ⬜
PUT    /api/farm/soil-profile        ⬜
POST   /api/farm/:id/fields          ⬜
GET    /api/farm/:id/fields          ⬜
PUT    /api/fields/update/:id        ⬜
DELETE /api/fields/delete/:id        ⬜
GET    /api/alerts                   ⬜
PUT    /api/alerts/:id/read          ⬜
GET    /api/alerts/history           ⬜
GET    /api/suggestions              ⬜
GET    /api/analysis/latest          ⬜
POST   /api/analysis/run             ⬜
POST   /api/crops/compare            ⬜
GET    /api/weather/forecast         ⬜
PUT    /api/notifications/prefs      ⬜
GET    /api/notifications/prefs      ⬜
```

---

## ⚙️ Key Decisions

```
Language:         English only
Database:         PostgreSQL (postgres superuser for dev)
Price data:       Static lookup JSON (only 7 days of data — no Prophet)
Geocoding:        Nominatim (free, no API key needed)
Weather:          Open-Meteo (free, no API key needed)
Email testing:    Mailtrap (not configured yet)
Email prod:       Gmail SMTP with App Password
Architecture:     Node owns all app tables
                  Django is pure AI service (never writes app data)
Email verify:     Token-based, 24hr expiry
Login history:    Stored in login_history table
```

---

## 📋 How to Use This File in New Chat

Paste this message at start of new chat:

"I am building FarmSense AI.
I am Member 2 — Node.js Backend Engineer.
[paste this entire PROGRESS.md file]
Tell me Step 7 — middleware/auth.js"
