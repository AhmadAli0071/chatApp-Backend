import User from "../models/user.models.js";
import asyncHandler from "express-async-handler";
import validator from "validator";
import bcrypt from "bcryptjs";
import generateAccessAndRefreshTokens from "../utils/generateToken.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import Chat from "../models/chat.models.js"
import { getImageName } from "../utils/getImageName.js";
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import nodemailer from "nodemailer";
import fs from "fs"
import dotenv from "dotenv"
import mongoose from "mongoose";
dotenv.config()
export const register = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body
    try {
        if (!fullname || !email || !username || !password) {
            return res.status(400).json({ message: "Please fill all the fields" })
        }

        const existingUser = await User.findOne({ email })

        if (existingUser) {
            return res.status(400).json({ message: "email already exists" })
        }
        const pictureLocalPath = req.file?.path;

        if (!pictureLocalPath) {
            return res.status(400).json({ message: "file path not found" })
        }
        const picture = await uploadOnCloudinary(pictureLocalPath);
        const findByUsername = await User.findOne({ username })
        if (findByUsername) {
            return res.status(400).json({ message: "username already exists" })
        }
        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: "Email is not a valid email " })
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);


        const user = await User.create({

            fullname,
            email,
            username,
            password: hashedPassword,
            picture: picture?.url || "",
        })

        await user.save()
        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
        const options = {
            httpOnly: process.env.NODE_ENV === 'production',
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? true : "none"
        };
        return res
            .status(201)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(user);
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})
export const login = asyncHandler(async (req, res) => {
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('FRONTEND_ORIGIN_DEV:', process.env.FRONTEND_ORIGIN_DEV);
    console.log('FRONTEND_ORIGIN_PROD:', process.env.FRONTEND_ORIGIN_PROD);
    try {
        const { email, password } = req.body;
        if (!email) {
            return res.status(400).json({ message: "email is required" })
        }
        if (!password) {
            return res.status(400).json({ message: "password is required" })
        }

        const user = await User.findOne({ email })
        if (!user) {
            return res.status(500).json({ message: "User not found!!!" })
        }

        const matchedPassword = await bcrypt.compare(password, user.password);
        if (!matchedPassword) {
            return res.status(400).json({ message: "Incorrect Password" })
        }
        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

        const options = {
            httpOnly: process.env.NODE_ENV === 'production',
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? true : "none"
        };
        return res
            .status(201)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json({
                user: {
                    _id: user._id, fullname: user.fullname, username: user.username, email: user.email, picture: user.picture, phoneNumber: user.phoneNumber, about: user.about
                }, accessToken, refreshToken
            });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message })
    }
})
export const forgetPassword = asyncHandler(async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(404).json({ message: "Incorrect Email" })
        }
        const token = uuidv4();
        const expires = Date.now() + 3600000;
        user.resetPasswordToken = token;
        user.resetPasswordExpires = expires;
        await user.save();
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.DEV_EMAIL,
                pass: process.env.DEV_PASS
            }
        });
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const emailTemplatePath = join(__dirname, '../emailTemplate.html');
        const emailTemplate = fs.readFileSync(emailTemplatePath, "utf-8");

        const modifiedTemplate = emailTemplate.replace('{{ token }}', token).replace('{{ name }}', user.fullname);
        const mailOptions = {
            from: process.env.DEV_EMAIL,
            to: email,
            subject: 'Password Reset',
            html: modifiedTemplate
        };

        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                return res.status(400).json({ message: "Failed to send the email" });
            }
            return res.status(201).json({ message: `OTP sended to ${email} `, token: token })
        })

    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})
export const resetPassword = asyncHandler(async (req, res) => {
    try {

        const { resetPasswordToken, password, confirmPassword, } = req.body;
        console.log(resetPasswordToken, password, confirmPassword);
        if (!password || !confirmPassword || !resetPasswordToken) {
            return res.status(400).json("All fields are mandatory to be filled")
        }
        if (password !== confirmPassword) {
            return res.status(400).json("Password not matched")
        }
        if (!resetPasswordToken) {
            return res.status(400).json("Please enter the OTP")
        }
        const user = await User.findOne({
            resetPasswordToken: resetPasswordToken.trim(),
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        console.log(user);
        const matchedPassword = await bcrypt.compare(password, user.password);
        if (matchedPassword) {
            return res.status(400).json({ message: `You Already have this Password` })
        }
        if (user.resetPasswordToken !== resetPasswordToken.trim()) {
            return res.status(400).json({ message: "OTP is not correct " })
        }
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt)
        user.password = hash;

        user.resetPasswordExpires = null;
        user.resetPasswordToken = null;
        await user.save();
        res.status(200).json({ message: "Password Reset Successful" })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message })
    }
})
export const changePassword = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { currentPassword, newPassword, confirmNewPassword } = req.body;
        const user = await User.findById(userId)

        if (!user) {
            return res.status(404).json({ message: "User not found!" })
        }
        const isCorrectPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isCorrectPassword) {
            return res.status(400).json({ message: "Current password is incorrect" })
        }
        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ message: "Password not matched" })
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        await user.save();
        return res.status(200).json({ message: "Password Updated Successfully" })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})
