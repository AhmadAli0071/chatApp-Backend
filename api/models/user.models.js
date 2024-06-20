import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,

    },
    phoneNumber: {
        type: String,
        default: ""
    },
    about: {
        type: String,
        default: "Hey there! I am using WhatsApp.",
    },
    picture: {
        type: String,
    },

    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    },
    refreshToken: {
        type: String
    }
})


const schema = mongoose.model("User", userSchema)
export default schema;