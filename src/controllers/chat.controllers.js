import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Chat from "../models/chat.models.js";
import User from "../models/user.models.js";
import Notification from "../models/notification.models.js";
import Message from "../models/message.model.js"
import Archive from "../models/archive.models.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { getImageName } from "../utils/getImageName.js";

export const sendRequest = asyncHandler(async (req, res) => {
    try {
        const senderId = req.user._id;
        const { receiverId } = req.params;
        const [sender, receiver] = await Promise.all([
            User.findById(senderId),
            User.findById(receiverId)
        ]);
        if (!sender || !receiver) {
            return res.status(404).json({ message: 'User not found' });
        }
        const chat = await Chat.findOne({
            users: {
                $all: [senderId, receiverId]
            },
            isGroupChat: false,
        });
        if (chat) {
            return res.status(400).json({ message: "Request already been sended " })
        }
        const chatRequest = await Chat.create({
            users: [senderId, receiverId],
            request: {
                status: "sended",
                to: receiverId
            }
        });
        if (!chatRequest) {
            return res.status(400).json({ message: `Can't send request to ${receiver.fullname} ` })
        }
        await Notification.create({
            from: senderId,
            to: receiverId,
            message: `${sender.fullname} sent you a friend request`,
            isRead: false,
            type: "Friend Request"
        })
        const receiverSocketId = getReceiverSocketId(receiverId);
        io.to(receiverSocketId).emit("request-notification", {
            _id: new mongoose.Types.ObjectId,
            from: {
                _id: sender._id,
                fullname: sender.fullname,
                picture: sender.picture,
            },
            to: receiverId,
            message: `${sender.fullname} sent you a friend request`,
            type: "Friend Request",
            isRead: false,
            createdAt: Date.now()
        })
        io.to(receiverSocketId).emit("request-sended", "request Sended ")
        res.status(201).json(`Friend Request Sended to ${receiver.fullname}`)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})
export const updateChatStatus = asyncHandler(async (req, res) => {
    try {
        const sender = req.user;
        const { chatId } = req.params;
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: "Chat not found!" })
        }
        chat.request.status = "accepted";
        await chat.save();
        const receiverSocketId = getReceiverSocketId(chat.users[0])


        if (chat) {
            io.to(receiverSocketId).emit("request-accepted", {
                _id: new mongoose.Types.ObjectId,
                from: {
                    _id: sender._id,
                    fullname: sender.fullname,
                    picture: sender.picture,
                },
                to: chat.users[0],
                message: `${sender.fullname} has accepted your  friend request`,
                type: "Friend Request",
                isRead: false,
                createdAt: Date.now()
            })
            await Notification.create({
                from: sender._id,
                to: chat.users[0],
                message: `${sender.fullname} has accepted your  friend request`,
                isRead: false,
                type: "Friend Request"
            })
        }

        res.status(203).json({ message: "Request Accepted" })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})
export const getAllChats = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;

        // Fetch archive documents
        const archives = await Archive.find({ userId });

        // Get the array of chatIds from archives
        const archivedChatIds = archives.map(archive => archive.chatId);

        // Fetch chats that match the criteria and are not in the archives
        const chats = await Chat.aggregate([
            {
                $match: {
                    "users": new mongoose.Types.ObjectId(userId),
                    "isGroupChat": false,
                    "request.status": "accepted",
                    "_id": { $nin: archivedChatIds } // Filter out chats that are in the archives
                }
            },
            {
                $unwind: "$users"
            },
            {
                $match: {
                    "users": { $nin: [new mongoose.Types.ObjectId(userId)] } // Match users not equal to userId
                }
            },
            {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "users",
                    as: "user",
                }
            },
            {
                $unwind: "$user"
            },
            {
                $project: {
                    _id: 1,
                    isGroupChat: 1,
                    user: {
                        _id: 1,
                        fullname: 1,
                        picture: 1,
                    },
                    lastMessage: {
                        $arrayElemAt: ["$messages", -1],

                    },
                }
            }, {
                $lookup: {
                    from: "messages",
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
                $sort: {
                    "lastMessage.createdAt": -1
                }
            }
        ]);

        res.status(200).json(chats);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
});

