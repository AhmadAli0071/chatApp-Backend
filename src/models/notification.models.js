import mongoose from "mongoose";
const notificationSchema = new mongoose.Schema({

    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },

}, { timestamps: true })
const Notification = mongoose.model("Notification", notificationSchema)
export default Notification;