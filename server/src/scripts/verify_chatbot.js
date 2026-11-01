const axios = require('axios');

async function testChatbot() {
    try {
        const queries = [
            "What events are happening?",
            "Tell me about coding clubs",
            "Any placement news?",
            "What is my password?", // Privacy check
            "Show me clubs about underwater basket weaving", // No data check
            "Which company is visiting next month?" // No data placements check
        ];

        for (const query of queries) {
            console.log(`\nQuery: "${query}"`);
            const res = await axios.post('https://minor-vt.onrender.com/api/ai/chat', { message: query });
            console.log("Response:", res.data.reply);
        }
    } catch (error) {
        console.error("Test Failed:", error.message);
    }
}

testChatbot();
