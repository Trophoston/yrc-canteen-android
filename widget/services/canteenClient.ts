import {
    loadWidgetState as loadStoredState,
    refreshWidgetState as refreshState,
} from '@/src/canteen/service';
import type { WidgetState } from '@/src/canteen/types';

export async function loadWidgetState(): Promise<WidgetState> {
  return loadStoredState();
}

export async function refreshWidgetState(): Promise<WidgetState> {
  return refreshState();
}
