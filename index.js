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

// 1. 只在 /webhook 註冊 LINE middleware
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    await Promise.all(req.body.events.map(handleEvent));
    res.status(200).end();
  } catch (err) {
    console.error('❌ Webhook error:', err);
    res.status(500).end();
  }
});

// 2. 其他 API 才加 JSON 處理
app.use(express.json());

// 3. 處理 LINE 事件
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;

  const text = event.message.text.trim();

  // 1. 用 chrono 中文解析時間
  const parsedResults = chrono.zh.parse(text, new Date(), { forwardDate: true });
  const parsedDate = parsedResults[0]?.start?.date();

  // 2. 提取提醒內容：移除時間描述
  let remindText = text;
  if (parsedResults.length > 0) {
    const { index, text: timeText } = parsedResults[0];
    // 移除時間描述（如「1分鐘後」、「下午2:53」等）
    remindText = (text.slice(0, index) + text.slice(index + timeText.length)).replace(/提醒(我)?/g, '').trim();
    // 若提醒內容太短，退回原始文字
    if (!remindText) remindText = text;
  }

  if (!parsedDate) {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '請輸入正確的提醒格式，例如：\n「10分鐘後提醒我下午3點開會」\n或：「明天中午12點提醒我團隊會議」'
    });
    return;
  }

  // 3. 台灣時區顯示
  const options = {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  const formattedDate = parsedDate.toLocaleString('zh-TW', options);

  // 4. 設定提醒
  schedule.scheduleJob(parsedDate, () => {
    const targetId = event.source.groupId || event.source.userId;
    client.pushMessage(targetId, {
      type: 'text',
      text: `🔔 開會提醒：${remindText}`,
    }).catch(console.error);
  });

  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: `✅ 已設定提醒：${remindText}\n提醒時間：${formattedDate}`
  });
}

// 5. 健康檢查用
app.get('/', (req, res) => {
  res.send('✅ LINE Reminder Bot is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
