import mongoose from "mongoose";
import Notification from "../models/notification.models.js";
import asyncHandler from "express-async-handler";

export const getNotifications = asyncHandler(async (req, res) => {
    try {
        const userId = req.user?._id;
        const notifications = await Notification.aggregate([
            {
                $match: {
                    to: userId
                }
            }, {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "from",
                    as: "from"
                }
            }, {
                $unwind: {
                    path: "$from",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    to: 1,
                    from: {
                        _id: 1,
                        fullname: 1,
                        picture: 1
                    },
                    message: 1,
                    isRead: 1,
                    type: 1,
                    createdAt: 1
                }
            }, {
                $sort: {
                    createdAt: -1
                }
            }
        ])
        if (notifications.length > 0) {
            return res.status(200).json(notifications)
        }
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})