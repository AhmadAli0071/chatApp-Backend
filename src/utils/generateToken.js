import jwt from "jsonwebtoken";
import User from "../models/user.models.js";
const generateToken = (_id, secretKey, expiry) => {
    const payload = {
        _id,
    }

    return jwt.sign(payload, secretKey, { expiresIn: expiry })
}

const generateAccessAndRefreshTokens = async (userId, _, res) => {
    try {
        const user = await User.findById(userId)
        const accessToken = generateToken(userId, process.env.ACCESS_TOKEN_SECRET, process.env.ACCESS_TOKEN_EXPIRY)
        const refreshToken = generateToken(userId, process.env.REFRESH_TOKEN_SECRET, process.env.REFRESH_TOKEN_EXPIRY)

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }


    } catch (error) {
        res.status(500).json({ message: "Something went wrong while generating refresh and access token", message2: error.message })
    }
}
export default generateAccessAndRefreshTokens;