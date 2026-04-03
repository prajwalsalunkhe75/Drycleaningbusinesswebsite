import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

import Order from './db/OrderSchema.js';
import WorkerLog from './db/LogSchema.js';
import Customer from './db/CustomerSchema.js';
import Settings from './db/SettingsSchema.js';
import Worker from './db/WorkerSchema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---

// Configure allowed origins
const getAllowedOrigins = () => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000';
    return allowedOrigins.split(',').map(origin => origin.trim());
};

const corsOptions = {
    origin: function (origin, callback) {
        const allowed = getAllowedOrigins();
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin || allowed.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
    credentials: true
};

app.use(cors(corsOptions));

// Place this right after app.use(express.json())
app.use(express.static(path.join(__dirname, 'dist')));

app.use(express.json());

// Manual Header Fix for ngrok/Mobile Browsers
app.use((req, res, next) => {
    const allowed = getAllowedOrigins();
    const origin = req.headers.origin;
    if (!origin || allowed.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin || '*');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ==================================================
// 1. PUBLIC ROUTES (UNLOCKED)
// ==================================================

app.post('/api/login', (req, res) => {
    try {
        const clientUser = String(req.body.username || '').trim();
        const clientPass = String(req.body.password || '').trim();
        const envUser = String(process.env.ADMIN_USER || '').trim();
        const envPass = String(process.env.ADMIN_PASS || '').trim();
        const secret = process.env.JWT_SECRET || 'temporary_secret_key';

        if (clientUser === envUser && clientPass === envPass) {
            const token = jwt.sign({ id: clientUser }, secret, { expiresIn: '24h' });
            return res.json({ success: true, token });
        } else {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ==================================================
// 2. SECURITY "BOUNCER"
// ==================================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access Denied' });

    const secret = process.env.JWT_SECRET || 'temporary_secret_key';
    jwt.verify(token, secret, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid Token' });
        req.user = user;
        next();
    });
};

// ==================================================
// 3. PROTECTED API ROUTES
// ==================================================

// Apply lock to API routes
app.use('/api/orders', authenticateToken);
app.use('/api/customers', authenticateToken);
app.use('/api/worker-logs', authenticateToken);

app.get('/api/orders', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 10);
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            Order.find().sort({ date: -1 }).skip(skip).limit(limit),
            Order.countDocuments()
        ]);

        res.json({
            data: orders,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: page < Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('GET /api/orders error:', error.message);
        res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        if (!req.body.customerName || !req.body.totalAmount) {
            return res.status(400).json({ message: 'Missing required fields: customerName, totalAmount' });
        }
        const newOrder = new Order(req.body);
        const savedOrder = await newOrder.save();
        res.status(201).json(savedOrder);
    } catch (error) {
        console.error('POST /api/orders error:', error.message);
        const statusCode = error.name === 'ValidationError' ? 400 : 500;
        res.status(statusCode).json({
            message: 'Failed to create order',
            error: error.message,
            details: error.name === 'ValidationError' ? error.errors : undefined
        });
    }
});

app.patch('/api/orders/:id', async (req, res) => {
    try {
        const updatedOrder = await Order.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true });
        res.json(updatedOrder);
    } catch (error) {
        console.error('PATCH /api/orders error:', error.message);
        res.status(500).json({ message: 'Failed to update order' });
    }
});

app.delete('/api/orders/:id', async (req, res) => {
    try {
        await Order.findOneAndDelete({ id: req.params.id });
        res.json({ message: "Deleted" });
    } catch (error) {
        console.error('DELETE /api/orders error:', error.message);
        res.status(500).json({ message: 'Failed to delete order' });
    }
});

app.get('/api/worker-logs', async (req, res) => {
    try {
        const logs = await WorkerLog.find().sort({ date: -1 });
        res.json(logs);
    } catch (error) {
        console.error('GET /api/worker-logs error:', error.message);
        res.status(500).json({ message: 'Failed to fetch worker logs' });
    }
});

app.post('/api/worker-logs', async (req, res) => {
    try {
        const newLog = new WorkerLog(req.body);
        await newLog.save();
        res.status(201).json(newLog);
    } catch (error) {
        console.error('POST /api/worker-logs error:', error.message);
        res.status(500).json({ message: 'Failed to create worker log' });
    }
});

app.get('/api/customers', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 10);
        const skip = (page - 1) * limit;

        const [customers, total] = await Promise.all([
            Customer.find().skip(skip).limit(limit),
            Customer.countDocuments()
        ]);

        res.json({
            data: customers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: page < Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('GET /api/customers error:', error.message);
        res.status(500).json({ message: 'Failed to fetch customers', error: error.message });
    }
});

