const StudyPlan = require('../models/StudyPlan');
const { GoogleGenAI } = require('@google/genai');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// ════════════════════════════════════════════════════════════════
//  AI MODEL CONFIG — gemini-2.5-flash works on this API key
// ════════════════════════════════════════════════════════════════
const AI_MODEL = 'gemini-2.5-flash';

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generateWithRetry = async (ai, options, maxRetries = 4) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await ai.models.generateContent(options);
        } catch (error) {
            const msg = error.message || '';
            console.warn(`[AI Retry ${i + 1}/${maxRetries}] Failed: ${msg}`);
            lastError = error;
            if (msg.includes('503') || msg.includes('429') || msg.includes('UNAVAILABLE') || msg.includes('overloaded')) {
                await new Promise(res => setTimeout(res, 2000 * Math.pow(2, i))); // 2s, 4s, 8s, 16s backoff
                continue;
            }
            throw error;
        }
    }
    throw lastError;
};

// Safely extract JSON from AI response (handles markdown wrapping)
const extractJSON = (text) => {
    const cleaned = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in AI response');
    return JSON.parse(match[0]);
};

// ════════════════════════════════════════════════════════════════
//  TEXT EXTRACTION (PDF / DOCX / TXT)
// ════════════════════════════════════════════════════════════════

const extractTextFromBuffer = async (buffer, mimetype, filename) => {
    try {
        if (mimetype === 'application/pdf') {
            const data = await pdfParse(buffer);
            return data.text || '';
        }
        if (
            mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimetype === 'application/msword'
        ) {
            const { value } = await mammoth.extractRawText({ buffer });
            return value || '';
        }
        if (mimetype === 'text/plain') return buffer.toString('utf8');
        return '';
    } catch (e) {
        console.error(`[Extractor] Error reading ${filename}:`, e.message);
        return '';
    }
};

// ════════════════════════════════════════════════════════════════
//  MODULE 1: ALGORITHMIC TIMETABLE (No AI — instant, always works)
// ════════════════════════════════════════════════════════════════

const ROUTINES = {
    'Early Morning': { morning: 'Primary deep study (5–9 AM): tackle hardest subject', afternoon: 'Light reading & passive review (1–3 PM)', evening: 'Problem solving & practice questions (5–7 PM)', night: 'Quick 15-min recap, sleep by 10 PM' },
    'Late Night':    { morning: 'Light warm-up — review last night\'s notes', afternoon: 'Practice problems & MCQs (2–4 PM)', evening: 'Plan tonight\'s topics after dinner', night: 'Primary deep study block (10 PM – 1 AM)' },
    'Afternoon':     { morning: 'Rest or light reading — review previous notes', afternoon: 'Primary deep study block (12–5 PM)', evening: 'Practice questions & problem sets (6–8 PM)', night: 'Quick recap before sleep (30 min max)' },
    'Anytime':       { morning: 'Start with your toughest subject when mind is fresh', afternoon: 'Practice problems & mock questions', evening: 'Revision of today\'s topics + formula review', night: 'Light reading, quick notes, sleep by 11 PM' }
};

