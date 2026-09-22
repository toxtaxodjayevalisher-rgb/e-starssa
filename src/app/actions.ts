'use server'

import { prisma } from '@/lib/db'

export async function getStudents() {
  return await prisma.student.findMany({
    include: {
      attendances: {
        include: { session: true }
      }
    }
  });
}

export async function getSession() {
  // Bugungi sanadagi sessionni topish
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  let session = await prisma.session.findFirst({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      }
    },
    include: { attendances: true }
  });

  return session;
}

export async function createOrUpdateSession() {
  let session = await getSession();
  
  if (!session) {
    session = await prisma.session.create({
      data: {
        date: new Date(),
        isClosed: false
      },
      include: { attendances: true }
    });
  }
  
  return session;
}

export async function submitAttendance(sessionId: string, attendances: any[]) {
  // Avval eski ma'lumotlarni o'chiramiz
  await prisma.attendance.deleteMany({
    where: { sessionId }
  });

  // Yangilarini qo'shamiz
  for (const a of attendances) {
    await prisma.attendance.create({
      data: {
        sessionId,
        studentId: a.studentId,
        status: a.status,
        reason: a.reason,
        time: a.time
      }
    });
  }

  return { success: true };
}

export async function closeSession(sessionId: string) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { isClosed: true }
  });
  return { success: true };
}

export async function getUsers() {
  return await prisma.user.findMany();
}

export async function getHistorySessions() {
  return await prisma.session.findMany({
    where: { isClosed: true },
    orderBy: { date: 'desc' },
    include: { 
      attendances: {
        include: { student: true }
      }
    }
  });
}
