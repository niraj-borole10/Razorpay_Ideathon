import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  resetPasswordToken?: string;
  resetPasswordOtp?: string;
  resetPasswordExpires?: Date;
  role: 'customer' | 'admin' | 'merchant';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      default: '+91 98000 00000'
    },
    address: {
      type: String,
      default: '101 Residency Road, Central District, Bengaluru 560025'
    },
    city: {
      type: String,
      default: 'Bengaluru 560025'
    },
    resetPasswordToken: {
      type: String,
      default: null
    },
    resetPasswordOtp: {
      type: String,
      default: null
    },
    resetPasswordExpires: {
      type: Date,
      default: null
    },
    role: {
      type: String,
      enum: ['customer', 'admin', 'merchant'],
      default: 'customer'
    }
  },
  {
    timestamps: true,
    bufferCommands: false
  }
);

export const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

