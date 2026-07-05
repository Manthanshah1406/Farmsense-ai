# FarmSense AI — Project Context & Build Guide
> Paste this file at the start of any new chat so the AI instantly understands the full project.

---

## 🧠 Project Summary

**FarmSense AI** is a full-stack smart farming assistant for Indian farmers.
It combines MERN stack + Django AI/ML backend + PostgreSQL database.

**Core purpose:**
- Alert farmers about bad weather before it damages crops
- Give AI-powered farming suggestions (irrigation, fertilizer, pest risk)
- Help farmers decide which crop gives maximum profit based on their land, soil, and weather

---

## 👨‍💻 Team & Skill Level
- College group project — 3 members
- Intermediate level developers
- 1 month timeline
- Gujarat, India context (Kapas, Gehu, Moong are common crops)

---

## 🏗️ Architecture (FINAL — DO NOT CHANGE)

```
React (port 5173)
      │
      │ axios + JWT only
      ▼
Node.js + Express (port 5000)
      │
      ├──── PostgreSQL (port 5432)
      │     Node.js OWNS all application tables
      │
      │ internal HTTP + X-Internal-Key header
      ▼
Django + DRF (port 8000)
      │
      ├──── Pure AI/ML Service ONLY
      │     NEVER writes to application tables
      │
      └──── PostgreSQL (same DB)
            Django ONLY owns: crops, market_prices, weather_cache
```

### Golden Rules:
1. React NEVER calls Django directly
2. React ONLY calls Node.js
3. Django NEVER writes to users/farms/fields/alerts/suggestions tables
4. Node.js saves ALL application data to PostgreSQL
5. Django is stateless for app data — pure input → output AI service
6. Both backends share the same PostgreSQL database

---

## 👤 User Journey (Complete Flow)

```
Signup (name, email, phone, password)
    │
    ▼
Login → get JWT token
    │
    ▼
Farm Profile Setup (ONE TIME — required before using any feature)
    │
    ├── Personal Info
    │   ├── Full Name (pre-filled from signup)
    │   └── Phone (pre-filled from signup)
    │
    ├── Farm Location
    │   ├── Country (default: India)
    │   ├── State (dropdown)
    │   ├── District (dropdown — filtered by state)
    │   ├── Taluka (text input)
    │   ├── Village (text input)
    │   └── Pincode (6 digits)
    │
    ├── Farm Details
    │   ├── Farm Name
    │   ├── Farm Area (number)
    │   ├── Area Unit (Acre / Bigha / Hectare)
    │   ├── Soil Type (Black / Sandy / Loamy / Clay / Red / Silt)
    │   ├── Irrigation Type (Drip / Flood / Rainfed / Sprinkler / Borewell)
    │   └── Water Source (Borewell / Canal / River / Rainwater / Reservoir)
    │
    └── Soil Profile (from Soil Health Card — optional but recommended)
        ├── Nitrogen (N)
        ├── Phosphorus (P)
        ├── Potassium (K)
        └── Soil pH
    │
    ▼
Backend automatically (on profile save):
    ├── Geocode address → fetch Latitude & Longitude (Nominatim free API)
    ├── Save Farm Profile to PostgreSQL
    ├── Detect current season from month
    ├── Fetch 16-day weather forecast (Open-Meteo)
    ├── Fetch seasonal historical weather (Open-Meteo archive)
    ├── Run complete AI pipeline (all 5 modules)
    └── Save results to DB
    │
    ▼
Dashboard — farmer can now use all features:
    ├── 🌦️ Weather widget (7-day forecast)
    ├── ⚠️ Active weather alerts
    ├── 🌾 Crop recommendation
    ├── 🧪 Fertilizer plan
    ├── 💧 Irrigation schedule
    ├── 📈 Yield prediction
    ├── 💰 Profit estimate
    └── 👤 Profile data visible
```

---

## 🗄️ Database — PostgreSQL (Complete Schema)

**Database name:** `farmsense`
**User:** `postgres` (superuser, for development)
**Port:** `5432`

### Django Owns (reference/ML data):
```
crops                 — crop master data for ML
market_prices         — crop prices by state/district
weather_cache         — cached Open-Meteo API responses
```

### Node.js Owns (all application data):

