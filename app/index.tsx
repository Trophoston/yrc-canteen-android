import {
  WIDGET_NAMES,
  loadCredentials,
  loadPreferencesWithDefaults,
  loadWidgetState,
  logout,
  persistCredentials,
  refreshWidgetState,
  updateAppearance,
} from '@/src/canteen/service';
import { loadDebugHtml } from '@/src/canteen/storage';
import type {
  WidgetFont,
  WidgetFontSize,
  WidgetPreferences,
  WidgetState,
  WidgetStatKey,
  WidgetTheme,
} from '@/src/canteen/types';
import ColorPicker from '@/src/components/ColorPicker';
import HelloWidget from '@/widget/HelloWidget';
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextStyle,
  View,
  useWindowDimensions,
} from 'react-native';
import { WidgetPreview, requestWidgetUpdate } from 'react-native-android-widget';

const FONT_REGULAR = 'LINESeedSansTH-Regular';
const textFontStyle: TextStyle = { fontFamily: FONT_REGULAR };

const BG_PRESETS: (string | null)[] = [null, '#f6f1e6', '#ffffff', '#1d1b18', '#0e3b2e', '#172554', '#3b1d2e'];
const TEXT_PRESETS: (string | null)[] = [null, '#1f1d18', '#ffffff', '#f6f1e6', '#1f9d55', '#e2b714'];
const FONT_OPTIONS: { value: WidgetFont; label: string }[] = [
  { value: 'line-seed', label: 'LINE Seed (เริ่มต้น)' },
  { value: 'system', label: 'ฟอนต์ในเครื่อง' },
];
const FONT_SIZE_OPTIONS: { value: WidgetFontSize; label: string }[] = [
  { value: 'small', label: 'เล็ก' },
  { value: 'medium', label: 'กลาง' },
  { value: 'large', label: 'ใหญ่' },
];
const STAT_OPTIONS: { key: WidgetStatKey; label: string }[] = [
  { key: 'today', label: 'ใช้วันนี้' },
  { key: 'count', label: 'จำนวนรายการ' },
  { key: 'biggest', label: 'จ่ายสูงสุด' },
  { key: 'last', label: 'ล่าสุด' },
];