app.post('/api/customers', async (req, res) => {
    try {
        if (!req.body.name || !req.body.phone) {
            return res.status(400).json({ message: 'Missing required fields: name, phone' });
        }
        const customer = new Customer(req.body);
        await customer.save();
        res.status(201).json(customer);
    } catch (error) {
        console.error('POST /api/customers error:', error.message);
        const statusCode = error.name === 'ValidationError' ? 400 : 500;
        res.status(statusCode).json({
            message: 'Failed to create customer',
            error: error.message,
            details: error.name === 'ValidationError' ? error.errors : undefined
        });
    }
});

app.patch('/api/customers/:id', async (req, res) => {
    try {
        const updatedCustomer = await Customer.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true });
        res.json(updatedCustomer);
    } catch (error) {
        console.error('PATCH /api/customers error:', error.message);
        res.status(500).json({ message: 'Failed to update customer' });
    }
});

app.delete('/api/customers/:id', async (req, res) => {
    try {
        await Order.findOneAndDelete({ id: req.params.id });
        res.json({ message: "Deleted" });
    } catch (error) {
        console.error('DELETE /api/customers error:', error.message);
        res.status(500).json({ message: 'Failed to delete customer' });
    }
});

// ==================================================
// 4. SETTINGS, WORKERS, ANALYTICS & AI API ROUTES
// ==================================================

app.use('/api/settings', authenticateToken);
app.use('/api/workers', authenticateToken);
app.use('/api/ai', authenticateToken);
app.use('/api/analytics', authenticateToken);

