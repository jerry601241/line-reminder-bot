const express = require('express');
const line = require('@line/bot-sdk');

// LINE BOT 設定
const config = {
  channelAccessToken: 'YOUR_CHANNEL_ACCESS_TOKEN',
  channelSecret: 'YOUR_CHANNEL_SECRET'
};

const app = express();

// 1. 先註冊 LINE middleware（很重要！）
app.use('/webhook', line.middleware(config));

// 2. 再註冊 JSON 解析（如果你有其他 API 需要用到）
app.use(express.json());

// 3. 處理 LINE webhook 請求
app.post('/webhook', (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// 4. 處理事件的函式（範例）
function handleEvent(event) {
  // 這裡可以根據 event 做你想要的處理
  // 例如回覆訊息
  return Promise.resolve(null);
}

// 5. 啟動伺服器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
