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

// ── Socket.io Setup ───────────────────────────
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',   // React dev URL
        methods: ['GET', 'POST'],
        credentials: true,
    }
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
app.use(helmet());
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/farm',          require('./routes/farm'));
app.use('/api/fields',        require('./routes/fields'));
app.use('/api/alerts',        require('./routes/alerts'));
app.use('/api/suggestions',   require('./routes/suggestions'));
app.use('/api/analysis',      require('./routes/analysis'));
app.use('/api/crops',         require('./routes/crops'));
app.use('/api/weather',       require('./routes/weather'));
app.use('/api/notifications', require('./routes/notifications'));

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
});

module.exports = { app, io };