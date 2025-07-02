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

  const text = msg.text.toLowerCase();
  const matchedSymptoms = [];

  for (const symptom in symptomsMap) {
    if (text.includes(symptom)) {
      matchedSymptoms.push(symptom);
    }
  }

  if (matchedSymptoms.length === 0) {
    bot.sendMessage(msg.chat.id, 'Не смог распознать симптомы. Пожалуйста, опишите подробнее или используйте распространённые выражения.');
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

  let response = `🧾 Возможные диагнозы на основе ваших симптомов:\n`;
  response += [...probableDiagnoses].map(d => `• ${d}`).join('\n');

  response += `\n\n🏥 Рекомендуемые направления:\n`;
  response += [...matchedCategories].map(c => `🔹 *${c}* — ${facilitiesMap[c] || 'учреждение не найдено'}`).join('\n\n');

  bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' });
});

app.listen(PORT, () => {
  console.log(`Express server is listening on port ${PORT}`);
});
