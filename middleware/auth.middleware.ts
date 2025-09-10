import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import Admin, { IAdmin } from "../models/admin.model";

// Extend Express Request to include admin as a full Mongoose document
export interface AuthRequest extends Request {
  admin?: IAdmin; // full Mongoose document
}

// Define decoded JWT structure
interface DecodedToken extends JwtPayload {
  id: string;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authorization token missing" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    const decoded = jwt.verify(token, secret) as DecodedToken;

    // Fetch admin as full Mongoose document (no .lean())
    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      res.status(404).json({ message: "Admin not found" });
      return;
    }

    // Attach full Mongoose document
    req.admin = admin;

    next();
  } catch (error: any) {
    console.error("Auth middleware error:", error.message);

    if (error.name === "TokenExpiredError") {
      res
        .status(401)
        .json({ message: "Token has expired, please log in again" });
    } else if (error.name === "JsonWebTokenError") {
      res.status(401).json({ message: "Invalid token" });
    } else {
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  }
};
