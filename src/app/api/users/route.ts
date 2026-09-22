import { NextResponse } from 'next/server';
import { getUsers } from '@/app/actions';
export async function GET() {
  const data = await getUsers();
  return NextResponse.json(data);
}