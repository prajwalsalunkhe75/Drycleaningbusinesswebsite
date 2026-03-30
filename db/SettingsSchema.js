import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, default: 'global' },

    // Customer price list
    regular: {
        shirt: { type: Number, default: 8 },
        pant: { type: Number, default: 8 },
        saree: { type: Number, default: 120 },
        blazer: { type: Number, default: 120 },
        bedsheet: { type: Number, default: 30 },
    },

    // Home delivery rates
    home: {
        shirt: { type: Number, default: 15 },
        pant: { type: Number, default: 15 },
        saree: { type: Number, default: 150 },
        blazer: { type: Number, default: 150 },
        bedsheet: { type: Number, default: 40 },
    },

    // Worker wages per piece
    wages: {
        shirt: { type: Number, default: 3.5 },
        pant: { type: Number, default: 3.5 },
        saree: { type: Number, default: 10 },
        blazer: { type: Number, default: 20 },
        bedsheet: { type: Number, default: 5 },
    },

    // Shop profile
    shopName: { type: String, default: "Angel's Dry Cleaners" },
    shopAddress: { type: String, default: 'Shop No. 4, MG Road, Pune' },

    // Integrations
    geminiApiKey: { type: String, default: '' },
    voiceLanguage: { type: String, default: 'en-IN' },
    cloudinaryCloudName: { type: String, default: '' },
    cloudinaryPreset: { type: String, default: '' },

    updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Settings', SettingsSchema);
