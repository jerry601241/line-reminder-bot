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

  // 正規表達式匹配你的指定格式
  const pattern = /(!?)(\d{1,2}\/\d{1,2})\s+(\d{1,2}:\d{2})(.*?)(\d{1,2}\/\d{1,2})\s+(\d{1,2}:\d{2})/;
  const match = commandText.match(pattern);

  if (!match) {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ 請用正確格式：\n!日期 時間 提醒內容 日期 時間\n例如：!6/2 13:20提醒我6/2 14:00要吃漢'
    });
    return;
  }

  // 提取時間和內容
  const [_, prefix, date1, time1, remindText, date2, time2] = match;
  const remindDateTime = `${date2} ${time2}`;

  // 用 chrono 解析最後一組時間（強制台灣時區）
  const parsedDate = chrono.zh.parseDate(remindDateTime, new Date(), {
    timezones: { 'CST': 480 } // 台灣時區 UTC+8
  });

  if (!parsedDate) {
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

  // 設定提醒
  schedule.scheduleJob(parsedDate, () => {
    const targetId = event.source.groupId || event.source.userId;
    client.pushMessage(targetId, {
      type: 'text',
      text: `🔔 提醒：${remindText.trim()}`
    }).catch(console.error);
  });

  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: `✅ 已設定提醒：${remindText.trim()}\n提醒時間：${formattedDate}`
  });
}

app.get('/', (req, res) => {
  res.send('✅ LINE Reminder Bot is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
