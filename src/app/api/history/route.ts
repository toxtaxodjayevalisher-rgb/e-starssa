import { NextResponse } from 'next/server';
import { getHistorySessions } from '@/app/actions';
export async function GET() {
  const data = await getHistorySessions();
  return NextResponse.json(data);
}