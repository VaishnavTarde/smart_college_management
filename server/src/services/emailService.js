const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Campus Connect <onboarding@resend.dev>';

const sendEmail = async (to, subject, html) => {
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject,
            html,
        });

        if (error) {
            console.error('Error sending email via Resend:', error);
            return false;
        }

        console.log('Email sent via Resend:', data.id);
        return true;
    } catch (error) {
        console.error('Exception sending email:', error);
        return false;
    }
};

const sendEventReminder = async (email, eventName, daysLeft, type = 'event', details = {}) => {
    const isToday = daysLeft === 0;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const subject = isToday
        ? `🚀 TODAY: ${eventName}`
        : `📅 ${daysLeft} Days to go: ${eventName}`;
    
    // High-quality colors
    const primaryColor = '#1e293b'; // slate-800 
    const accentColor = '#4f46e5';   // indigo-600
    const textColor = '#334155';    // slate-700
    const lightBg = '#f8fafc';       // slate-50

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @media only screen and (max-width: 600px) {
                .container { width: 100% !important; border-radius: 0 !important; }
                .content { padding: 20px !important; }
            }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${lightBg}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${lightBg}; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                        
                        <!-- Header / Branding -->
                        <tr>
                            <td style="background-color: ${primaryColor}; padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -1px;">CAMPUS CONNECT</h1>
                                <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 2px;">University Event Portal</p>
                            </td>
                        </tr>

                        <!-- Banner Section -->
                        <tr>
                            <td style="padding: 40px 40px 0 40px; text-align: center;">
                                <div style="display: inline-block; padding: 6px 16px; background-color: ${accentColor}15; color: ${accentColor}; border-radius: 50px; font-size: 13px; font-weight: 700; margin-bottom: 20px; text-transform: uppercase;">
                                    Upcoming Activity
                                </div>
                                <h2 style="color: #0f172a; margin: 0; font-size: 28px; font-weight: 800; line-height: 1.2;">
                                    ${eventName}
                                </h2>
                                <p style="color: ${textColor}; font-size: 18px; margin-top: 10px;">
                                    Organized by <strong>${details.club || 'Campus Connect'}</strong>
                                </p>
                            </td>
                        </tr>

                        <!-- Content Body -->
                        <tr>
                            <td class="content" style="padding: 40px;">
                                <p style="color: ${textColor}; font-size: 16px; line-height: 1.6; margin: 0;">
                                    Hello student,<br><br>
                                    Get ready! <strong>${eventName}</strong> is ${isToday ? 'happening <span style="color: #e63946;">TODAY</span>' : `just <strong>${daysLeft} days away</strong>`}. We've compiled all the details you need to participate.
                                </p>

                                <!-- Event Details Card -->
                                <div style="background-color: #f1f5f9; border-radius: 12px; padding: 25px; margin: 30px 0; border: 1px solid #e2e8f0;">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td style="padding-bottom: 12px; color: ${textColor}; font-size: 15px;">
                                                <span style="font-size: 20px; margin-right: 10px;">📅</span> <strong>Date:</strong> ${details.date}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding-bottom: 12px; color: ${textColor}; font-size: 15px;">
                                                <span style="font-size: 20px; margin-right: 10px;">⏰</span> <strong>Time:</strong> ${details.time}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding-bottom: 12px; color: ${textColor}; font-size: 15px;">
                                                <span style="font-size: 20px; margin-right: 10px;">📍</span> <strong>Venue:</strong> ${details.venue}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="color: ${textColor}; font-size: 15px;">
                                                <span style="font-size: 20px; margin-right: 10px;">🏷️</span> <strong>Category:</strong> ${details.type}
                                            </td>
                                        </tr>
                                    </table>
                                </div>

                                <!-- Dynamic Description Section -->
                                ${details.description ? `
                                <div style="border-left: 4px solid ${accentColor}; background-color: #f5f3ff; padding: 25px; border-radius: 0 12px 12px 0; margin-bottom: 30px;">
                                    <h3 style="margin-top: 0; color: ${accentColor}; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">Message from Organizer:</h3>
                                    <p style="color: #4c1d95; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-line;">
                                        ${details.description}
                                    </p>
                                </div>
                                ` : ''}

                                <!-- Poster Image -->
                                ${details.image ? `
                                <div style="text-align: center; margin-bottom: 40px;">
                                    <img src="${details.image}" alt="Event Poster" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 12px 30px rgba(0,0,0,0.15); border: 4px solid #ffffff;">
                                </div>
                                ` : ''}

                                <!-- CTA Section -->
                                <div style="text-align: center; padding: 20px 0;">
                                    ${details.registrationLink ? `
                                        <a href="${details.registrationLink}" style="background-color: ${accentColor}; color: #ffffff; padding: 18px 45px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; display: inline-block; box-shadow: 0 5px 15px rgba(79, 70, 229, 0.4);">Register Now</a>
                                        <p style="margin-top: 15px; font-size: 12px; color: #94a3b8;">
                                            Direct Link: <br>
                                            <a href="${details.registrationLink}" style="color: ${accentColor}; text-decoration: underline;">${details.registrationLink}</a>
                                        </p>
                                    ` : `
                                        <a href="${clientUrl}/events" style="background-color: ${primaryColor}; color: #ffffff; padding: 16px 35px; text-decoration: none; border-radius: 12px; font-weight: 700; display: inline-block;">View on Campus Connect</a>
                                    `}
                                </div>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8fafc; padding: 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                                <p style="color: #64748b; font-size: 14px; margin: 0;">
                                    &copy; ${new Date().getFullYear()} Campus Connect. All rights reserved.<br>
                                    Official college event notification system.
                                </p>
                                <div style="margin-top: 20px;">
                                    <a href="${clientUrl}" style="color: #94a3b8; text-decoration: none; margin: 0 10px; font-size: 12px;">Portal</a>
                                    <a href="${clientUrl}/clubs" style="color: #94a3b8; text-decoration: none; margin: 0 10px; font-size: 12px;">Clubs</a>
                                    <a href="${clientUrl}/profile" style="color: #94a3b8; text-decoration: none; margin: 0 10px; font-size: 12px;">Privacy</a>
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    return await sendEmail(email, subject, html);
};

