import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String, required: true }, // Ensure this is String, not Number
    address: { type: String, default: '' },
    
    // The Ledger: Stores every pickup/delivery
    transactions: [{
        date: { type: Date, default: Date.now },
        summary: { type: String },
        amount: { type: Number },
        type: { type: String }
    }],

    totalDue: { type: Number, default: 0 },
    status: { type: String, default: 'Active' }
});

export default mongoose.model('Customer', CustomerSchema);