exports.generatePlan = async (req, res) => {
    try {
        const { subjects, examDate, hoursPerDay, weakSubjects, preferredTime, daysLeft: clientDaysLeft, todayStr } = req.body;
        if (!subjects || !examDate || !hoursPerDay)
            return res.status(400).json({ success: false, message: 'Required fields missing.' });

        const subjectArr = Array.isArray(subjects) ? subjects : subjects.split(',').map(s => s.trim()).filter(Boolean);
        const weakArr = Array.isArray(weakSubjects) ? weakSubjects : (weakSubjects ? weakSubjects.split(',').map(s => s.trim()).filter(Boolean) : []);
        const hours = Number(hoursPerDay) || 4;
        const examDt = new Date(examDate);
        
        // Use client-provided daysLeft or fallback to server calculation
        const daysLeft = clientDaysLeft || Math.max(2, Math.ceil((examDt - new Date()) / 86400000));
        const startDateInfo = todayStr ? `Today is ${todayStr}. ` : '';

        const ai = getAI();
        const prompt = `You are a world-class academic study planner.
A student needs a highly detailed, personalized, and AI-generated study plan.
Here are the details:
- Strict Subjects to Include: ${subjectArr.join(', ')}
- Weak subjects (needs extra focus): ${weakArr.length ? weakArr.join(', ') : 'None'}
- START DATE: ${startDateInfo}
- Days left until exam: ${daysLeft} days (Exam date: ${examDt.toLocaleDateString('en-IN')})
- Study hours per day: ${hours} hours
- Preferred study time: ${preferredTime || 'Anytime'}

CRITICAL INSTRUCTIONS:
1. ONLY generate a plan for the STRICT subjects listed above (${subjectArr.join(', ')}).
2. In the dayWisePlan list, explicitly state the precise subject being studied that day using the "subject" field.
3. Generate a DAY-BY-DAY study plan for the next ${daysLeft} days starting exactly from today (${startDateInfo || 'Today'}).
4. DO NOT use generic texts like "Read chapter 1". Generate SPECIFIC, REALISTIC, AND DETAILED topics based on actual concepts.

Return ONLY a valid JSON object. The JSON must exactly match this structure:
{
  "dayWisePlan": [
    {
      "day": "Day 1",
      "subject": "Exact Name of the provided subject",
      "tasks": ["Highly detailed, subject-specific task 1", "Task 2 relating to real concepts", "Task 3"]
    }
  ],
  "weeklyOverview": "A motivating, 2-3 sentence overview customized to these specific subjects.",
  "revisionSchedule": ["Day X: Detailed specific revision task", "Day Y: ..."],
  "priorityTopics": ["Specific Topic 1 from Subject A", "Specific Topic 2 from Subject B"],
  "countdownNotes": "A customized motivational note regarding their weak subjects.",
  "dailyRoutine": {
    "morning": "Detailed morning routine tasks",
    "afternoon": "Detailed afternoon routine tasks",
    "evening": "Detailed evening routine tasks",
    "night": "Detailed night routine tasks"
  }
}`;

        console.log(`[generatePlan] Calling AI to build generative plan for ${daysLeft} days... Start Date: ${todayStr || 'Server Now'}`);
        
        const response = await generateWithRetry(ai, {
            model: AI_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        console.log('[generatePlan] AI generated plan successfully');
        const planData = extractJSON(response.text);

        // Save to DB
        let plan = await StudyPlan.findOne({ user: req.user._id });
        if (plan) { 
            Object.assign(plan, { subjects: subjectArr, weakSubjects: weakArr, examDate: examDt, hoursPerDay: hours, planData }); 
            await plan.save(); 
        } else { 
            plan = new StudyPlan({ user: req.user._id, subjects: subjectArr, weakSubjects: weakArr, examDate: examDt, hoursPerDay: hours, planData }); 
            await plan.save(); 
        }

        return res.json({ success: true, plan });
    } catch (error) {
        console.error('[generatePlan] FULL ERROR:', error);
        return res.status(500).json({ success: false, message: 'AI Plan generation failed: ' + error.message });
    }
};

exports.getPlan = async (req, res) => {
    try {
        const plan = await StudyPlan.findOne({ user: req.user._id });
        return res.json({ success: true, plan });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════════
//  MODULE 2: DOCUMENT ANALYZER (gemini-2.5-flash AI)
// ════════════════════════════════════════════════════════════════

exports.analyzeDocuments = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0)
            return res.status(400).json({ success: false, message: 'No files uploaded.' });

        // Extract text from all uploaded files
        const parts = [];
        let combinedText = '';
        let hasFiles = false;

        for (const file of req.files) {
            const text = await extractTextFromBuffer(file.buffer, file.mimetype, file.originalname);
            if (text.trim().length > 20) {
                combinedText += `=== FILE: ${file.originalname} ===\n${text}\n\n`;
                hasFiles = true;
            } else if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
                console.log(`[OCR] Appending ${file.originalname} as inlineData for native OCR...`);
                parts.push({
                    inlineData: {
                        data: file.buffer.toString('base64'),
                        mimeType: file.mimetype
                    }
                });
                parts.push({ text: `\n(The appended visual file is: ${file.originalname})\n` });
                hasFiles = true;
            } else {
                console.warn(`[DocAnalysis] Skipped ${file.originalname}: unreadable format.`);
            }
        }

        if (!hasFiles) {
            return res.status(400).json({ success: false, message: 'Could not extract content from files. Make sure PDFs are text-based or valid scanned images.' });
        }

        if (combinedText.length > 100000) combinedText = combinedText.substring(0, 100000) + '\n...[truncated for size]';

        // Get optional custom question from user
        const customQuestion = req.body?.customQuestion || '';

        const ai = getAI();
        const promptText = `You are an expert university professor. Analyze the following study material.
${customQuestion ? `\nThe student specifically asks: "${customQuestion}"\nAnswer their question in detail using the material, AND also provide the standard analysis below.\n` : ''}
Based ONLY on the actual content provided, extract:
1. Important topics actually present in the material
2. Brief summaries per file/chapter
3. A revision roadmap in logical order
4. Key concepts, formulas, definitions found
5. Quick one-line exam-worthy facts
6. Topic priority (High/Medium/Low based on depth of coverage)

Return ONLY valid JSON. No markdown, no explanation.
{
  "importantTopics": ["Topic from material"],
  "summaries": [{"title": "File/Chapter name", "summary": "2-3 sentence summary"}],
  "revisionRoadmap": ["Step 1: Start with ...", "Step 2: ..."],
  "keyConcepts": ["Concept: explanation from material"],
  "quickNotes": ["One-line fact from material"],
  "topicPriority": [{"topic": "Topic", "priority": "High"}]${customQuestion ? ',\n  "customAnswer": "Detailed answer to the student question based on the material"' : ''}
}

--- MATERIAL (Text formats below, Scanned formats implicitly attached) ---
${combinedText}`;
        
        parts.unshift({ text: promptText });

        console.log(`[DocAnalysis] Sending materials to Gemini for analysis & OCR...`);

        const response = await generateWithRetry(ai, {
            model: AI_MODEL,
            contents: [{ role: 'user', parts }]
        });

        console.log('[DocAnalysis] AI responded successfully');
        const analysisData = extractJSON(response.text);
        analysisData.aiPowered = true;

        return res.json({ success: true, analysis: analysisData });

    } catch (error) {
        console.error('[analyzeDocuments] FULL ERROR:', error);
        return res.status(500).json({ success: false, message: 'Document analysis failed: ' + (error.message || 'Unknown error') });
    }
};

