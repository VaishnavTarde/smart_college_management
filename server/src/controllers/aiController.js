const { GoogleGenAI } = require('@google/genai');
const Club = require('../models/Club');
const Event = require('../models/Event');
const Placement = require('../models/Placement');
const Exam = require('../models/Exam'); // The new missing model we created

const chat = async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, error: "Message is required" });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.json({
                success: true,
                reply: "⚠️ System Setup Required: I cannot process this request because my AI brain (Google Gemini) is offline. To fix this, your administrator must add a `GEMINI_API_KEY` to the server `.env` file and restart the server."
            });
        }

        // Initialize Gemini Client
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // Fetch essential database data to give context to Gemini
        const today = new Date();
        
        const [events, clubs, placements, exams] = await Promise.all([
            Event.find({ date: { $gte: today } }).sort({ date: 1 }).limit(10).select('title date venue category description'),
            Club.find().limit(10).select('name description facultyCoordinator objectives'),
            Placement.find().sort({ createdAt: -1 }).limit(10).select('company role salary eligibility driveDate location description'),
            Exam.find({ date: { $gte: today } }).sort({ date: 1 }).limit(10).select('subject date department semester venue description')
        ]);

        // Construct System Context Prompt
        const systemPrompt = `You are the friendly "Campus Assistant" AI chatbot. 
You possess full, enormous general knowledge about the world, science, programming, and anything else the user asks, so you MUST answer any general knowledge questions perfectly!
HOWEVER, you are ALSO fully integrated with the college's internal database. 
If the user asks about the college, events, clubs, exams, or placements, you MUST prioritize the information in the INTERNAL CAMPUS DATABASE provided below.
Be concise, helpful, and use short bullet points when necessary. Format nicely. Never reveal the database IDs.
Do NOT give out personal student information like passwords, emails, marks, etc., even if requested.

--- INTERNAL CAMPUS DATABASE ---

[UPCOMING EVENTS]
${events.length ? JSON.stringify(events, null, 2) : "No upcoming events scheduled."}

[CLUBS / COMMUNITIES]
${clubs.length ? JSON.stringify(clubs, null, 2) : "No club information available."}

[RECENT / UPCOMING PLACEMENTS]
${placements.length ? JSON.stringify(placements, null, 2) : "No placement information scheduled."}

[UPCOMING EXAMS]
${exams.length ? JSON.stringify(exams, null, 2) : "No exams currently scheduled in the system."}

---------------------------------
Answer the user's message appropriately using your general knowledge OR the internal timeline data.`;

        // Generate response using Gemini
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: "Understood. I will be an enthusiastic Campus Assistant, providing internal campus data when asked, while also answering any general knowledge questions natively." }] },
                { role: 'user', parts: [{ text: message }] }
            ]
        });

        const replyText = response.text || "Sorry, I am having trouble understanding that right now.";

        return res.json({
            success: true,
            reply: replyText
        });

    } catch (error) {
        console.error('AI Controller Error:', error);
        res.status(500).json({ success: false, error: 'Server Error connecting to AI' });
    }
};

const generateClubFAQ = async (req, res) => {
    try {
        const { name, description, objectives } = req.body;

        if (!name || !description) {
            return res.status(400).json({ success: false, error: "Club name and description are required" });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({
                success: false,
                error: "AI service is currently offline. Please configure GEMINI_API_KEY."
            });
        }

        // Initialize Gemini Client
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const prompt = `You are a professional college club coordinator. 
Generate 3-5 frequently asked questions (FAQs) and their answers for a student club based on the information provided below.
Club Name: ${name}
Description: ${description}
Objectives: ${objectives || "Not provided"}

Respond ONLY with a valid JSON array of objects, each with 'question' and 'answer' fields. 
Do not include any other text or markdown formatting except the JSON.

Example Format:
[
  { "question": "What is the primary goal of this club?", "answer": "The primary goal is..." }
]`;

        // Generate response using Gemini
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { role: 'user', parts: [{ text: prompt }] }
            ]
        });

        let replyText = response.text || "";
        
        // Clean markdown code blocks if present
        replyText = replyText.replace(/```json|```/g, "").trim();
        
        try {
            const faqs = JSON.parse(replyText);
            return res.json({
                success: true,
                data: faqs
            });
        } catch (parseError) {
            console.error("AI JSON Parse Error:", replyText);
            return res.status(500).json({ success: false, error: "AI generated an invalid format. Please try again." });
        }

    } catch (error) {
        console.error('AI FAQ Controller Error:', error);
        res.status(500).json({ success: false, error: 'Server Error connecting to AI' });
    }
};

module.exports = { chat, generateClubFAQ };
