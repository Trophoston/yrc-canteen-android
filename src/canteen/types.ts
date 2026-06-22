export type WidgetTheme = 'light' | 'dark';

export type WidgetFont = 'line-seed' | 'system';

export type WidgetFontSize = 'small' | 'medium' | 'large';

export type UserType = 'student' | 'seller' | 'admin';

export interface Credentials {
  username: string;
  password: string;
  userType: UserType;
}

/** Selectable stat keys the user can choose to show in larger widgets. */
export type WidgetStatKey = 'today' | 'income' | 'count' | 'biggest' | 'last';

export interface WidgetPreferences {
  theme: WidgetTheme;
  autoRefreshMinutes: number;
  /** Custom widget background colour (hex). Falls back to the theme preset when null. */
  backgroundColor: string | null;
  /** Custom widget text colour (hex). Falls back to the theme preset when null. */
  textColor: string | null;
  font: WidgetFont;
  fontSize: WidgetFontSize;
  /** Show the extra info block (selected stats) when available. */
  showExtras: boolean;
  /** Which stats to show, in order. */
  visibleStats: WidgetStatKey[];
  /** Show the money-status pet. */
  showPet: boolean;
  /** Recently used custom colours for the picker. */
  recentColors: string[];
}

/** One recent canteen transaction. */
export interface WidgetTransaction {
  amount: string;
  time: string | null;
}

/** Optional extra glanceable data shown to fill larger widgets. */
export interface WidgetExtras {
  /** Total spent today. */
  todaySpent: string | null;
  /** Total added/topped-up today. (No longer displayed, kept for compatibility.) */
  income: string | null;
  /** Number of purchases today. */
  transactionCount: string | null;
  /** The single most expensive purchase today. */
  biggestExpense: string | null;
  /** The most recent purchase. */
  lastTransaction: WidgetTransaction | null;
  /** True when there was at least one purchase today (drives the pet's special pose). */
  spentToday?: boolean;
}

export interface CanteenSnapshot {
  balanceText: string;
  ownerName: string | null;
  fetchedAt: number;
  extras?: WidgetExtras | null;
  /** Raw dashboard HTML, kept only for debugging the extras scraper. */
  debugHtml?: string;
}

export type WidgetStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface WidgetState {
  status: WidgetStatus;
  balance: string | null;
  ownerName: string | null;
  lastUpdatedAt: number | null;
  theme: WidgetTheme;
  errorMessage?: string;
  // appearance (mirrored from preferences so the widget can render standalone)
  backgroundColor?: string | null;
  textColor?: string | null;
  font?: WidgetFont;
  fontSize?: WidgetFontSize;
  showExtras?: boolean;
  visibleStats?: WidgetStatKey[];
  showPet?: boolean;
  // extra glanceable data
  extras?: WidgetExtras | null;
}

export interface RefreshResult {
  state: WidgetState;
  snapshot?: CanteenSnapshot;
}
