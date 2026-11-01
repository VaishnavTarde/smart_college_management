require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

console.log("--- Cloudinary Diagnostic ---");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "Found" : "Missing");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadTest = async () => {
    try {
        console.log("Attempting to upload 'test-image.txt'...");
        const result = await cloudinary.uploader.upload("test-image.txt", {
            resource_type: "auto",
            folder: "test_uploads"
        });
        console.log("✅ Upload SUCCESS!");
        console.log("URL:", result.secure_url);
    } catch (error) {
        console.error("❌ Upload FAILED:");
        console.error(error);
    }
};

uploadTest();
