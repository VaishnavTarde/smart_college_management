const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const dropIndex = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const collection = mongoose.connection.collection('discussions');

        // The index name we found earlier is 'createdAt_1'
        const indexName = 'createdAt_1';

        try {
            await collection.dropIndex(indexName);
            console.log(`Index '${indexName}' dropped successfully.`);
        } catch (error) {
            if (error.code === 27) {
                console.log(`Index '${indexName}' not found.`);
            } else {
                throw error;
            }
        }

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

dropIndex();
