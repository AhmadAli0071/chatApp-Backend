import Chat from "../models/chat.models.js";
import User from "../models/user.models.js";
import Message from "../models/message.model.js";
import asyncHandler from "express-async-handler";
import { getReceiverSocketId, io } from "../socket/socket.js";
import mongoose from "mongoose";

export const sendMessage = asyncHandler(async (req, res) => {
    try {
        const senderId = req.user?._id;
        const { chatId } = req.params;
        const { message, receiverId } = req.body;
        const sender = await User.findById(senderId);
        const senderSocketId = getReceiverSocketId(senderId);
        const receiverSocketId = getReceiverSocketId(receiverId);
        const chat = await Chat.findById(chatId);
        if (!chat) res.status(404).json({ message: "Chat Not Found!" })
        if (senderSocketId || receiverSocketId) {
            [senderSocketId, receiverSocketId].forEach(id => {
                io.to(id).emit("newMessage", {
                    _id: new mongoose.Types.ObjectId,
                    sender: {
                        _id: sender._id,
                        fullname: sender.fullname,
                        picture: sender.picture,
                        phoneNumber: sender.phoneNumber,
                    },
                    receiverId,
                    message,
                    chatId,
                    createdAt: Date.now()
                });
            });
        }
        const newMessage = await Message.create({
            senderId,
            receiverId,
            message,
            chatId
        })

        if (!newMessage) res.status(400).json({ message: "Can't send message" })

        await newMessage.save();
        chat.messages.push(newMessage?._id)
        await chat.save();

        res.status(201).json("message sended")
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})
export const allMessages = asyncHandler(async (req, res) => {
    try {
        const { chatId } = req.params;
        const messages = await Message.aggregate([
            {
                $match: {
                    chatId: new mongoose.Types.ObjectId(chatId)
                }
            }, {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "senderId",
                    as: "sender"
                }
            }, {
                $unwind: "$sender"
            },
            {
                $project: {
                    _id: 1,
                    sender: {
                        _id: 1,
                        fullname: 1,
                        picture: 1,
                        phoneNumber: 1,
                    },
                    receiverId: 1,
                    message: 1,
                    isEdited: 1,
                    chatId: 1,
                    starredBy: 1,
                    createdAt: 1
                }
            }

        ])
        res.status(200).json(messages)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})
export const fetchGroupMessages = asyncHandler(async (req, res) => {
    try {

    } catch (error) {

    }
})
export const sendGroupMessage = asyncHandler(async (req, res) => {
    try {
        const sender = req.user;
        const { chatId } = req.params;
        const { message, receivers } = req.body;
        const receiverIds = JSON.parse(receivers);
        const chat = await Chat.findById(chatId);
        if (!chat) res.status(404).json({ message: "Chat Not Found!" });
        if (receiverIds.length > 0) {
            receiverIds.forEach(receiverId => {
                const socketId = getReceiverSocketId(receiverId);
                io.to(socketId).emit("groupMessage", {
                    _id: new mongoose.Types.ObjectId,
                    sender: {
                        _id: sender._id,
                        fullname: sender.fullname,
                        picture: sender.picture,
                        phoneNumber: sender.phoneNumber,
                    },
                    receiverId,
                    message,
                    chatId,
                    createdAt: Date.now()
                })
            })
        }
        const newMessage = await Message.create({
            senderId: sender._id,
            message,
            chatId
        })

        if (!newMessage) res.status(400).json({ message: "Can't send message" })

        await newMessage.save();
        chat.messages.push(newMessage?._id)
        await chat.save();

        res.status(201).json("message sended")
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

export const starMessage = asyncHandler(async (req, res) => {
    try {
        const { messageId } = req.params;
        const user = req.user;


        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }


        if (message.starredBy.includes(user._id)) {
            return res.status(400).json({ message: "Message already added to starred" });
        }
        message.starredBy.push(user._id);
        await message.save();


        return res.status(200).json({ message: "Message starred successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export const getStarredMessages = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;
        const starredMessages = await Message.aggregate([
            {
                $match: {
                    starredBy: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup: {
                    from: "chats",
                    foreignField: "_id",
                    localField: "chatId",
                    as: "chatId",
                }
            },
            {
                $unwind: "$chatId"
            },
            {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "senderId",
                    as: "senderInfo"
                }
            },
            {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "receiverId",
                    as: "receiverInfo"
                }
            },
            {
                $unwind: "$senderInfo"
            },
            {
                $unwind: {
                    path: "$receiverInfo",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    "sentBy": {
                        $cond: {
                            if: { $eq: ["$senderId", new mongoose.Types.ObjectId(userId)] },
                            then: { _id: "$senderId", name: "You", picture: "$senderInfo.picture" },
                            else: { _id: "$senderId", name: "$senderInfo.fullname", picture: "$senderInfo.picture" }
                        }
                    },
                    "receivedBy": {
                        $cond: {
                            if: { $eq: ["$receiverId", new mongoose.Types.ObjectId(userId)] },
                            then: "You",
                            else: "$receiverInfo.fullname"
                        }
                    }
                }
            },
            {
                $addFields: {
                    "receivedBy": {
                        $cond: {
                            if: { $eq: ["$chatId.isGroupChat", true] },
                            then: "$chatId.chatName",
                            else: "$receivedBy"
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    chatId: "$chatId._id",
                    isGroupChat: "$chatId.isGroupChat",

                    sentBy: 1,
                    message: 1,
                    receivedBy: 1,
                    createdAt: 1,
                }
            }, {
                $lookup: {
                    from: "chats",
                    foreignField: "_id",
                    localField: "chatId",
                    as: "chatId"
                }
            },
            {
                $unwind: {
                    path: "$chatId",
                    preserveNullAndEmptyArrays: true
                }

            },
            // _id, sentBy , message ,createdAt,receivedBy,isGroupChat , chatId
            {
                $project: {
                    _id: 1,
                    sentBy: 1,
                    message: 1,
                    createdAt: 1,
                    receivedBy: 1,
                    isGroupChat: 1,
                    chat: {
                        $cond: {
                            if: { $eq: ["$chatId.isGroupChat", false] },
                            then: {
                                _id: "$chatId._id",
                                isGroupChat: "$chatId.isGroupChat",
                                createdAt: "$chatId.createdAt",
                                user: {
                                    $arrayElemAt: ["$chatId.users", 1]
                                },
                                groupPicture: "$chatId.groupPicture",
                                chatName: "$chatId.chatName",
                                lastMessage: {
                                    $arrayElemAt: ["$chatId.messages", -1],

                                },
                            },
                            else: {
                                _id: "$chatId._id",
                                isGroupChat: "$chatId.isGroupChat",
                                users: "$chatId.users",
                                groupPicture: "$chatId.groupPicture",
                                chatName: "$chatId.chatName",
                                groupAdmin: "$chatId.groupAdmin",
                                createdAt: "$chatId.createdAt",
                                lastMessage: {
                                    $let: {
                                        vars: {
                                            lastMsg: { $arrayElemAt: ["$chatId.messages", -1] }
                                        },
                                        in: {
                                            $ifNull: ["$$lastMsg", null]
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    "_id": 1,
                    "sentBy": 1,
                    "chat": 1,
                    "message": 1,
                    "createdAt": 1,
                    "receivedBy": 1,
                    "isGroupChat": 1,
                }
            }, {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "chat.users",
                    as: "chat.users"
                }
            }
            , {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "chat.groupAdmin",
                    as: "chat.groupAdmin"
                }
            }, {
                $lookup: {
                    from: "messages",
                    foreignField: "_id",
                    localField: "chat.lastMessage",
                    as: "chat.lastMessage"
                }
            },
            {
                $unwind: {
                    path: "$chat.lastMessage",
                    preserveNullAndEmptyArrays: true,
                }

            },
            {
                $unwind: {
                    path: "$chat.groupAdmin",
                    preserveNullAndEmptyArrays: true,

                }
            },
            {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "chat.user",
                    as: "chat.user"
                }
            },
            {
                $unwind: {
                    path: "$chat.user",
                    preserveNullAndEmptyArrays: true,

                }
            },
            {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "chat.lastMessage.senderId",
                    as: "chat.lastMessage.senderId"
                }
            },
            {
                $unwind: {
                    path: "$chat.lastMessage.senderId",
                    preserveNullAndEmptyArrays: true,
                }
            },
            {
                $project: {
                    _id: 1,
                    sentBy: 1,
                    message: 1,
                    createdAt: 1,
                    receivedBy: 1,
                    isGroupChat: 1,
                    "chat._id": 1,
                    "chat.chatName": 1,
                    "chat.groupPicture": 1,
                    "chat.isGroupChat": 1,
                    "chat.createdAt": 1,
                    "chat.users._id": 1,
                    "chat.users.fullname": 1,
                    "chat.users.email": 1,
                    "chat.users.about": 1,
                    "chat.users.picture": 1,
                    "chat.user": {
                        _id: 1,
                        fullname: 1,
                        picture: 1
                    },
                    "chat.groupAdmin._id": 1,
                    "chat.groupAdmin.fullname": 1,
                    "chat.groupAdmin.email": 1,
                    "chat.groupAdmin.picture": 1,
                    "chat.lastMessage": {
                        $cond: {
                            if: { $ne: ["$chat.lastMessage", {}] },
                            then: {
                                "_id": "$chat.lastMessage._id",
                                "senderId": "$chat.lastMessage.senderId._id",
                                "senderName": "$chat.lastMessage.senderId.fullname",
                                "message": "$chat.lastMessage.message",
                                "createdAt": "$chat.lastMessage.createdAt"
                            },
                            else: "$$REMOVE"
                        }
                    },
                }
            }
        ]);

        return res.status(200).json(starredMessages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export const unstarMessage = asyncHandler(async (req, res) => {
    try {
        const { messageId, userId } = req.params;
        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }
        if (message.starredBy.length > 0) {
            message.starredBy = message.starredBy.filter(star => star.toString() !== userId.toString());
        }
        await message.save();
        res.status(200).json({ message: "Message removed from Starred" });
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})


export const editMessage = asyncHandler(async (req, res) => {
    try {
        const { messageId, chatId } = req.params;
        const { text } = req.body;
        const message = await Message.findOne({ _id: messageId, chatId });
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }
        const chat = await Chat.findById(message.chatId);


        message.isEdited = true
        message.message = text;
        await message.save();

        chat.users.forEach(id => {
            const receiverSocketId = getReceiverSocketId(id);
            io.to(receiverSocketId).emit("updated-message", chat.users)
        })

        res.status(200).json(message);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
});
