import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { Credentials, WidgetPreferences, WidgetState, WidgetTheme } from './types';

const CREDENTIALS_KEY = 'canteen.credentials';
const PREFERENCES_KEY = 'canteen.preferences';
const STATE_KEY = 'canteen.widget.state';
const DEBUG_HTML_KEY = 'canteen.debug.dashboardHtml';

const DEFAULT_PREFERENCES: WidgetPreferences = {
  theme: 'light',
  autoRefreshMinutes: 5,
  backgroundColor: null,
  textColor: null,
  font: 'line-seed',
  fontSize: 'medium',
  showExtras: true,
  visibleStats: ['today', 'last'],
  showPet: true,
  recentColors: [],
};

const DEFAULT_STATE: WidgetState = {
  status: 'idle',
  balance: null,
  ownerName: null,
  lastUpdatedAt: null,
  theme: DEFAULT_PREFERENCES.theme,
  backgroundColor: DEFAULT_PREFERENCES.backgroundColor,
  textColor: DEFAULT_PREFERENCES.textColor,
  font: DEFAULT_PREFERENCES.font,
  fontSize: DEFAULT_PREFERENCES.fontSize,
  showExtras: DEFAULT_PREFERENCES.showExtras,
  visibleStats: DEFAULT_PREFERENCES.visibleStats,
  showPet: DEFAULT_PREFERENCES.showPet,
  extras: null,
};

async function parseJSON<T>(value: string | null): Promise<T | null> {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('Failed to parse stored JSON', error);
    return null;
  }
}

export async function saveCredentials(credentials: Credentials): Promise<void> {
  await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(credentials));
}

export async function loadCredentials(): Promise<Credentials | null> {
  const raw = await SecureStore.getItemAsync(CREDENTIALS_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Credentials>;
    if (!parsed.username || !parsed.password) {
      return null;
    }
    return {
      username: parsed.username,
      password: parsed.password,
      userType: parsed.userType ?? 'student',
    };
  } catch (error) {
    console.warn('Failed to parse credentials', error);
    return null;
  }
}

export async function clearCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
}

export async function loadPreferences(): Promise<WidgetPreferences> {
  const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
  const parsed = await parseJSON<WidgetPreferences>(raw);
  if (!parsed) {
    return DEFAULT_PREFERENCES;
  }
  return {
    ...DEFAULT_PREFERENCES,
    ...parsed,
  };
}

export async function savePreferences(preferences: Partial<WidgetPreferences>): Promise<WidgetPreferences> {
  const current = await loadPreferences();
  const merged: WidgetPreferences = {
    ...current,
    ...preferences,
  };
  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(merged));
  return merged;
}

export async function clearPreferences(): Promise<void> {
  await AsyncStorage.removeItem(PREFERENCES_KEY);
}

export async function loadWidgetState(): Promise<WidgetState> {
  const raw = await AsyncStorage.getItem(STATE_KEY);
  const parsed = await parseJSON<WidgetState>(raw);
  if (!parsed) {
    return DEFAULT_STATE;
  }
  return {
    ...DEFAULT_STATE,
    ...parsed,
  };
}

export async function saveWidgetState(state: WidgetState): Promise<void> {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export async function clearWidgetState(): Promise<void> {
  await AsyncStorage.removeItem(STATE_KEY);
}

/** Stores the most recent raw dashboard HTML for debugging the extras scraper. */
export async function saveDebugHtml(html: string): Promise<void> {
  try {
    await AsyncStorage.setItem(DEBUG_HTML_KEY, html);
  } catch (error) {
    console.warn('Failed to save debug html', error);
  }
}

export async function loadDebugHtml(): Promise<string | null> {
  return AsyncStorage.getItem(DEBUG_HTML_KEY);
}

export function applyTheme(state: WidgetState, theme: WidgetTheme): WidgetState {
  return {
    ...state,
    theme,
  };
}

/** Copy every appearance preference into the widget state so it can render standalone. */
export function applyAppearance(state: WidgetState, preferences: WidgetPreferences): WidgetState {
  return {
    ...state,
    theme: preferences.theme,
    backgroundColor: preferences.backgroundColor,
    textColor: preferences.textColor,
    font: preferences.font,
    fontSize: preferences.fontSize,
    showExtras: preferences.showExtras,
    visibleStats: preferences.visibleStats,
    showPet: preferences.showPet,
  };
}

export { DEFAULT_PREFERENCES, DEFAULT_STATE };
