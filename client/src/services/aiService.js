import api from './api';

export const sendMessage = async (message) => {
    try {
        const response = await api.post('/ai/chat', { message });

        if (response.data.success) {
            return response.data.reply;
        } else {
            return "I'm having a little trouble connecting to the campus network right now. Please try again.";
        }
    } catch (error) {
        console.error("AI Service Error:", error);
        return "I'm feeling a bit disconnected (Network Error). Please check your internet connection.";
    }
};
export const generateClubFAQs = async (clubData) => {
    try {
        const response = await api.post('/ai/generate-club-faq', clubData);
        if (response.data.success) {
            return response.data.data;
        } else {
            throw new Error(response.data.error || "Failed to generate FAQs");
        }
    } catch (error) {
        console.error("AI FAQ Error:", error);
        throw error;
    }
};
