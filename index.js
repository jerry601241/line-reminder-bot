require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const chrono = require('chrono-node');
const schedule = require('node-schedule');

const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

// ✅ 重要：使用 express.raw() 處理 Webhook
app.post('/webhook', express.raw({ type: '*/*' }), line.middleware(config), async (req, res) => {
  try {
    const body = JSON.parse(req.body.toString()); // 將 raw buffer 轉成 JSON
    await Promise.all(body.events.map(handleEvent));
    res.status(200).end();
  } catch (err) {
    console.error('❌ Webhook error:', err);
    res.status(500).end();
  }
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;

  const text = event.message.text.trim();
  const parsedDate = chrono.parseDate(text);
  const match = text.match(/提醒開會\s*(.*)/);
  const remindText = match?.[1] || text;
  const date = parsedDate;

  if (!date) {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '請輸入正確的提醒格式，例如：\n提醒開會 6月15日 14:00\n或：明天提醒我下星期五中午12點要和組長們開會'
    });
    return;
  }

  // 設定提醒
  schedule.scheduleJob(date, () => {
    const targetId = event.source.groupId || event.source.userId;
    client.pushMessage(targetId, {
      type: 'text',
      text: `🔔 開會提醒：${remindText}`,
    }).catch(console.error);
  });

  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: `✅ 已設定提醒：${remindText}，提醒時間：${date.toLocaleString('zh-TW')}`,
  });
}

app.get('/', (req, res) => {
  res.send('✅ LINE Reminder Bot is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});