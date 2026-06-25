# 🌾 FarmSense AI
### Smart Farming Assistant — Weather Alerts + AI Suggestions + Crop Profit Comparison

![Tech Stack](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
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
├── server/          # 🟢  Node.js + Express (Auth, Farm, Notifications)
├── ai-engine/       # 🐍  Django + DRF + ML (AI, Weather, Crop Logic)
└── README.md
```

### How They Connect
```
React (port 5173)
    │  axios + JWT
    ▼
Node.js (port 5000)  ──── PostgreSQL (port 5432)
    │  internal HTTP + secret key          ▲
    ▼                                      │
Django (port 8000)  ────────────────────────
```

- **React** only calls **Node.js** (never Django directly)
- **Node.js** handles auth, farm data, notifications, scheduling
- **Django** handles all AI/ML tasks, weather processing, crop comparison
- **PostgreSQL** is shared between Node.js and Django

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, Vite, Tailwind CSS, Recharts, Socket.io-client |
| App Backend | Node.js, Express.js, JWT, node-cron, Nodemailer, Socket.io |
| AI Backend | Django, Django REST Framework, scikit-learn, XGBoost, pandas |
| Database | PostgreSQL (shared by both backends) |
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
Open pgAdmin or psql terminal and run:
```sql
CREATE DATABASE farmsense;
CREATE USER farmsense_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE farmsense TO farmsense_user;
```

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

# Run migrations (creates all tables in PostgreSQL)
python manage.py makemigrations
python manage.py migrate

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

GET    /api/suggestions?farm_id=x Get AI suggestions (from Django)
POST   /api/crops/compare         Compare crops (via Django ML)
GET    /api/weather/forecast      Get weather forecast (via Django)
```

#### Settings
```
PUT    /api/notifications/prefs   Update notification preferences
```

---

### Django Endpoints (Internal — called by Node.js only)

#### Weather
```
GET    /api/weather/forecast/         Fetch 7-day forecast
POST   /api/weather/check-alerts/     Generate weather alerts
```

#### Crops & ML
```
GET    /api/crops/list/               List all crops
POST   /api/crops/compare/            ML crop comparison + profit
GET    /api/crops/market-prices/      Get market prices
```

#### AI Suggestions
```
POST   /api/suggestions/generate/     Generate AI suggestions
GET    /api/suggestions/today/        Get today's suggestions
```

---

## 🗄️ Database Schema Overview

```
users                    — Farmer accounts
farms                    — Farm details (soil, location, land size)
fields                   — Individual fields within a farm
crops                    — Crop master data
market_prices            — Crop market prices by region
weather_cache            — Cached weather API responses
alerts                   — Generated weather alerts
ai_suggestions           — AI-generated farming suggestions
crop_comparison_results  — Saved crop comparison results
notification_preferences — Per-user notification settings
```

---

## 🤖 ML Models

| Model | Algorithm | Purpose | Dataset |
|---|---|---|---|
| Crop Suitability | Random Forest | Score how suitable a crop is (0-100%) | Kaggle Crop Recommendation |
| Yield Predictor | XGBoost | Predict yield in quintals/acre | data.gov.in |
| Alert Engine | Rule-based | Generate weather alerts | No training needed |

---

## 📁 Environment Variables

### server/.env
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=farmsense
DB_USER=farmsense_user
DB_PASSWORD=yourpassword
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
DJANGO_URL=http://localhost:8000
DJANGO_INTERNAL_KEY=your_internal_secret
EMAIL_USER=yourgmail@gmail.com
EMAIL_PASS=your_gmail_app_password
TWILIO_SID=your_twilio_sid
TWILIO_TOKEN=your_twilio_token
TWILIO_PHONE=+1234567890
```

### ai-engine/.env
```env
DEBUG=True
DJANGO_SECRET_KEY=your_django_secret
DB_HOST=localhost
DB_PORT=5432
DB_NAME=farmsense
DB_USER=farmsense_user
DB_PASSWORD=yourpassword
INTERNAL_API_KEY=your_internal_secret
OPEN_METEO_URL=https://api.open-meteo.com/v1/forecast
```

---

## 👥 Team & Roles

| Role | Responsibility |
|---|---|
| Frontend Developer | React.js, UI/UX, Recharts, Socket.io client |
| Node.js Developer | Express, JWT, PostgreSQL, Cron, Nodemailer |
| Django/ML Developer | Django DRF, ML models, Weather API, AI logic |

---

## 📅 Development Timeline

| Week | Tasks |
|---|---|
| Week 1 | Django setup + models + migrations + Node.js auth + farm routes |
| Week 2 | ML model training + Django AI endpoints + alert engine |
| Week 3 | Node ↔ Django connection + cron job + notifications + full backend testing |
| Week 4 | React frontend + connect to backend + UI polish + deployment |

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

- [Open-Meteo](https://open-meteo.com/) — Free weather API
- [Kaggle](https://kaggle.com/) — Crop recommendation dataset
- [data.gov.in](https://data.gov.in/) — Indian agriculture datasets
- [Agmarknet](https://agmarknet.gov.in/) — Crop market prices