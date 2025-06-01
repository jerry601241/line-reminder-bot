async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;

  const text = event.message.text.trim();

  // 只回應以 ! 開頭的訊息
  if (!text.startsWith('!')) return;

  // 移除開頭的 !
  const commandText = text.slice(1).trim();

  // 用 chrono 中文解析時間
  const parsedResults = chrono.zh.parse(commandText, new Date(), { forwardDate: true });
  const parsedDate = parsedResults[0]?.start?.date();

  // 提取提醒內容：移除時間描述
  let remindText = commandText;
  if (parsedResults.length > 0) {
    const { index, text: timeText } = parsedResults[0];
    remindText = (commandText.slice(0, index) + commandText.slice(index + timeText.length)).replace(/提醒(我)?/g, '').trim();
    if (!remindText) remindText = commandText;
  }

  if (!parsedDate) {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '請輸入正確的提醒格式，例如：\n!10分鐘後提醒我下午3點開會\n或：!明天中午12點提醒我團隊會議'
    });
    return;
  }

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
