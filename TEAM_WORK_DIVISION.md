# 👥 FarmSense AI — Team Work Division
> 3 Members | Intermediate Level | 1 Month Timeline

---

## 👤 Member Roles

| Member | Role | Primary Tech |
|---|---|---|
| **Member 1** | 🐍 AI/ML Engineer | Python, Django, DRF, scikit-learn, XGBoost, Prophet |
| **Member 2** | 🟢 Backend Engineer | Node.js, Express.js, PostgreSQL, JWT, Socket.io |
| **Member 3** | ⚛️ Frontend Engineer | React.js, Tailwind CSS, Recharts, Axios |

---

## 🐍 Member 1 — AI/ML Engineer (Django + Python)

### Your Responsibility
You own the entire `ai-engine/` folder.
Django is a **pure AI service** — you never touch users/farms/alerts tables.
You only write to: `crops`, `market_prices`, `weather_cache`.
You receive data FROM Node → process → return JSON result.

---

### 📁 Files You Own
```
ai-engine/
├── farmsense/
│   ├── settings.py          ✅ already done
│   ├── urls.py              ✅ already done
│   └── middleware.py        ✅ already done
│
├── crops/
│   ├── models.py            ← Crop, MarketPrice models
│   ├── views.py             ← /api/crops/list/, /api/crops/compare/
│   ├── urls.py
│   ├── serializers.py
│   └── services/
│       ├── crop_scorer.py          ← ML suitability scoring
│       └── profit_calculator.py    ← profit calculation logic
│
├── weather/
│   ├── models.py            ← WeatherCache model
│   ├── views.py             ← /api/weather/forecast/, /api/weather/check-alerts/
│   ├── urls.py
│   ├── serializers.py
│   └── services/
│       ├── open_meteo.py           ← fetch Open-Meteo API (free, no key)
│       └── alert_engine.py         ← rule-based alert generation
│
├── suggestions/
│   ├── models.py            ← empty
│   ├── views.py             ← /api/suggestions/generate/
│   ├── urls.py
│   └── services/
│       ├── irrigation.py           ← irrigation ML suggestion
│       ├── fertilizer.py           ← fertilizer ML suggestion
│       ├── pest_risk.py            ← rule-based pest risk
│       └── harvest_window.py       ← rule-based harvest timing
│
├── ml_models/
│   ├── train_crop_suitability.py        ← Random Forest
│   ├── train_yield_predictor.py         ← XGBoost
│   ├── train_fertilizer_recommender.py  ← Random Forest
│   ├── train_irrigation_recommender.py  ← Random Forest
│   ├── train_price_forecaster.py        ← Prophet
│   ├── crop_suitability.pkl
│   ├── yield_predictor.pkl
│   ├── fertilizer_recommender.pkl
│   ├── irrigation_recommender.pkl
│   ├── price_forecaster_kapas.pkl
│   └── scaler.pkl
│
└── data/
    ├── crops.json                   ← seed data (you create this)
    ├── market_prices.csv
    └── datasets/                    ← downloaded from Kaggle
        ├── crop_recommendation.csv
        ├── crop_yield.csv
        ├── fertilizer.csv
        ├── irrigation.csv
        └── commodity_prices.csv
```

---

### 📋 Your Task List (Week by Week)

#### Week 1
- [ ] Write `crops/models.py` — Crop, MarketPrice
- [ ] Write `weather/models.py` — WeatherCache
- [ ] Register in `admin.py` for both apps
- [ ] Run `makemigrations` + `migrate`
- [ ] Create Django superuser
- [ ] Create `data/crops.json` seed file (10-15 crops with all details)
- [ ] Load seed data: `python manage.py loaddata data/crops.json`

#### Week 2
- [ ] Download all 5 datasets from Kaggle
- [ ] Train all 5 ML models → save `.pkl` files
- [ ] Write `weather/services/open_meteo.py` — fetch 7-day forecast
- [ ] Write `weather/services/alert_engine.py` — 8 alert rules
- [ ] Write `weather/views.py` + `weather/urls.py`

#### Week 3
- [ ] Write `suggestions/services/` — all 4 suggestion types
- [ ] Write `suggestions/views.py` + `suggestions/urls.py`
- [ ] Write `crops/services/crop_scorer.py` — load pkl, run predict_proba()
- [ ] Write `crops/services/profit_calculator.py` — Prophet price + profit formula
- [ ] Write `crops/views.py` + `crops/urls.py`
- [ ] Test ALL endpoints in Postman with `X-Internal-Key` header
- [ ] Fix bugs, share Postman collection with Member 2

