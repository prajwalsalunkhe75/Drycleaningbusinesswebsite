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
// 4. SETTINGS, WORKERS & AI API ROUTES
// ==================================================

app.use('/api/settings', authenticateToken);
app.use('/api/workers', authenticateToken);
app.use('/api/ai', authenticateToken);

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
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/laundryDB');
        console.log(`✅ MongoDB Connected`);
        return true;
    } catch (error) {
        console.error(`❌ DB Error: ${error.message}`);
        return false;
    }
};

const startServer = async () => {
    if (await connectDB()) {
        app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
    }
};

startServer();