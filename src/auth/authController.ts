import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { UserModel, IUser } from '../models/User';
import { config } from '../config';
import { isMongoConnected } from '../db/connection';
import { AuthenticatedRequest } from './authMiddleware';

// In-memory fallback user registry for resilience
const fallbackUsers: Map<string, any> = new Map();

function generateToken(user: { _id?: any; id?: string; username: string; email: string; name: string; role?: string }): string {
  const userId = user._id ? user._id.toString() : (user.id || user.username);
  return jwt.sign(
    {
      userId,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role || 'customer'
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

// Seed default known accounts with password 'password123'
export async function seedInitialUsers(): Promise<void> {
  const defaultUsers = [
    {
      username: 'rahul',
      email: 'rahul.sharma@example.com',
      name: 'Rahul Sharma',
      phone: '+91 98765 43210',
      address: '42 MG Road, Indiranagar, Bengaluru 560038',
      city: 'Bengaluru 560038'
    },
    {
      username: 'sneha',
      email: 'sneha.k@example.com',
      name: 'Sneha Kapur',
      phone: '+91 98111 22334',
      address: '18 Bandra West, Mumbai 400050',
      city: 'Mumbai 400050'
    },
    {
      username: 'vikram',
      email: 'v.mehta@corp.in',
      name: 'Vikram Mehta',
      phone: '+91 99887 76655',
      address: '77 Cyber City, Gurugram 122002',
      city: 'Gurugram 122002'
    },
    {
      username: 'aditi',
      email: 'aditi.roy@gmail.com',
      name: 'Aditi Roy',
      phone: '+91 97766 55443',
      address: '12 Alipore Road, Kolkata 700027',
      city: 'Kolkata 700027'
    },
    {
      username: 'niraj',
      email: 'niraj@example.com',
      name: 'Niraj',
      phone: '+91 98000 11223',
      address: '101 Residency Road, Central District, Bengaluru 560025',
      city: 'Bengaluru 560025'
    },
    {
      username: 'admin',
      email: 'admin@shopstore.com',
      name: 'Store Administrator',
      phone: '+91 98000 99999',
      address: 'ShopStore HQ, 100ft Road, Indiranagar, Bengaluru 560038',
      city: 'Bengaluru 560038',
      role: 'admin'
    }
  ];

  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  for (const u of defaultUsers) {
    fallbackUsers.set(u.username.toLowerCase(), {
      ...u,
      id: `cust_${u.username}`,
      passwordHash: defaultPasswordHash,
      role: 'customer',
      createdAt: new Date()
    });

    if (isMongoConnected()) {
      try {
        const existing = await UserModel.findOne({
          $or: [{ username: u.username.toLowerCase() }, { email: u.email.toLowerCase() }]
        });
        if (!existing) {
          await UserModel.create({
            ...u,
            passwordHash: defaultPasswordHash,
            role: 'customer'
          });
        }
      } catch (e) {}
    }
  }
}

export class AuthController {
  /**
   * Register a new user
   */
  public async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password, name, phone, address, city } = req.body;

      if (!username || !email || !password || !name) {
        res.status(400).json({
          status: 'error',
          message: 'Username, email, password, and full name are required.'
        });
        return;
      }

      const cleanUsername = username.trim().toLowerCase();
      const cleanEmail = email.trim().toLowerCase();

      if (cleanUsername.length < 3) {
        res.status(400).json({
          status: 'error',
          message: 'Username must be at least 3 characters long.'
        });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({
          status: 'error',
          message: 'Password must be at least 6 characters long.'
        });
        return;
      }

      // Check if user exists
      let userExists = false;
      if (isMongoConnected()) {
        try {
          const existing = await UserModel.findOne({
            $or: [{ username: cleanUsername }, { email: cleanEmail }]
          });
          if (existing) userExists = true;
        } catch (e) {}
      }

      if (!userExists && fallbackUsers.has(cleanUsername)) {
        userExists = true;
      }

      if (userExists) {
        res.status(400).json({
          status: 'error',
          message: 'An account with this username or email already exists.'
        });
        return;
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      let savedUser: any = null;
      if (isMongoConnected()) {
        try {
          savedUser = await UserModel.create({
            username: cleanUsername,
            email: cleanEmail,
            passwordHash,
            name: name.trim(),
            phone: phone ? phone.trim() : '+91 98000 00000',
            address: address ? address.trim() : '101 Residency Road, Central District, Bengaluru 560025',
            city: city ? city.trim() : 'Bengaluru 560025',
            role: 'customer'
          });
        } catch (mongoErr: any) {
          console.warn(`[Auth] Mongo write fallback: ${mongoErr.message}`);
        }
      }

      if (!savedUser) {
        savedUser = {
          id: `cust_${cleanUsername}`,
          username: cleanUsername,
          email: cleanEmail,
          passwordHash,
          name: name.trim(),
          phone: phone ? phone.trim() : '+91 98000 00000',
          address: address ? address.trim() : '101 Residency Road, Central District, Bengaluru 560025',
          city: city ? city.trim() : 'Bengaluru 560025',
          role: 'customer',
          createdAt: new Date()
        };
      }

      fallbackUsers.set(cleanUsername, savedUser);

      const token = generateToken(savedUser);

      res.status(201).json({
        status: 'success',
        message: 'Account created successfully.',
        token,
        user: {
          id: savedUser._id ? savedUser._id.toString() : (savedUser.id || savedUser.username),
          username: savedUser.username,
          email: savedUser.email,
          name: savedUser.name,
          phone: savedUser.phone,
          address: savedUser.address,
          city: savedUser.city,
          role: savedUser.role
        }
      });
    } catch (error: any) {
      console.error('[Auth Error Register]', error);
      res.status(500).json({ status: 'error', message: error.message || 'Server error during registration.' });
    }
  }

  /**
   * Login with username/email and password
   */
  public async login(req: Request, res: Response): Promise<void> {
    try {
      const { usernameOrEmail, password } = req.body;

      if (!usernameOrEmail || !password) {
        res.status(400).json({
          status: 'error',
          message: 'Username/Email and password are required.'
        });
        return;
      }

      const query = usernameOrEmail.trim().toLowerCase();
      let user: any = null;

      if (isMongoConnected()) {
        try {
          user = await UserModel.findOne({
            $or: [{ username: query }, { email: query }]
          });
        } catch (e) {}
      }

      if (!user) {
        user = fallbackUsers.get(query);
        if (!user) {
          for (const fallback of fallbackUsers.values()) {
            if (fallback.email?.toLowerCase() === query || fallback.username?.toLowerCase() === query) {
              user = fallback;
              break;
            }
          }
        }
      }

      if (!user) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid credentials. User not found.'
        });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid credentials. Incorrect password.'
        });
        return;
      }

      const token = generateToken(user);

      res.json({
        status: 'success',
        message: 'Login successful.',
        token,
        user: {
          id: user._id ? user._id.toString() : (user.id || user.username),
          username: user.username,
          email: user.email,
          name: user.name,
          phone: user.phone,
          address: user.address,
          city: user.city,
          role: user.role
        }
      });
    } catch (error: any) {
      console.error('[Auth Error Login]', error);
      res.status(500).json({ status: 'error', message: error.message || 'Server error during login.' });
    }
  }

  /**
   * Direct Easy Password Reset (No OTP/Email verification barrier)
   */
  public async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { usernameOrEmail, newPassword } = req.body;

      if (!usernameOrEmail || !newPassword) {
        res.status(400).json({
          status: 'error',
          message: 'Please enter your username/email and a new password.'
        });
        return;
      }

      if (newPassword.length < 4) {
        res.status(400).json({
          status: 'error',
          message: 'New password must be at least 4 characters long.'
        });
        return;
      }

      const query = usernameOrEmail.trim().toLowerCase();
      let user: any = null;

      if (isMongoConnected()) {
        try {
          user = await UserModel.findOne({
            $or: [{ username: query }, { email: query }]
          });
        } catch (e) {}
      }

      if (!user) {
        user = fallbackUsers.get(query);
        if (!user) {
          for (const fb of fallbackUsers.values()) {
            if (fb.email?.toLowerCase() === query || fb.username?.toLowerCase() === query) {
              user = fb;
              break;
            }
          }
        }
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      if (user) {
        if (user.save && isMongoConnected()) {
          try {
            user.passwordHash = newPasswordHash;
            user.resetPasswordToken = undefined;
            user.resetPasswordOtp = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
          } catch (e) {}
        }
        user.passwordHash = newPasswordHash;
        fallbackUsers.set(user.username.toLowerCase(), user);
      } else {
        // Auto-create account if it doesn't exist yet
        const cleanName = query.split('@')[0];
        const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
        const email = query.includes('@') ? query : `${query}@example.com`;

        let saved: any = null;
        if (isMongoConnected()) {
          try {
            saved = await UserModel.create({
              username: query,
              email,
              passwordHash: newPasswordHash,
              name: formattedName,
              phone: '+91 98000 11223',
              address: '101 Residency Road, Central District, Bengaluru 560025',
              city: 'Bengaluru 560025',
              role: 'customer'
            });
          } catch (e) {}
        }

        if (!saved) {
          saved = {
            id: `cust_${query.replace(/[^a-z0-9]/g, '_')}`,
            username: query,
            email,
            passwordHash: newPasswordHash,
            name: formattedName,
            phone: '+91 98000 11223',
            address: '101 Residency Road, Central District, Bengaluru 560025',
            city: 'Bengaluru 560025',
            role: 'customer',
            createdAt: new Date()
          };
        }
        fallbackUsers.set(query, saved);
      }

      res.json({
        status: 'success',
        message: 'Password updated successfully! You can now sign in with your new password.'
      });
    } catch (error: any) {
      console.error('[Auth Error ResetPassword]', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  public async forgotPassword(req: Request, res: Response): Promise<void> {
    return this.resetPassword(req, res);
  }

  /**
   * Get Current Authenticated User Profile
   */
  public async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Not authenticated.' });
        return;
      }

      let user: any = null;
      if (isMongoConnected()) {
        try {
          user = await UserModel.findById(req.user.userId);
        } catch (e) {}
      }

      if (!user) {
        user = fallbackUsers.get(req.user.username.toLowerCase());
      }

      if (!user) {
        res.json({
          status: 'success',
          user: req.user
        });
        return;
      }

      res.json({
        status: 'success',
        user: {
          id: user._id ? user._id.toString() : (user.id || user.username),
          username: user.username,
          email: user.email,
          name: user.name,
          phone: user.phone,
          address: user.address,
          city: user.city,
          role: user.role
        }
      });
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  /**
   * Update Profile Details (Address, Phone, Name)
   */
  public async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Not authenticated.' });
        return;
      }

      const { name, phone, address, city } = req.body;
      let user: any = null;

      if (isMongoConnected()) {
        try {
          user = await UserModel.findById(req.user.userId);
          if (user) {
            if (name) user.name = name.trim();
            if (phone) user.phone = phone.trim();
            if (address) user.address = address.trim();
            if (city) user.city = city.trim();
            await user.save();
          }
        } catch (e) {}
      }

      const fallback = fallbackUsers.get(req.user.username.toLowerCase());
      if (fallback) {
        if (name) fallback.name = name.trim();
        if (phone) fallback.phone = phone.trim();
        if (address) fallback.address = address.trim();
        if (city) fallback.city = city.trim();
      }

      res.json({
        status: 'success',
        message: 'Profile updated successfully.',
        user: user ? {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          name: user.name,
          phone: user.phone,
          address: user.address,
          city: user.city,
          role: user.role
        } : fallback
      });
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }
}

export const authController = new AuthController();
