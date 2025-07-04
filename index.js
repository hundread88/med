// index.js
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

const allSymptoms = Object.keys(symptomsMap);
const pageSize = 5;
const userState = {}; // { chatId: { selected: [], page: 0 } }

function buildSymptomKeyboard(chatId) {
  const state = userState[chatId];
  const page = state.page || 0;
  const symptoms = allSymptoms.slice(page * pageSize, (page + 1) * pageSize);

  const buttons = symptoms.map(symptom => {
    const selected = state.selected.includes(symptom);
    return [{
      text: `${selected ? '✅' : '❌'} ${symptom}`,
      callback_data: `toggle_${symptom}`
    }];
  });

  const navButtons = [];
  if (page > 0) navButtons.push({ text: '⬅️ Назад', callback_data: 'prev' });
  if ((page + 1) * pageSize < allSymptoms.length) navButtons.push({ text: '➡️ Далее', callback_data: 'next' });
  if (state.selected.length > 0) navButtons.push({ text: '✅ Готово', callback_data: 'done' });

  if (navButtons.length) buttons.push(navButtons);

  return {
    reply_markup: {
      inline_keyboard: buttons
    }
  };
}

app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userState[chatId] = { selected: [], page: 0 };
  bot.sendMessage(chatId, 'Выберите симптомы из списка:', buildSymptomKeyboard(chatId));
});

bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const state = userState[chatId] || { selected: [], page: 0 };
  const data = query.data;

  if (data.startsWith('toggle_')) {
    const symptom = data.replace('toggle_', '');
    if (state.selected.includes(symptom)) {
      state.selected = state.selected.filter(s => s !== symptom);
    } else if (state.selected.length < 5) {
      state.selected.push(symptom);
    }
    bot.editMessageReplyMarkup(buildSymptomKeyboard(chatId).reply_markup, {
      chat_id: chatId,
      message_id: query.message.message_id
    });
    bot.answerCallbackQuery(query.id);
  } else if (data === 'next') {
    state.page++;
    bot.editMessageReplyMarkup(buildSymptomKeyboard(chatId).reply_markup, {
      chat_id: chatId,
      message_id: query.message.message_id
    });
    bot.answerCallbackQuery(query.id);
  } else if (data === 'prev') {
    state.page--;
    bot.editMessageReplyMarkup(buildSymptomKeyboard(chatId).reply_markup, {
      chat_id: chatId,
      message_id: query.message.message_id
    });
    bot.answerCallbackQuery(query.id);
  } else if (data === 'done') {
    const selected = state.selected;
    const diagnoses = new Set();
    const categories = new Set();

    selected.forEach(symptom => {
      (diagnosisMap[symptom] || []).forEach(d => diagnoses.add(d));
      if (symptomsMap[symptom]) categories.add(symptomsMap[symptom]);
    });

    let response = '🧾 Возможные диагнозы:\n';
    response += [...diagnoses].map(d => `• ${d}`).join('\n');
    response += '\n\n🏥 Направления:\n';
    response += [...categories].map(c => `🔹 *${c}* — ${facilitiesMap[c] || 'учреждение не найдено'}`).join('\n\n');

    bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
    delete userState[chatId];
    bot.answerCallbackQuery(query.id);
  }
});

app.listen(PORT, () => {
  console.log(`Express server is listening on port ${PORT}`);
});
