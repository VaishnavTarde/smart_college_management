require('dotenv').config();
const nodemailer = require('nodemailer');

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

console.log('Checking email configuration...');
console.log('EMAIL_USER set:', !!emailUser);
console.log('EMAIL_PASS set:', !!emailPass);

if (!emailUser || !emailPass) {
    console.error('Missing EMAIL_USER or EMAIL_PASS in .env');
    process.exit(1);
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: emailUser,
        pass: emailPass
    }
});

const mailOptions = {
    from: emailUser,
    to: emailUser, // Send to self
    subject: 'Test Email from Debug Script',
    text: 'If you receive this, email sending is working correctly.'
};

console.log('Attempting to send test email to:', emailUser);

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.error('Error sending email:', error);
    } else {
        console.log('Email sent successfully:', info.response);
    }
});