#### Week 4
- [ ] Help Member 2 integrate Django endpoints into Node
- [ ] Fix any bugs found during integration
- [ ] Help Member 3 understand what data Django returns (for UI)

---

### 🌐 Your Django API Endpoints

```
All protected by: X-Internal-Key: farmsense_internal_secret_2024

GET  /api/weather/forecast/?lat=23.2&lon=72.6
     Returns: 7-day forecast JSON

POST /api/weather/check-alerts/
     Body: { farm_id, lat, lon, soil_type, current_crop, crop_stage }
     Returns: list of alerts (does NOT save to DB)

GET  /api/crops/list/?season=kharif
     Returns: all crops from DB

POST /api/crops/compare/
     Body: { soil_type, npk, ph, lat, lon, season, crop_ids[], land_size }
     Returns: comparison with scores, yield, profit (does NOT save)

GET  /api/crops/market-prices/?crop_id=1&state=gujarat
     Returns: latest market price

POST /api/suggestions/generate/
     Body: { farm_id, soil_type, crop_name, crop_stage, weather_forecast }
     Returns: list of suggestions (does NOT save to DB)
```

---

### 🤖 ML Models You Build

| Model | Algorithm | Input Features | Output |
|---|---|---|---|
| Crop Recommendation | Random Forest | N,P,K,temp,humidity,pH,rainfall | crop suitability % |
| Yield Prediction | XGBoost | crop,season,rainfall,temp,N,P,K,pH | quintal/acre |
| Fertilizer Recommendation | Random Forest | soil_type,crop,N,P,K,temp,humidity,moisture | fertilizer name |
| Irrigation Recommendation | Random Forest | crop,soil,temp,humidity,rainfall,soil_moisture | irrigation level |
| Price Forecasting | Prophet | date, price (time series per crop) | 30/60/90 day price |

---

### 📦 Your pip packages
```bash
pip install django djangorestframework psycopg2-binary python-dotenv
pip install django-cors-headers requests pandas numpy
pip install scikit-learn xgboost joblib prophet
```

---

## 🟢 Member 2 — Backend Engineer (Node.js + Express)

### Your Responsibility
You own the entire `server/` folder.
You are the **bridge between React and Django**.
You own ALL application tables in PostgreSQL.
You handle auth, farm data, notifications, scheduling, and calling Django.

---

### 📁 Files You Own
```
server/
├── index.js                  ← Express app, CORS, Socket.io setup
├── package.json
├── .env
│
├── config/
│   ├── db.js                 ← PostgreSQL pool connection (pg library)
│   └── socket.js             ← Socket.io setup
│
├── middleware/
│   ├── auth.js               ← JWT verify middleware
│   └── errorHandler.js       ← global error handler
│
├── routes/
│   ├── auth.js               ← POST /api/auth/register, login, GET /me
│   ├── farm.js               ← POST /api/farm/create, GET /me, PUT /update
│   ├── fields.js             ← CRUD for fields
│   ├── alerts.js             ← GET alerts, PUT read, GET history
│   ├── suggestions.js        ← GET suggestions (calls Django internally)
│   ├── crops.js              ← POST /compare (calls Django ML)
│   ├── weather.js            ← GET forecast (calls Django)
│   └── notifications.js      ← PUT notification preferences
│
├── services/
│   ├── aiEngineClient.js     ← axios client with X-Internal-Key for Django
│   ├── scheduler.js          ← node-cron daily 7AM job
│   └── notifier.js           ← Nodemailer (email) + Twilio (SMS)
│
└── db/
    └── schema.sql            ← all Node.js table definitions (run in pgAdmin)
```

---

### 📋 Your Task List (Week by Week)

#### Week 1
- [ ] Run `schema.sql` in pgAdmin — creates all 7 application tables
- [ ] Write `config/db.js` — PostgreSQL pool connection
- [ ] Write `index.js` — Express setup, CORS, middleware
- [ ] Write `middleware/auth.js` — JWT verification
- [ ] Write `routes/auth.js` — register (bcrypt), login (JWT), me
- [ ] Test register + login in Postman

