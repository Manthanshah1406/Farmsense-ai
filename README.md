# 🌾 FarmSense AI
### Smart Farming Assistant — Weather Alerts + AI Suggestions + Crop Profit Comparison

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

---

## 📌 About The Project

FarmSense AI is a full-stack smart farming assistant that helps Indian farmers make better decisions using AI, machine learning, and real-time weather data.

### 🔑 Key Features
- 🌦️ **Smart Weather Alerts** — Real-time alerts for rain, heatwave, frost, fungal risk
- 🤖 **AI Suggestions** — Irrigation, fertilizer, pest risk, and harvest window recommendations
- 💰 **Crop Profit Comparison** — Compare crops side by side with profit estimates based on your land size, soil, and weather
- 🔔 **Real-time Notifications** — Email, SMS, and live push notifications via Socket.io
- 📊 **Farm Dashboard** — Complete farm management with field tracking

---

## 🏗️ Project Architecture

```
farmsense-ai/
│
├── client/          # ⚛️  React.js Frontend (Vite + Tailwind)
├── server/          # 🟢  Node.js + Express (Auth, Farm, DB, Notifications)
├── ai-engine/       # 🐍  Django + DRF + ML (Pure AI/ML — no app DB writes)
└── README.md
```

### How They Connect
```
React (port 5173)
    │  axios + JWT
    ▼
Node.js (port 5000)  ──── PostgreSQL (port 5432)
    │  internal HTTP           (Node owns all app tables)
    │  + secret key
    ▼
Django (port 8000)
    │  Pure AI/ML Service
    │  (owns only: crops, market_prices, weather_cache)
    └──── PostgreSQL (same DB, only reads crop/weather data)
```

### Key Architecture Decisions
- **React** only calls **Node.js** — never Django directly
- **Node.js** is the single source of truth for all application data
- **Node.js** owns and manages all application tables in PostgreSQL
- **Django** is a pure AI/ML service — receives data from Node, returns predictions
- **Django** only owns 3 reference tables: `crops`, `market_prices`, `weather_cache`
- **Django** never writes to application tables (users, farms, alerts etc.)

---

## 🗄️ Database Ownership

### Django Owns (reference/ML data):
```
crops                    — Crop master data for ML models
market_prices            — Crop market prices by state/district
weather_cache            — Cached Open-Meteo API responses
```

### Node.js Owns (application data):
```
users                    — Farmer accounts & auth
farms                    — Farm details (soil, location, land size)
fields                   — Individual fields within a farm
alerts                   — Generated weather alerts
ai_suggestions           — AI-generated farming suggestions
crop_comparison_results  — Saved crop comparison results
notification_preferences — Per-user notification settings
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, Vite, Tailwind CSS, Recharts, Socket.io-client |
| App Backend | Node.js, Express.js, JWT, node-cron, Nodemailer, Socket.io |
| AI Backend | Django, Django REST Framework, scikit-learn, XGBoost, Prophet, pandas |
| Database | PostgreSQL (Node owns app tables, Django owns reference tables) |
| Weather API | Open-Meteo (free, no API key required) |
| Notifications | Nodemailer (email) + Twilio (SMS) |
| ML Models | Random Forest (crop suitability), XGBoost (yield prediction) |

---

## ⚙️ Prerequisites

Make sure you have these installed:

- [Node.js v18+](https://nodejs.org/)
- [Python 3.10+](https://python.org/)
- [PostgreSQL 15+](https://postgresql.org/)
- [pgAdmin 4](https://pgadmin.org/) — GUI for PostgreSQL
- [Git](https://git-scm.com/)
- [Postman](https://postman.com/) — for API testing

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/farmsense-ai.git
cd farmsense-ai
```

### 2. PostgreSQL Database Setup
Open pgAdmin → Query Tool and run:
```sql
CREATE DATABASE farmsense;
```
> Use the `postgres` superuser for full permissions (recommended for development).

---

### 3. Django AI Engine Setup

```bash
cd ai-engine

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run migrations (creates only Django's 3 tables)
python manage.py makemigrations crops
python manage.py makemigrations weather
python manage.py makemigrations accounts
python manage.py makemigrations suggestions
python manage.py migrate

# Create Django admin superuser
python manage.py createsuperuser

# Load initial crop data
python manage.py loaddata data/crops.json

# Train ML models
python ml_models/train_crop_suitability.py
python ml_models/train_yield_predictor.py

# Start Django server
python manage.py runserver 8000
```

---

### 4. Node.js Server Setup

```bash
cd server

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your credentials

# Create Node.js application tables in PostgreSQL
# Open pgAdmin → farmsense DB → Query Tool → run server/db/schema.sql

# Start Node.js server
npm run dev
```

---

### 5. React Frontend Setup (After Backend is Done)

```bash
cd client

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Start React dev server
npm run dev
```

---

## 🌐 API Endpoints

### Node.js Endpoints (Public — called by React)

#### Auth
```
POST   /api/auth/register         Register new farmer
POST   /api/auth/login            Login and get JWT token
GET    /api/auth/me               Get current farmer profile
```

#### Farm Management
```
POST   /api/farm/create           Create farm profile
GET    /api/farm/me               Get my farm details
PUT    /api/farm/update/:id       Update farm details

POST   /api/farm/:id/fields       Add a field to farm
GET    /api/farm/:id/fields       Get all fields of a farm
PUT    /api/fields/update/:id     Update field details
DELETE /api/fields/delete/:id     Delete a field
```

