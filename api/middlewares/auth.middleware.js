import User from "../models/user.models.js"
import jwt from "jsonwebtoken";

const verifyJWT = async (req, res, next) => {
    try {

        const token = req.cookies?.accessToken || req.headers?.Authorization?.split(" ")[1] || req.headers?.authorization?.split(" ")[1];

        if (!token) {

            return res.status(401).json("Unauthorized request");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken -accessToken");

        if (!user) {

            return res.status(401).json("Invalid Access Token");
        }

        req.user = user;
        next();
    } catch (error) {

        res.status(401).json({ message: error?.message || "Invalid access token" });
    }
};

export default verifyJWT;
