import { WIDGET_REFRESH_ACTION } from '@/src/canteen/service';
import type { WidgetState } from '@/src/canteen/types';
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

const themes = {
  light: {
    surface: '#f7f3e8',
    card: '#1f1f1f',
    primary: '#1f1f1f',
    secondary: '#2f2f2f',
    accent: '#111111',
    muted: '#3c3c3c',
  },
  dark: {
    surface: '#1f1f1f',
    card: '#f7f3e8',
    primary: '#f7f3e8',
    secondary: '#ded8c9',
    accent: '#f7f3e8',
    muted: '#c8c2b4',
  },
} as const;

function formatLastUpdated(timestamp: number | null): string {
  if (!timestamp) {
    return 'ยังไม่ดึงข้อมูล';
  }
  try {
    const formatter = new Intl.DateTimeFormat('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `ข้อมูลเมื่อ ${formatter.format(new Date(timestamp))}`;
  } catch (error) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `ข้อมูลเมื่อ ${hours}:${minutes}`;
  }
}

export const REFRESH_CLICK_ACTION = WIDGET_REFRESH_ACTION;

interface HelloWidgetProps {
  state: WidgetState;
}

export default function HelloWidget({ state }: HelloWidgetProps) {
  const palette = themes[state.theme] ?? themes.light;
  const isError = state.status === 'error';
  const isLoading = state.status === 'loading';
  const balanceText = isError ? '--' : state.balance ?? '--';
  const statusText = (() => {
    if (isLoading) {
      return 'กำลังอัปเดต...';
    }
    if (isError) {
      return state.errorMessage ?? 'ดึงข้อมูลไม่สำเร็จ';
    }
    return state.ownerName ?? '';
  })();

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: palette.surface,
        borderRadius: 28,
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
        }}
      >
        <TextWidget
          text="YRC CANTEEN"
          style={{
            color: palette.primary,
            fontSize: 20,
            fontWeight: '700',
          }}
          maxLines={1}
        />
        <TextWidget
          text="⟳"
          style={{
            color: palette.primary,
            fontSize: 22,
            fontWeight: '700',
            padding: 4,
            borderRadius: 999,
            borderWidth: isLoading ? 0 : 1,
            borderColor: palette.primary,
          }}
          clickAction={REFRESH_CLICK_ACTION}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          width: 'match_parent',
          marginTop: 12,
        }}
      >
        <TextWidget
          text={balanceText}
          style={{
            color: palette.accent,
            fontSize: 72,
            fontWeight: '700',
            letterSpacing: -2,
          }}
          maxLines={1}
          truncate="END"
        />
        <TextWidget
          text="คงเหลือ"
          style={{
            color: palette.secondary,
            fontSize: 20,
            fontWeight: '600',
            paddingBottom: 8,
          }}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          width: 'match_parent',
          marginTop: 16,
        }}
      >
        <TextWidget
          text={statusText}
          style={{
            color: isError ? '#e14747' : palette.secondary,
            fontSize: 16,
            fontWeight: '500',
          }}
          truncate="END"
          maxLines={1}
        />
        <TextWidget
          text={formatLastUpdated(state.lastUpdatedAt)}
          style={{
            color: palette.muted,
            fontSize: 14,
            fontWeight: '400',
          }}
          maxLines={1}
          truncate="END"
        />
      </FlexWidget>
    </FlexWidget>
  );
}