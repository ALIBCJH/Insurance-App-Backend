import express from "express";
import dotenv from "dotenv";
import { connectToDatabase } from "./config/db";
import adminRoutes from "./routes/admin.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON requests
app.use(express.json());

// Connect to MongoDB
connectToDatabase();

// Register Admin routes under /api/admin
app.use("/api/admin", adminRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.send("Welcome to the backend server with TS and Express");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
