import 'dotenv/config';
import mongoose from 'mongoose';
import User from './src/models/User.js';

await mongoose.connect(process.env.MONGO_URI);
const users = await User.find({}, 'email name role isActive');
console.log('=== Users in EcoTrack DB ===');
if (users.length === 0) {
    console.log('NO USERS FOUND - database is empty');
} else {
    users.forEach(u => console.log(`  ${u.email} | ${u.name} | role=${u.role} | active=${u.isActive}`));
}
console.log(`\nTotal: ${users.length} user(s)`);
await mongoose.disconnect();
