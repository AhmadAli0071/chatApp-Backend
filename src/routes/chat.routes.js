import express from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
    addUserToGroup,
    createGroup,
    deleteGroup,
    fetchToBeAddedParticipants,
    getAllChats,
    getAllGroups,
    getSingleGroup,
    leaveGroup,
    removeUserFromGroup,
    sendRequest,
    updateChatStatus
} from "../controllers/chat.controllers.js";
const router = express.Router();
router.post("/request/:receiverId", verifyJWT, sendRequest)
router.put("/update-status/:chatId", verifyJWT, updateChatStatus)
router.get("/fetch-chats/:userId", verifyJWT, getAllChats)
// group chat
router.post("/group", upload.single("groupPicture"), verifyJWT, createGroup)
router.get("/groups/:userId", getAllGroups)
router.get("/group/:chatId", getSingleGroup)
router.put("/leave-group/:chatId", verifyJWT, leaveGroup)
router.delete("/group/:chatId", verifyJWT, deleteGroup)
// remove user from group
router.put("/group/:chatId", verifyJWT, removeUserFromGroup)
// add user to group
router.put("/group-add/:chatId", verifyJWT, addUserToGroup)
// new participants list to be added  to group
router.get("/participants/:chatId", fetchToBeAddedParticipants)
export default router;