import { GoogleGenAI } from '@google/genai';
import { readFileSync } from 'node:fs';

const envText = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8');
const key = /^GEMINI_API_KEY=(.+)$/m.exec(envText)[1].trim();
const ai = new GoogleGenAI({ apiKey: key });
const model = process.argv[2] ?? 'gemini-2.5-flash';
const res = await ai.models.generateContent({
  model,
  contents: 'Reply with exactly: OK',
});
console.log(model, '->', res.text);