// Dashboard Analytics
app.get('/api/analytics', async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const thirtyDaysAgo = new Date(todayStart); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thisWeekStart = new Date(todayStart); thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
        const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        const yearStart = new Date(now.getFullYear(), 0, 1);

        // Run all aggregations in parallel
        const [
            dailyRevenue,
            monthlyRevenue,
            paymentBreakdown,
            topCustomers,
            weekdayPattern,
            todayOrders,
            yesterdayOrders,
            thisWeekOrders,
            lastWeekOrders,
            thisMonthOrders,
            lastMonthOrders,
            yearOrders,
            totalOrders
        ] = await Promise.all([
            // 1. Daily revenue (last 30 days)
            Order.aggregate([
                { $match: { date: { $gte: thirtyDaysAgo } } },
                { $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                    revenue: { $sum: { $cond: [{ $gt: ['$advanceAmount', 0] }, '$advanceAmount', { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$totalAmount', 0] }] } },
                    billed: { $sum: '$totalAmount' },
                    count: { $sum: 1 }
                }},
                { $sort: { _id: 1 } }
            ]),
            // 2. Monthly revenue (last 12 months)
            Order.aggregate([
                { $match: { date: { $gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) } } },
                { $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
                    revenue: { $sum: { $cond: [{ $gt: ['$advanceAmount', 0] }, '$advanceAmount', { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$totalAmount', 0] }] } },
                    billed: { $sum: '$totalAmount' },
                    count: { $sum: 1 }
                }},
                { $sort: { _id: 1 } }
            ]),
            // 3. Payment status breakdown
            Order.aggregate([
                { $group: {
                    _id: '$paymentStatus',
                    count: { $sum: 1 },
                    amount: { $sum: '$totalAmount' }
                }}
            ]),
            // 4. Top 5 customers by spending
            Order.aggregate([
                { $group: {
                    _id: '$customerName',
                    totalSpent: { $sum: '$totalAmount' },
                    orderCount: { $sum: 1 }
                }},
                { $sort: { totalSpent: -1 } },
                { $limit: 5 }
            ]),
            // 5. Orders by day of week
            Order.aggregate([
                { $group: {
                    _id: { $dayOfWeek: '$date' },
                    count: { $sum: 1 },
                    revenue: { $sum: '$totalAmount' }
                }},
                { $sort: { _id: 1 } }
            ]),
            // 6. Today's orders
            Order.aggregate([
                { $match: { date: { $gte: todayStart } } },
                { $group: {
                    _id: null,
                    count: { $sum: 1 },
                    revenue: { $sum: { $cond: [{ $gt: ['$advanceAmount', 0] }, '$advanceAmount', { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$totalAmount', 0] }] } },
                    billed: { $sum: '$totalAmount' },
                    pending: { $sum: { $cond: [{ $ne: ['$status', 'Delivered'] }, 1, 0] } }
                }}
            ]),
            // 7. Yesterday's orders (for comparison)
            Order.aggregate([
                { $match: { date: { $gte: yesterdayStart, $lt: todayStart } } },
                { $group: {
                    _id: null,
                    revenue: { $sum: { $cond: [{ $gt: ['$advanceAmount', 0] }, '$advanceAmount', { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$totalAmount', 0] }] } },
                    count: { $sum: 1 }
                }}
            ]),
            // 8. This week orders
            Order.aggregate([
                { $match: { date: { $gte: thisWeekStart } } },
                { $group: { _id: null, revenue: { $sum: { $cond: [{ $gt: ['$advanceAmount', 0] }, '$advanceAmount', { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$totalAmount', 0] }] } }, count: { $sum: 1 } }}
            ]),
            // 9. Last week orders
            Order.aggregate([
                { $match: { date: { $gte: lastWeekStart, $lt: thisWeekStart } } },
                { $group: { _id: null, revenue: { $sum: { $cond: [{ $gt: ['$advanceAmount', 0] }, '$advanceAmount', { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$totalAmount', 0] }] } }, count: { $sum: 1 } }}
            ]),
            // 10. This month
            Order.aggregate([
                { $match: { date: { $gte: monthStart } } },
                { $group: { _id: null, revenue: { $sum: { $cond: [{ $gt: ['$advanceAmount', 0] }, '$advanceAmount', { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$totalAmount', 0] }] } }, billed: { $sum: '$totalAmount' }, count: { $sum: 1 } }}
            ]),
            // 11. Last month
            Order.aggregate([
                { $match: { date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
                { $group: { _id: null, revenue: { $sum: { $cond: [{ $gt: ['$advanceAmount', 0] }, '$advanceAmount', { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$totalAmount', 0] }] } }, count: { $sum: 1 } }}
            ]),
            // 12. Year total
            Order.aggregate([
                { $match: { date: { $gte: yearStart } } },
                { $group: { _id: null, revenue: { $sum: { $cond: [{ $gt: ['$advanceAmount', 0] }, '$advanceAmount', { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$totalAmount', 0] }] } }, billed: { $sum: '$totalAmount' }, count: { $sum: 1 } }}
            ]),
            // 13. Total all-time orders count
            Order.countDocuments()
        ]);

        const t = todayOrders[0] || { count: 0, revenue: 0, billed: 0, pending: 0 };
        const y = yesterdayOrders[0] || { revenue: 0, count: 0 };
        const tw = thisWeekOrders[0] || { revenue: 0, count: 0 };
        const lw = lastWeekOrders[0] || { revenue: 0, count: 0 };
        const tm = thisMonthOrders[0] || { revenue: 0, billed: 0, count: 0 };
        const lm = lastMonthOrders[0] || { revenue: 0, count: 0 };
        const yr = yearOrders[0] || { revenue: 0, billed: 0, count: 0 };

        // Calculate percentage changes
        const pctChange = (curr, prev) => prev > 0 ? Math.round(((curr - prev) / prev) * 100) : (curr > 0 ? 100 : 0);

        // Day of week mapping
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weekdayData = dayNames.map((name, i) => {
            const found = weekdayPattern.find(w => w._id === i + 1);
            return { day: name, orders: found?.count || 0, revenue: found?.revenue || 0 };
        });

        // Collection rate (overall)
        const totalBilled = yr.billed || 1;
        const totalCollected = yr.revenue || 0;
        const collectionRate = Math.min(100, Math.round((totalCollected / totalBilled) * 100));

        res.json({
            dailyRevenue,
            monthlyRevenue,
            paymentBreakdown: paymentBreakdown.map(p => ({
                status: p._id || 'Unknown',
                count: p.count,
                amount: p.amount
            })),
            topCustomers: topCustomers.map(c => ({
                name: c._id,
                totalSpent: c.totalSpent,
                orders: c.orderCount
            })),
            weekdayPattern: weekdayData,
            today: {
                orders: t.count,
                revenue: t.revenue,
                billed: t.billed,
                pending: t.pending,
                avgOrderValue: t.count > 0 ? Math.round(t.billed / t.count) : 0,
                revenueChange: pctChange(t.revenue, y.revenue),
                ordersChange: pctChange(t.count, y.count)
            },
            thisWeek: {
                revenue: tw.revenue,
                orders: tw.count,
                change: pctChange(tw.revenue, lw.revenue)
            },
            thisMonth: {
                revenue: tm.revenue,
                billed: tm.billed,
                orders: tm.count,
                change: pctChange(tm.revenue, lm.revenue)
            },
            year: {
                revenue: yr.revenue,
                billed: yr.billed,
                orders: yr.count
            },
            collectionRate,
            totalOrders
        });
    } catch (error) {
        console.error('GET /api/analytics error:', error.message);
        res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
    }
});

// AI Voice Parser
app.post('/api/ai/parse-voice', async (req, res) => {
    try {
        const { text, apiKey } = req.body;
        if (!text || !apiKey) {
            return res.status(400).json({ message: 'Missing text or API key' });
        }

        const prompt = `You are an AI parser for a dry cleaning and ironing shop.
Parse the following Indian/Hinglish voice order text into JSON format.
Extract: 
1. Customer names (if any, capitalize it).
2. Phone number (if any).
3. Items (list the item name, quantity, category "Ironing" or "DryClean", and price if explicitly mentioned).

Return ONLY valid JSON like:
{
  "names": ["John"],
  "phone": "9876543210",
  "items": [
    { "name": "shirt", "qty": 2, "category": "Ironing", "price": null },
    { "name": "pant", "qty": 1, "category": "DryClean", "price": 100 }
  ]
}

Voice Text: "${text}"`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' }
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            return res.status(response.status).json({ message: 'LLM Error', details: errData });
        }

        const data = await response.json();
        const jsonText = data.candidates[0].content.parts[0].text;
        const result = JSON.parse(jsonText);

        res.json(result);
    } catch (error) {
        console.error('AI Parse error:', error);
        res.status(500).json({ message: 'Failed to parse voice command', error: error.message });
    }
});

// Get settings (returns global settings doc, or creates defaults)
app.get('/api/settings', async (req, res) => {
    try {
        let settings = await Settings.findOne({ key: 'global' });
        if (!settings) {
            settings = await new Settings({ key: 'global' }).save();
        }
        res.json(settings);
    } catch (error) {
        console.error('GET /api/settings error:', error.message);
        res.status(500).json({ message: 'Failed to fetch settings' });
    }
});

// Save settings (upsert)
app.post('/api/settings', async (req, res) => {
    try {
        const settings = await Settings.findOneAndUpdate(
            { key: 'global' },
            { $set: { ...req.body, updatedAt: new Date() } },
            { new: true, upsert: true }
        );
        res.json(settings);
    } catch (error) {
        console.error('POST /api/settings error:', error.message);
        res.status(500).json({ message: 'Failed to save settings' });
    }
});

// Get all workers
app.get('/api/workers', async (req, res) => {
    try {
        const workers = await Worker.find({ isActive: true }).sort({ createdAt: 1 });
        res.json(workers);
    } catch (error) {
        console.error('GET /api/workers error:', error.message);
        res.status(500).json({ message: 'Failed to fetch workers' });
    }
});

// Add a new worker
app.post('/api/workers', async (req, res) => {
    try {
        const worker = new Worker({ name: req.body.name });
        await worker.save();
        res.status(201).json(worker);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Worker already exists' });
        }
        console.error('POST /api/workers error:', error.message);
        res.status(500).json({ message: 'Failed to add worker' });
    }
});

// Delete a worker (soft delete)
app.delete('/api/workers/:id', async (req, res) => {
    try {
        await Worker.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ message: 'Worker removed' });
    } catch (error) {
        console.error('DELETE /api/workers error:', error.message);
        res.status(500).json({ message: 'Failed to remove worker' });
    }
});

// ==================================================
// 5. SERVE FRONTEND (DIST FOLDER)
// ==================================================

// --- NEAR THE BOTTOM OF server.js ---


// 1. Explicitly serve the 192 icon
app.get('/pwa-192x192.png', (req, res) => {
    res.set('Content-Type', 'image/png');
    res.sendFile(path.join(__dirname, 'dist', 'pwa-192x192.png'));
});

// 2. Explicitly serve the 512 icon
app.get('/pwa-512x512.png', (req, res) => {
    res.set('Content-Type', 'image/png');
    res.sendFile(path.join(__dirname, 'dist', 'pwa-512x512.png'));
});

// 3. Your existing manifest and static routes go BELOW these

app.get('/manifest.webmanifest', (req, res) => {
    res.set('Content-Type', 'application/manifest+json');
    res.sendFile(path.join(__dirname, 'dist', 'manifest.webmanifest'));
});

// Catch-all: serve index.html for all non-API routes (SPA routing)
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- START SERVER ---
const connectDB = async (retries = 5) => {
    const options = {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 2,
        heartbeatFrequencyMS: 10000,
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/laundryDB', options);
            console.log(`✅ MongoDB Connected (attempt ${attempt})`);
            return true;
        } catch (error) {
            console.error(`❌ DB connect attempt ${attempt}/${retries} failed: ${error.message}`);
            if (attempt < retries) {
                const delay = Math.min(attempt * 2000, 10000);
                console.log(`⏳ Retrying in ${delay / 1000}s...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    return false;
};

// Auto-reconnect on disconnect
mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected. Attempting reconnect...');
    setTimeout(() => connectDB(3), 3000);
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected successfully');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
});

// Health check endpoint (public, no auth)
app.get('/api/health', async (req, res) => {
    const dbState = mongoose.connection.readyState;
    const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    res.json({
        status: dbState === 1 ? 'ok' : 'degraded',
        db: states[dbState] || 'unknown',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

const startServer = async () => {
    const dbConnected = await connectDB();
    // Start server even if DB is temporarily down — it will auto-reconnect
    app.listen(PORT, () => {
        console.log(`🚀 Server on http://localhost:${PORT}`);
        if (!dbConnected) console.log('⚠️ Server started without DB — will auto-reconnect');
    });
};

startServer();