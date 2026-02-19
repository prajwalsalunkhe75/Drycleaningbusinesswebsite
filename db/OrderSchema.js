import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
    // CHANGE: Type is now String to allow "IRN-1234"
    id: { type: String, required: true, unique: true }, 
    
    customerName: { type: String, required: true },
    phone: { type: String },
    
    // Items array stores what they bought
    items: [{
        type: { type: String }, // e.g., "Shirt"
        qty: { type: Number },
        price: { type: Number }
    }],

    totalAmount: { type: Number, required: true },
    
    paymentStatus: { type: String, default: 'Unpaid' }, // Paid / Unpaid
    status: { type: String, default: 'Pending' },       // Pending / Delivered
    
    origin: { type: String, default: 'dashboard' },     // 'dashboard' or 'ledger'
    date: { type: Date, default: Date.now }
});

export default mongoose.model('Order', OrderSchema);