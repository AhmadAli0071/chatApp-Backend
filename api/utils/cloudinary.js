import { v2 as cloudinary } from 'cloudinary';
import dotenv from "dotenv"

import fs from "fs";
dotenv.config();
const cloudinaryConfig = {
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
}; cloudinary.config(cloudinaryConfig);

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath)
        return null
    }
}

const deleteFromCloudinary = async (imageName) => {
    try {
        if (!imageName) return null;
        const response = await cloudinary.uploader.destroy(imageName, (error, _) => {
            if (error) return null;
        })
        return response;
    } catch (error) {
        return null;
    }
}

export { uploadOnCloudinary, deleteFromCloudinary }