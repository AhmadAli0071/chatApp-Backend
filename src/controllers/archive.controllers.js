import mongoose from "mongoose";
import Archive from "../models/archive.models.js";
import Chat from "../models/chat.models.js"
import asyncHandler from "express-async-handler";

export const addToArchive = asyncHandler(async (req, res) => {
    try {
        const userId = req.user?._id
        const { chatId } = req.params;
        const chat = await Chat.findById(chatId);
        if (!chat) res.status(404).json({ message: "Chat not found" });
        const archive = await Archive.create({
            chatId,
            userId,
        })
        await archive.save();
        res.status(200).json(archive);
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})
export const getArchive = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;

        // Fetch archives
        const archives = await Archive.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup: {
                    from: "chats",
                    foreignField: "_id",
                    localField: "chatId",
                    as: "chatId"
                }
            },
            {
                $unwind: "$chatId"
            },
            {
                $project: {
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
                    "chat": 1
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
                    "_id": 1,
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


        // Send the response
        if (archives.length > 0) {
            res.status(200).json(archives);
        } else {
            res.status(200).json({ message: "Archive is Empty" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export const removeFromArchive = asyncHandler(async (req, res) => {
    try {
        const { archiveId } = req.params;
        const archive = await Archive.findByIdAndDelete(archiveId)
        if (!archive) {
            return res.status(404).json({ message: "Archive not found" })
        }
        res.status(200).json({ message: "Archive removed from archive" })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

