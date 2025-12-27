import { NextResponse } from 'next/server';
import { findUserByEmail, updateUser } from '../../../../utils/auth.js';

// Simple JWT creation without external dependencies
function createToken(payload, secret) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + (24 * 60 * 60) // 24 hours
  };
  
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(tokenPayload));
  
  // For simplicity, we're creating a basic token structure
  // In production, you'd want proper HMAC signing
  return `${encodedHeader}.${encodedPayload}.signature`;
}

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // Find user
    const user = findUserByEmail(email);
    
    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login
    updateUser(user.id, { lastLogin: new Date().toISOString() });

    // Create JWT token
    const token = createToken({ 
      id: user.id, 
      email: user.email, 
      role: user.role 
    }, process.env.JWT_SECRET || 'fallback-secret-key');

    // Create response with user data
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });

    // Set HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}