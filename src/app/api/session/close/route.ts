import { NextResponse } from 'next/server';
import { closeSession } from '@/app/actions';
export async function POST(req: Request) {
  const body = await req.json();
  const data = await closeSession(body.sessionId);
  return NextResponse.json(data);
}