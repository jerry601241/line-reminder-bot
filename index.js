require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const chrono = require('chrono-node');
const schedule = require('node-schedule');

const app = express();
app.use(express.json());

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

const reminders = []; // 儲存提醒項目

app.post('/webhook', line.middleware(config), async (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).then(() => res.end());
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;
  const text = event.message.text.trim();

  // 嘗試解析自然語言或固定格式時間
  const parsedDate = chrono.parseDate(text);

  // 提醒開會 6月15日 14:00
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

  // 安排提醒任務
  schedule.scheduleJob(date, () => {
    client.pushMessage(event.source.groupId || event.source.userId, {
      type: 'text',
      text: `🔔 開會提醒：${remindText}`,
    });
  });

  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: `✅ 已設定提醒：${remindText}，提醒時間：${date.toLocaleString('zh-TW')}`,
  });
}

app.get('/', (req, res) => {
  res.send('LINE Reminder Bot is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});