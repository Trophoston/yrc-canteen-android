import type { WidgetState } from '@/src/canteen/types';
import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import HelloWidget, { REFRESH_CLICK_ACTION } from './HelloWidget';
import { loadWidgetState, refreshWidgetState } from './services/canteenClient';

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
  const render = (state: WidgetState) =>
    props.renderWidget(<HelloWidget state={state} />);

  const renderLatest = async () => {
    const nextState = await safeRefresh();
    render(nextState);
  };

  switch (props.widgetAction) {
    case 'WIDGET_ADDED': {
      const cachedState = await loadWidgetState();
      render(cachedState);
      await renderLatest();
      break;
    }
    case 'WIDGET_UPDATE':
      await renderLatest();
      break;
    case 'WIDGET_CLICK':
      if (props.clickAction === REFRESH_CLICK_ACTION) {
        await renderLatest();
      }
      break;
    default:
      break;
  }
}