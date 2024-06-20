
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./api/db/index.js";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import userRoutes from "./api/routes/user.routes.js";
import chatRoutes from "./api/routes/chat.routes.js";
import messageRoutes from "./api/routes/message.routes.js";
import archiveRoutes from "./api/routes/archive.routes.js"
import notificationRoutes from "./api/routes/notification.routes.js"
import { app, server } from "./api/socket/socket.js";
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
    res.send('<h2> App is running !! </h2>');

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