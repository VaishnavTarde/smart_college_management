const dotenv = require('dotenv');
dotenv.config();
const { sendWelcomeEmail } = require('./src/services/emailService');

async function test() {
    console.log("Testing email credentials...");
    console.log("USER:", process.env.EMAIL_USER);
    // Don't log full pass for security, just length
    console.log("PASS Length:", process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);
    
    // Test sending to self
    const result = await sendWelcomeEmail(process.env.EMAIL_USER, 'Test User');
    console.log("Email Result:", result);
}
test();
