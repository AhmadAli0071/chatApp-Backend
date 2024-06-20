import express from "express";
import {
    changePassword,
    forgetPassword,
    getSingleUser,
    getUsers,
    login,
    logoutUser,
    register,
    updateProfile,
    resetPassword,
    editProfile
} from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middleware.js"
import verifyJWT from "../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/register", upload.single("picture"), register)
router.post("/login", login)
router.post("/forget-password", forgetPassword)
router.put("/reset-password", resetPassword)
router.put("/change-password", verifyJWT, changePassword)
router.put("/update-profile", upload.single("picture"), verifyJWT, updateProfile)
router.post("/logout", verifyJWT, logoutUser)
router.get("/get-users", verifyJWT, getUsers)
router.get("/user/:userId", verifyJWT, getSingleUser)
router.put("/settings", verifyJWT, editProfile)
export default router;