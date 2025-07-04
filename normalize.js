// normalize.js

const normalizationDict = {
  "болит живот": "боль в животе",
  "живот болит": "боль в животе",
  "температура": "высокая температура",
  "кашляет": "кашель",
  "кашляю": "кашель",
  "болит голова": "головная боль",
  "голова болит": "головная боль",
  "грудь болит": "боль в груди",
  "боль в области груди": "боль в груди"
};

export function normalizeText(input) {
  let text = input.toLowerCase();
  for (const phrase in normalizationDict) {
    if (text.includes(phrase)) {
      text = text.replace(phrase, normalizationDict[phrase]);
    }
  }
  return text;
}
