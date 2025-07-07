/* eslint-disable @typescript-eslint/no-explicit-any */
// import { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/database';
import { hashPassword, generateToken } from '../../../../lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  // if (req.method !== 'POST') {
  //   return res.status(405).json({ message: 'Method not allowed' });
  // }

  const { displayName, email, password } = await request.json()

  try {
    const hashedPassword = await hashPassword(password);
    const uid = uuidv4();
    
    const [result] = await pool.execute(
      'INSERT INTO users (uid, displayName, email, password) VALUES (?, ?, ?, ?)',
      [uid, displayName, email, hashedPassword]
    ) as any;

    const token = generateToken(result.insertId);
    
    return NextResponse.json({
      message: 'User created successfully',
      token,
      user: { 
        id: result.insertId, 
        uid, 
        displayName, 
        email
      }
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ message: 'Email already exists' });
    } else {
      console.error('Registration error:', error);
      return NextResponse.json({ message: 'Server error' });
    }
  }
}
