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
app.post('/webhook', line.middleware(config), (req, res) => {
  // 立即回應 LINE 平台，避免 timeout
  res.status(200).end();

  // 之後再處理事件（不影響 webhook 回應速度）
  Promise.all(req.body.events.map(handleEvent))
    .catch(err => console.error('❌ Webhook error:', err));
});

// 2. 其他 API 才加 JSON 處理
app.use(express.json());

// 3. 處理 LINE 事件
async function handleEvent(event) {
  // 機器人被邀請加入群組時
  if (event.type === 'join') {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '👋 謝謝邀請我加入群組！請用「!」開頭輸入提醒指令，例如：\n!明天下午3點提醒我開會'
    });
    return;
  }

  // 只處理文字訊息
  if (event.type !== 'message' || event.message.type !== 'text') return;

  const text = event.message.text.trim();

  // 只回應以 ! 開頭的訊息
  if (!text.startsWith('!')) return;

  // 移除開頭的 !
  const commandText = text.slice(1).trim();

  // 用 chrono 中文解析所有時間描述
  const parsedResults = chrono.zh.parse(commandText, new Date(), { forwardDate: true });

  let parsedDate;
  let remindText = commandText;

  if (parsedResults.length > 0) {
    // 取最後一個時間（通常是最終要提醒的時間）
    const lastTime = parsedResults[parsedResults.length - 1];
    parsedDate = lastTime.start?.date();

    // 只移除最後一個時間描述，保留其他內容
    remindText = commandText.slice(0, lastTime.index) +
                 commandText.slice(lastTime.index + lastTime.text.length);
    // 移除「提醒我」等關鍵詞
    remindText = remindText.replace(/提醒(我)?/g, '').trim();
    if (!remindText) remindText = commandText;
  }

  if (!parsedDate) {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '請輸入明確時間，例如：\n!6月2日13:00提醒我吃漢堡\n或：!明天下午12:00提醒我團隊會議\n建議用24小時制或明確寫出上午/下午。'
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
    second: '2-digit',
    hour12: false
  };
  const formattedDate = parsedDate.toLocaleString('zh-TW', options);

  // 設定提醒
  schedule.scheduleJob(parsedDate, () => {
    const targetId = event.source.groupId || event.source.userId;
    client.pushMessage(targetId, {
      type: 'text',
      text: `🔔 開會提醒：${remindText}`,
    }).catch(console.error);
  });

  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: `✅ 已設定提醒：${remindText}\n提醒時間：${formattedDate}\n（建議用24小時制或明確寫出上午/下午）`
  });
}

// 4. 健康檢查用
app.get('/', (req, res) => {
  res.send('✅ LINE Reminder Bot is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