export const createGroup = asyncHandler(async (req, res) => {
    try {
        const adminId = req.user?._id;
        const { stringifiedUsers, chatName } = req.body;
        const users = JSON.parse(stringifiedUsers);
        if (!Array.isArray(users)) {
            return res.status(400).json({ message: "Invalid users Array" })
        }
        // Check if adminId and users are provided
        if (!adminId || !users || !chatName) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const groupPictureLocalPath = req.file?.path;
        if (!groupPictureLocalPath) {
            return res.status(400).json({ message: "file path not found" })
        }
        const groupPicture = await uploadOnCloudinary(groupPictureLocalPath);
        // Create a new chat document
        const newChat = await Chat.create({
            chatName,
            groupPicture: groupPicture?.url || "",
            groupAdmin: adminId,
            users: [adminId, ...users], // Include admin in the users list
            isGroupChat: true,
        });
        for (const user of users) {
            const notification = await Notification.create({
                from: adminId,
                to: user,
                type: "groupChat",
                message: `${req.user.fullname} has added you in ${chatName} `,
            });
            const receiverSocketId = getReceiverSocketId(user)
            io.to(receiverSocketId).emit("groupRequest", notification);
        }

        // Return the newly created chat document as the response
        res.status(201).json(newChat);
    } catch (error) {

        res.status(500).json({ message: error.message });
    }
});
export const getAllGroups = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;
        const archives = await Archive.find({ userId });

        // Get the array of chatIds from archives
        const archivedChatIds = archives.map(archive => archive.chatId);
        const groups = await Chat.aggregate([
            {
                $match: {
                    "users": new mongoose.Types.ObjectId(userId),
                    "isGroupChat": true,
                    "_id": { $nin: archivedChatIds }
                }
            },
            {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "users",
                    as: "users"
                }
            },
            {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "groupAdmin",
                    as: "groupAdmin"
                }

            },
            {
                $unwind: "$groupAdmin"
            },
            {
                $addFields: {
                    lastMessage: {
                        $arrayElemAt: ["$messages", -1]
                    }
                }
            },
            {
                $lookup: {
                    from: "messages",
                    foreignField: "_id",
                    localField: "lastMessage",
                    as: "lastMessage"
                }
            },
            {
                $unwind: {
                    path: "$lastMessage",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "lastMessage.senderId",
                    as: "lastMessage.senderId"

                }
            },
            {
                $unwind: {
                    path: "$lastMessage.senderId",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    "_id": 1,
                    "chatName": 1,
                    "groupPicture": 1,
                    "isGroupChat": 1,
                    "lastMessage": {
                        $cond: {
                            if: { $ne: ["$lastMessage", {}] },
                            then: {
                                "_id": "$lastMessage._id",
                                "senderId": "$lastMessage.senderId._id",
                                "senderName": "$lastMessage.senderId.fullname",
                                "message": "$lastMessage.message",
                                "createdAt": "$lastMessage.createdAt"
                            },
                            else: "$$REMOVE"
                        }
                    },
                    "groupAdmin.fullname": 1,
                    "groupAdmin._id": 1,
                    "groupAdmin.picture": 1,
                    "groupAdmin.email": 1,
                    "users._id": 1,
                    "users.fullname": 1,
                    "users.picture": 1,
                    "users.email": 1,
                    "users.about": 1,
                    "createdAt": 1,
                }
            }, {
                $sort: {
                    "lastMessage.createdAt": -1
                }
            }
        ])
        res.status(200).json(groups)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})
