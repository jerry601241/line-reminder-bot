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

// ✅ 使用 LINE SDK 的 middleware 前，不能先加其他 body-parser！
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    await Promise.all(req.body.events.map(handleEvent));
    res.status(200).end();
  } catch (err) {
    console.error('❌ Webhook error:', err);
    res.status(500).end();
  }
});

// ✅ 其他 API 才加 JSON 處理
app.use(express.json());

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