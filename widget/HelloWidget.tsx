import { WIDGET_REFRESH_ACTION } from '@/src/canteen/service';
import type {
  WidgetExtras,
  WidgetFont,
  WidgetFontSize,
  WidgetState,
  WidgetStatKey,
  WidgetStatus,
  WidgetTheme,
} from '@/src/canteen/types';
import React from 'react';
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

type HexColor = `#${string}`;

interface Palette {
  surface: HexColor;
  ink: HexColor;
  inkSoft: HexColor;
  inkMuted: HexColor;
  hairline: HexColor;
  chip: HexColor;
  chipBorder: HexColor;
}

const themes: Record<WidgetTheme, Palette> = {
  light: {
    surface: '#f6f1e6',
    ink: '#1f1d18',
    inkSoft: '#57534a',
    inkMuted: '#938c7c',
    hairline: '#e7dfcd',
    chip: '#ffffff',
    chipBorder: '#e7dfcd',
  },
  dark: {
    surface: '#1d1b18',
    ink: '#f7f3e8',
    inkSoft: '#d6d0c2',
    inkMuted: '#979080',
    hairline: '#34312b',
    chip: '#2c2924',
    chipBorder: '#3c382f',
  },
};

const BUNDLED_FONT = 'LINESeedSansTH_A_Rg';

// --- colour helpers: let users pick any background / text colour ----------------