```sql
-- ============================================
-- NODE.JS TABLE SCHEMA (run in pgAdmin)
-- ============================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    preferred_language VARCHAR(20) DEFAULT 'english',
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. FARMS TABLE (full address + soil profile)
CREATE TABLE IF NOT EXISTS farms (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

    -- Farm Identity
    farm_name VARCHAR(200) NOT NULL,

    -- Full Location
    country VARCHAR(100) DEFAULT 'India',
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    taluka VARCHAR(100),
    village VARCHAR(100),
    pincode VARCHAR(10),

    -- Auto-fetched via geocoding (Nominatim API)
    latitude FLOAT,
    longitude FLOAT,

    -- Farm Details
    farm_area FLOAT NOT NULL,
    area_unit VARCHAR(10) DEFAULT 'acre',
    soil_type VARCHAR(20) NOT NULL,
    irrigation_type VARCHAR(30),
    water_source VARCHAR(100),

    -- Soil Profile (from Soil Health Card)
    npk_nitrogen FLOAT,
    npk_phosphorus FLOAT,
    npk_potassium FLOAT,
    ph_level FLOAT,

    -- Current Crop Info
    current_crop VARCHAR(100),
    sow_date DATE,

    -- AI pipeline metadata
    last_ai_run TIMESTAMP,
    current_season VARCHAR(20),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. FIELDS TABLE
CREATE TABLE IF NOT EXISTS fields (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    field_size FLOAT NOT NULL,
    current_crop VARCHAR(100),
    sow_date DATE,
    expected_harvest_date DATE,
    crop_stage VARCHAR(20),
    status VARCHAR(20) DEFAULT 'empty',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. ALERTS TABLE
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE,
    alert_type VARCHAR(30) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    alert_date DATE,
    is_read BOOLEAN DEFAULT FALSE,
    is_sent_email BOOLEAN DEFAULT FALSE,
    is_sent_sms BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. AI SUGGESTIONS TABLE
CREATE TABLE IF NOT EXISTS ai_suggestions (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE,
    field_id INTEGER REFERENCES fields(id) ON DELETE SET NULL,
    category VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    suggestion_text TEXT NOT NULL,
    priority VARCHAR(10) NOT NULL,
    valid_for_date DATE NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. AI ANALYSIS RESULTS TABLE (full pipeline output)
CREATE TABLE IF NOT EXISTS ai_analysis_results (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE,

    -- Crop Recommendation
    recommended_crop VARCHAR(100),
    crop_suitability_score FLOAT,
    all_crop_recommendations JSONB,

    -- Fertilizer
    recommended_fertilizer VARCHAR(100),
    fertilizer_quantity VARCHAR(100),
    fertilizer_timing TEXT,

    -- Irrigation
    irrigation_need VARCHAR(20),
    water_amount_mm FLOAT,
    next_irrigation_date DATE,
    irrigation_frequency VARCHAR(100),

    -- Yield Prediction
    predicted_yield_per_acre FLOAT,
    total_predicted_yield FLOAT,
    yield_confidence VARCHAR(20),

    -- Profit Estimate
    market_price_per_quintal FLOAT,
    gross_revenue FLOAT,
    total_input_cost FLOAT,
    net_profit FLOAT,
    roi_percent FLOAT,

    -- Season & Weather snapshot
    season VARCHAR(20),
    weather_snapshot JSONB,

    -- Full raw result
    full_analysis JSONB,

    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. CROP COMPARISON RESULTS TABLE
CREATE TABLE IF NOT EXISTS crop_comparison_results (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE,
    season VARCHAR(20) NOT NULL,
    land_size_used FLOAT NOT NULL,
    comparison_data JSONB NOT NULL,
    recommended_crop_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. NOTIFICATION PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email_alerts BOOLEAN DEFAULT TRUE,
    sms_alerts BOOLEAN DEFAULT FALSE,
    alert_time TIME DEFAULT '07:00:00',
    alert_types TEXT DEFAULT 'heavy_rain,drought,heatwave,fungal_risk,irrigation',
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📁 Project Folder Structure

```
farmsense-ai/
│
├── PROJECT_CONTEXT.md
├── AI_ARCHITECTURE.md
├── DATASETS_AND_ML_GUIDE.md
├── TEAM_WORK_DIVISION.md
├── README.md
├── .gitignore
│
├── ai-engine/                       # Django + ML
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env
│   ├── venv/
│   │
│   ├── farmsense/
│   │   ├── settings.py              ✅ done
│   │   ├── urls.py                  ✅ done
│   │   ├── wsgi.py
│   │   └── middleware.py            ✅ done
│   │
│   ├── accounts/                    # empty models
│   ├── crops/                       # Crop, MarketPrice models
│   ├── weather/                     # WeatherCache model
│   ├── suggestions/                 # empty models, AI pipeline views
│   │
│   ├── ml_models/
│   │   ├── train_crop_suitability.py
│   │   ├── train_yield_predictor.py
│   │   ├── train_fertilizer_recommender.py
│   │   ├── train_irrigation_recommender.py
│   │   ├── build_price_lookup.py
│   │   ├── crop_suitability.pkl
│   │   ├── yield_predictor.pkl
│   │   ├── fertilizer_recommender.pkl
│   │   └── irrigation_recommender.pkl
│   │
│   └── data/
│       ├── crops.json
│       ├── price_lookup.json
│       └── datasets/
│           ├── crop_recommendation.csv
│           ├── crop_yield.csv
│           ├── fertilizer_recommendation.csv
│           ├── irrigation_prediction.csv
│           └── commodity_prices.csv
│
├── server/                          # Node.js + Express
│   ├── index.js
│   ├── package.json
│   ├── .env
│   │
│   ├── config/
│   │   ├── db.js
│   │   └── socket.js
│   │
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   │
│   ├── routes/
│   │   ├── auth.js                  # register, login, me
│   │   ├── farm.js                  # farm CRUD + profile setup
│   │   ├── fields.js
│   │   ├── alerts.js
│   │   ├── suggestions.js
│   │   ├── analysis.js              # full AI analysis results
│   │   ├── crops.js
│   │   ├── weather.js
│   │   └── notifications.js
│   │
│   ├── services/
│   │   ├── aiEngineClient.js
│   │   ├── scheduler.js
│   │   ├── notifier.js
│   │   └── geocoder.js              # address → lat/lon
│   │
│   └── db/
│       └── schema.sql
│
└── client/                          # React (build last)
    └── src/
        ├── api/
        ├── components/
        ├── pages/
        │   ├── Landing.jsx
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Onboarding.jsx       # farm profile setup wizard
        │   ├── Dashboard.jsx
        │   ├── Alerts.jsx
        │   ├── Suggestions.jsx
        │   ├── CropComparison.jsx
        │   ├── FarmProfile.jsx
        │   └── Settings.jsx
        └── context/
