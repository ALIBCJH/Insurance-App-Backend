// controllers/admin.controller.ts

import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit";
import mongoose from "mongoose";
import Admin, { IPolicy } from "../models/admin.model";

// Extend Express Request to include admin from middleware
interface AuthenticatedRequest extends Request {
  admin?: any; // Ideally, type this properly with your Admin model interface
}

// -------------------- Helpers --------------------
const generateToken = (id: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined in env");

  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// -------------------- Auth --------------------
export const registerAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const tenantId = new Date().getTime().toString();
    const newAdmin = new Admin({ name, email, password, tenantId });
    await newAdmin.save();

    const token = generateToken(newAdmin._id.toString());

    res.status(201).json({
      message: "Admin registered successfully",
      token,
      admin: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        tenantId: newAdmin.tenantId,
      },
    });
  } catch (error) {
    console.error("❌ Error registering admin:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const loginAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(admin._id.toString());

    res.status(200).json({
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        tenantId: admin.tenantId,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// -------------------- Policies --------------------
export const addPolicy = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const {
      name,
      email,
      phoneNumber,
      insuranceType,
      insuranceCompany,
      policyNumber,
      policyStartDate,
      policyEndDate,
      premiumAmount,
      messages, // Optional: array of messages from frontend
    } = req.body;

    // Initialize policies array if not existing
    admin.policies = admin.policies || [];

    // Check for duplicate policy number
    if (admin.policies.some((p) => p.policyNumber === policyNumber)) {
      return res.status(400).json({ message: "Policy number already exists" });
    }

    // Construct new policy object
    const newPolicy = {
      _id: new mongoose.Types.ObjectId(), // Generate nested _id
      name,
      email,
      phoneNumber,
      insuranceType,
      insuranceCompany,
      policyNumber,
      policyStartDate,
      policyEndDate,
      premiumAmount,
      messages: Array.isArray(messages)
        ? messages.map((msg) => ({
            content: msg.content,
            status: msg.status || "pending",
            sentAt: msg.sentAt || new Date(),
          }))
        : [],
    };

    // Push and save
    admin.policies.push(newPolicy);
    await admin.save();

    res.status(201).json({
      message: "Policy added successfully",
      policy: newPolicy,
    });
  } catch (error) {
    console.error("❌ Error adding policy:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all policies
export const getPolicies = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    res.status(200).json(admin.policies);
  } catch (error) {
    console.error("❌ Error fetching policies:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get a single policy by ID
export const getPolicyById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const admin = req.admin;
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const policy = admin.policies.find(
      (p: any) => p._id.toString() === req.params.id
    );
    if (!policy) return res.status(404).json({ message: "Policy not found" });

    res.status(200).json(policy);
  } catch (error) {
    console.error("❌ Error fetching policy by ID:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// -------------------- Notifications --------------------
export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const admin = req.admin;
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const today = new Date();

    const notifications = admin.policies
      .filter((policy: IPolicy) => {
        const endDate = new Date(policy.policyEndDate);
        const diffInTime = endDate.getTime() - today.getTime();
        const diffInDays = Math.ceil(diffInTime / (1000 * 3600 * 24));
        return diffInDays <= 14;
      })
      .map((policy: IPolicy) => {
        const endDate = new Date(policy.policyEndDate);
        const expired = endDate < today;

        return {
          id: policy._id,
          title: expired ? "Policy Expired" : "Policy Expiring Soon",
          message: expired
            ? `The policy for ${policy.name} (Policy No: ${policy.policyNumber}) has already expired.`
            : `The policy for ${policy.name} (Policy No: ${
                policy.policyNumber
              }) will expire on ${endDate.toDateString()}.`,
          holderName: policy.name,
          dueDate: endDate,
          status: expired ? "Expired" : "Expiring Soon",
          dismissible: true,
          popup: true,
        };
      });

    res.status(200).json({
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("❌ Error generating notifications:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Search policies
export const searchPolicy = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { q = "" } = req.query as { q: string };
    const regex = new RegExp(q, "i");

    const admin = req.admin;
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const results = admin.policies.filter(
      (p: IPolicy) => regex.test(p.name) || regex.test(p.policyNumber)
    );

    res.status(200).json(results);
  } catch (error) {
    console.error("❌ Error searching policies:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Renew Policy
export const renewPolicy = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const { id } = req.params;

    // Find policy by _id
    const policy = admin.policies.id(id);
    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }

    // Update fields
    Object.assign(policy, req.body);

    await admin.save();

    return res.status(200).json({
      message: "Policy updated successfully",
      policy,
    });
  } catch (error) {
    console.error("❌ Error renewing policy:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Delete Policy
export const deletePolicy = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const admin = req.admin;
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    admin.policies = admin.policies.filter(
      (p: IPolicy) => p.policyNumber !== req.params.policyNumber
    );
    await admin.save();

    res.status(200).json({ message: "Policy deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting policy:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// -------------------- Send Policy SMS --------------------
export const sendPolicySms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { policyId } = req.params;

    // Find the admin document that contains the policy
    const admin: IAdmin | null = await Admin.findOne({ "policies._id": policyId });

    if (!admin) {
      res.status(404).json({ message: "Policy not found" });
      return;
    }

    // Use Mongoose subdocument method to fetch the policy
    const policy: IPolicy | undefined = admin.policies.id(policyId);

    if (!policy) {
      res.status(404).json({ message: "Policy not found" });
      return;
    }

    // Build personalized SMS
    const expiryDate = new Date(policy.policyEndDate).toDateString();
    const message = `Hello ${policy.name}, please remember to renew your ${policy.insuranceType} policy (Policy No: ${policy.policyNumber}). It expires on ${expiryDate}.`;

    // Respond with phone + message (you can later send via SMS API)
    res.status(200).json({
      phoneNumber: policy.phoneNumber,
      message,
    });
  } catch (error) {
    console.error("❌ Error generating SMS:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// Generate PDF report
export const generatePolicyReport = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const admin = req.admin;
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const policy = admin.policies.find(
      (p: IPolicy) => p.policyNumber === req.params.policyNumber
    );
    if (!policy) return res.status(404).json({ message: "Policy not found" });

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${policy.name.replace(
        /\s+/g,
        "_"
      )}_Policy_Report.pdf`
    );

    doc.pipe(res);
    doc
      .fontSize(20)
      .text("Insurance Policy Report", { align: "center" })
      .moveDown();

    doc.fontSize(12).text(`Name: ${policy.name}`);
    doc.text(`Email: ${policy.email}`);
    doc.text(`Phone: ${policy.phoneNumber}`);
    doc.text(`Insurance Type: ${policy.insuranceType}`);
    doc.text(`Insurance Company: ${policy.insuranceCompany}`);
    doc.text(`Policy Number: ${policy.policyNumber}`);
    doc.text(
      `Policy Start Date: ${new Date(policy.policyStartDate).toDateString()}`
    );
    doc.text(
      `Policy End Date: ${new Date(policy.policyEndDate).toDateString()}`
    );
    doc.text(`Premium Amount: $${policy.premiumAmount}`);

    doc.end();
  } catch (error) {
    console.error("❌ Error generating PDF report:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