#### Alerts & Suggestions
```
GET    /api/alerts?farm_id=x      Get active alerts
PUT    /api/alerts/:id/read       Mark alert as read
GET    /api/alerts/history        Get past alerts

GET    /api/suggestions?farm_id=x Get AI suggestions (Node fetches from Django, saves to DB)
POST   /api/crops/compare         Compare crops (Node forwards to Django ML, saves result)
GET    /api/weather/forecast      Get weather forecast (Node fetches from Django)
```

#### Settings
```
PUT    /api/notifications/prefs   Update notification preferences
```

---

### Django Endpoints (Internal — called by Node.js only, protected by secret key)

#### Weather
```
GET    /api/weather/forecast/         Fetch & return 7-day forecast (no DB write)
POST   /api/weather/check-alerts/     Analyze weather → return alert list (no DB write)
```

#### Crops & ML
```
GET    /api/crops/list/               List all crops from DB
POST   /api/crops/compare/            ML crop comparison → return results (no DB write)
GET    /api/crops/market-prices/      Get market prices from DB
```

#### AI Suggestions
```
POST   /api/suggestions/generate/     Run AI logic → return suggestions (no DB write)
```

> ⚠️ Django endpoints never write to application tables.
> Node.js receives Django's response and saves it to PostgreSQL.

---

## 🤖 ML Models

| Feature | Model | Dataset | Expected Performance |
|---|---|---|---|
| 🌾 Crop Recommendation | Random Forest Classifier | Kaggle Crop Recommendation | ~95% accuracy |
| 📈 Yield Prediction | XGBoost Regressor | Kaggle Crop Yield / data.gov.in | R² ~0.85 |
| 🧪 Fertilizer Recommendation | Random Forest Classifier | Kaggle Fertilizer Prediction | ~92% accuracy |
| 💧 Irrigation Recommendation | Random Forest Classifier | Kaggle Irrigation Prediction | ~90% accuracy |
| 📊 Price Forecasting | Prophet | Kaggle Agricultural Commodity Prices | 30/60/90 day forecast |
| ⚠️ Weather Alerts | Rule-based Engine | Open-Meteo live data | No training needed |

---

## 🔄 How a Request Works (Example: Crop Comparison)

```
1. Farmer clicks "Compare Crops" in React

2. React → POST /api/crops/compare (Node.js)
   Body: { farm_id, season, crop_ids[] }
   Header: Authorization: Bearer <jwt>

3. Node.js:
   - Verifies JWT
   - Gets farm soil/location data from PostgreSQL
   - Calls Django internally:
     POST /api/crops/compare/
     Body: { soil, weather, crops, land_size }
     Header: X-Internal-Key: secret

4. Django:
   - Verifies internal key
   - Fetches weather from Open-Meteo
   - Loads ML model (.pkl)
   - Calculates profit & suitability scores
   - Returns JSON result (does NOT save to DB)

5. Node.js:
   - Receives Django result
   - Saves result to crop_comparison_results table
   - Returns result to React

6. React displays comparison table + charts
```

---

## 📁 Environment Variables

### server/.env
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=farmsense
DB_USER=postgres
DB_PASSWORD=yourpostgrespassword
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
DJANGO_URL=http://localhost:8000
DJANGO_INTERNAL_KEY=farmsense_internal_secret_2024
EMAIL_USER=yourgmail@gmail.com
EMAIL_PASS=your_gmail_app_password
TWILIO_SID=your_twilio_sid
TWILIO_TOKEN=your_twilio_token
TWILIO_PHONE=+1234567890
```

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
```

---

## 👥 Team & Roles

| Role | Responsibility |
|---|---|
| Frontend Developer | React.js, UI/UX, Recharts, Socket.io client |
| Node.js Developer | Express, JWT, PostgreSQL schema, Cron, Nodemailer |
| Django/ML Developer | Django DRF, ML models, Weather API, AI logic |

---

## 📅 Development Timeline

| Week | Tasks |
|---|---|
| Week 1 | Django setup + 3 models (crops, market_prices, weather_cache) + Node.js auth + farm routes + PostgreSQL schema |
| Week 2 | ML model training + Django AI endpoints (pure functions, no DB writes) + alert engine |
| Week 3 | Node ↔ Django connection + Node saves AI results to DB + cron job + email/SMS notifications |
| Week 4 | React frontend + connect to Node.js API + UI polish + deployment |

---

## 🚀 Deployment

| Service | Platform | Free Tier |
|---|---|---|
| React Frontend | Vercel | ✅ Free |
| Node.js Backend | Render | ✅ Free |
| Django AI Engine | Render | ✅ Free |
| PostgreSQL | Render / Supabase | ✅ Free |

---

## 📜 License

This project is built for educational purposes as a college group project.

---

## 🙏 Acknowledgements

- [Open-Meteo](https://open-meteo.com/) — Free weather API (no API key needed)
- [Kaggle](https://kaggle.com/) — Crop recommendation dataset
- [data.gov.in](https://data.gov.in/) — Indian agriculture datasets
- [Agmarknet](https://agmarknet.gov.in/) — Crop market prices
