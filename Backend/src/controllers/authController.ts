import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { signupSchema, signinSchema } from '../validators/authValidator';
import { sendSuccess, sendError } from '../utils/response';

const generateToken = (userId: string) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your_jwt_secret_key_here', {
    expiresIn: '7d',
  });
};

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = signupSchema.parse(req.body);

    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      return sendError(res, 'Email already in use', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validatedData.password, salt);

    const user = await User.create({
      name: validatedData.name,
      email: validatedData.email,
      passwordHash,
    });

    const token = generateToken(user._id.toString());

    return sendSuccess(res, {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        settings: user.settings,
      },
    }, 201);
  } catch (error) {
    next(error);
  }
};

export const signin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = signinSchema.parse(req.body);

    const user = await User.findOne({ email: validatedData.email });
    if (!user) {
      return sendError(res, 'Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(validatedData.password, user.passwordHash);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password', 401);
    }

    const token = generateToken(user._id.toString());

    return sendSuccess(res, {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        settings: user.settings,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user?.id).select('-passwordHash');
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
};
