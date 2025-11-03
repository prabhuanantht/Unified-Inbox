import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    
    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user: session.user });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}

