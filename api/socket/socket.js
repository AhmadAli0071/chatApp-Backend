import { Server } from "socket.io"
import dotenv from "dotenv"
import http from "http";
import express from "express";
const app = express();
dotenv.config()
const server = http.createServer(app);
// Dynamically select the frontend origin based on the environment
const FRONTEND_ORIGIN = process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_ORIGIN_PROD
    : process.env.FRONTEND_ORIGIN_DEV;
const io = new Server(server, {
    cors: {
        origin: FRONTEND_ORIGIN,
        methods: ["GET", "POST"],
        credentials: true,
    }
});
console.log("Socket CORS Origin:", FRONTEND_ORIGIN); // Debugging log
const userSocketMap = {};

export const getReceiverSocketId = (receiverId) => {
    return userSocketMap[receiverId];
};
io.on("connection", (socket) => {
    console.log("New socket connection:", socket.id); // Debugging log
    const userId = socket.handshake.query.userId;
    if (userId && userId !== "undefined") userSocketMap[userId] = socket.id;
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
    socket.on("disconnect", () => {

        delete userSocketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    })
    socket.on("typing", ({ receiver, sender }) => {
        const userSocketId = getReceiverSocketId(receiver._id)
        io.to(userSocketId).emit("typing", { name: sender.fullname, id: receiver._id })
    })
})
export { app, server, io };