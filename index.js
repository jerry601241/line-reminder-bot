const express = require('express');
const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: 'YOUR_CHANNEL_ACCESS_TOKEN',
  channelSecret: 'YOUR_CHANNEL_SECRET'
};

const app = express();

// 1. 先註冊 LINE middleware（這個順序很重要！）
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// 2. 其他 API 路徑再用 express.json()，不要影響 /webhook
app.use(express.json());

// 3. 事件處理函式（範例，可根據需求修改）
function handleEvent(event) {
  // 這裡可以根據 event 做你想要的處理
  // 例如回覆訊息等
  return Promise.resolve(null);
}

// 4. 啟動伺服器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