const sendWelcomeEmail = async (email, name) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const subject = '🚀 Welcome to Campus Connect!';
    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #ffffff; border-radius: 20px; border: 1px solid #eee;">
        <h2 style="color: #4f46e5; font-size: 28px; font-weight: 800; margin-bottom: 20px;">Welcome to the Community, ${name}!</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">We are thrilled to have you on board. Campus Connect is your exclusive platform for all college events, clubs, and real-time campus updates.</p>
        <div style="background-color: #f8fafc; padding: 25px; border-radius: 16px; margin: 30px 0;">
            <p style="margin: 0; font-weight: 700; color: #1e293b; margin-bottom: 10px;">What you can do now:</p>
            <ul style="color: #475569; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Explore upcoming AI Hackathons and Workshops</li>
                <li style="margin-bottom: 8px;">Join your favorite college clubs</li>
                <li style="margin-bottom: 8px;">Get instant event participation certificates</li>
            </ul>
        </div>
        <div style="text-align: center;">
            <a href="${clientUrl}" style="background-color: #4f46e5; color: white; padding: 14px 35px; text-decoration: none; border-radius: 12px; font-weight: 800; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">Enter Dashboard</a>
        </div>
        <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 13px;">Best regards,<br>The Campus Connect Team</p>
    </div>
    `;

    return await sendEmail(email, subject, html);
};

const sendPasswordResetEmail = async (email, resetUrl) => {
    const subject = '🔒 Password Reset Request';
    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #ffffff; border-radius: 20px; border: 1px solid #eee;">
        <h2 style="color: #1e293b; font-size: 24px; font-weight: 800; margin-bottom: 20px;">Secure Password Reset</h2>
        <p style="color: #475569; font-size: 16px;">We received a request to reset your password. Click the secure button below to choose a new password. This link expires in 10 minutes.</p>
        <div style="text-align: center; margin: 40px 0;">
            <a href="${resetUrl}" style="background-color: #ef4444; color: white; padding: 16px 35px; text-decoration: none; border-radius: 12px; font-weight: 800; display: inline-block; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">Reset Password</a>
        </div>
        <p style="color: #94a3b8; font-size: 14px;">If you did not request this, please ignore this email or contact support if you have concerns about your account security.</p>
        <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 13px;">Best regards,<br>Security Team | Campus Connect</p>
    </div>
    `;

    return await sendEmail(email, subject, html);
};

