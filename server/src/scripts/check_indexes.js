const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const checkIndexes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const collection = mongoose.connection.collection('discussions');
        const indexes = await collection.indexes();

        const outputPath = path.join(__dirname, 'index_info.txt');
        fs.writeFileSync(outputPath, JSON.stringify(indexes, null, 2));

        console.log('Indexes written to index_info.txt');

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkIndexes();
