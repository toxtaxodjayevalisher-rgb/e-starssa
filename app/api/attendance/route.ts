import { NextResponse } from 'next/server';
import { submitAttendance } from '@/app/actions';
export async function POST(req: Request) {
  const body = await req.json();
  const data = await submitAttendance(body.sessionId, body.attendances);
  return NextResponse.json(data);
}