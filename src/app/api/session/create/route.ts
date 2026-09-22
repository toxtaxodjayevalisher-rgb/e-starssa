import { NextResponse } from 'next/server';
import { createOrUpdateSession } from '@/app/actions';
export async function POST() {
  const data = await createOrUpdateSession();
  return NextResponse.json(data);
}