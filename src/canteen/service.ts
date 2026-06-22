import { fetchCanteenSnapshot } from './api';
import {
  applyAppearance,
  clearCredentials,
  clearPreferences,
  clearWidgetState,
  DEFAULT_PREFERENCES,
  DEFAULT_STATE,
  loadCredentials,
  loadPreferences,
  loadWidgetState as loadStoredState,
  saveCredentials,
  saveDebugHtml,
  savePreferences,
  saveWidgetState,
} from './storage';
import type { Credentials, WidgetPreferences, WidgetState } from './types';

export type LogHandler = (message: string) => void;

export const WIDGET_REFRESH_ACTION = 'canteen.widget.refresh';

// Every widget size registered in app.json. The task handler is shared across all
// of them; the responsive HelloWidget adapts to whichever size the user picked.
export const WIDGET_NAMES = ['Canteen2x1', 'Canteen4x1', 'Canteen4x2', 'Canteen4x3', 'Canteen2x2'] as const;
export const WIDGET_NAME = WIDGET_NAMES[2];

export async function loadWidgetState(): Promise<WidgetState> {
  const [state, preferences] = await Promise.all([loadStoredState(), loadPreferences()]);
  return applyAppearance(state, preferences);
}

export async function persistPreferences(preferences: Partial<WidgetPreferences>): Promise<WidgetPreferences> {
  const updated = await savePreferences(preferences);
  const state = await loadStoredState();
  await saveWidgetState(applyAppearance(state, updated));
  return updated;
}

/** Update any appearance preference (theme, colours, font, font size, extras) and return the new state. */
export async function updateAppearance(partial: Partial<WidgetPreferences>): Promise<WidgetState> {
  await persistPreferences(partial);
  return loadWidgetState();
}

export async function persistCredentials(credentials: Credentials, logger?: LogHandler): Promise<WidgetState> {
  logger?.('กำลังบันทึกบัญชีเจ้าของบัตร (นักเรียน)...');
  await saveCredentials(credentials);
  await clearWidgetState();
  logger?.('ล้างแคชยอดเงินเดิมเรียบร้อย');
  return refreshWidgetState(logger);
}

export async function refreshWidgetState(logger?: LogHandler): Promise<WidgetState> {
  logger?.('เริ่มดึงข้อมูลยอดเงินล่าสุด');
  const [credentials, preferences] = await Promise.all([loadCredentials(), loadPreferences()]);
  const baseState: WidgetState = applyAppearance(
    {
      status: 'loading',
      balance: null,
      ownerName: null,
      lastUpdatedAt: null,
      theme: preferences.theme,
      extras: null,
    },
    preferences,
  );

  if (!credentials) {
    logger?.('ยังไม่ได้กำหนดบัญชี ขอให้เพิ่มชื่อผู้ใช้และรหัสผ่าน');
    const state: WidgetState = {
      ...baseState,
      status: 'error',
      errorMessage: 'ใส่บัญชีก่อนใช้งาน',
    };
    await saveWidgetState(state);
    return state;
  }

  try {
    const snapshot = await fetchCanteenSnapshot(credentials, logger);
    if (snapshot.debugHtml) {
      await saveDebugHtml(snapshot.debugHtml);
    }
    logger?.(`สำเร็จ: พบยอดเงิน ${snapshot.balanceText}`);
    if (snapshot.ownerName) {
      logger?.(`เจ้าของบัญชี: ${snapshot.ownerName}`);
    }
    const state: WidgetState = applyAppearance(
      {
        status: 'ready',
        balance: snapshot.balanceText,
        ownerName: snapshot.ownerName,
        lastUpdatedAt: snapshot.fetchedAt,
        theme: preferences.theme,
        extras: snapshot.extras ?? null,
      },
      preferences,
    );
    await saveWidgetState(state);
    return state;
  } catch (error) {
    console.warn('Failed to refresh canteen data', error);
    logger?.(
      error instanceof Error
        ? `ดึงข้อมูลไม่สำเร็จ: ${error.message}`
        : 'ดึงข้อมูลไม่สำเร็จ: เกิดข้อผิดพลาดไม่ทราบสาเหตุ',
    );
    const state: WidgetState = {
      ...baseState,
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'ดึงข้อมูลไม่สำเร็จ',
    };
    await saveWidgetState(state);
    return state;
  }
}

export async function updateTheme(theme: WidgetPreferences['theme']): Promise<WidgetState> {
  return updateAppearance({ theme });
}

export async function loadPreferencesWithDefaults(): Promise<WidgetPreferences> {
  return loadPreferences();
}

export { DEFAULT_PREFERENCES, loadCredentials } from './storage';

export async function logout(logger?: LogHandler): Promise<WidgetState> {
  logger?.('กำลังออกจากระบบและล้างข้อมูลทั้งหมด');
  await clearCredentials();
  await clearWidgetState();
  await clearPreferences();
  const clearedState = applyAppearance({ ...DEFAULT_STATE }, DEFAULT_PREFERENCES);
  await saveWidgetState(clearedState);
  logger?.('ออกจากระบบสำเร็จ พร้อมสร้างเซสชันใหม่ในการล็อกอินถัดไป');
  return clearedState;
}
