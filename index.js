require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const schedule = require('node-schedule');

const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

app.post('/webhook', line.middleware(config), (req, res) => {
  res.status(200).end();
  Promise.all(req.body.events.map(handleEvent))
    .catch(err => console.error('❌ Webhook error:', err));
});

app.use(express.json());

async function handleEvent(event) {
  if (event.type === 'join') {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '👋 請用指定格式設定提醒：\n!日期 時間 提醒內容 日期 時間\n例如：!6/2 13:20提醒我6/2 14:00要吃漢'
    });
    return;
  }
  if (event.type !== 'message' || event.message.type !== 'text') return;

  const text = event.message.text.trim();
  if (!text.startsWith('!')) return;
  const commandText = text.slice(1).trim();

  // 正則匹配格式：!6/2 13:20提醒我6/2 14:00要吃漢
  const pattern = /(\d{1,2}\/\d{1,2})\s+(\d{1,2}:\d{2})(.*)(\d{1,2}\/\d{1,2})\s+(\d{1,2}:\d{2})(.*)/;
  const match = commandText.match(pattern);

  if (!match) {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ 請用正確格式：\n!日期 時間 提醒內容 日期 時間提醒內容\n例如：!6/2 13:20提醒我6/2 14:00要吃漢'
    });
    return;
  }

  // 取最後一組日期時間
  const date2 = match[4];
  const time2 = match[5];
  let remindText = (match[3] + (match[6] || '')).trim();

  // 用 JS 解析日期時間（台灣時區）
  const now = new Date();
  const defaultYear = now.getFullYear();
  const [month, day] = date2.split('/').map(Number);
  const [hour, minute] = time2.split(':').map(Number);
  const parsedDate = new Date(defaultYear, month - 1, day, hour, minute);

  if (isNaN(parsedDate.getTime())) {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ 時間解析失敗，請確認格式正確，例如：6/2 14:00'
    });
    return;
  }

  // 台灣時區顯示
  const options = {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  const formattedDate = parsedDate.toLocaleString('zh-TW', options);

  schedule.scheduleJob(parsedDate, () => {
    const targetId = event.source.groupId || event.source.userId;
    client.pushMessage(targetId, {
      type: 'text',
      text: `🔔 提醒：${remindText}`
    }).catch(console.error);
  });

  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: `✅ 已設定提醒：${remindText}\n提醒時間：${formattedDate}`
  });
}

app.get('/', (req, res) => {
  res.send('✅ LINE Reminder Bot is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
