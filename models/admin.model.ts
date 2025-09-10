import mongoose, { Document, Schema, Types } from "mongoose";
import bcrypt from "bcryptjs";

// -------------------- Message Schema --------------------
const MessageSchema = new Schema({
  content: { type: String, required: true },
  sentAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["pending", "sent"], default: "pending" },
});

// -------------------- Policy Interface --------------------
export interface IPolicy {
  name: string;
  email: string;
  phoneNumber: string;
  insuranceType: string;
  insuranceCompany: string;
  policyNumber: string;
  policyStartDate: Date;
  policyEndDate: Date;
  premiumAmount: number;
  messages?: {
    content: string;
    sentAt?: Date;
    status?: "pending" | "sent";
  }[];
}

// -------------------- Admin Interface --------------------
export interface IAdmin extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  tenantId: string;
  policies: IPolicy[];
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
}

// -------------------- Policy Schema --------------------
const policySchema = new Schema<IPolicy>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  insuranceType: { type: String, required: true },
  insuranceCompany: { type: String, required: true },
  policyNumber: { type: String, required: true },
  policyStartDate: { type: Date, required: true },
  policyEndDate: { type: Date, required: true },
  premiumAmount: { type: Number, required: true },
  messages: [MessageSchema], // embedded messages per policy
});

// -------------------- Admin Schema --------------------
const adminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    tenantId: { type: String, required: true, unique: true },
    policies: [policySchema], // embedded array of policies
  },
  { timestamps: true }
);

// -------------------- Password Hash Middleware --------------------
adminSchema.pre<IAdmin>("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// -------------------- Password Compare Method --------------------
adminSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// -------------------- Admin Model --------------------
const Admin = mongoose.model<IAdmin>("Admin", adminSchema);
export default Admin;