// ════════════════════════════════════════════════════════════════
//  MODULE 3: PYQ ANALYZER (gemini-2.5-flash AI)
// ════════════════════════════════════════════════════════════════

exports.analyzePYQ = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0)
            return res.status(400).json({ success: false, message: 'No question papers uploaded.' });

        const parts = [];
        let combinedText = '';
        let hasFiles = false;

        for (const file of req.files) {
            const text = await extractTextFromBuffer(file.buffer, file.mimetype, file.originalname);
            if (text.trim().length > 20) {
                combinedText += `=== PAPER: ${file.originalname} ===\n${text}\n\n`;
                hasFiles = true;
            } else if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
                console.log(`[OCR] Appending ${file.originalname} as inlineData for native OCR...`);
                parts.push({
                    inlineData: {
                        data: file.buffer.toString('base64'),
                        mimeType: file.mimetype
                    }
                });
                parts.push({ text: `\n(The appended visual paper is: ${file.originalname})\n` });
                hasFiles = true;
            } else {
                console.warn(`[PYQAnalysis] Skipped ${file.originalname}: unreadable format.`);
            }
        }

        if (!hasFiles) {
            return res.status(400).json({ success: false, message: 'Could not extract content from papers. Make sure PDFs are valid or scanned images.' });
        }

        if (combinedText.length > 100000) combinedText = combinedText.substring(0, 100000) + '\n...[truncated]';

        const customQuestion = req.body?.customQuestion || '';

        const ai = getAI();
        const promptText = `You are an expert exam paper analyst for university students.
${customQuestion ? `\nThe student specifically asks: "${customQuestion}"\nAnswer their question in detail using the papers, AND also provide the standard analysis below.\n` : ''}
Analyze the question papers below. Based ONLY on actual content:
1. Find questions that are repeated or very similar across papers. For each, extract the MARKS/WEIGHTAGE (e.g. 5M, 10M, 2 Marks) if mentioned.
2. List the most important questions students should prepare. Include the MARKS mentioned for each question.
3. Identify frequently tested topics.
4. Describe overall trends and patterns.
5. Analyze chapter-wise patterns.

IMPORTANT: Never claim to predict future questions. Say "Based on uploaded papers..."
FOR MARKS: If marks are not explicitly mentioned for a question, use "N/A".

Return ONLY valid JSON. No markdown.
{
  "diagnosticSnapshot": {
    "totalQuestionsFound": 45,
    "repeatedQuestionsCount": 12,
    "confidenceScore": "High"
  },
  "repeatedQuestions": [{"question": "Actual question text", "repetitions": 2, "marks": "5M"}],
  "importantQuestions": [{"question": "Important question from the papers", "marks": "10M"}],
  "frequentlyAskedTopics": ["Topic that appears frequently"],
  "topicTrends": ["Pointwise observation 1 about trends", "Pointwise observation 2 about patterns"],
  "chapterWisePatterns": [{"chapter": "Chapter name", "pattern": ["Point 1 about this chapter", "Point 2 about this chapter"]}]${customQuestion ? ',\n  "customAnswer": "Detailed answer to the student question based on the papers"' : ''}
}

--- PAPERS (Text formats below, Scanned formats implicitly attached) ---
${combinedText}`;
        parts.unshift({ text: promptText });

        console.log(`[PYQAnalysis] Sending papers to Gemini for analysis & OCR...`);

        const response = await generateWithRetry(ai, {
            model: AI_MODEL,
            contents: [{ role: 'user', parts }]
        });

        console.log('[PYQAnalysis] AI responded successfully');
        const analysisData = extractJSON(response.text);
        analysisData.aiPowered = true;

        return res.json({ success: true, analysis: analysisData });

    } catch (error) {
        console.error('[analyzePYQ] FULL ERROR:', error);
        return res.status(500).json({ success: false, message: 'PYQ analysis failed: ' + (error.message || 'Unknown error') });
    }
};