```

---

## 🔑 Environment Variables

### ai-engine/.env
```env
DEBUG=True
DJANGO_SECRET_KEY=your_django_secret_key
DB_HOST=localhost
DB_PORT=5432
DB_NAME=farmsense
DB_USER=postgres
DB_PASSWORD=yourpostgrespassword
INTERNAL_API_KEY=farmsense_internal_secret_2024
OPEN_METEO_URL=https://api.open-meteo.com/v1/forecast
OPEN_METEO_ARCHIVE_URL=https://archive-api.open-meteo.com/v1/archive
```

### server/.env
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=farmsense
DB_USER=postgres
DB_PASSWORD=yourpostgrespassword
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=7d
DJANGO_URL=http://localhost:8000
DJANGO_INTERNAL_KEY=farmsense_internal_secret_2024
EMAIL_USER=yourgmail@gmail.com
EMAIL_PASS=your_gmail_app_password
TWILIO_SID=your_twilio_sid
TWILIO_TOKEN=your_twilio_token
TWILIO_PHONE=+1234567890
```

---

## 🌐 API Endpoints (Complete)

### Node.js (called by React)
```
── AUTH ──
POST   /api/auth/register              name, email, phone, password
POST   /api/auth/login                 email, password → JWT
GET    /api/auth/me                    returns user + farm profile

── FARM PROFILE ──
POST   /api/farm/setup                 create farm profile (onboarding)
GET    /api/farm/me                    get my complete farm profile
PUT    /api/farm/update                update farm details
GET    /api/farm/profile-status        check if profile is completed

── FIELDS ──
POST   /api/farm/:id/fields
GET    /api/farm/:id/fields
PUT    /api/fields/update/:id
DELETE /api/fields/delete/:id

── WEATHER ──
GET    /api/weather/forecast           farm lat/lon → 7-day forecast

── ALERTS ──
GET    /api/alerts                     active alerts for farm
PUT    /api/alerts/:id/read
GET    /api/alerts/history

── AI FEATURES ──
GET    /api/analysis/latest            latest full AI analysis for farm
POST   /api/analysis/run              manually trigger AI pipeline
GET    /api/suggestions                today's suggestions
POST   /api/crops/compare              crop profit comparison

── PROFILE DATA ──
GET    /api/farm/profile               full profile data for Profile page
PUT    /api/farm/soil-profile          update N, P, K, pH values

── SETTINGS ──
PUT    /api/notifications/prefs
```

### Django (called by Node.js only)
```
POST   /api/weather/forecast/
POST   /api/weather/check-alerts/
POST   /api/analysis/full-pipeline/   ← main AI endpoint (all 5 modules)
POST   /api/crops/compare/
GET    /api/crops/list/
```

