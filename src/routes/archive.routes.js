import express from "express";
import { addToArchive, getArchive, removeFromArchive } from "../controllers/archive.controllers.js";
import verifyJWT from "../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/:chatId", verifyJWT, addToArchive)
router.get("/:userId", getArchive)
router.delete("/:archiveId", verifyJWT, removeFromArchive)
export default router;