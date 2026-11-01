const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Memory Storage
const storage = multer.memoryStorage();
const parser = multer({ storage: storage });

// @desc    Upload single image
// @route   POST /api/upload
// @access  Private
const uploadImage = async (req, res) => {
    try {
        console.log("Upload Request Received (Stream Method)");

        if (!req.file) {
            console.log("No file received");
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        console.log("File received into memory:", req.file.originalname, "Size:", req.file.size);

        // Upload using stream (more robust)
        const streamUpload = (fileBuffer) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'campus-connect-gallery',
                        resource_type: 'auto'
                    },
                    (error, result) => {
                        if (result) {
                            resolve(result);
                        } else {
                            reject(error);
                        }
                    }
                );
                stream.write(fileBuffer);
                stream.end();
            });
        };

        const result = await streamUpload(req.file.buffer);

        console.log("Cloudinary Upload Success:", result.secure_url);

        res.status(200).json({
            success: true,
            data: {
                url: result.secure_url,
                public_id: result.public_id
            }
        });

    } catch (error) {
        console.error('Stream Upload Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error during upload',
            error: error.message
        });
    }
};

module.exports = {
    uploadMiddleware: parser.single('image'),
    uploadImage
};