export const updateProfile = asyncHandler(async (req, res) => {
    try {
        const { fullname, username, email } = req.body;
        const user = req.user;
        let picture;
        const pictureLocalPath = req.file?.path;
        if (pictureLocalPath) {
            const imageName = getImageName(user.picture)
            const isDeletedFromCloudinary = await deleteFromCloudinary(imageName)
            if (isDeletedFromCloudinary) {
                picture = await uploadOnCloudinary(pictureLocalPath)
            }
        }
        const updatedUser = await User.findByIdAndUpdate(
            user._id,
            {
                fullname,
                username,
                email,
                picture: picture ? picture.url : user.picture
            },
            {
                new: true
            }
        )
        if (updatedUser) {
            return res.status(201).json(updatedUser)
        }
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})
export const logoutUser = asyncHandler(async (req, res) => {
    try {

        await User.findByIdAndUpdate(
            req.user?._id,
            {
                $unset: {
                    refreshToken: 1
                }
            },
            {
                new: true
            }
        )
        const options = {
            httpOnly: process.env.NODE_ENV === 'production',
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? true : "none"
        };
        return res
            .status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json({ message: `${req.user?.fullName} Logged Out` })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error?.message })
    }
})
export const getUsers = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;

        const users = await User.aggregate([
            {
                $match: {
                    _id: { $ne: userId }
                }
            },
            {
                $project: {
                    fullname: 1,
                    picture: 1,
                    email: 1,
                    phoneNumber: 1,
                    username: 1,
                    about: 1,
                    _id: 1
                }
            }
        ]);
        if (users.length > 0) {
            return res.status(200).json(users);
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export const getSingleUser = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;
        const reqUser = req.user._id;
        const user = await User.findById(userId).select("-password -refreshToken");
        if (!user) {
            return res.status(404).json({ message: "user not found!" })
        }
        const groupsInCommon = await Chat.aggregate([
            {
                $match: {
                    users: { $all: [new mongoose.Types.ObjectId(userId), new mongoose.Types.ObjectId(reqUser)] },
                    isGroupChat: true
                }
            }, {
                $project: {
                    _id: 1,
                    chatName: 1,
                    groupPicture: 1,
                    lastMessage: { $arrayElemAt: ['$messages', -1] },
                    totalUsers: { $size: '$users' }
                }
            }, {
                $lookup: {
                    from: 'messages',
                    foreignField: "_id",
                    localField: "lastMessage",
                    as: "lastMessage"
                }
            }, {
                $unwind: {
                    path: "$lastMessage",
                    preserveNullAndEmptyArrays: true
                }
            }, {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "lastMessage.senderId",
                    as: "sender",
                }
            }, {
                $unwind: {
                    path: "$sender",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    chatName: 1,
                    groupPicture: 1,
                    totalUsers: 1,
                    "lastMessage._id": 1,
                    "lastMessage.createdAt": 1,
                    "lastMessage.message": 1,
                    "sender._id": 1,
                    "sender.fullname": 1,

                }
            }

        ]);
        const chat = await Chat.findOne({
            users: {
                $all: [userId, reqUser]
            },
            isGroupChat: false
        });
        res.status(200).json({ user, chat, groupsInCommon })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})
export const editProfile = asyncHandler(async (req, res) => {
    try {
        const user = req.user;
        const { phoneNumber, about } = req.body;

        if (!user) {
            return res.status(404).json({ message: "Unauthorized Request" });
        }


        const updateData = {};
        if (phoneNumber) updateData.phoneNumber = phoneNumber;
        if (about) updateData.about = about;

        const updatedUser = await User.findByIdAndUpdate(
            user._id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "Profile updated successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})