export default function Index() {
  const [widgetState, setWidgetState] = useState<WidgetState | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [theme, setTheme] = useState<WidgetTheme>('light');
  const [prefs, setPrefs] = useState<WidgetPreferences | null>(null);
  const [pickerTarget, setPickerTarget] = useState<null | 'bg' | 'text'>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [logsVisible, setLogsVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const { width } = useWindowDimensions();

  const scale = useMemo(() => {
    const normalized = width / 420;
    return Math.max(Math.min(normalized, 1.15), 0.85);
  }, [width]);

  const previewWidth = useMemo(() => {
    const containerPadding = Math.round(24 * scale);
    const availableWidth = width - containerPadding * 2;
    const minWidth = 260;
    const maxWidth = 360;
    return Math.min(Math.max(availableWidth, minWidth), maxWidth);
  }, [scale, width]);

  const previewHeight = useMemo(() => Number((previewWidth * (200 / 320)).toFixed(1)), [previewWidth]);

  const gallerySizes = useMemo(() => {
    const full = previewWidth;
    const half = Math.round(full * 0.52);
    const r = (value: number) => Math.round(value);
    return [
      { name: 'YRC Canteen 2×1', hint: 'เล็กสุด เน้นยอดเงิน', w: half, h: r(half * 0.46) },
      { name: 'YRC Canteen 4×1', hint: 'แถบบาง เต็มความกว้าง', w: full, h: r(full * 0.2) },
      { name: 'YRC Canteen 4×2', hint: 'ยอดเงิน + ชื่อบัญชี + เวลา', w: full, h: r(full * 0.42) },
      { name: 'YRC Canteen 4×3', hint: 'ใหญ่ + ข้อมูลเสริม + เพื่อนตัวน้อย', w: full, h: r(full * 0.62) },
      { name: 'YRC Canteen 2×2', hint: 'จัตุรัสกะทัดรัด', w: half, h: half },
    ];
  }, [previewWidth]);

  const styles = useMemo(() => createStyles(scale), [scale]);

  const appendLog = useCallback((message: string) => {
    setLogs((current) => {
      const timestamp = new Date().toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const entry = `[${timestamp}] ${message}`;
      return [entry, ...current].slice(0, 50);
    });
  }, []);

  const showError = useCallback(
    (message: string) => {
      appendLog(`[ผิดพลาด] ${message}`);
      setErrorMessage(message);
    },
    [appendLog],
  );

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [state, prefs, credentials] = await Promise.all([
          loadWidgetState(),
          loadPreferencesWithDefaults(),
          loadCredentials(),
        ]);
        if (!isMounted) {
          return;
        }
        setWidgetState(state);
        setTheme(prefs.theme);
        setPrefs(prefs);
        if (credentials) {
          setUsername(credentials.username);
          setPassword(credentials.password);
        }
      } catch (error) {
        console.warn('Failed to load stored data', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const previewState: WidgetState = useMemo(
    () =>
      widgetState ?? {
        status: 'idle',
        balance: null,
        ownerName: null,
        lastUpdatedAt: null,
        theme,
      },
    [widgetState, theme],
  );

  const pushWidgetUpdate = useCallback(async (state: WidgetState) => {
    // Update every registered size; each instance is rendered at its own dimensions.
    await Promise.all(
      WIDGET_NAMES.map((widgetName) =>
        requestWidgetUpdate({
          widgetName,
          renderWidget: (info) => (
            <HelloWidget state={state} width={info.width} height={info.height} />
          ),
        }).catch((error) => console.warn(`Widget update failed: ${widgetName}`, error)),
      ),
    );
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    appendLog('เริ่มอัปเดตข้อมูลด้วยตนเอง');
    try {
      const state = await refreshWidgetState(appendLog);
      setWidgetState(state);
      await pushWidgetUpdate(state);
      if (state.status === 'ready') {
        appendLog(`อัปเดตสำเร็จ ยอดคงเหลือ ${state.balance}`);
      } else if (state.status === 'error') {
        showError(state.errorMessage ?? 'ดึงข้อมูลไม่สำเร็จ');
      }
    } catch (error) {
      console.warn('Refresh failed', error);
      showError('อัปเดตไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อหรือล็อกอินอีกครั้ง');
    } finally {
      setRefreshing(false);
    }
  }, [appendLog, pushWidgetUpdate, showError]);

  const handleSaveCredentials = useCallback(async () => {
    if (!username || !password) {
      showError('กรอกชื่อผู้ใช้และรหัสผ่านให้ครบก่อนบันทึก');
      return;
    }
    setSaving(true);
    appendLog('กำลังบันทึกบัญชีใหม่ (นักเรียน)');
    try {
      const state = await persistCredentials({ username: username.trim(), password, userType: 'student' }, appendLog);
      setWidgetState(state);
      await pushWidgetUpdate(state);
      if (state.status === 'error') {
        showError(state.errorMessage ?? 'บันทึกแล้วแต่ดึงข้อมูลไม่สำเร็จ');
      } else {
        appendLog('บันทึกข้อมูลบัญชีสำเร็จ');
      }
    } catch (error) {
      console.warn('Failed to save credentials', error);
      showError('บันทึกไม่สำเร็จ ลองใหม่อีกครั้งภายหลัง');
    } finally {
      setSaving(false);
    }
  }, [appendLog, password, pushWidgetUpdate, showError, username]);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    setErrorMessage(null);
    setLogs([]);
    setLogsVisible(false);
    appendLog('กำลังรีเซ็ตข้อมูลทั้งหมด');
    try {
      const state = await logout(appendLog);
      setWidgetState(state);
      setTheme(state.theme);
      setUsername('');
      setPassword('');
      await pushWidgetUpdate(state);
      appendLog('ข้อมูลถูกล้างแล้ว พร้อมเริ่มใหม่');
    } catch (error) {
      console.warn('Logout failed', error);
      showError('ออกจากระบบไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setLoggingOut(false);
    }
  }, [appendLog, pushWidgetUpdate, showError]);

  const applyAppearancePref = useCallback(
    async (partial: Partial<WidgetPreferences>) => {
      setPrefs((current) => (current ? { ...current, ...partial } : current));
      if (partial.theme) {
        setTheme(partial.theme);
      }
      try {
        const state = await updateAppearance(partial);
        setWidgetState(state);
        await pushWidgetUpdate(state);
      } catch (error) {
        console.warn('Failed to update appearance', error);
      }
    },
    [pushWidgetUpdate],
  );

  const handleThemeToggle = useCallback(
    (nextValue: boolean) => applyAppearancePref({ theme: nextValue ? 'dark' : 'light' }),
    [applyAppearancePref],
  );

  const handlePickColor = useCallback(
    (hex: string) => {
      if (!pickerTarget) return;
      const existing = prefs?.recentColors ?? [];
      const recentColors = [hex, ...existing.filter((c) => c.toLowerCase() !== hex.toLowerCase())].slice(0, 8);
      applyAppearancePref(
        pickerTarget === 'bg'
          ? { backgroundColor: hex, recentColors }
          : { textColor: hex, recentColors },
      );
      setPickerTarget(null);
    },
    [pickerTarget, prefs, applyAppearancePref],
  );

  const handleClearColor = useCallback(() => {
    if (!pickerTarget) return;
    applyAppearancePref(pickerTarget === 'bg' ? { backgroundColor: null } : { textColor: null });
    setPickerTarget(null);
  }, [pickerTarget, applyAppearancePref]);

  const toggleStat = useCallback(
    (key: WidgetStatKey) => {
      const current = prefs?.visibleStats ?? [];
      const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
      applyAppearancePref({ visibleStats: next });
    },
    [prefs, applyAppearancePref],
  );

  const handleCopyDebugHtml = useCallback(async () => {
    try {
      const html = await loadDebugHtml();
      if (!html) {
        appendLog('ยังไม่มี HTML แดชบอร์ด กรุณากดดึงข้อมูลก่อน');
        return;
      }
      await Clipboard.setStringAsync(html);
      appendLog(`คัดลอก HTML แดชบอร์ดแล้ว (${html.length} ตัวอักษร) นำไปส่งให้ผู้พัฒนาได้เลย`);
    } catch (error) {
      console.warn('Copy debug html failed', error);
      appendLog('คัดลอก HTML ไม่สำเร็จ');
    }
  }, [appendLog]);

  const handleOpenCredit = useCallback(() => {
    Linking.openURL('https://www.instagram.com/trophoston/').catch((error) => {
      console.warn('Failed to open Instagram link', error);
    });
  }, []);

  const handleOpenCredit2 = useCallback(() => {
    Linking.openURL('https://github.com/Trophoston/yrc-canteen-android').catch((error) => {
      console.warn('Failed to open Github link', error);
    });
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Widget Preview</Text>
        <Pressable style={styles.infoButton} onPress={() => setLogsVisible(true)}>
          <Text style={styles.infoButtonText}>Log</Text>
        </Pressable>
      </View>
      <View style={styles.previewWrapper}>
        <WidgetPreview
          renderWidget={() => (
            <HelloWidget state={previewState} width={previewWidth} height={previewHeight} />
          )}
          width={previewWidth}
          height={previewHeight}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>บัญชีโรงอาหาร</Text>
        <Text style={styles.sectionHint}>ข้อมูลจะถูกเก็บอย่างปลอดภัยไว้บนอุปกรณ์เท่านั้น</Text>

        <TextInput
          placeholder="ชื่อผู้ใช้"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <TextInput
          placeholder="รหัสผ่าน"
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          secureTextEntry
          style={styles.input}
        />

        <Pressable style={styles.button} onPress={handleSaveCredentials} disabled={saving}>
          {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>บันทึกข้อมูล</Text>}
        </Pressable>

        {/* <Pressable
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
          disabled={loggingOut || saving}
        >
          {loggingOut ? (
            <ActivityIndicator color="#b91c1c" />
          ) : (
            <Text style={styles.logoutButtonText}>ออกจากระบบ</Text>
          )}
        </Pressable> */}
      </View>

      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.sectionTitle}>โหมดสี</Text>
            <Text style={styles.sectionHint}>ปรับสีพื้นหลังของวิดเจ็ต</Text>
          </View>
          <Switch value={theme === 'dark'} onValueChange={handleThemeToggle} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ปรับแต่งหน้าตาวิดเจ็ต</Text>
        <Text style={styles.sectionHint}>เลือกสีพื้นหลัง สีตัวอักษร ฟอนต์ และขนาด (เลือก Auto เพื่อใช้ตามธีม)</Text>

        <Text style={styles.fieldLabel}>สีพื้นหลัง</Text>
        <View style={styles.swatchRow}>
          {BG_PRESETS.map((color, index) => {
            const selected = (prefs?.backgroundColor ?? null) === color;
            return (
              <Pressable
                key={`bg-${index}`}
                onPress={() => applyAppearancePref({ backgroundColor: color })}
                style={[
                  styles.swatch,
                  color ? { backgroundColor: color } : styles.swatchAuto,
                  selected && styles.swatchSelected,
                ]}
              >
                {color ? null : <Text style={styles.swatchAutoText}>Auto</Text>}
              </Pressable>
            );
          })}
        </View>
        <Pressable style={styles.customColorBtn} onPress={() => setPickerTarget('bg')}>
          <View style={[styles.customColorChip, { backgroundColor: prefs?.backgroundColor ?? '#f6f1e6' }]} />
          <Text style={styles.customColorText}>
            {prefs?.backgroundColor ? `กำหนดเอง ${prefs.backgroundColor.toUpperCase()}` : 'ปรับแต่งสีเองด้วยจานสี'}
          </Text>
        </Pressable>

        <Text style={styles.fieldLabel}>สีตัวอักษร</Text>
        <View style={styles.swatchRow}>
          {TEXT_PRESETS.map((color, index) => {
            const selected = (prefs?.textColor ?? null) === color;
            return (
              <Pressable
                key={`tx-${index}`}
                onPress={() => applyAppearancePref({ textColor: color })}
                style={[
                  styles.swatch,
                  color ? { backgroundColor: color } : styles.swatchAuto,
                  selected && styles.swatchSelected,
                ]}
              >
                {color ? null : <Text style={styles.swatchAutoText}>Auto</Text>}
              </Pressable>
            );
          })}
        </View>
        <Pressable style={styles.customColorBtn} onPress={() => setPickerTarget('text')}>
          <View style={[styles.customColorChip, { backgroundColor: prefs?.textColor ?? '#1f1d18' }]} />
          <Text style={styles.customColorText}>
            {prefs?.textColor ? `กำหนดเอง ${prefs.textColor.toUpperCase()}` : 'ปรับแต่งสีเองด้วยจานสี'}
          </Text>
        </Pressable>

        <Text style={styles.fieldLabel}>ฟอนต์</Text>
        <View style={styles.segRow}>
          {FONT_OPTIONS.map((opt) => {
            const active = (prefs?.font ?? 'line-seed') === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => applyAppearancePref({ font: opt.value })}
                style={[styles.segButton, active && styles.segButtonActive]}
              >
                <Text style={[styles.segButtonText, active && styles.segButtonTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>ขนาดตัวอักษร</Text>
        <View style={styles.segRow}>
          {FONT_SIZE_OPTIONS.map((opt) => {
            const active = (prefs?.fontSize ?? 'medium') === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => applyAppearancePref({ fontSize: opt.value })}
                style={[styles.segButton, active && styles.segButtonActive]}
              >
                <Text style={[styles.segButtonText, active && styles.segButtonTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.rowBetween, styles.extrasRow]}>
          <View style={styles.extrasLabelWrap}>
            <Text style={styles.fieldLabel}>แสดงข้อมูลเสริม</Text>
            <Text style={styles.sectionHint}>เลือกข้อมูลที่จะโชว์บนวิดเจ็ตขนาดใหญ่</Text>
          </View>
          <Switch
            value={prefs?.showExtras ?? true}
            onValueChange={(value) => applyAppearancePref({ showExtras: value })}
          />
        </View>

        {(prefs?.showExtras ?? true) ? (
          <View style={styles.statChipRow}>
            {STAT_OPTIONS.map((opt) => {
              const active = (prefs?.visibleStats ?? []).includes(opt.key);
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => toggleStat(opt.key)}
                  style={[styles.statChip, active && styles.statChipActive]}
                >
                  <Text style={[styles.statChipText, active && styles.statChipTextActive]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={[styles.rowBetween, styles.extrasRow]}>
          <View style={styles.extrasLabelWrap}>
            <Text style={styles.fieldLabel}>เพื่อนตัวน้อย</Text>
            <Text style={styles.sectionHint}>อารมณ์ของเพื่อนจะเปลี่ยนตามยอดเงินคงเหลือ</Text>
          </View>
          <Switch
            value={prefs?.showPet ?? true}
            onValueChange={(value) => applyAppearancePref({ showPet: value })}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ตัวอย่างวิดเจ็ตแต่ละขนาด</Text>
        <Text style={styles.sectionHint}>ดูหน้าตาของแต่ละขนาดก่อนเลือกเพิ่มลงหน้าจอ</Text>
        {gallerySizes.map((item) => (
          <View key={item.name} style={styles.galleryItem}>
            <View style={styles.galleryPreview}>
              <WidgetPreview
                renderWidget={() => <HelloWidget state={previewState} width={item.w} height={item.h} />}
                width={item.w}
                height={item.h}
              />
            </View>
            <Text style={styles.galleryName}>{item.name}</Text>
            <Text style={styles.sectionHint}>{item.hint}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.sectionTitle}>ข้อมูลปัจจุบัน</Text>
            {previewState.ownerName ? (
              <Text style={styles.sectionHint}>{previewState.ownerName}</Text>
            ) : null}
            <Text style={styles.sectionHint}>
              {previewState.lastUpdatedAt
                ? `อัปเดตล่าสุด: ${new Date(previewState.lastUpdatedAt).toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'ยังไม่เคยอัปเดต'}
            </Text>
          </View>
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <ActivityIndicator color="#1f1f1f" />
            ) : (
              <Text style={styles.secondaryButtonText}>ดึงข้อมูลตอนนี้</Text>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.disclaimer}>
          หมายเหตุ: ระบบนี้อาจใช้งานไม่ได้ หากเว็บไซต์ canteen.yupparaj.ac.th มีการอัปเดตหรือเปลี่ยนแปลงโครงสร้างหน้าเว็บ
        </Text>
        <Text style={styles.footerText}>Credit</Text>
        <Pressable onPress={handleOpenCredit} accessibilityRole="link">
          <Text style={styles.footerLink}>@trophoston</Text>
        </Pressable>
        <Text style={styles.footerText}>Project Github Repositories</Text>
        <Pressable onPress={handleOpenCredit2} accessibilityRole="link">
          <Text style={styles.footerLink}>yrc-canteen-android</Text>
        </Pressable>
      </View>

      {loading ? <ActivityIndicator style={styles.loadingIndicator} /> : null}

      <Modal visible={logsVisible} animationType="slide" onRequestClose={() => setLogsVisible(false)}>
        <View style={styles.logContainer}>
          <View style={styles.logHeader}>
            <Text style={styles.logTitle}>บันทึกการทำงาน</Text>
            <View style={styles.logHeaderActions}>
              <Pressable style={[styles.closeButton, styles.copyButton]} onPress={handleCopyDebugHtml}>
                <Text style={styles.closeButtonText}>คัดลอก HTML</Text>
              </Pressable>
              <Pressable style={styles.closeButton} onPress={() => setLogsVisible(false)}>
                <Text style={styles.closeButtonText}>ปิด</Text>
              </Pressable>
            </View>
          </View>
          <ScrollView style={styles.logScroll} contentContainerStyle={styles.logContent}>
            {logs.length === 0 ? (
              <Text style={styles.logEmpty}>ยังไม่มีข้อมูลการทำงาน</Text>
            ) : (
              logs.map((entry, index) => (
                <Text key={index} style={styles.logEntry}>
                  {entry}
                </Text>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={!!errorMessage} transparent animationType="fade" onRequestClose={() => setErrorMessage(null)}>
        <View style={styles.errorOverlay}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>เกิดข้อผิดพลาด</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <Pressable style={styles.closeButton} onPress={() => setErrorMessage(null)}>
              <Text style={styles.closeButtonText}>ปิด</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ColorPicker
        visible={pickerTarget !== null}
        title={pickerTarget === 'text' ? 'สีตัวอักษร' : 'สีพื้นหลัง'}
        initialColor={pickerTarget === 'text' ? prefs?.textColor : prefs?.backgroundColor}
        recent={prefs?.recentColors ?? []}
        onClose={() => setPickerTarget(null)}
        onSelect={handlePickColor}
        onClear={handleClearColor}
      />
    </ScrollView>
  );
}

function createStyles(scale: number) {
  const font = (value: number) => Number((value * scale).toFixed(2));
  const spacing = (value: number) => Math.round(value * scale);
  const minActionWidth = Math.max(Math.round(140 * scale), 110);

  return StyleSheet.create({
    container: {
      padding: spacing(24),
      gap: spacing(24),
      backgroundColor: '#f4f2ee',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing(12),
    },
    heading: {
      ...textFontStyle,
      fontSize: font(20),
      color: '#1f1f1f',
    },
    infoButton: {
      backgroundColor: '#ffffff',
      borderRadius: 999,
      paddingHorizontal: spacing(12),
      paddingVertical: spacing(6),
      shadowColor: '#000000',
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 2,
    },
    infoButtonText: {
      ...textFontStyle,
      fontSize: font(16),
    },
    previewWrapper: {
      alignItems: 'center',
    },
    section: {
      backgroundColor: '#ffffff',
      padding: spacing(20),
      borderRadius: spacing(16),
      shadowColor: '#000000',
      shadowOpacity: 0.05,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: 2,
      gap: spacing(12),
    },
    sectionTitle: {
      ...textFontStyle,
      fontSize: font(20),
      color: '#1f1f1f',
    },
    sectionHint: {
      ...textFontStyle,
      fontSize: font(13),
      color: '#6b6b6b',
    },
    input: {
      ...textFontStyle,
      backgroundColor: '#f3f3f3',
      borderRadius: spacing(12),
      paddingHorizontal: spacing(16),
      paddingVertical: spacing(12),
      fontSize: font(16),
      color: '#1f1f1f',
    },
    button: {
      backgroundColor: '#1f1f1f',
      borderRadius: spacing(12),
      paddingVertical: spacing(12),
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      ...textFontStyle,
      color: '#ffffff',
      fontSize: font(16),
    },
    logoutButton: {
      marginTop: spacing(12),
      backgroundColor: '#fee2e2',
      borderWidth: 1,
      borderColor: '#fecaca',
    },
    logoutButtonText: {
      ...textFontStyle,
      color: '#b91c1c',
      fontSize: font(14),
    },
    secondaryButton: {
      backgroundColor: '#f1efe7',
      paddingHorizontal: spacing(16),
      minWidth: minActionWidth,
    },
    secondaryButtonText: {
      ...textFontStyle,
      color: '#1f1f1f',
      fontSize: font(14),
    },
    rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    fieldLabel: {
      ...textFontStyle,
      fontSize: font(14),
      color: '#1f1f1f',
      marginTop: spacing(4),
    },
    swatchRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing(10),
    },
    swatch: {
      width: spacing(34),
      height: spacing(34),
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#e2ddd0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    swatchAuto: {
      backgroundColor: '#f1efe7',
    },
    swatchAutoText: {
      ...textFontStyle,
      fontSize: font(10),
      color: '#6b6b6b',
    },
    swatchSelected: {
      borderWidth: 3,
      borderColor: '#1f1f1f',
    },
    segRow: {
      flexDirection: 'row',
      gap: spacing(8),
    },
    segButton: {
      flex: 1,
      backgroundColor: '#f1efe7',
      borderRadius: spacing(10),
      paddingVertical: spacing(10),
      alignItems: 'center',
      justifyContent: 'center',
    },
    segButtonActive: {
      backgroundColor: '#1f1f1f',
    },
    segButtonText: {
      ...textFontStyle,
      fontSize: font(14),
      color: '#1f1f1f',
    },
    segButtonTextActive: {
      ...textFontStyle,
      fontSize: font(14),
      color: '#ffffff',
    },
    extrasRow: {
      marginTop: spacing(8),
      gap: spacing(12),
    },
    extrasLabelWrap: {
      flex: 1,
    },
    customColorBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing(12),
      backgroundColor: '#f1efe7',
      borderRadius: spacing(12),
      paddingHorizontal: spacing(14),
      paddingVertical: spacing(11),
    },
    customColorChip: {
      width: spacing(26),
      height: spacing(26),
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#e2ddd0',
    },
    customColorText: {
      ...textFontStyle,
      fontSize: font(14),
      color: '#1f1f1f',
    },
    statChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing(8),
    },
    statChip: {
      backgroundColor: '#f1efe7',
      borderRadius: 999,
      paddingHorizontal: spacing(14),
      paddingVertical: spacing(8),
    },
    statChipActive: {
      backgroundColor: '#1f1f1f',
    },
    statChipText: {
      ...textFontStyle,
      fontSize: font(13),
      color: '#1f1f1f',
    },
    statChipTextActive: {
      ...textFontStyle,
      fontSize: font(13),
      color: '#ffffff',
    },
    galleryItem: {
      gap: spacing(4),
      marginTop: spacing(8),
    },
    galleryPreview: {
      alignItems: 'center',
      marginBottom: spacing(4),
    },
    galleryName: {
      ...textFontStyle,
      fontSize: font(15),
      color: '#1f1f1f',
    },
    disclaimer: {
      ...textFontStyle,
      fontSize: font(12),
      color: '#9a9384',
      textAlign: 'center',
      marginBottom: spacing(8),
    },
    logHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing(8),
    },
    copyButton: {
      backgroundColor: '#e7e0cf',
    },
    loadingIndicator: {
      marginTop: spacing(12),
    },
    logContainer: {
      flex: 1,
      backgroundColor: '#f4f2ee',
      paddingHorizontal: spacing(20),
      paddingTop: spacing(60),
      paddingBottom: spacing(20),
    },
    logHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing(16),
    },
    logTitle: {
      ...textFontStyle,
      fontSize: font(20),
      color: '#1f1f1f',
    },
    closeButton: {
      paddingHorizontal: spacing(16),
      paddingVertical: spacing(8),
      backgroundColor: '#1f1f1f',
      borderRadius: spacing(12),
    },
    closeButtonText: {
      ...textFontStyle,
      color: '#ffffff',
      fontSize: font(14),
    },
    logScroll: {
      flex: 1,
      borderRadius: spacing(16),
      backgroundColor: '#ffffff',
    },
    logContent: {
      padding: spacing(16),
      gap: spacing(12),
    },
    logEntry: {
      ...textFontStyle,
      fontSize: font(14),
      color: '#1f1f1f',
    },
    logEmpty: {
      ...textFontStyle,
      fontSize: font(14),
      color: '#6b6b6b',
      textAlign: 'center',
      marginTop: spacing(24),
    },
    footer: {
      alignItems: 'center',
      gap: spacing(6),
    },
    footerText: {
      ...textFontStyle,
      fontSize: font(12),
      color: '#6b6b6b',
    },
    footerLink: {
      ...textFontStyle,
      fontSize: font(14),
      color: '#2563eb',
    },
    errorOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing(24),
    },
    errorCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: '#ffffff',
      borderRadius: spacing(16),
      padding: spacing(24),
      gap: spacing(16),
      shadowColor: '#0f172a',
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 24,
      elevation: 8,
    },
    errorTitle: {
      ...textFontStyle,
      fontSize: font(18),
      color: '#dc2626',
    },
    errorMessage: {
      ...textFontStyle,
      fontSize: font(16),
      color: '#1f1f1f',
      lineHeight: font(22),
    },
  });
}