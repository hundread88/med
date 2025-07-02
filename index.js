import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const symptomsMap = JSON.parse(fs.readFileSync('./symptoms.json', 'utf-8'));
const facilitiesMap = JSON.parse(fs.readFileSync('./facilities.json', 'utf-8'));

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Здравствуйте! Опишите, пожалуйста, ваши симптомы, и я подскажу, куда лучше обратиться.');
});

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