---

## 🔄 Core Workflows

### 1. Registration + Profile Setup
```
React: Register form (name, email, phone, password)
  → POST /api/auth/register (Node)
  → Node: hash password, insert users table
  → Node: create notification_preferences row
  → Node: set profile_completed = FALSE
  → Returns JWT

React: redirects to /onboarding (Farm Profile Setup)

React: Onboarding wizard (3 steps)
  Step 1: Location (country, state, district, taluka, village, pincode)
  Step 2: Farm details (farm_name, area, soil_type, irrigation, water_source)
  Step 3: Soil profile (N, P, K, pH) — with "Skip for now" option

  → POST /api/farm/setup (Node)
  → Node: geocode address → get lat/lon (Nominatim free API)
  → Node: insert farms table with all data
  → Node: set users.profile_completed = TRUE
  → Node: call Django POST /api/analysis/full-pipeline/
           { farm_id, soil, weather_needed: true }
  → Django: fetch weather, run all 5 AI modules, return results
  → Node: save results to ai_analysis_results table
  → Node: save suggestions to ai_suggestions table
  → Returns { farm, analysis }

React: redirects to /dashboard
```

### 2. Dashboard Load
```
React loads /dashboard
  → GET /api/auth/me          → user + profile_completed status
  → if profile_completed = FALSE → redirect to /onboarding

  → GET /api/weather/forecast  → 7-day weather
  → GET /api/alerts            → active alerts
  → GET /api/analysis/latest   → latest AI results
  → GET /api/suggestions       → today's suggestions

  React renders:
  ├── Weather widget (7-day forecast)
  ├── Alert cards (red/orange/green)
  ├── Crop recommendation card
  ├── Fertilizer tip card
  ├── Irrigation schedule card
  ├── Yield + profit estimate card
  └── Farm profile summary
```

### 3. Daily 7AM Cron Job
```
node-cron fires at 07:00 every day
  → Get all farms where profile_completed = TRUE
  → For each farm:
      a. Call Django: POST /api/weather/check-alerts/
         → Node saves new alerts to alerts table
      b. Call Django: POST /api/analysis/full-pipeline/
         → Node saves updated analysis to ai_analysis_results
      c. Node sends email/SMS notifications
      d. Node emits Socket.io event to online users
```

### 4. Profile Page
```
React: GET /api/farm/profile
Returns:
{
  personal: { name, phone, email },
  location: { state, district, taluka, village, pincode, lat, lon },
  farm: { farm_name, area, area_unit, soil_type, irrigation_type, water_source },
  soil: { N, P, K, pH },
  current: { crop, sow_date, season, crop_stage },
  stats: { total_alerts, last_ai_run, member_since }
}
```

### 5. Profile Completion Guard
```javascript
// Node.js middleware for protected AI routes
const requireProfileComplete = async (req, res, next) => {
  const farm = await pool.query(
    'SELECT profile_completed FROM users WHERE id = $1',
    [req.user.id]
  );
  if (!farm.rows[0].profile_completed) {
    return res.status(403).json({
      error: 'Please complete your farm profile first',
      redirect: '/onboarding'
    });
  }
  next();
};

// Apply to all AI routes
router.get('/analysis/latest', requireProfileComplete, getLatestAnalysis);
router.get('/suggestions', requireProfileComplete, getSuggestions);
router.post('/crops/compare', requireProfileComplete, compareCrops);
```

---

## 🤖 AI Ecosystem (5 Modules Connected)

```
Farm Profile Data
      +
Weather (Open-Meteo)
      │
      ▼
[1] Crop Recommendation (Random Forest)
      │ → top_crop, season, suitability_score
      ▼
[2] Fertilizer Recommendation (Random Forest)
      │ → fertilizer_name, quantity, timing
      ▼
[3] Irrigation Recommendation (Random Forest)
      │ → need (Low/Medium/High), amount, frequency
      ▼
[4] Yield Prediction (XGBoost)
      │ → yield_per_acre, total_yield
      ▼
[5] Price Lookup + Profit Calculator
      │ → market_price, gross_revenue, net_profit, ROI
      ▼
Complete Farming Plan (saved to ai_analysis_results)
```

### Weather Strategy:
| Model | Weather Source | Why |
|---|---|---|
| Crop Recommendation | Historical seasonal average | Crops grow over months |
| Yield Prediction | Historical annual total rainfall | Full season data |
| Fertilizer | 16-day forecast | Short-term timing decisions |
| Irrigation | 16-day forecast + soil moisture | Real-time water need |
| Alerts | 16-day forecast | Immediate danger warnings |

