import mongoose from "mongoose";
const chatSchema = new mongoose.Schema({

    chatName: {
        type: String,
        trim: true
    },
    groupPicture: {
        type: String,
        default: ""
    },
    isGroupChat: {
        type: Boolean,
        default: false
    },
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    ],
    messages: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: [],
        },
    ],
    groupAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    request: {
        status: {
            type: String,
            enum: ["pending", "sended", "accepted"],
            default: "pending",
            trim: true
        },
        to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }

    }

}, {
    timestamps: true
})

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;