#### Week 2
- [ ] Write `routes/farm.js` — create farm, get my farm, update
- [ ] Write `routes/fields.js` — add field, get fields, update, delete
- [ ] Write `routes/alerts.js` — get active alerts, mark read, history
- [ ] Write `routes/notifications.js` — update email/SMS preferences
- [ ] Test all routes in Postman with JWT header

#### Week 3
- [ ] Write `services/aiEngineClient.js` — axios client for Django
- [ ] Write `routes/weather.js` — calls Django, returns forecast to React
- [ ] Write `routes/suggestions.js` — calls Django, saves result, returns to React
- [ ] Write `routes/crops.js` — calls Django ML, saves result, returns to React
- [ ] Write `services/scheduler.js` — daily 7AM cron job (calls Django for all farms)
- [ ] Write `services/notifier.js` — send email + SMS alerts
- [ ] Write `config/socket.js` — Socket.io real-time alert push
- [ ] Full end-to-end Postman testing

#### Week 4
- [ ] Work with Member 3 to connect React to all Node endpoints
- [ ] Fix CORS issues if any
- [ ] Fix any bugs found during frontend integration
- [ ] Help with deployment setup

---

### 🌐 Your Node.js API Endpoints

```
── AUTH ──
POST   /api/auth/register        → hash password, insert user, return JWT
POST   /api/auth/login           → verify password, return JWT
GET    /api/auth/me              → return user profile (JWT protected)

── FARM ──
POST   /api/farm/create          → insert farm, return farm object
GET    /api/farm/me              → get farm + fields for logged-in user
PUT    /api/farm/update/:id      → update farm details

── FIELDS ──
POST   /api/farm/:id/fields      → add field to farm
GET    /api/farm/:id/fields      → get all fields of a farm
PUT    /api/fields/update/:id    → update field (crop, stage, etc.)
DELETE /api/fields/delete/:id    → delete field

── ALERTS ──
GET    /api/alerts?farm_id=x     → get active (unread) alerts
PUT    /api/alerts/:id/read      → mark single alert as read
GET    /api/alerts/history       → get all past alerts

── AI (Node calls Django internally, saves result, returns to React) ──
GET    /api/weather/forecast?farm_id=x    → calls Django → returns forecast
GET    /api/suggestions?farm_id=x         → reads ai_suggestions from DB
POST   /api/crops/compare                 → calls Django ML → saves + returns

── SETTINGS ──
PUT    /api/notifications/prefs  → update email/SMS/alert type preferences
```

---

### 🔗 How You Call Django (aiEngineClient.js)

```javascript
const axios = require('axios');

const djangoClient = axios.create({
  baseURL: process.env.DJANGO_URL,        // http://localhost:8000
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Key': process.env.DJANGO_INTERNAL_KEY
  }
});

// Call Django for weather
const getWeatherForecast = (lat, lon) =>
  djangoClient.get(`/api/weather/forecast/?lat=${lat}&lon=${lon}`);

// Call Django for alerts (returns list, YOU save to DB)
const checkAlerts = (payload) =>
  djangoClient.post('/api/weather/check-alerts/', payload);

// Call Django ML for crop comparison (returns result, YOU save to DB)
const compareCrops = (payload) =>
  djangoClient.post('/api/crops/compare/', payload);

// Call Django for suggestions (returns list, YOU save to DB)
const generateSuggestions = (payload) =>
  djangoClient.post('/api/suggestions/generate/', payload);
```

---

### 📦 Your npm packages
```bash
npm install express pg bcryptjs jsonwebtoken dotenv cors
npm install axios nodemailer node-cron express-validator
npm install helmet socket.io
npm install --save-dev nodemon
```

---

## ⚛️ Member 3 — Frontend Engineer (React.js)

### Your Responsibility
You own the entire `client/` folder.
You **only call Node.js endpoints** — never Django directly.
You build all pages, components, and connect to Node APIs.
You handle real-time alerts via Socket.io client.

---

