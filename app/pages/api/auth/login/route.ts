/* eslint-disable @typescript-eslint/no-explicit-any */
// import { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/database';
import { verifyPassword, generateToken } from '../../../../lib/auth';

export async function POST(request: NextRequest) {
  // if (req.method !== 'POST') {
  //   return res.status(405).json({ message: 'Method not allowed' });
  // }

  const { email, password } = await request.json()

  try {
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    ) as any;

    if (users.length === 0) {
      return NextResponse.json({ message: 'User not found' });
    }

    const user = users[0];
    // const isValid = await verifyPassword(password, user.password);

    // if (!isValid) {
    //   return NextResponse.json({ message: isValid });
    // }

    const token = generateToken(user.id);
    
    return NextResponse.json({
      message: 'Login successful',
      token,
      user: { 
        id: user.id, 
        uid: user.uid, 
        displayName: user.displayName, 
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Server error' });
  }
}
