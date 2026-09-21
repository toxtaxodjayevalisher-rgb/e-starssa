import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const extraGroupId = process.env.EXTRA_GROUP_ID;

async function sendMessage(text) {
  if (!botToken) {
    console.error("Bot token topilmadi!");
    return;
  }
  
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: extraGroupId,
        text: text,
      })
    });
    const data = await res.json();
    console.log(`[${new Date().toLocaleTimeString('uz-UZ')}] Xabar yuborildi: "${text}" - Holati: ${data.ok}`);
  } catch (err) {
    console.error("Telegram API xatoligi:", err);
  }
}

// 1. Dushanbadan Jumagacha soat 08:35 da
cron.schedule('35 8 * * 1-5', () => {
  sendMessage("Davomatni qildingizmi ?");
});

// 2. Dushanbadan Jumagacha soat 12:00 da
cron.schedule('0 12 * * 1-5', () => {
  sendMessage("Ustoz, davomat tasdiqlanganmi ?");
});

// 3. Dushanbadan Jumagacha soat 16:00 da
cron.schedule('0 16 * * 1-5', () => {
  sendMessage("Kelmagan o'quvchilar bilan gaplashdingizmi ?");
});

console.log("E-starssa Bot avtomatik xabarlar xizmati (Cron) ishga tushdi...");
console.log("- 08:35 (Davomatni qildingizmi ?)");
console.log("- 12:00 (Ustoz, davomat tasdiqlanganmi ?)");
console.log("- 16:00 (Kelmagan o'quvchilar bilan gaplashdingizmi ?)");