### 📁 Files You Own
```
client/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── .env                      ← VITE_API_URL=http://localhost:5000
│
└── src/
    ├── main.jsx
    ├── App.jsx               ← routes setup
    │
    ├── api/
    │   ├── apiClient.js      ← axios instance with JWT interceptor
    │   ├── authApi.js        ← register, login, me
    │   ├── farmApi.js        ← farm CRUD, fields CRUD
    │   ├── alertApi.js       ← get alerts, mark read
    │   ├── suggestionApi.js  ← get suggestions
    │   ├── cropApi.js        ← compare crops
    │   └── weatherApi.js     ← get forecast
    │
    ├── context/
    │   ├── AuthContext.jsx   ← JWT storage, user state, login/logout
    │   └── SocketContext.jsx ← Socket.io connection, real-time alerts
    │
    ├── components/
    │   ├── Navbar.jsx
    │   ├── Sidebar.jsx
    │   ├── AlertCard.jsx         ← single alert display
    │   ├── WeatherWidget.jsx     ← 7-day forecast strip
    │   ├── SuggestionCard.jsx    ← AI tip card
    │   ├── CropCompareTable.jsx  ← comparison table
    │   ├── FieldCard.jsx         ← farm field status card
    │   ├── StatCard.jsx          ← dashboard stat card
    │   └── ProtectedRoute.jsx    ← redirect if not logged in
    │
    └── pages/
        ├── Landing.jsx       ← hero + features + CTA
        ├── Login.jsx         ← login form
        ├── Register.jsx      ← register form
        ├── Onboarding.jsx    ← 3-step farm setup wizard
        ├── Dashboard.jsx     ← main dashboard
        ├── Alerts.jsx        ← all alerts page
        ├── Suggestions.jsx   ← AI suggestions page
        ├── CropComparison.jsx ← compare crops + charts
        ├── FarmProfile.jsx   ← farm details + fields
        └── Settings.jsx      ← notification preferences
```

---

### 📋 Your Task List (Week by Week)

#### Week 1
- [ ] Setup Vite + React project
- [ ] Install Tailwind CSS
- [ ] Setup React Router v6
- [ ] Build `Landing.jsx` — hero section, features, CTA buttons
- [ ] Build `Register.jsx` + `Login.jsx` pages (forms only, no API yet)
- [ ] Build `Onboarding.jsx` — 3-step wizard UI (no API yet)
- [ ] Setup color theme in tailwind.config.js

#### Week 2
- [ ] Write `api/apiClient.js` — axios with JWT interceptor
- [ ] Write `context/AuthContext.jsx` — login, logout, user state
- [ ] Connect Register + Login to Node.js auth API
- [ ] Write `ProtectedRoute.jsx` — redirect to login if no JWT
- [ ] Build `Dashboard.jsx` layout — sidebar + stat cards + skeleton
- [ ] Build `WeatherWidget.jsx` component
- [ ] Build `AlertCard.jsx` component
- [ ] Build `SuggestionCard.jsx` component

#### Week 3
- [ ] Connect Dashboard to real API data (weather, alerts, suggestions)
- [ ] Build `Alerts.jsx` — full alerts page with filter tabs
- [ ] Build `Suggestions.jsx` — category tabs + suggestion cards
- [ ] Build `CropComparison.jsx` — input form + results table + Recharts bar chart
- [ ] Build `FarmProfile.jsx` — farm details + field cards grid
- [ ] Build `Settings.jsx` — toggle email/SMS alerts
- [ ] Write `context/SocketContext.jsx` — real-time alert popup

#### Week 4
- [ ] Full integration testing with Member 2's Node.js APIs
- [ ] Fix UI bugs, loading states, error handling
- [ ] Add responsive design (mobile friendly)
- [ ] Polish UI — animations, empty states, loading spinners
- [ ] Help with deployment on Vercel

---

### 🎨 Design System (use these everywhere)

```
Colors (add to tailwind.config.js):
  primary:     #2D6A4F   (deep green — buttons, active states)
  secondary:   #52B788   (mid green — accents)
  light:       #D8F3DC   (pale green — card backgrounds)
  warning:     #F4A261   (amber — warning alerts)
  danger:      #E63946   (red — critical alerts)
  info:        #4361EE   (blue — info, charts)
  background:  #F8FAF8   (off-white — page background)

Fonts:
  Headings: Outfit (bold)
  Body:     Inter
  Numbers:  JetBrains Mono

Components style:
  Cards:    bg-white rounded-2xl shadow-sm border border-gray-100 p-6
  Buttons:  bg-primary text-white rounded-lg px-6 py-3 hover:bg-primary/90
  Inputs:   border border-gray-200 rounded-lg p-3 focus:border-secondary
```

### 🌐 API Calls You Make (all to Node.js port 5000)

