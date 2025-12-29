export type WidgetTheme = 'light' | 'dark';

export type UserType = 'student' | 'seller' | 'admin';

export interface Credentials {
  username: string;
  password: string;
  userType: UserType;
}

export interface WidgetPreferences {
  theme: WidgetTheme;
  autoRefreshMinutes: number;
}

export interface CanteenSnapshot {
  balanceText: string;
  ownerName: string | null;
  fetchedAt: number;
}

export type WidgetStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface WidgetState {
  status: WidgetStatus;
  balance: string | null;
  ownerName: string | null;
  lastUpdatedAt: number | null;
  theme: WidgetTheme;
  errorMessage?: string;
}

export interface RefreshResult {
  state: WidgetState;
  snapshot?: CanteenSnapshot;
}
