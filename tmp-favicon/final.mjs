// Gera favicon transparente em vários tamanhos a partir do recorte do user.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require(
  'C:/xampp/htdocs/Kharis/sistema-gestao-de-tarefas/node_modules/.pnpm/sharp@0.34.5/node_modules/sharp',
);

const ROOT = 'C:/xampp/htdocs/Kharis/sistema-gestao-de-tarefas';
const SRC = 'C:/Users/NoteBook1/Downloads/favicon-ktask.png';
const APP_DIR = `${ROOT}/apps/web/src/app`;
const BRAND_DIR = `${ROOT}/apps/web/public/brand`;

// 1) Trim — remove fundo escuro
const trimmed = await sharp(SRC)
  .trim({
    background: { r: 37, g: 12, b: 89 },
    threshold: 25,
  })
  .toBuffer();
const m = await sharp(trimmed).metadata();
console.log(`trimmed: ${m.width}x${m.height}`);

// 2) Aplicar máscara rounded-rect (raio ≈ 22% do lado, padrão iOS)
const W = m.width;
const H = m.height;
const R = Math.round(Math.min(W, H) * 0.22);
const mask = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
     <rect x="0" y="0" width="${W}" height="${H}" rx="${R}" ry="${R}" fill="white"/>
   </svg>`,
);
const masked = await sharp(trimmed)
  .composite([{ input: mask, blend: 'dest-in' }])
  .png()
  .toBuffer();

// 3) Helper de export quadrado em N pixels com fundo transparente
async function saveAt(target, n) {
  // Padronizar pra quadrado caso W != H
  const max = Math.max(W, H);
  const padded = await sharp(masked)
    .extend({
      top: Math.floor((max - H) / 2),
      bottom: Math.ceil((max - H) / 2),
      left: Math.floor((max - W) / 2),
      right: Math.ceil((max - W) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();
  await sharp(padded)
    .resize(n, n, { kernel: 'cubic', fit: 'cover' })
    .png()
    .toFile(target);
  console.log(`  ${target.split('/').slice(-2).join('/')} (${n}x${n})`);
}

console.log('Gerando favicons transparentes...');
await saveAt(`${APP_DIR}/icon.png`, 256);
await saveAt(`${APP_DIR}/apple-icon.png`, 180);
await saveAt(`${BRAND_DIR}/app-icon-192.png`, 192);
await saveAt(`${BRAND_DIR}/app-icon-512.png`, 512);
console.log('OK');
