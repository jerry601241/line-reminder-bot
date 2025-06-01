require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const chrono = require('chrono-node');
const schedule = require('node-schedule');

const app = express();
app.use(express.json()); // 用於處理 JSON 資料
app.use(express.urlencoded({ extended: true })); // 處理 URL 編碼的表單資料

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

// 處理 LINE 的 webhook 請求
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    await Promise.all(req.body.events.map(handleEvent));
    res.status(200).end();
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).end();
  }
});

// 主邏輯：處理訊息並設定提醒
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;

  const text = event.message.text.trim();
  const parsed = chrono.parse(text);

  if (!parsed.length) {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ 無法解析時間，請輸入像這樣的指令：\n提醒開會 6月15日 14:00\n或：明天提醒我中午12點要開會',
    });
    return;
  }

  const date = parsed[0].start.date(); // 取第一個解析到的時間
  const timeText = parsed[0].text; // 時間字串，例如「明天下午2點」
  const remindText = text.replace(timeText, '').trim(); // 移除時間字串，留下提醒內容

  // 確認是群組還是個人
  const targetId = event.source.groupId || event.source.userId;

  // 安排提醒
  schedule.scheduleJob(date, () => {
    client.pushMessage(targetId, {
      type: 'text',
      text: `🔔 開會提醒：${remindText || '您設定的事項'}（時間：${date.toLocaleString('zh-TW')}）`,
    });
  });

  // 回覆用戶確認訊息
  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: `✅ 已設定提醒：${remindText || text}\n⏰ 提醒時間：${date.toLocaleString('zh-TW')}`,
  });
}

// 健康檢查頁面（Render 用）
app.get('/', (req, res) => {
  res.send('✅ LINE Reminder Bot is running');
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});