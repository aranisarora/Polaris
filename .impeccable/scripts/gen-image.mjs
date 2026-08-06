// Design-comp generator: renders a prompt file to PNG via the Gemini image model.
// Usage: node gen-image.mjs --prompt-file <path> --out <path> [--model gemini-2.5-flash-image] [--aspect 9:16]
import { GoogleGenAI } from '@google/genai';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : undefined;
};

const envText = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8');
const keyMatch = /^GEMINI_API_KEY=(.+)$/m.exec(envText);
if (!keyMatch) {
  console.error('GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}

const prompt = readFileSync(arg('prompt-file'), 'utf8');
const ai = new GoogleGenAI({ apiKey: keyMatch[1].trim() });

const res = await ai.models.generateContent({
  model: arg('model') ?? 'gemini-2.5-flash-image',
  contents: prompt,
  config: { imageConfig: { aspectRatio: arg('aspect') ?? '9:16' } },
});

const parts = res.candidates?.[0]?.content?.parts ?? [];
const img = parts.find((p) => p.inlineData?.data);
if (!img) {
  console.error('No image in response:', JSON.stringify(res).slice(0, 1500));
  process.exit(1);
}
writeFileSync(arg('out'), Buffer.from(img.inlineData.data, 'base64'));
console.log('Wrote', arg('out'));
