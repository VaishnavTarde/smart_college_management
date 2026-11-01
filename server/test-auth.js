const mongoose = require('mongoose');

// Direct connection to primary with explicit credentials
const uri = "mongodb://vaishnavtarde_db_user:uqFLFzkD53yX00aH@ac-rvh9eew-shard-00-00.swxktqf.mongodb.net:27017/?ssl=true&authSource=admin&directConnection=true";

async function testConnection() {
    console.log(`\nTesting Direct Connection...`);
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log(`Success! Connected.`);
        await mongoose.disconnect();
    } catch (err) {
        console.log("---------------------------------------------------");
        console.log("CONNECTION ERROR:");
        console.log("Message:", err.message);
        console.log("Code:", err.code);
        console.log("CodeName:", err.codeName);
        console.log("Syscal:", err.syscall); // sometimes useful
        console.log("---------------------------------------------------");
    }
}

testConnection();
