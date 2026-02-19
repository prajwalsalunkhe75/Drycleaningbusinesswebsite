import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken'; // <-- NEW: Security Package

import Order from './db/OrderSchema.js';
import WorkerLog from './db/LogSchema.js';
import Customer from './db/CustomerSchema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// ==================================================
// 1. PUBLIC ROUTES (UNLOCKED)
// ==================================================

// --- NEW: SECURE LOGIN ROUTE ---
// --- BULLETPROOF LOGIN ROUTE ---
app.post('/api/login', (req, res) => {
    try {
        // Force them to be strings, and .trim() removes spaces AND hidden \r characters
        const clientUser = String(req.body.username || '').trim();
        const clientPass = String(req.body.password || '').trim();
        
        const envUser = String(process.env.ADMIN_USER || '').trim();
        const envPass = String(process.env.ADMIN_PASS || '').trim();
        
        // If JWT_SECRET is missing from .env, use a temporary one so it doesn't crash
        const secret = process.env.JWT_SECRET || 'temporary_secret_key';

        // REPLACE the strict debug block with this:
console.log(`🔑 Login attempt for user: ${clientUser} at ${new Date().toISOString()}`);

        if (clientUser === envUser && clientPass === envPass) {
            console.log("✅ MATCH SUCCESS! Generating token...");
            const token = jwt.sign({ id: clientUser }, secret, { expiresIn: '24h' });
            return res.json({ success: true, token });
        } else {
            console.log("❌ MATCH FAILED!");
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error("🚨 Server Crash during login:", error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});
// ==================================================
// 2. SECURITY "BOUNCER" (LOCKS EVERYTHING BELOW)
// ==================================================
const authenticateToken = (req, res, next) => {
    // Look for the token in the request headers
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

    if (!token) {
        return res.status(401).json({ message: 'Access Denied: No Token Provided' });
    }

    // Verify the token is real and hasn't expired
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid or Expired Token' });
        req.user = user;
        next(); // Let them through!
    });
};

// Apply the lock to ALL /api routes from this point downward
app.use('/api', authenticateToken);


// ==================================================
// 3. PROTECTED API ROUTES (NOW SECURE!)
// ==================================================

// --- ORDER ROUTES ---
app.get('/api/orders', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ message: 'Database not connected' });
        }
        const orders = await Order.find().sort({ date: -1 });
        res.json(orders);
    } catch (err) { 
        console.error('Error fetching orders:', err);
        res.status(500).json({ message: err.message }); 
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ message: 'Database not connected' });
        }
        const newOrder = new Order(req.body);
        const savedOrder = await newOrder.save();
        res.status(201).json(savedOrder);
    } catch (err) { 
        console.error('Error creating order:', err);
        res.status(400).json({ message: err.message }); 
    }
});

app.patch('/api/orders/:id', async (req, res) => {
    try {
        const updatedOrder = await Order.findOneAndUpdate(
            { id: req.params.id }, 
            { $set: req.body }, 
            { new: true }
        );
        res.json(updatedOrder);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/orders/:id', async (req, res) => {
    try {
        await Order.findOneAndDelete({ id: req.params.id });
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- WORKER LOG ROUTES ---
app.get('/api/worker-logs', async (req, res) => {
    try {
        const logs = await WorkerLog.find().sort({ date: -1 });
        res.json(logs);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/worker-logs', async (req, res) => {
    try {
        const newLog = new WorkerLog(req.body);
        const savedLog = await newLog.save();
        res.status(201).json(savedLog);
    } catch (err) { res.status(400).json({ message: err.message }); }
});

app.delete('/api/worker-logs/:id', async (req, res) => {
    try {
        await WorkerLog.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- CUSTOMER ROUTES ---
app.get('/api/customers', async (req, res) => {
    try {
        const customers = await Customer.find();
        res.json(customers);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/customers', async (req, res) => {
    const customer = new Customer(req.body);
    try {
        const newCustomer = await customer.save();
        res.status(201).json(newCustomer);
    } catch (err) { 
        res.status(400).json({ message: err.message }); 
    }
});

app.patch('/api/customers/:id', async (req, res) => {
    try {
        const updatedCustomer = await Customer.findOneAndUpdate(
            { id: req.params.id }, 
            { $set: req.body }, 
            { new: true }
        );
        res.json(updatedCustomer);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/customers/:id', async (req, res) => {
    try {
        await Customer.findOneAndDelete({ id: req.params.id });
        res.json({ message: "Customer Deleted" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ==================================================
// 4. SERVE FRONTEND
// ==================================================
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.json({ 
            message: 'API Server Running', 
            note: 'Frontend is served by Vite dev server on port 5173' 
        });
    });
}

// --- DATABASE CONNECTION & SERVER START ---
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/laundryDB');
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        return true;
    } catch (error) {
        console.error(`❌ DB Error: ${error.message}`);
        return false;
    }
};

const startServer = async () => {
    const dbConnected = await connectDB();
    if (!dbConnected) {
        console.error('❌ Failed to connect to database. Server will not start.');
        process.exit(1);
    }
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
        if (process.env.NODE_ENV !== 'production') {
            console.log(`📱 Frontend dev server: http://localhost:5173`);
        }
    });
};

startServer();