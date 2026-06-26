import { loadLastFetchSlot, saveLastFetchSlot } from '@/src/canteen/storage';
import type { WidgetState } from '@/src/canteen/types';
import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import HelloWidget, { REFRESH_CLICK_ACTION } from './HelloWidget';
import { loadWidgetState, refreshWidgetState } from './services/canteenClient';

// Auto-fetch only happens during these hours. Android wakes the widget roughly
// every 30 min (updatePeriodMillis); we only hit the network when the wake lands
// in one of these hours, and only once per hour-slot per day.
const SCHEDULED_HOURS = [0, 9, 11, 13, 18];

/** Returns a per-day slot key (e.g. "2026-06-23-9") if now is a scheduled hour, else null. */
function scheduledSlot(): string | null {
  const now = new Date();
  const hour = now.getHours();
  if (!SCHEDULED_HOURS.includes(hour)) {
    return null;
  }
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}-${hour}`;
}

async function safeRefresh(): Promise<WidgetState> {
  try {
    return await refreshWidgetState();
  } catch (error) {
    console.warn('Widget refresh failed', error);
    const cached = await loadWidgetState();
    return {
      status: 'error',
      balance: null,
      ownerName: cached.ownerName,
      lastUpdatedAt: Date.now(),
      theme: cached.theme,
      errorMessage: 'อัปเดตไม่สำเร็จ',
    };
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { width, height } = props.widgetInfo ?? {};
  const render = (state: WidgetState) =>
    props.renderWidget(<HelloWidget state={state} width={width} height={height} />);

  // Fetch from the network, render, and (if it succeeded) mark the given slot done.
  const fetchAndRender = async (slot?: string | null) => {
    const nextState = await safeRefresh();
    render(nextState);
    if (slot && nextState.status === 'ready') {
      await saveLastFetchSlot(slot);
    }
  };

  switch (props.widgetAction) {
    case 'WIDGET_ADDED': {
      const cachedState = await loadWidgetState();
      render(cachedState);
      await fetchAndRender(scheduledSlot());
      break;
    }
    case 'WIDGET_UPDATE': {
      // Only fetch on the scheduled hours; otherwise just re-render the cached data.
      const slot = scheduledSlot();
      if (slot && (await loadLastFetchSlot()) !== slot) {
        await fetchAndRender(slot);
      } else {
        render(await loadWidgetState());
      }
      break;
    }
    case 'WIDGET_RESIZED': {
      // Re-render the cached state at the new size — no network round-trip needed.
      render(await loadWidgetState());
      break;
    }
    case 'WIDGET_CLICK':
      // Manual refresh always fetches, and satisfies the current slot if there is one.
      if (props.clickAction === REFRESH_CLICK_ACTION) {
        await fetchAndRender(scheduledSlot());
      }
      break;
    default:
      break;
  }
}
