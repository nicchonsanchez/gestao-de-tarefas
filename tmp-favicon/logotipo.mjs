// Remove fundo violet escuro do logotipo, mantendo K (violet brilhante) + Task (branco) com transparência.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require(
  'C:/xampp/htdocs/Kharis/sistema-gestao-de-tarefas/node_modules/.pnpm/sharp@0.34.5/node_modules/sharp',
);

const SRC = 'C:/Users/NoteBook1/Downloads/logotipo KTask.png';
const ROOT = 'C:/xampp/htdocs/Kharis/sistema-gestao-de-tarefas';
const TMP = `${ROOT}/tmp-favicon`;
const BRAND = `${ROOT}/apps/web/public/brand`;

// Lê pixels raw e aplica chroma-key contra o violet escuro.
const { data, info } = await sharp(SRC)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const BG = { r: 37, g: 12, b: 89 };

// Threshold: pixels com distância <= NEAR viram transparentes;
// FAR viram opacos; entre eles fade linear pra suavizar bordas.
const NEAR = 28;
const FAR = 70;

const out = Buffer.from(data);
for (let i = 0; i < out.length; i += info.channels) {
  const r = out[i],
    g = out[i + 1],
    b = out[i + 2];
  const d = Math.sqrt((r - BG.r) ** 2 + (g - BG.g) ** 2 + (b - BG.b) ** 2);
  let a;
  if (d <= NEAR) a = 0;
  else if (d >= FAR) a = 255;
  else a = Math.round(((d - NEAR) / (FAR - NEAR)) * 255);
  out[i + 3] = a;
}

await sharp(out, { raw: { width: info.width, height: info.height, channels: info.channels } })
  .png()
  .toFile(`${TMP}/logotipo_keyed.png`);

// Trim pra cortar padding lateral
await sharp(`${TMP}/logotipo_keyed.png`)
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 5 })
  .toFile(`${BRAND}/lockup-wordmark.png`);

const finalMeta = await sharp(`${BRAND}/lockup-wordmark.png`).metadata();
console.log(`brand/lockup-wordmark.png ${finalMeta.width}x${finalMeta.height}`);
