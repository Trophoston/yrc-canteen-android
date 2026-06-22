import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

const FONT_REGULAR = 'LINESeedSansTH-Regular';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return null;
  const n = Number.parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

interface ColorPickerProps {
  visible: boolean;
  initialColor?: string | null;
  recent?: string[];
  title?: string;
  onClose: () => void;
  onSelect: (hex: string) => void;
  /** Optional "follow theme" reset. */
  onClear?: () => void;
}

export default function ColorPicker({
  visible,
  initialColor,
  recent = [],
  title = 'เลือกสี',
  onClose,
  onSelect,
  onClear,
}: ColorPickerProps) {
  const { width: winW } = useWindowDimensions();
  const size = Math.min(winW - 80, 300);
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const [h, setH] = useState(265);
  const [s, setS] = useState(0.85);
  const [v, setV] = useState(0.9);
  const [hexInput, setHexInput] = useState('');

  useEffect(() => {
    if (!visible) return;
    const rgb = hexToRgb(initialColor ?? '');
    if (rgb) {
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setH(hsv.h);
      setS(hsv.s);
      setV(hsv.v);
    }
  }, [visible, initialColor]);

  const rgb = useMemo(() => hsvToRgb(h, s, v), [h, s, v]);
  const hex = useMemo(() => rgbToHex(rgb.r, rgb.g, rgb.b), [rgb]);
  const hueHex = useMemo(() => {
    const c = hsvToRgb(h, 1, 1);
    return rgbToHex(c.r, c.g, c.b);
  }, [h]);

  useEffect(() => {
    setHexInput(hex.replace('#', '').toUpperCase());
  }, [hex]);

  const svPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const sz = sizeRef.current;
          setS(clamp(e.nativeEvent.locationX / sz, 0, 1));
          setV(clamp(1 - e.nativeEvent.locationY / sz, 0, 1));
        },
        onPanResponderMove: (e) => {
          const sz = sizeRef.current;
          setS(clamp(e.nativeEvent.locationX / sz, 0, 1));
          setV(clamp(1 - e.nativeEvent.locationY / sz, 0, 1));
        },
      }),
    [],
  );

  const huePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => setH(clamp(e.nativeEvent.locationX / sizeRef.current, 0, 1) * 360),
        onPanResponderMove: (e) => setH(clamp(e.nativeEvent.locationX / sizeRef.current, 0, 1) * 360),
      }),
    [],
  );

  const applyHex = (raw: string) => {
    const rgbValue = hexToRgb(raw);
    if (!rgbValue) return;
    const hsv = rgbToHsv(rgbValue.r, rgbValue.g, rgbValue.b);
    setH(hsv.h);
    setS(hsv.s);
    setV(hsv.v);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable hitSlop={10} onPress={onClose}>
              <Text style={styles.close}>ปิด</Text>
            </Pressable>
          </View>

          <View
            style={[styles.svArea, { width: size, height: size, backgroundColor: hueHex }]}
            {...svPan.panHandlers}
          >
            <LinearGradient
              colors={['#ffffff', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0)', '#000000']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={[styles.svThumb, { left: s * size - 10, top: (1 - v) * size - 10 }]}
            />
          </View>

          <View style={[styles.hueArea, { width: size }]} {...huePan.panHandlers}>
            <LinearGradient
              colors={['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.hueGradient}
            />
            <View pointerEvents="none" style={[styles.hueThumb, { left: (h / 360) * size - 10 }]} />
          </View>

          <View style={[styles.inputRow, { width: size }]}>
            <View style={[styles.preview, { backgroundColor: hex }]} />
            <View style={styles.hexWrap}>
              <Text style={styles.hexHash}>#</Text>
              <TextInput
                value={hexInput}
                onChangeText={setHexInput}
                onSubmitEditing={() => applyHex(hexInput)}
                onEndEditing={() => applyHex(hexInput)}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
                style={styles.hexInput}
                placeholder="RRGGBB"
              />
            </View>
          </View>

          <Text style={[styles.rgbText, { width: size }]}>{`RGB  ${rgb.r}, ${rgb.g}, ${rgb.b}`}</Text>

          {recent.length ? (
            <View style={[styles.recentWrap, { width: size }]}>
              <Text style={styles.recentLabel}>ใช้ล่าสุด</Text>
              <View style={styles.recentRow}>
                {recent.slice(0, 8).map((color, index) => (
                  <Pressable
                    key={`${color}-${index}`}
                    onPress={() => applyHex(color)}
                    style={[styles.recentSwatch, { backgroundColor: color }]}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <View style={[styles.actions, { width: size }]}>
            {onClear ? (
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClear}>
                <Text style={styles.btnGhostText}>ตามธีม</Text>
              </Pressable>
            ) : null}
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => onSelect(hex)}>
              <Text style={styles.btnPrimaryText}>เลือกสีนี้</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  title: { fontFamily: FONT_REGULAR, fontSize: 17, color: '#1f1f1f' },
  close: { fontFamily: FONT_REGULAR, fontSize: 18, color: '#8a8580' },
  svArea: { borderRadius: 14, overflow: 'hidden' },
  svThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  hueArea: { height: 20, justifyContent: 'center' },
  hueGradient: { height: 14, borderRadius: 7 },
  hueThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: 'transparent',
    top: 0,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  preview: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#e2ddd0' },
  hexWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f1ec',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  hexHash: { fontFamily: FONT_REGULAR, fontSize: 16, color: '#8a8580' },
  hexInput: { fontFamily: FONT_REGULAR, flex: 1, fontSize: 16, color: '#1f1f1f', paddingVertical: 12 },
  rgbText: { fontFamily: FONT_REGULAR, fontSize: 13, color: '#6b6b6b', textAlign: 'left' },
  recentWrap: { gap: 8 },
  recentLabel: { fontFamily: FONT_REGULAR, fontSize: 13, color: '#6b6b6b' },
  recentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  recentSwatch: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: '#e2ddd0' },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: '#f1efe7' },
  btnGhostText: { fontFamily: FONT_REGULAR, fontSize: 15, color: '#1f1f1f' },
  btnPrimary: { backgroundColor: '#1f1f1f' },
  btnPrimaryText: { fontFamily: FONT_REGULAR, fontSize: 15, color: '#ffffff' },
});
