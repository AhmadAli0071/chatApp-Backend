import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(process.env.MONGO_URL)
        if (connectionInstance) {
            console.log("Database Connection");
        }
    } catch (error) {
        console.log("MongoDB Connection Error", error);
    }
}
export default connectDB;