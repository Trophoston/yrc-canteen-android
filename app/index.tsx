import {
  WIDGET_NAME,
  loadCredentials,
  loadPreferencesWithDefaults,
  loadWidgetState,
  logout,
  persistCredentials,
  refreshWidgetState,
  updateTheme,
} from '@/src/canteen/service';
import type { WidgetState, WidgetTheme } from '@/src/canteen/types';
import HelloWidget from '@/widget/HelloWidget';
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
  View,
} from 'react-native';
import { WidgetPreview, requestWidgetUpdate } from 'react-native-android-widget';

export default function Index() {
  const [widgetState, setWidgetState] = useState<WidgetState | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [theme, setTheme] = useState<WidgetTheme>('light');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [logsVisible, setLogsVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

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
      appendLog(`⚠️ ${message}`);
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
    try {
      await requestWidgetUpdate({
        widgetName: WIDGET_NAME,
        renderWidget: () => <HelloWidget state={state} />,
      });
    } catch (error) {
      console.warn('Widget update request failed', error);
    }
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

  const handleThemeToggle = useCallback(
    async (nextValue: boolean) => {
      const nextTheme: WidgetTheme = nextValue ? 'dark' : 'light';
      setTheme(nextTheme);
      try {
        const state = await updateTheme(nextTheme);
        setWidgetState(state);
        await pushWidgetUpdate(state);
      } catch (error) {
        console.warn('Failed to update theme', error);
      }
    },
    [pushWidgetUpdate],
  );

  const handleOpenCredit = useCallback(() => {
    Linking.openURL('https://www.instagram.com/trophoston/').catch((error) => {
      console.warn('Failed to open Instagram link', error);
    });
  }, []);

  const handleOpenCredit2 = useCallback(() => {
    Linking.openURL('https://github.com/trophoston').catch((error) => {
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
          renderWidget={() => <HelloWidget state={previewState} />}
          width={320}
          height={200}
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
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.sectionTitle}>ข้อมูลปัจจุบัน</Text>
            {previewState.ownerName ? (
              <Text style={styles.sectionHint}>บัญชี: {previewState.ownerName}</Text>
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
        <Text style={styles.footerText}>Credit</Text>
        <Pressable onPress={handleOpenCredit} accessibilityRole="link">
          <Text style={styles.footerLink}>@trophoston</Text>
        </Pressable>
        <Text style={styles.footerText}>Project Github</Text>
        <Pressable onPress={handleOpenCredit2} accessibilityRole="link">
          <Text style={styles.footerLink}>@trophoston</Text>
        </Pressable>
      </View>

      {loading ? <ActivityIndicator style={styles.loadingIndicator} /> : null}

      <Modal visible={logsVisible} animationType="slide" onRequestClose={() => setLogsVisible(false)}>
        <View style={styles.logContainer}>
          <View style={styles.logHeader}>
            <Text style={styles.logTitle}>บันทึกการทำงาน</Text>
            <Pressable style={styles.closeButton} onPress={() => setLogsVisible(false)}>
              <Text style={styles.closeButtonText}>ปิด</Text>
            </Pressable>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 24,
    backgroundColor: '#f4f2ee',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f1f1f',
  },
  infoButton: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  infoButtonText: {
    fontSize: 16,
  },
  previewWrapper: {
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f1f1f',
  },
  sectionHint: {
    fontSize: 13,
    color: '#6b6b6b',
  },
  input: {
    backgroundColor: '#f3f3f3',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f1f1f',
  },
  button: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 12,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutButtonText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f1efe7',
    paddingHorizontal: 16,
    minWidth: 140,
  },
  secondaryButtonText: {
    color: '#1f1f1f',
    fontSize: 14,
    fontWeight: '600',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loadingIndicator: {
    marginTop: 12,
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#f4f2ee',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f1f1f',
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  logScroll: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#ffffff',
  },
  logContent: {
    padding: 16,
    gap: 12,
  },
  logEntry: {
    fontSize: 14,
    color: '#1f1f1f',
  },
  logEmpty: {
    fontSize: 14,
    color: '#6b6b6b',
    textAlign: 'center',
    marginTop: 24,
  },
  footer: {
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#6b6b6b',
  },
  footerLink: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  errorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    gap: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#dc2626',
  },
  errorMessage: {
    fontSize: 16,
    color: '#1f1f1f',
    lineHeight: 22,
  },
});