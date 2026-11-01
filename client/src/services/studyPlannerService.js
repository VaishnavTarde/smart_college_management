import api from './api';

export const generatePlan = async (planData) => {
    try {
        const response = await api.post('/study-planner/generate', planData);
        return response.data;
    } catch (error) {
        throw error.response?.data || { success: false, message: 'Failed to connect to server' };
    }
};

export const getMyPlan = async () => {
    try {
        const response = await api.get('/study-planner/my-plan');
        return response.data;
    } catch (error) {
        throw error.response?.data || { success: false, message: 'Failed to fetch plan' };
    }
};

export const analyzeDocuments = async (files, customQuestion = '') => {
    try {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        if (customQuestion.trim()) formData.append('customQuestion', customQuestion.trim());

        const response = await api.post('/study-planner/analyze-documents', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000 // 2 min timeout for large files
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { success: false, message: 'Failed to analyze documents' };
    }
};

export const analyzePYQ = async (files, customQuestion = '') => {
    try {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        if (customQuestion.trim()) formData.append('customQuestion', customQuestion.trim());

        const response = await api.post('/study-planner/analyze-pyq', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { success: false, message: 'Failed to analyze PYQs' };
    }
};
