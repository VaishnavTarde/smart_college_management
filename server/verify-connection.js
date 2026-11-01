const mongoose = require('mongoose');

// Option 1: The standard string we constructed
const uri1 = "mongodb://vaishnavtarde_db_user:uqFLFzkD53yX00aH@ac-rvh9eew-shard-00-00.swxktqf.mongodb.net:27017,ac-rvh9eew-shard-00-01.swxktqf.mongodb.net:27017,ac-rvh9eew-shard-00-02.swxktqf.mongodb.net:27017/?ssl=true&replicaSet=atlas-rvh9eew-shard-0&authSource=admin&appName=Cluster0";

// Option 2: Direct connection to primary (guessing 00-00, trying all eventually if loop needed)
const uri2 = "mongodb://vaishnavtarde_db_user:uqFLFzkD53yX00aH@ac-rvh9eew-shard-00-00.swxktqf.mongodb.net:27017/?ssl=true&authSource=admin &directConnection=true";

async function testConnection(uri, name) {
    console.log(`\nTesting ${name}...`);
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log(`Success! Connected using ${name}`);
        await mongoose.disconnect();
    } catch (err) {
        console.error(`Failed ${name}:`, err.message);
        if (err.reason) console.error("Reason:", err.reason);
    }
}

async function run() {
    await testConnection(uri1, "Standard Replica Set URI");
    await testConnection(uri2, "Direct Connection URI");
    console.log("Done.");
}

run();
