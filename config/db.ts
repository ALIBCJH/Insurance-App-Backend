import mongoose from 'mongoose';

export const connectToDatabase = async () => {
    try{
        await mongoose.connect(process.env.MONGO_URI!);
        console.log("✅ Connected to MongoDB Successfully");
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        process.exit(1);
    }
}