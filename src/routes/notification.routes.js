import express from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import { getNotifications } from "../controllers/notification.controllers.js";
const router = express.Router()
router.get("/", verifyJWT, getNotifications);
export default router;