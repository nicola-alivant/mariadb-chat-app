/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/database';
import { verifyToken } from '../../../lib/auth';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  
  if (!token) {
    return NextResponse.json({ message: 'No token provided' }, { status: 401 });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }

  try {
    const [users] = await pool.execute(
      `SELECT id, name, email, role FROM users WHERE id != ? AND role != 'admin'`,
      [decoded.userId]
    ) as any;
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}