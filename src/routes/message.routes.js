import express from "express";
import verifyJWT from "../middlewares/auth.middleware.js"
import { allMessages, editMessage, getStarredMessages, sendGroupMessage, sendMessage, starMessage, unstarMessage } from "../controllers/message.controllers.js";
const router = express.Router()
router.post("/:chatId", verifyJWT, sendMessage)
router.post("/group/:chatId", verifyJWT, sendGroupMessage)
router.get("/:chatId", verifyJWT, allMessages)
router.put("/edit/:messageId/:chatId" ,verifyJWT,editMessage)
router.put("/:messageId", verifyJWT, starMessage)
router.get("/starred/:userId", verifyJWT, getStarredMessages)
router.put("/unstar/:messageId/:userId", verifyJWT, unstarMessage)
export default router;