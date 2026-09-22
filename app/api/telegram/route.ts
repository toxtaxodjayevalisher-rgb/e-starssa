import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { isUpdate, isCommand, commandMessage, absentStudents, updatedStudents, totalStudents } = await req.json();

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const teacherChatId = process.env.TEACHER_CHAT_ID;
    const adminChatId = process.env.ADMIN_CHAT_ID;

    if (!botToken) {
      return NextResponse.json({ error: "Bot token topilmadi" }, { status: 500 });
    }

    let teacherMessage = "";
    let adminMessage = "";

    if (isCommand) {
      // Ustoz tomonidan yuborilgan tezkor xabar
      teacherMessage = `📩 <b>O'qituvchidan xabar:</b>\n\n<i>"${commandMessage}"</i>`;
      // Rahbariyatga xabar bormasligi ham mumkin, lekin hozircha ikkalasiga yuborsak bo'ladi yoki faqat teacher guruhiga
      adminMessage = ""; // Tezkor buyruqlarni faqat sardorlar ko'radigan guruhga yuborish mantiqiyroq
    }
    else {
      const absences = (isUpdate ? updatedStudents : absentStudents) || [];
      const presentCount = totalStudents - absences.length;
      const percentage = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1) : 0;
      const dateStr = new Date().toLocaleDateString('uz-UZ');

      const absentList = absences.filter((s: any) => !s.status || s.status === 'kelmadi');
      const excusedList = absences.filter((s: any) => s.status === 'sababli');
      const lateList = absences.filter((s: any) => s.status === 'kech_qoldi');

      // 1. Rahbariyat uchun xabar (Admin)
      adminMessage = `Assalomu alaykum\n`;
      adminMessage += `Sana: ${dateStr}\n`;
      adminMessage += `IG2-26 guruhi Davomat: ${percentage}%\n`;

      if (absentList.length > 0 || excusedList.length > 0) {
        adminMessage += `Kimlar kelmagan:\n`;
        absentList.forEach((s: any) => {
          adminMessage += `• ${s.name} - ${s.reason ? s.reason : 'Sababsiz'}\n`;
        });
        excusedList.forEach((s: any) => {
          adminMessage += `• ${s.name} - Sababli ${s.reason ? `(${s.reason})` : ''}\n`;
        });
      }

      // 2. Ustoz uchun xabar (Teacher)
      teacherMessage = `Assalomu alaykum (o'qituvchi uchun)\n`;
      teacherMessage += `Sana: ${dateStr}\n`;
      teacherMessage += `IG2-26 guruhi Davomat: ${percentage}%\n`;

      if (absentList.length > 0 || excusedList.length > 0) {
        teacherMessage += `Kimlar kelmagan:\n`;
        absentList.forEach((s: any) => {
          teacherMessage += `• ${s.name} - ${s.reason ? s.reason : 'Sababsiz'}\n`;
        });
        excusedList.forEach((s: any) => {
          teacherMessage += `• ${s.name} - Sababli ${s.reason ? `(${s.reason})` : ''}\n`;
        });
      }

      if (lateList.length > 0) {
        teacherMessage += `Kechikib kelganlar:\n`;
        lateList.forEach((s: any) => {
          teacherMessage += `• ${s.name} - ${s.time || ''} ${s.reason ? `(${s.reason})` : ''}\n`;
        });
      }

      if (absentList.length === 0 && excusedList.length === 0 && lateList.length === 0) {
        teacherMessage += `✅ Barcha o'quvchilar darsda ishtirok etmoqda.\n`;
      }
    }

    // Telegram API ga so'rov yuborish funksiyasi
    const sendMessage = async (chatId: string, text: string) => {
      if (!chatId) return null;
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML'
        })
      });
      return res.json();
    };

    // Chat ID lar mavjud bo'lsa xabarni yuborish
    const results = [];
    if (teacherChatId && teacherMessage) {
      results.push(await sendMessage(teacherChatId, teacherMessage));
    }
    if (adminChatId && adminMessage) {
      results.push(await sendMessage(adminChatId, adminMessage));
    }

    // Yangi qo'shilgan guruh (bunga ham xabar boradi)
    const extraGroupId = process.env.EXTRA_GROUP_ID;
    if (extraGroupId) {
      if (isCommand && teacherMessage) {
        results.push(await sendMessage(extraGroupId, teacherMessage));
      } else {
        if (adminMessage) results.push(await sendMessage(extraGroupId, adminMessage));
        if (teacherMessage) results.push(await sendMessage(extraGroupId, teacherMessage));
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Telegramga yuborildi",
      sent: results.length > 0,
      teacherMessagePreview: teacherMessage,
      telegramResponses: results
    });

  } catch (error) {
    console.error("Telegram xatolik:", error);
    return NextResponse.json({ error: "Ichki server xatoligi yuz berdi" }, { status: 500 });
  }
}
