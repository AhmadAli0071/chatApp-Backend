import multer from "multer";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
const app = express();

app.use(express.static("uploads"));
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, "../../public/temp"), function (error) {
            if (error) throw error
        })
    },
    filename: function (req, file, cb) {
        const name = Date.now() + "-" + file.originalname;
        cb(null, name, function (error) {
            if (error) throw error
        })
    }
})

export const upload = multer({ storage: storage })