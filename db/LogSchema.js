import mongoose from 'mongoose';

const WorkerLogSchema = new mongoose.Schema({
    worker: { type: String, required: true },
    customer: { type: String, required: true },
    desc: { type: String },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now }
});

// THIS LINE IS CRITICAL. DO NOT DELETE.
export default mongoose.model('WorkerLog', WorkerLogSchema);