function parseHex(hex?: string | null): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return null;
  const n = Number.parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex(r: number, g: number, b: number): HexColor {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function mix(a: string, b: string, t: number, fallback: HexColor): HexColor {
  const A = parseHex(a);
  const B = parseHex(b);
  if (!A || !B) return fallback;
  return toHex(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t);
}

function luminance(hex: string): number {
  const c = parseHex(hex);
  if (!c) return 1;
  return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
}

/** Base preset palette, with optional custom background / text colours layered on. */
function buildPalette(theme: WidgetTheme, bg?: string | null, text?: string | null): Palette {
  const base = themes[theme] ?? themes.light;
  const surface = parseHex(bg) ? (bg as HexColor) : base.surface;
  const ink: HexColor = parseHex(text)
    ? (text as HexColor)
    : parseHex(bg)
      ? luminance(surface) < 0.5
        ? '#f7f3e8'
        : '#1f1d18'
      : base.ink;
  if (surface === base.surface && ink === base.ink) {
    return base;
  }
  return {
    surface,
    ink,
    inkSoft: mix(ink, surface, 0.32, base.inkSoft),
    inkMuted: mix(ink, surface, 0.52, base.inkMuted),
    hairline: mix(surface, ink, 0.14, base.hairline),
    chip: mix(surface, ink, 0.06, base.chip),
    chipBorder: mix(surface, ink, 0.16, base.chipBorder),
  };
}

function fontFamilyFor(font?: WidgetFont): string | undefined {
  return font === 'system' ? undefined : BUNDLED_FONT;
}

function fontScaleFor(size?: WidgetFontSize): number {
  if (size === 'small') return 0.9;
  if (size === 'large') return 1.14;
  return 1;
}

function statusColor(status: WidgetStatus, theme: WidgetTheme): HexColor {
  switch (status) {
    case 'ready':
      return '#1f9d55';
    case 'loading':
      return '#e08a1e';
    case 'error':
      return theme === 'dark' ? '#f87171' : '#d63a2f';
    default:
      return theme === 'dark' ? '#6f6a60' : '#b3ab99';
  }
}

// --- money-status pet ----------------------------------------------------------

type PetTier = 'full' | 'happy' | 'content' | 'hungry' | 'sad';

function parseBalanceNumber(text?: string | null): number | null {
  if (!text) return null;
  const match = text.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isNaN(value) ? null : value;
}

function moneyTier(balance: number | null): PetTier {
  if (balance == null) return 'sad';
  if (balance >= 500) return 'full';
  if (balance >= 200) return 'happy';
  if (balance >= 50) return 'content';
  if (balance >= 1) return 'hungry';
  return 'sad';
}

/**
 * A small mascot whose expression and colour follow the balance. When `special`
 * (there was a purchase today) it gets an excited, well-fed pose with sparkles.
 */
function petSvg(tier: PetTier, special = false): string {
  const body: Record<PetTier, string> = {
    full: '#51cf86',
    happy: '#74d99a',
    content: '#f2c14e',
    hungry: '#f0a35e',
    sad: '#e8836b',
  };
  const ink = '#2a2622';
  const fill = body[tier];
  const cheery = special || tier === 'full' || tier === 'happy';

  const happyEyes = `<path d="M33 47 Q39 40 45 47" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M55 47 Q61 40 67 47" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const dotEyes = `<circle cx="39" cy="46" r="3.4" fill="${ink}"/><circle cx="61" cy="46" r="3.4" fill="${ink}"/>`;
  const eyes = special || tier === 'full' || tier === 'happy' ? happyEyes : dotEyes;

  const mouths: Record<PetTier, string> = {
    full: 'M36 60 Q50 75 64 60',
    happy: 'M39 61 Q50 71 61 61',
    content: 'M42 63 Q50 67 58 63',
    hungry: 'M42 67 Q50 62 58 67',
    sad: 'M39 69 Q50 60 61 69',
  };
  const mouth = special
    ? `<ellipse cx="50" cy="64" rx="9" ry="7.5" fill="${ink}"/><path d="M44 66 Q50 71 56 66" stroke="#ff8fa3" stroke-width="3" fill="none" stroke-linecap="round"/>`
    : `<path d="${mouths[tier]}" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;

  const cheeks = cheery
    ? `<circle cx="31" cy="57" r="5" fill="#ffffff" fill-opacity="0.28"/><circle cx="69" cy="57" r="5" fill="#ffffff" fill-opacity="0.28"/>`
    : '';
  const sparkles = special
    ? `<path d="M16 26 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#ffd34d"/><path d="M84 36 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" fill="#ffd34d"/>`
    : '';

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="33" cy="31" r="8" fill="${fill}"/><circle cx="67" cy="31" r="8" fill="${fill}"/><ellipse cx="50" cy="57" rx="32" ry="30" fill="${fill}"/>${cheeks}${sparkles}${eyes}${mouth}</svg>`;
}

// --- selectable stats ----------------------------------------------------------

const STAT_LABEL: Record<WidgetStatKey, string> = {
  today: 'ใช้วันนี้',
  income: 'รายรับ',
  count: 'รายการวันนี้',
  biggest: 'จ่ายสูงสุด',
  last: 'ล่าสุด',
};

function statValue(key: WidgetStatKey, extras?: WidgetExtras | null): string | null {
  if (!extras) return null;
  switch (key) {
    case 'today':
      return extras.todaySpent;
    case 'income':
      return extras.income;
    case 'count':
      return extras.transactionCount ? `${extras.transactionCount} ครั้ง` : null;
    case 'biggest':
      return extras.biggestExpense;
    case 'last':
      return extras.lastTransaction
        ? `${extras.lastTransaction.amount}${extras.lastTransaction.time ? ` · ${extras.lastTransaction.time}` : ''}`
        : null;
    default:
      return null;
  }
}

type Layout = 'mini' | 'bar' | 'standard' | 'roomy';

function getLayout(width: number, height: number): Layout {
  const short = height < 108;
  const narrow = width < 200;
  if (short && narrow) return 'mini';
  if (short) return 'bar';
  // Only the genuinely tall cells (≈4×3+) get the extra stats strip + divider; a
  // 4×2 stays "standard" so its balance is big and nothing overflows.
  if (height >= 230) return 'roomy';
  return 'standard';
}

const APPROX_GLYPH_ADVANCE = 0.62;

function fitBalance(text: string, availableWidth: number, maxByHeight: number, cap: number): number {
  const chars = Math.max(text.length, 1);
  const widthFit = (availableWidth - 4) / (chars * APPROX_GLYPH_ADVANCE);
  return Math.max(15, Math.floor(Math.min(cap, widthFit, maxByHeight)));
}

function letterSpacingFor(size: number): number {
  if (size >= 48) return -2;
  if (size >= 36) return -1.3;
  if (size >= 26) return -0.7;
  return -0.2;
}

function formatUpdated(timestamp: number | null): string {
  if (!timestamp) {
    return 'ยังไม่ได้อัปเดต';
  }
  const date = new Date(timestamp);
  try {
    const formatter = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' });
    return `อัปเดต ${formatter.format(date)}`;
  } catch (error) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `อัปเดต ${hours}:${minutes}`;
  }
}

function refreshSvg(color: HexColor): string {
  return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.5 12a8.5 8.5 0 1 1-2.5-6.02" stroke="${color}" stroke-width="2.1" stroke-linecap="round"/><path d="M20.9 4.3v4.6h-4.6" stroke="${color}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export const REFRESH_CLICK_ACTION = WIDGET_REFRESH_ACTION;
// Built-in action handled natively by react-native-android-widget — opens the app.
const OPEN_APP_ACTION = 'OPEN_APP';

interface HelloWidgetProps {
  state: WidgetState;
  width?: number;
  height?: number;
}

export default function HelloWidget({ state, width = 320, height = 140 }: HelloWidgetProps) {
  const theme: WidgetTheme = state.theme === 'dark' ? 'dark' : 'light';
  const palette = buildPalette(theme, state.backgroundColor, state.textColor);
  const layout = getLayout(width, height);
  const narrow = width < 200;
  const fontFamily = fontFamilyFor(state.font);
  const textFont = fontFamily ? ({ fontFamily } as const) : ({} as const);
  const scale = fontScaleFor(state.fontSize);
  const fs = (n: number) => Math.round(n * scale);

  const isError = state.status === 'error';
  const isLoading = state.status === 'loading';
  const isIdle = state.status === 'idle' && !state.balance;
  const accent = statusColor(state.status, theme);

  const balanceText = isError || !state.balance ? '—' : state.balance;
  const ownerText =
    state.ownerName ??
    (isLoading ? 'กำลังอัปเดต' : isIdle ? 'แตะรีเฟรชเพื่อดึงยอดเงิน' : 'บัญชีโรงอาหาร');
  const errorText = state.errorMessage ?? 'ดึงข้อมูลไม่สำเร็จ';
  const updatedText = formatUpdated(state.lastUpdatedAt);

  // Selected stats, shared by every layout.
  const statsResolved = (state.visibleStats ?? ['today', 'last'])
    .map((key) => ({ label: STAT_LABEL[key], value: statValue(key, state.extras) }))
    .filter((stat): stat is { label: string; value: string } => !!stat.value);
  const wantStats = (state.showExtras ?? true) && !isError && statsResolved.length > 0;
  const firstStat = wantStats ? statsResolved[0] : undefined;
  // A single compact info line for the small (bar / mini) sizes.
  const compactInfo = firstStat ? `${firstStat.label} ${firstStat.value}` : updatedText;

  const dot = (size: number) => (
    <FlexWidget style={{ width: size, height: size, borderRadius: size, backgroundColor: accent }} />
  );

  const refreshButton = (size: number) => (
    <FlexWidget
      style={{
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: palette.chip,
        borderWidth: 1,
        borderColor: palette.chipBorder,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      clickAction={REFRESH_CLICK_ACTION}
    >
      <SvgWidget
        svg={refreshSvg(isLoading ? accent : palette.ink)}
        style={{ width: Math.round(size * 0.5), height: Math.round(size * 0.5) }}
      />
    </FlexWidget>
  );

  // Tapping the balance opens the app. (Click actions live on leaf elements, never on
  // containers that also hold the refresh button — otherwise the refresh tap is stolen.)
  const balanceWidget = (availableWidth: number, maxByHeight: number, cap: number) => {
    const size = fitBalance(`${balanceText}`, availableWidth, maxByHeight, fs(cap));
    return (
      <TextWidget
        text={`${balanceText}`}
        style={{
          ...textFont,
          color: palette.ink,
          fontSize: size,
          letterSpacing: letterSpacingFor(size),
          fontWeight: 'bold',
          width: 'match_parent',
          adjustsFontSizeToFit: true,
        }}
        maxLines={1}
        clickAction={OPEN_APP_ACTION}
      />
    );
  };

  // --- shared pet + brand, used by every size ----------------------------------
  const petTier = moneyTier(parseBalanceNumber(state.balance));
  const petSpecial = !!state.extras?.spentToday;
  const showPet = (state.showPet ?? true) && !isError && !!state.balance;

  const petGlyph = (size: number) => (
    <SvgWidget svg={petSvg(petTier, petSpecial)} style={{ width: size, height: size }} clickAction={OPEN_APP_ACTION} />
  );

  // Brand label is flex + truncate so it can never push anything off the edge.
  const brandCluster = (brandSize: number, dotSize: number) => (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 7, flex: 1 }} clickAction={OPEN_APP_ACTION}>
      {dot(dotSize)}
      <FlexWidget style={{ flex: 1 }}>
        <TextWidget
          text="YRC CANTEEN"
          style={{ ...textFont, color: palette.inkMuted, fontSize: brandSize, letterSpacing: 1.2 }}
          maxLines={1}
          truncate="END"
        />
      </FlexWidget>
    </FlexWidget>
  );

  // ---- mini (2×1) ---------------------------------------------------------------
  if (layout === 'mini') {
    const pad = 10;
    const refresh = 22;
    const petS = showPet ? 24 : 0;
    const showInfo = height >= 98;
    const infoH = showInfo ? 13 : 0;
    const avail = width - pad * 2 - petS - (showPet ? 8 : 0);
    const balMax = Math.max(16, Math.floor((height - 22 - infoH - 10) / 1.5));
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: palette.surface,
          overflow: 'hidden',
          borderRadius: 18,
          paddingHorizontal: pad,
          flexDirection: 'column',
          justifyContent: 'center',
          flexGap: 2,
        }}
      >
        <FlexWidget
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 'match_parent' }}
        >
          {brandCluster(10, 7)}
          {refreshButton(refresh)}
        </FlexWidget>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', flexGap: 8 }}>
          <FlexWidget style={{ flex: 1 }}>{balanceWidget(avail, balMax, 34)}</FlexWidget>
          {showPet ? petGlyph(24) : null}
        </FlexWidget>
        {showInfo ? (
          <TextWidget
            text={compactInfo}
            style={{ ...textFont, color: palette.inkMuted, fontSize: 11, width: 'match_parent' }}
            maxLines={1}
            truncate="END"
          />
        ) : null}
      </FlexWidget>
    );
  }

  // ---- bar (4×1) ----------------------------------------------------------------
  if (layout === 'bar') {
    const pad = 13;
    const refresh = 28;
    const showInfo = height >= 102;
    const infoH = showInfo ? 16 : 0;
    const avail = width - pad * 2;
    const balMax = Math.max(22, Math.floor((height - 30 - infoH - 10) / 1.5));
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: palette.surface,
          overflow: 'hidden',
          borderRadius: 20,
          paddingHorizontal: pad,
          flexDirection: 'column',
          justifyContent: 'center',
          flexGap: 3,
        }}
      >
        <FlexWidget
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 'match_parent' }}
        >
          {brandCluster(12, 8)}
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 8 }}>
            {showPet ? petGlyph(30) : null}
            {refreshButton(refresh)}
          </FlexWidget>
        </FlexWidget>
        {balanceWidget(avail, balMax, 48)}
        {showInfo ? (
          <TextWidget
            text={compactInfo}
            style={{ ...textFont, color: palette.inkMuted, fontSize: 13, width: 'match_parent' }}
            maxLines={1}
            truncate="END"
          />
        ) : null}
      </FlexWidget>
    );
  }

  // ---- standard / roomy ---------------------------------------------------------
  const roomy = layout === 'roomy';
  const pad = roomy ? 20 : 16;
  const radius = roomy ? 28 : 24;
  const refresh = roomy ? 36 : 32;
  const dotSize = roomy ? 9 : 8;
  const brandSize = fs(12);
  const ownerSize = fs(roomy ? 14 : 13);
  const metaSize = fs(11);
  // The balance is the whole point of the app — make it as large as the cell allows.
  const balCap = roomy ? 96 : 76;

  // Pet placement: in the header on wide cells (4×2 / 4×3); in the footer on narrow
  // cells (2×2) so the brand fits the header and the balance keeps the full width.
  const petInHeader = showPet && !narrow;
  const petInFooter = showPet && narrow;
  const petHeaderSize = roomy ? 46 : 40;
  const petFooterSize = 28;

  const selectedStats = statsResolved;

  // Vertical budget. Reserves use generous line heights (bold ฿ / Thai glyphs are tall)
  // so the balance never overlaps or clips the footer — nothing gets hidden.
  const RESERVE_LH = 1.4;
  const BALANCE_LH = 1.5;
  const headerH = Math.max(refresh, petInHeader ? petHeaderSize : 0);
  const footerH = Math.max(Math.round((roomy ? 14 : 13) * RESERVE_LH), petInFooter ? petFooterSize : 0);
  const statsH = wantStats && roomy ? Math.round((11 + 14) * RESERVE_LH + 10) : 0;
  const dividerH = roomy ? 13 : 0;
  const budget = height - pad * 2 - headerH - footerH - statsH - dividerH - 8;
  const balMaxByHeight = Math.max(24, Math.floor(budget / BALANCE_LH));
  const avail = width - pad * 2;

  const header = (
    <FlexWidget
      style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: 'match_parent' }}
    >
      {brandCluster(brandSize, dotSize)}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 8 }}>
        {petInHeader ? petGlyph(petHeaderSize) : null}
        {refreshButton(refresh)}
      </FlexWidget>
    </FlexWidget>
  );

  // Hero — the balance, full width, as big as possible.
  const hero = (
    <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }} clickAction={OPEN_APP_ACTION}>
      {balanceWidget(avail, balMaxByHeight, balCap)}
    </FlexWidget>
  );

  const miniStat = (label: string, value: string, key: string) => (
    <FlexWidget key={key} style={{ flexDirection: 'column', flexGap: 1, flex: 1 }}>
      <TextWidget text={label} style={{ ...textFont, color: palette.inkMuted, fontSize: metaSize }} maxLines={1} />
      <TextWidget
        text={value}
        style={{ ...textFont, color: palette.inkSoft, fontSize: ownerSize, fontWeight: 'bold' }}
        maxLines={1}
        truncate="END"
      />
    </FlexWidget>
  );

  const statsStrip =
    wantStats && roomy ? (
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', flexGap: 14, marginBottom: 12 }}>
        {selectedStats.slice(0, 2).map((stat, index) => miniStat(stat.label, stat.value, `stat-${index}`))}
      </FlexWidget>
    ) : null;

  // Footer: never more than one row, so nothing wraps off the edge.
  const footer = isError ? (
    <TextWidget
      text={errorText}
      style={{ ...textFont, color: accent, fontSize: ownerSize, width: 'match_parent' }}
      maxLines={2}
      truncate="END"
    />
  ) : narrow ? (
    <FlexWidget
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 'match_parent', flexGap: 8 }}
    >
      <FlexWidget style={{ flex: 1 }}>
        <TextWidget
          text={firstStat ? `${firstStat.label} ${firstStat.value}` : updatedText}
          style={{ ...textFont, color: palette.inkSoft, fontSize: ownerSize }}
          maxLines={1}
          truncate="END"
        />
      </FlexWidget>
      {petInFooter ? petGlyph(petFooterSize) : null}
    </FlexWidget>
  ) : (
    <FlexWidget
      style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: 'match_parent', flexGap: 8 }}
    >
      <FlexWidget style={{ flex: 1 }}>
        <TextWidget
          text={!roomy && firstStat ? `${firstStat.label} ${firstStat.value}` : ownerText}
          style={{ ...textFont, color: palette.inkSoft, fontSize: ownerSize }}
          maxLines={1}
          truncate="END"
        />
      </FlexWidget>
      <TextWidget
        text={updatedText}
        style={{ ...textFont, color: palette.inkMuted, fontSize: metaSize }}
        maxLines={1}
        truncate="END"
      />
    </FlexWidget>
  );

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: palette.surface,
        overflow: 'hidden',
        borderRadius: radius,
        padding: pad,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {header}
      {hero}
      <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
        {statsStrip}
        {roomy ? (
          <FlexWidget style={{ width: 'match_parent', height: 1, backgroundColor: palette.hairline, marginBottom: 12 }} />
        ) : null}
        {footer}
      </FlexWidget>
    </FlexWidget>
  );
}
