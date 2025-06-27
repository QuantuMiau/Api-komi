// telegramBot.js
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const chatId = process.env.TELEGRAM_CHAT_ID; 

module.exports.sendMessage = (text) => {
  return bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
};

module.exports.sendPhoto = (filePath, caption) => {
  return bot.sendPhoto(chatId, fs.createReadStream(filePath), {
    caption,
    parse_mode: 'Markdown'
  });
};