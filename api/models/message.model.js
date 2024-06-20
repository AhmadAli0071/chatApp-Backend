import mongoose from "mongoose";

const messageSchema = mongoose.Schema({

    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",

    },
    message: {
        type: String,
        required: true,
    },
    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat"
    },
    isRead: {
        type: Boolean,
        default: false
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, {
    timestamps: true
})

const Message = mongoose.model("Message", messageSchema);
export default Message;