---

## ✅ Build Phases & Current Progress

### Phase 1 — Django Setup ✅ COMPLETE
- [x] Django project created
- [x] 4 apps created (accounts, weather, crops, suggestions)
- [x] settings.py configured
- [x] urls.py in all apps
- [x] middleware.py (X-Internal-Key protection)
- [x] PostgreSQL connected (postgres superuser)
- [x] Default Django migrations applied

### Phase 2 — Django Models & Node Schema ⬅️ CURRENT
- [ ] crops/models.py — Crop, MarketPrice
- [ ] weather/models.py — WeatherCache
- [ ] Run makemigrations + migrate for all apps
- [ ] Register in admin.py
- [ ] Create Django superuser
- [ ] Run schema.sql in pgAdmin (creates all 8 Node.js tables)
- [ ] Verify all tables in pgAdmin

### Phase 3 — Django AI Services & Views
- [ ] weather/services/open_meteo.py
- [ ] weather/services/alert_engine.py
- [ ] weather/views.py + urls.py
- [ ] suggestions/services/ai_pipeline.py (main orchestrator)
- [ ] suggestions/services/crop_recommender.py
- [ ] suggestions/services/fertilizer_service.py
- [ ] suggestions/services/irrigation_service.py
- [ ] suggestions/services/yield_predictor.py
- [ ] suggestions/services/price_service.py
- [ ] suggestions/views.py + urls.py
- [ ] crops/views.py + urls.py

### Phase 4 — ML Model Training
- [ ] Download all 5 datasets → put in ai-engine/data/datasets/
- [ ] train_crop_suitability.py → crop_suitability.pkl
- [ ] train_yield_predictor.py → yield_predictor.pkl
- [ ] train_fertilizer_recommender.py → fertilizer_recommender.pkl
- [ ] train_irrigation_recommender.py → irrigation_recommender.pkl
- [ ] build_price_lookup.py → price_lookup.json

### Phase 5 — Node.js Setup
- [ ] config/db.js — PostgreSQL pool
- [ ] index.js — Express + CORS + Socket.io
- [ ] middleware/auth.js — JWT verify
- [ ] services/geocoder.js — address → lat/lon (Nominatim)
- [ ] routes/auth.js — register, login, me
- [ ] routes/farm.js — setup, profile, update, profile-status
- [ ] routes/fields.js
- [ ] routes/weather.js
- [ ] routes/alerts.js
- [ ] routes/analysis.js — latest results + manual trigger
- [ ] routes/suggestions.js
- [ ] routes/crops.js
- [ ] routes/notifications.js

### Phase 6 — Integration
- [ ] services/aiEngineClient.js
- [ ] Farm setup → trigger Django pipeline → save results
- [ ] services/scheduler.js — daily 7AM cron
- [ ] services/notifier.js — email + SMS
- [ ] Socket.io real-time alerts
- [ ] Profile completion guard middleware
- [ ] End-to-end Postman testing

### Phase 7 — React Frontend
- [ ] Vite + React + Tailwind setup
- [ ] AuthContext + SocketContext
- [ ] Landing, Login, Register pages
- [ ] Onboarding wizard (3 steps — location, farm, soil)
- [ ] Dashboard with all widgets
- [ ] Weather & Alerts page
- [ ] AI Suggestions page
- [ ] Crop Comparison page
- [ ] Farm Profile page (view all profile data)
- [ ] Settings page

### Phase 8 — Deploy
- [ ] Vercel (React)
- [ ] Render (Node.js + Django)
- [ ] Supabase or Render (PostgreSQL)

---

## 💡 Important Notes for New Chat

1. **Do not suggest MongoDB** — PostgreSQL only
2. **Do not suggest FastAPI** — Django + DRF only
3. **Do not suggest Streamlit** — React frontend
4. **Architecture is FINAL** — Node owns app data, Django is pure AI
5. **Profile must be completed before any AI feature works**
6. **district and pincode are required fields in farm profile**
7. **Geocoding**: Nominatim (OpenStreetMap) — free, no API key
8. **Weather**: Open-Meteo — free, no API key
9. **OS**: Windows development environment
10. **Current phase**: Phase 2 — Django models + Node schema
11. **venv**: ai-engine/venv/ (separate from server/)
12. **Price forecasting**: NOT Prophet — use price_lookup.json (only 7 days of data available)
13. **AI pipeline**: All 5 modules chain together, triggered on profile setup and daily at 7AM
14. **Crop overlap problem**: Only Cotton, Maize, Rice in all datasets — use crop_mapping.py for others
