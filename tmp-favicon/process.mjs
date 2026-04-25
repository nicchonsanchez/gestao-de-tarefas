// Processa favicon-ktask.png — remove fundo escuro mantendo só o rounded square com transparência.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const sharp = require(
  'C:/xampp/htdocs/Kharis/sistema-gestao-de-tarefas/node_modules/.pnpm/sharp@0.34.5/node_modules/sharp',
);

const SRC = 'C:/Users/NoteBook1/Downloads/favicon-ktask.png';
const TMP = 'C:/xampp/htdocs/Kharis/sistema-gestao-de-tarefas/tmp-favicon';
mkdirSync(TMP, { recursive: true });

const meta = await sharp(SRC).metadata();
console.log(`source: ${meta.width}x${meta.height} (${meta.channels}ch)`);

// 1) Detectar bounding box do violet brilhante (rounded square interior).
//    Estratégia: trim() do sharp remove padding de cor sólida; podemos passar
//    a cor escura como background pra cortar.
const trimmed = await sharp(SRC)
  .trim({
    background: { r: 37, g: 12, b: 89 }, // brand violet escuro amostrado
    threshold: 25,
  })
  .toBuffer();
const tMeta = await sharp(trimmed).metadata();
console.log(`trimmed: ${tMeta.width}x${tMeta.height}`);
await sharp(trimmed).toFile(`${TMP}/01_trimmed.png`);

// 2) Aplicar máscara rounded-rect com SVG via composite.
//    O raio de canto deve casar com o do rounded square original — vou estimar
//    pelo tamanho (em iOS/Android, ~22% do lado).
const W = tMeta.width;
const H = tMeta.height;
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
await sharp(masked).toFile(`${TMP}/02_masked.png`);
console.log(`masked: ${W}x${H} radius=${R}`);
