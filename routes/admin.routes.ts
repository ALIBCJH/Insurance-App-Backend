import express from "express";
import { protect } from "../middleware/auth.middleware";

import {
  registerAdmin,
  loginAdmin,
  addPolicy,
  renewPolicy,
  deletePolicy,
  getPolicies,
   getNotifications,
  searchPolicy,
  generatePolicyReport,
  getPolicyById,
  sendPolicySms
} from "../controllers/admin.controller";

const router = express.Router();

// -------------------- Auth --------------------
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);

// -------------------- Policies / Clients --------------------
// Protect all routes below with JWT middleware
router.use(protect);

// Add a new policy/client
router.post("/policies", addPolicy);

// Renew/update a policy by ID
router.put("/policies/:id/renew", renewPolicy);

// Get notifications for policies
router.get("/policies/notifications", getNotifications);

//Send policy Sms
router.post("/policies/:id/send-sms", sendPolicySms);

// Delete a policy by policyNumber
router.delete("/policies/:policyNumber", deletePolicy);

// Get all policies for the logged-in admin
router.get("/policies", getPolicies);



// Get Policy by ID
router.get("/policies/:id", protect, getPolicyById);

// Search policies (by name or policyNumber)
router.get("/policies/search", protect, searchPolicy); // add 'protect' middleware

// Get policy by ID
router.get("/policies/:id", protect, getPolicyById);

// Get preloaded message for a user
router.get("/users/:id/send-sms", protect, sendPolicySms);


// Generate PDF report for a policy
router.get("/policies/:policyNumber/report", generatePolicyReport);

// Get notifications for expired policies


export default router;
