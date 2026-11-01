const mongoose = require('mongoose');

const uri = "mongodb://vaishnavtarde_db_user:uqFLFzkD53yX00aH@ac-rvh9eew-shard-00-00.swxktqf.mongodb.net:27017/?ssl=true&authSource=admin&directConnection=true";

async function checkPrimary() {
    try {
        await mongoose.connect(uri);
        const admin = mongoose.connection.db.admin();
        const status = await admin.command({ isMaster: 1 });
        console.log("IsMaster:", status.ismaster);
        console.log("Primary:", status.primary);
        console.log("SetName:", status.setName);
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkPrimary();
