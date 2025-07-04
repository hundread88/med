import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import fs from 'fs';
import { normalizeText } from './normalize.js';

dotenv.config();

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PORT = process.env.PORT || 3000;

const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${WEBHOOK_URL}/bot${TOKEN}`);

const symptomsMap = JSON.parse(fs.readFileSync('./symptoms.json', 'utf-8'));
const facilitiesMap = JSON.parse(fs.readFileSync('./facilities.json', 'utf-8'));
const diagnosisMap = JSON.parse(fs.readFileSync('./symptom_diagnosis.json', 'utf-8'));

app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Здравствуйте! Опишите, пожалуйста, ваши симптомы, и я подскажу, куда лучше обратиться.');
});

bot.on('message', (msg) => {
  if (msg.text.startsWith('/start')) return;

  const chatId = msg.chat.id;
  const rawText = msg.text;
  const text = normalizeText(rawText);

  console.log(`[message] from @${msg.from.username || msg.from.id}: "${rawText}"`);
  console.log(`→ Normalized: "${text}"`);

  const matchedSymptoms = [];

  for (const symptom in symptomsMap) {
    if (text.includes(symptom)) {
      matchedSymptoms.push(symptom);
    }
  }

  if (matchedSymptoms.length === 0) {
    console.log('⚠️  Symptoms not recognized.');
    bot.sendMessage(chatId, 'Не смог распознать симптомы. Пожалуйста, опишите подробнее или используйте распространённые выражения.');
    return;
  }

  const probableDiagnoses = new Set();
  const matchedCategories = new Set();

  matchedSymptoms.forEach(symptom => {
    const diagnoses = diagnosisMap[symptom];
    if (diagnoses) diagnoses.forEach(d => probableDiagnoses.add(d));

    const category = symptomsMap[symptom];
    if (category) matchedCategories.add(category);
  });

  console.log(`✔️  Matched symptoms: ${matchedSymptoms}`);
  console.log(`📋 Diagnoses: ${[...probableDiagnoses]}`);
  console.log(`🏥 Categories: ${[...matchedCategories]}`);

  let response = `🧾 Возможные диагнозы на основе ваших симптомов:\n`;
  response += [...probableDiagnoses].map(d => `• ${d}`).join('\n');

  response += `\n\n🏥 Рекомендуемые направления:\n`;
  response += [...matchedCategories].map(c => `🔹 *${c}* — ${facilitiesMap[c] || 'учреждение не найдено'}`).join('\n\n');

  bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
});

app.listen(PORT, () => {
  console.log(`Express server is listening on port ${PORT}`);
});