export const removeUserFromGroup = asyncHandler(async (req, res) => {
    try {
        const loggedInUser = req.user?._id;
        const { chatId } = req.params;
        const { userToBeRemovedId } = req.body;
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: "Chat not found!" })
        }
        if (chat.groupAdmin.toString() !== loggedInUser.toString()) {
            return res.status(400).json({ message: "You are not a group admin" })
        }
        const userToBeRemoved = await User.findById(userToBeRemovedId)
        if (!userToBeRemoved) {
            return res.status(404).json({ message: "User not found!" })
        }
        const isUserRemoved = await Chat.findByIdAndUpdate(chatId, {
            $pull: { users: userToBeRemovedId }
        });
        if (!isUserRemoved) {
            return res.status(400).json({ message: "User not removed from group" })
        }
        res.status(203).json({ message: "User removed from group successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})
export const addUserToGroup = asyncHandler(async (req, res) => {
    try {
        const loggedInUser = req.user;
        const { chatId } = req.params;

        const { users } = req.body;
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: "Chat not found!" })
        }
        if (chat.groupAdmin.toString() !== loggedInUser._id.toString()) {
            return res.status(400).json({ message: "You are not a group admin" })
        }

        const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            { $push: { users: { $each: JSON.parse(users) } } },
            { new: true }
        );

        if (!updatedChat) {
            return res.status(400).json({ message: "Users not added to the group" })
        }

        for (const id of JSON.parse(users)) {
            const receiverSocketId = getReceiverSocketId(id);
            const notification = await Notification.create({
                from: loggedInUser._id,
                to: id,
                type: "groupChat",
                message: `${req.user.fullname} has added you in ${updatedChat.chatName} `,
            });

            io.to(receiverSocketId).emit("new-participants-to-group", { notification, chatId });
        }

        res.status(201).json({ message: "Users added to the group successfully" });

    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message })
    }
})
export const fetchToBeAddedParticipants = asyncHandler(async (req, res) => {
    try {
        const { chatId } = req.params;
        const { query } = req.query;
        const chat = await Chat.findById(chatId);
        const allUsers = await User.find({}, 'fullname email picture about');
        if (!chat) res.status(404).json({ message: "Chat not found!" })
        const existingGroupUsers = chat.users;
        let newParticipants = allUsers.filter(user => !existingGroupUsers.some(existingUser => existingUser._id.toString() === user._id.toString()));

        // Apply query based on fullname
        if (query) {
            const regex = new RegExp(query, 'i'); // Case-insensitive regex
            newParticipants = newParticipants.filter(user => regex.test(user.fullname));
        }
        if (newParticipants.length < 0) {
            return res.status(404).json({ message: "No users found" })
        }
        res.status(200).json(newParticipants)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})
export const getSingleGroup = asyncHandler(async (req, res) => {
    try {
        const { chatId } = req.params;
        const chat = await Chat.findById(chatId)
            .populate("users", "fullname email picture about")
            .populate("groupAdmin", "fullname email picture about")
        if (!chat) res.status(404).json({ message: "Chat not found" })
        res.status(200).json(chat)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})
export const leaveGroup = asyncHandler(async (req, res) => {
    try {
        const { chatId } = req.params;
        const user = req.user;
        const chat = await Chat.findById(chatId);
        if (!chat) res.status(404).json({ message: "Chat not found" })
        chat.users = chat.users.filter(id => id.toString() !== user._id.toString());
        await chat.save()
        for (const id of chat.users) {
            const receiverSocketId = getReceiverSocketId(id);
            const notification = await Notification.create({
                from: user._id,
                to: id,
                type: "groupChat",
                message: `${req.user.fullname} has left ${chat.chatName}  `,
            });

            io.to(receiverSocketId).emit("leave-group-notification", { notification, chatId: chat._id })
        }
        res.status(200).json({ message: "Removed from Group" })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})
export const deleteGroup = asyncHandler(async (req, res) => {
    try {
        const { chatId } = req.params;
        const chat = await Chat.findById(chatId);
        if (!chat) res.status(404).json({ message: "Chat not found!" });
        const pictureName = getImageName(chat.groupPicture);
        const isPictureDeleted = await deleteFromCloudinary(pictureName);
        if (!isPictureDeleted) res.status(500).json({ message: "Group picture not deleted" });
        await Message.deleteMany({ chatId })
        const deletedChat = await Chat.findByIdAndDelete(chatId);
        if (!deletedChat) res.status(500).json({ message: "Cannot delete this group" })
        res.status(200).json({ message: "Group Deleted Successfully" })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})