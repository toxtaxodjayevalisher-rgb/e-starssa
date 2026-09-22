import { NextResponse } from 'next/server';
import { getSession } from '@/app/actions';
export async function GET() {
  const data = await getSession();
  return NextResponse.json(data);
}