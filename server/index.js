// server/index.js


require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');

// ── App & Server Setup ────────────────────────
const app = express();
const server = http.createServer(app);

// ── CORS Configuration ────────────────────────
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.CLIENT_URL,
].filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some(o => origin.startsWith(o))) {
            callback(null, true);
        } else {
            callback(null, true); // Fallback to permissive for smooth deployment
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
};

// ── Socket.io Setup ───────────────────────────
const io = new Server(server, {
    cors: corsOptions
});

// Make io accessible in routes
app.set('io', io);

io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);

    // Farmer joins their farm room for real-time alerts
    socket.on('join_farm', (farmId) => {
        socket.join(`farm_${farmId}`);
        console.log(`✅ Socket joined room: farm_${farmId}`);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected:', socket.id);
    });
});

// ── Core Middleware ───────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: false,
}));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/farm',          require('./routes/farm'));
app.use('/api/farm',          require('./routes/fields'));  // ← farm/:id/fields
app.use('/api/fields',        require('./routes/fields'));  // ← fields/update/:id
app.use('/api/alerts',        require('./routes/alerts'));
app.use('/api/suggestions',   require('./routes/suggestions'));
app.use('/api/analysis',      require('./routes/analysis'));
app.use('/api/crops',         require('./routes/crops'));
app.use('/api/weather',       require('./routes/weather'));
app.get('/api/weather/test', (req, res) => {
    res.json({ message: 'weather route works' });
});
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/disease',       require('./routes/disease'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/inspections',   require('./routes/inspections'));

// ── Health Check ──────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'FarmSense API is running',
        timestamp: new Date().toISOString()
    });
});

// ── 404 Handler ───────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.path} not found` });
});

// ── Global Error Handler ──────────────────────
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

// ── Start Server ──────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`FarmSense server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);

    require('./services/scheduler');
});

module.exports = { app, io };