```javascript
// apiClient.js — attach JWT to every request
const token = localStorage.getItem('token');
headers: { Authorization: `Bearer ${token}` }

// Auth
POST   http://localhost:5000/api/auth/register
POST   http://localhost:5000/api/auth/login
GET    http://localhost:5000/api/auth/me

// Farm
POST   http://localhost:5000/api/farm/create
GET    http://localhost:5000/api/farm/me

// Dashboard data
GET    http://localhost:5000/api/weather/forecast?farm_id=x
GET    http://localhost:5000/api/alerts?farm_id=x
GET    http://localhost:5000/api/suggestions?farm_id=x

// Crop comparison
POST   http://localhost:5000/api/crops/compare
Body:  { farm_id, season, crop_ids[], land_size }

// Mark alert read
PUT    http://localhost:5000/api/alerts/:id/read

// Settings
PUT    http://localhost:5000/api/notifications/prefs
```

### 📦 Your npm packages
```bash
npm create vite@latest client -- --template react
cd client
npm install
npm install react-router-dom axios
npm install recharts
npm install socket.io-client
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## 🤝 How All 3 Members Work Together

### Shared Files (everyone reads, nobody breaks)
```
PROJECT_CONTEXT.md    ← full project bible
README.md             ← public docs
.gitignore            ← already set up
```

### Week-by-Week Coordination

| Week | Member 1 (Django/ML) | Member 2 (Node.js) | Member 3 (React) |
|---|---|---|---|
| **Week 1** | Models + migrations + seed data | schema.sql + auth routes + DB setup | UI pages (no API yet) + design system |
| **Week 2** | Train ML models + weather service + alert engine | Farm + field routes + alert routes | Components + connect auth to API |
| **Week 3** | Suggestion services + crop compare + all endpoints tested | Django integration + cron job + notifications + Socket.io | Connect all pages to Node APIs + real-time alerts |
| **Week 4** | Bug fixes + help with integration | Bug fixes + deployment setup | Polish UI + mobile responsive + deploy Vercel |

---

### Communication Rules
```
1. Member 1 shares Postman collection after finishing each Django endpoint
   → Member 2 uses this to integrate

2. Member 2 shares API documentation (endpoint + request + response example)
   → Member 3 uses this to connect React

3. Use Git branches:
   main          ← stable, working code only
   member1/ai    ← Member 1's work
   member2/node  ← Member 2's work
   member3/react ← Member 3's work

4. Merge to main only after testing
```

---

### Git Branch Setup
```bash
# Member 1 runs:
git checkout -b member1/ai

# Member 2 runs:
git checkout -b member2/node

# Member 3 runs:
git checkout -b member3/react

# Merge to main when feature is complete and tested:
git checkout main
git merge member1/ai
```

---

### Shared .env Values (all 3 members use same values locally)
```
DB_NAME=farmsense
DB_USER=postgres
DB_HOST=localhost
DB_PORT=5432
DJANGO_INTERNAL_KEY=farmsense_internal_secret_2024
JWT_SECRET=farmsense_jwt_secret_2024
DJANGO_URL=http://localhost:8000
NODE_URL=http://localhost:5000
```

---

## ✅ Individual Completion Checklist

### Member 1 Done When:
```
□ python manage.py runserver 8000 runs without errors
□ All 5 .pkl model files exist in ml_models/
□ Postman: GET /api/weather/forecast/ returns 7-day JSON
□ Postman: POST /api/weather/check-alerts/ returns alert list
□ Postman: POST /api/crops/compare/ returns profit comparison
□ Postman: POST /api/suggestions/generate/ returns suggestions list
□ Django admin shows Crop and MarketPrice data
```

### Member 2 Done When:
```
□ npm run dev runs without errors on port 5000
□ Postman: POST /api/auth/register returns JWT
□ Postman: POST /api/auth/login returns JWT
□ Postman: GET /api/farm/me returns farm data
□ Postman: GET /api/weather/forecast?farm_id=1 returns forecast
□ Postman: POST /api/crops/compare returns comparison result
□ Postman: GET /api/suggestions?farm_id=1 returns suggestions
□ Daily cron job tested manually (call scheduler function once)
□ Email notification sends successfully
```

### Member 3 Done When:
```
□ npm run dev runs without errors on port 5173
□ Register + Login works end-to-end
□ Dashboard loads with real weather + alerts + suggestions
□ Crop comparison page shows table + bar chart
□ Real-time alert popup appears when Socket.io event fires
□ All pages mobile responsive
□ No console errors in browser
```
