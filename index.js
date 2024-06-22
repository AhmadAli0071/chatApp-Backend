
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./src/db/index.js";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import userRoutes from "./src/routes/user.routes.js";
import chatRoutes from "./src/routes/chat.routes.js";
import messageRoutes from "./src/routes/message.routes.js";
import archiveRoutes from "./src/routes/archive.routes.js"
import notificationRoutes from "./src/routes/notification.routes.js"
import { app, server } from "./src/socket/socket.js";
dotenv.config();

// cors config
// Dynamically select the frontend origin based on the environment
const FRONTEND_ORIGIN = process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_ORIGIN_PROD
    : process.env.FRONTEND_ORIGIN_DEV;
app.use(cors({
    origin: FRONTEND_ORIGIN,
    credentials: true
}));
app.use(bodyParser.json())
app.use(cookieParser())
// routes declaration

app.get('/api/v1/', (_, res) => {
    console.log("hello");
    res.send(`<h2> ${process.env.NODE_ENV === 'production' ? "production" : "development"} </h2>`);

});
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/chat", chatRoutes)
app.use("/api/v1/message", messageRoutes)
app.use("/api/v1/notifications", notificationRoutes)
app.use("/api/v1/archive", archiveRoutes)
// db connection and server listening
connectDB()
    .then(() => {
        server.listen(process.env.PORT, () => {
            console.log(`Server is running at port:${process.env.PORT} !!`);
        });
    })
    .catch((err) => {
        console.log(err);
    });