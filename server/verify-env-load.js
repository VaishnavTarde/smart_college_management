require('dotenv').config();
const mongoose = require('mongoose');

console.log("Loaded URI from .env:", process.env.MONGO_URI);

// Mask the password for log safety if needed, but here we just want to see if it matches.
// We can check if it contains the directConnection param
if (process.env.MONGO_URI.includes('directConnection=true')) {
    console.log("URI contains directConnection=true");
} else {
    console.log("WARNING: URI does NOT contain directConnection=true");
}

async function test() {
    console.log("Attempting connection...");
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log("MongoDB Connected Successfully!");
        await mongoose.disconnect();
    } catch (err) {
        console.error("Connection Failed:", err.message);
    }
}

test();
