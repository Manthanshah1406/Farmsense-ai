# 🌾 FarmSense AI

FarmSense AI is an intelligent, full-stack agricultural platform designed to empower farmers with data-driven insights. It leverages Machine Learning, Large Language Models (LLMs), and localized real-time data to provide crop suitability recommendations, yield predictions, automated disease detection, and personalized farm management assistance.

---

## ✨ Core Features

### 🤖 Artificial Intelligence & Machine Learning
- **Crop Suitability Engine:** Uses ML (`scikit-learn`, `xgboost`) to recommend the best crops based on soil composition, current season, and weather forecasts.
- **Yield Prediction:** Forecasts potential crop yields utilizing historical data and advanced predictive models.
- **Disease Detection (Computer Vision):** AI-powered image analysis allows farmers to upload photos of their crops to detect diseases and receive actionable treatment suggestions.
- **AI Agricultural Assistant (RAG):** Uses Langchain and ChromaDB to provide intelligent, context-aware answers to farming queries, referencing agricultural documents and government schemes.

### 🚜 Farm & Field Management
- **Farm Profiling:** Manage details about the farm, soil types, and location.
- **Field Inspections:** Log and track regular field inspections, crop health, and growth stages.
- **Crop Comparison:** Interactive tools to compare different crops based on market value, growth time, and resource requirements.
- **Government Schemes Directory:** Access up-to-date information on agricultural subsidies and government initiatives.

### 🌤 Real-Time Integrations
- **Weather Forecasting:** Live weather tracking and severe weather alerts integrated directly into the dashboard.
- **Automated Alerts:** SMS and Email notifications (via Twilio & Nodemailer) for sudden weather changes, disease outbreak warnings in the region, or pending field inspections.

### 🌍 Accessibility
- **Localization Support:** Multilingual support out-of-the-box, including Hindi (`hi`), designed to be accessible to local farming communities.
- **Responsive UI:** Built with React and Tailwind CSS for a seamless experience on both mobile and desktop devices.

---

## 🏗 Project Architecture & Tech Stack

FarmSense AI follows a microservices-inspired architecture separated into three core domains:

### 1. Client (`/client`)
The user-facing frontend built for speed and responsiveness.
- **Framework:** React 18, Vite
- **Styling:** Tailwind CSS, PostCSS
- **State/Routing:** React Router v6
- **Data Visualization:** Recharts
- **Key Libraries:** `axios`, `socket.io-client`, `i18next` (Localization)

### 2. Node API Server (`/server`)
The main backend orchestrator handling business logic, user data, and real-time events.
- **Framework:** Node.js, Express
- **Database:** PostgreSQL (via `pg`)
- **Authentication:** JWT, bcryptjs, Google OAuth (`google-auth-library`)
- **Communication:** Socket.io (WebSockets)
- **Notifications:** Twilio (SMS), Nodemailer (Emails)
- **Utilities:** `multer` (file uploads), `pdfkit` (report generation), `node-cron` (scheduled tasks)

### 3. AI Engine (`/ai-engine`)
A dedicated Python backend optimized for running heavy computations, machine learning inferences, and AI workflows.
- **Framework:** Python 3.10+, Django 5, Django REST Framework
- **Machine Learning:** `scikit-learn`, `xgboost`, `pandas`, `numpy`
- **GenAI / RAG:** `langchain`, `langchain-groq`, `chromadb`, `sentence-transformers`, `pypdf`
- **Modules:** `crops`, `weather`, `disease`, `predictions`, `suggestions`

---

## 🚀 Getting Started

### Prerequisites
Before running the project, ensure you have the following installed:
- **Node.js** (v18.x or higher)
- **Python** (v3.10 or higher)
- **PostgreSQL** (Running locally or remotely)
- (Optional) API Keys for Twilio, Google OAuth, Open-Meteo, and Groq/LLM services configured in `.env` files.

### 🛠️ One-Click Installation

We provide an automated batch script for Windows to set up the entire workspace. This script will install dependencies across all three applications, run database migrations, load initial data, and pre-train the ML models.

From the root directory, run:
```bat
install.bat
```
*Note: This process may take a few minutes as it downloads pip/npm packages and trains the Scikit-learn/XGBoost models.*

### 🏃‍♂️ Running the Platform

Once installed, you can launch all three servers concurrently using the provided start script:

```bat
start.bat
```

This will open separate command prompts and start:
- **Client (React):** `http://localhost:5173`
- **Server (Node):** `http://localhost:5000`
- **AI Engine (Django):** `http://localhost:8000`

---

## 📁 Directory Structure
```text
FarmSense-ai/
├── client/           # React frontend
│   ├── src/          # Components, pages, hooks, context, i18n
│   └── package.json  
├── server/           # Express backend API
│   ├── controllers/  # API logic
│   ├── routes/       # API endpoints (auth, alerts, crops, disease, farm)
│   ├── services/     # Third-party integrations (Email, Twilio)
│   └── package.json
└── ai-engine/        # Django AI Microservice
    ├── ai/           # RAG and Vision modules
    ├── ml_models/    # Training scripts and joblib models
    ├── crops/        # Crop suitability logic
    └── requirements.txt
```
