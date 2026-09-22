import { NextResponse } from 'next/server';
import { getStudents } from '@/app/actions';
export async function GET() {
  const data = await getStudents();
  return NextResponse.json(data);
}