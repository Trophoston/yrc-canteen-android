/**
 * Generates the widget-picker preview images so each size shows what it actually
 * looks like. Run with `node scripts/generate-widget-previews.js`.
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const ASSET_DIR = path.join(__dirname, '..', 'assets', 'images');
const FONT_FILE = path.join(__dirname, '..', 'assets', 'font', 'LINESeedSansTH_A_Rg.ttf');

const P = {
  surface: '#f6f1e6',
  ink: '#1f1d18',
  inkSoft: '#57534a',
  inkMuted: '#938c7c',
  hairline: '#e7dfcd',
  chip: '#ffffff',
  chipBorder: '#e7dfcd',
  accent: '#1f9d55',
};

const FF = 'LINE Seed Sans TH';

function dot(cx, cy, r) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${P.accent}"/>`;
}

function refresh(cx, cy, R) {
  const f = R / 24;
  const tx = cx - R * 0.5;
  const ty = cy - R * 0.5;
  return `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${P.chip}" stroke="${P.chipBorder}" stroke-width="1"/>
  <g transform="translate(${tx},${ty}) scale(${f})">
    <path d="M20.5 12a8.5 8.5 0 1 1-2.5-6.02" stroke="${P.ink}" stroke-width="2.1" fill="none" stroke-linecap="round"/>
    <path d="M20.9 4.3v4.6h-4.6" stroke="${P.ink}" stroke-width="2.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

// Special "spent today" pose: sparkles + eating mouth.
function pet(px, py, size) {
  const s = size / 100;
  const fill = '#74d99a';
  const ink = '#2a2622';
  return `<g transform="translate(${px},${py}) scale(${s})">
    <circle cx="33" cy="31" r="8" fill="${fill}"/><circle cx="67" cy="31" r="8" fill="${fill}"/>
    <ellipse cx="50" cy="57" rx="32" ry="30" fill="${fill}"/>
    <circle cx="31" cy="57" r="5" fill="#ffffff" fill-opacity="0.28"/><circle cx="69" cy="57" r="5" fill="#ffffff" fill-opacity="0.28"/>
    <path d="M16 26 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#ffd34d"/>
    <path d="M84 36 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" fill="#ffd34d"/>
    <path d="M33 47 Q39 40 45 47" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M55 47 Q61 40 67 47" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="50" cy="64" rx="9" ry="7.5" fill="${ink}"/>
    <path d="M44 66 Q50 71 56 66" stroke="#ff8fa3" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>`;
}

function text(x, y, size, color, content, opts = {}) {
  const weight = opts.bold ? '700' : '400';
  const anchor = opts.anchor ? ` text-anchor="${opts.anchor}"` : '';
  const ls = opts.ls ? ` letter-spacing="${opts.ls}"` : '';
  return `<text x="${x}" y="${y}" font-family="${FF}" font-size="${size}" font-weight="${weight}" fill="${color}"${anchor}${ls}>${content}</text>`;
}

function surface(w, h, r) {
  return `<rect x="0" y="0" width="${w}" height="${h}" rx="${r}" fill="${P.surface}"/>`;
}

const designs = {
  '2x1': (() => {
    const w = 320, h = 160;
    return { w, h, svg: `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      ${surface(w, h, 26)}
      ${dot(30, 42, 7)}
      ${text(50, 49, 18, P.inkMuted, 'YRC CANTEEN', { ls: 1.5 })}
      ${refresh(288, 42, 20)}
      ${text(30, 130, 48, P.ink, '฿295.00', { bold: true })}
      ${pet(238, 90, 46)}
    </svg>` };
  })(),
  '4x1': (() => {
    const w = 560, h = 150;
    return { w, h, svg: `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      ${surface(w, h, 28)}
      ${dot(40, 44, 8)}
      ${text(62, 51, 20, P.inkMuted, 'YRC CANTEEN', { ls: 1.5 })}
      ${pet(452, 18, 48)}
      ${refresh(524, 44, 26)}
      ${text(40, 110, 52, P.ink, '฿295.00', { bold: true })}
      ${text(40, 140, 20, P.inkSoft, 'ใช้วันนี้ ฿210.00')}
    </svg>` };
  })(),
  '4x2': (() => {
    const w = 560, h = 280;
    return { w, h, svg: `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      ${surface(w, h, 30)}
      ${dot(40, 48, 8)}
      ${text(60, 55, 22, P.inkMuted, 'YRC CANTEEN', { ls: 2 })}
      ${pet(452, 22, 52)}
      ${refresh(524, 48, 28)}
      ${text(28, 178, 96, P.ink, '฿295.00', { bold: true })}
      ${text(28, 244, 24, P.inkSoft, 'ใช้วันนี้ ฿210.00', { bold: true })}
      ${text(532, 244, 20, P.inkMuted, 'อัปเดต 15:39', { anchor: 'end' })}
    </svg>` };
  })(),
  '4x3': (() => {
    const w = 520, h = 400;
    return { w, h, svg: `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      ${surface(w, h, 34)}
      ${dot(48, 56, 9)}
      ${text(68, 63, 22, P.inkMuted, 'YRC CANTEEN', { ls: 2 })}
      ${pet(396, 28, 56)}
      ${refresh(486, 56, 28)}
      ${text(32, 218, 104, P.ink, '฿295.00', { bold: true })}
      ${text(32, 290, 20, P.inkMuted, 'ใช้วันนี้')}
      ${text(32, 318, 26, P.inkSoft, '฿210.00', { bold: true })}
      ${text(280, 290, 20, P.inkMuted, 'ล่าสุด')}
      ${text(280, 318, 26, P.inkSoft, '-฿10.00 · 12:25', { bold: true })}
      <rect x="32" y="344" width="456" height="2" fill="${P.hairline}"/>
      ${text(32, 380, 22, P.inkSoft, 'นายธัญทันณ์ จอมชาญพันธ์')}
      ${text(488, 380, 20, P.inkMuted, 'อัปเดต 15:39', { anchor: 'end' })}
    </svg>` };
  })(),
  '2x2': (() => {
    const w = 300, h = 300;
    return { w, h, svg: `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      ${surface(w, h, 30)}
      ${dot(28, 46, 8)}
      ${text(50, 53, 20, P.inkMuted, 'YRC CANTEEN', { ls: 1.5 })}
      ${refresh(256, 46, 26)}
      ${text(28, 178, 58, P.ink, '฿295.00', { bold: true })}
      ${text(28, 258, 20, P.inkSoft, 'ใช้วันนี้ ฿210.00')}
      ${pet(240, 232, 46)}
    </svg>` };
  })(),
};

const fontOpts = { fontFiles: [FONT_FILE], loadSystemFonts: true, defaultFontFamily: FF };

for (const [key, d] of Object.entries(designs)) {
  const resvg = new Resvg(d.svg, {
    fitTo: { mode: 'width', value: d.w * 2 },
    font: fontOpts,
    background: 'transparent',
  });
  const png = resvg.render().asPng();
  const out = path.join(ASSET_DIR, `widget-preview-${key}.png`);
  fs.writeFileSync(out, png);
  console.log(`wrote ${out} (${png.length} bytes)`);
}
