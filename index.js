require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);
const app = express();

// 1. 僅在 /webhook 註冊 LINE middleware
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    await Promise.all(req.body.events.map(handleEvent));
    res.status(200).end();
  } catch (err) {
    console.error('❌ Webhook error:', err);
    res.status(500).end();
  }
});

// 2. 限制 express.json() 作用範圍（非 /webhook）
app.use((req, res, next) => {
  if (!req.path.startsWith('/webhook')) {
    express.json()(req, res, next);
  } else {
    next();
  }
});

// 3. 其他路由處理...
app.get('/', (req, res) => res.send('✅ Bot is running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));

async function handleEvent(event) { ... }  // 你的原有邏輯
