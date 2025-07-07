import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const hashPassword = async (password: string): Promise<string> => await bcrypt.hash(password, 12);

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => await bcrypt.compare(password, hashedPassword);

export const generateToken = (userId: number): string => jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });

export const verifyToken = (token: string): { userId: number } | null => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        return null;
    }
};