const sendNewEventAnnouncement = async (email, details) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const subject = `📢 NEW EVENT: ${details.title}`;
    
    // High-quality colors
    const primaryColor = '#1e293b'; // slate-800 
    const accentColor = '#4f46e5';   // indigo-600
    const textColor = '#334155';    // slate-700
    const lightBg = '#f8fafc';       // slate-50

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @media only screen and (max-width: 600px) {
                .container { width: 100% !important; border-radius: 0 !important; }
                .content { padding: 20px !important; }
            }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${lightBg}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${lightBg}; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                        
                        <!-- Header / Branding -->
                        <tr>
                            <td style="background-color: ${primaryColor}; padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -1px;">CAMPUS CONNECT</h1>
                                <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 2px;">New Event Announcement</p>
                            </td>
                        </tr>

                        <!-- Banner Section -->
                        <tr>
                            <td style="padding: 40px 40px 0 40px; text-align: center;">
                                <div style="display: inline-block; padding: 6px 16px; background-color: ${accentColor}15; color: ${accentColor}; border-radius: 50px; font-size: 13px; font-weight: 700; margin-bottom: 20px; text-transform: uppercase;">
                                    Just Announced
                                </div>
                                <h2 style="color: #0f172a; margin: 0; font-size: 28px; font-weight: 800; line-height: 1.2;">
                                    ${details.title}
                                </h2>
                                <p style="color: ${textColor}; font-size: 18px; margin-top: 10px;">
                                    Organized by <strong>${details.clubName || 'Campus Connect'}</strong>
                                </p>
                            </td>
                        </tr>

                        <!-- Content Body -->
                        <tr>
                            <td class="content" style="padding: 40px;">
                                <p style="color: ${textColor}; font-size: 16px; line-height: 1.6; margin: 0;">
                                    Hello student,<br><br>
                                    A new event has just been announced on Campus Connect! Check out the details below.
                                </p>

                                <!-- Event Details Card -->
                                <div style="background-color: #f1f5f9; border-radius: 12px; padding: 25px; margin: 30px 0; border: 1px solid #e2e8f0;">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td style="padding-bottom: 12px; color: ${textColor}; font-size: 15px;">
                                                <span style="font-size: 20px; margin-right: 10px;">📅</span> <strong>Date:</strong> ${details.eventDate ? new Date(details.eventDate).toLocaleDateString() : 'TBA'}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding-bottom: 12px; color: ${textColor}; font-size: 15px;">
                                                <span style="font-size: 20px; margin-right: 10px;">📍</span> <strong>Venue:</strong> ${details.venue || 'TBA'}
                                            </td>
                                        </tr>
                                    </table>
                                </div>

                                <!-- Dynamic Description Section -->
                                ${details.description ? `
                                <div style="border-left: 4px solid ${accentColor}; background-color: #f5f3ff; padding: 25px; border-radius: 0 12px 12px 0; margin-bottom: 30px;">
                                    <h3 style="margin-top: 0; color: ${accentColor}; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">Event Details:</h3>
                                    <p style="color: #4c1d95; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-line;">
                                        ${details.description}
                                    </p>
                                </div>
                                ` : ''}

                                <!-- Poster Image -->
                                ${details.url ? `
                                <div style="text-align: center; margin-bottom: 40px;">
                                    <img src="${details.url}" alt="Event Poster" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 12px 30px rgba(0,0,0,0.15); border: 4px solid #ffffff;">
                                </div>
                                ` : ''}

                                <!-- CTA Section -->
                                <div style="text-align: center; padding: 20px 0;">
                                    <a href="${clientUrl}/events" style="background-color: ${accentColor}; color: #ffffff; padding: 18px 45px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; display: inline-block; box-shadow: 0 5px 15px rgba(79, 70, 229, 0.4);">View on Campus Connect</a>
                                </div>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8fafc; padding: 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                                <p style="color: #64748b; font-size: 14px; margin: 0;">
                                    &copy; ${new Date().getFullYear()} Campus Connect. All rights reserved.<br>
                                    Official college event notification system.
                                </p>
                                <div style="margin-top: 20px;">
                                    <a href="${clientUrl}" style="color: #94a3b8; text-decoration: none; margin: 0 10px; font-size: 12px;">Portal</a>
                                    <a href="${clientUrl}/clubs" style="color: #94a3b8; text-decoration: none; margin: 0 10px; font-size: 12px;">Clubs</a>
                                    <a href="${clientUrl}/profile" style="color: #94a3b8; text-decoration: none; margin: 0 10px; font-size: 12px;">Privacy</a>
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    return await sendEmail(email, subject, html);
};

module.exports = {

    sendEmail,
    sendEventReminder,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendNewEventAnnouncement
};
