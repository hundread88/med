import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PORT = process.env.PORT || 3000;

// Инициализируем бота без передачи порта (иначе конфликт с Express)
const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${WEBHOOK_URL}/bot${TOKEN}`);

// Загружаем базы симптомов и учреждений
const symptomsMap = JSON.parse(fs.readFileSync('./symptoms.json', 'utf-8'));
const facilitiesMap = JSON.parse(fs.readFileSync('./facilities.json', 'utf-8'));

// Устанавливаем обработчик Webhook
app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Ответ на /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Здравствуйте! Опишите, пожалуйста, ваши симптомы, и я подскажу, куда лучше обратиться.');
});

// Обработка сообщений
bot.on('message', (msg) => {
  if (msg.text.startsWith('/start')) return;

  const text = msg.text.toLowerCase();
  const matched = [];

  for (const symptom in symptomsMap) {
    if (text.includes(symptom)) {
      matched.push(symptomsMap[symptom]);
    }
  }

  if (matched.length === 0) {
    bot.sendMessage(msg.chat.id, 'Не смог распознать симптомы. Пожалуйста, опишите подробнее или используйте распространённые выражения.');
    return;
  }

  const uniqueCategories = [...new Set(matched)];
  const recommendations = uniqueCategories.map(category => {
    const facility = facilitiesMap[category];
    return `🔹 *${category}* — ${facility}`;
  }).join('\n\n');

  bot.sendMessage(msg.chat.id, `На основе ваших симптомов рекомендую обратиться к:\n\n${recommendations}`, {
    parse_mode: 'Markdown'
  });
});

// Запуск Express-сервера
app.listen(PORT, () => {
  console.log(`Express server is listening on port ${PORT}`);
});
