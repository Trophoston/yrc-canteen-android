import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';
import { StyleProp, Text, TextInput, TextStyle } from 'react-native';

const FONT_REGULAR = 'LINESeedSansTH-Regular';
type ComponentWithDefault = {
  defaultProps?: {
    style?: StyleProp<TextStyle>;
  };
};

const TextWithDefault = Text as typeof Text & ComponentWithDefault;
const TextInputWithDefault = TextInput as typeof TextInput & ComponentWithDefault;

SplashScreen.preventAutoHideAsync().catch(() => {
  /* no-op */
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    [FONT_REGULAR]: require('../assets/font/LINESeedSansTH_A_Rg.ttf'),
  });

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    const fontStyle: StyleProp<TextStyle> = { fontFamily: FONT_REGULAR };

    const ensureFont = (component: ComponentWithDefault) => {
      if (component.defaultProps == null) {
        component.defaultProps = {};
      }

      if (Array.isArray(component.defaultProps.style)) {
        component.defaultProps.style = [...component.defaultProps.style, fontStyle];
      } else if (component.defaultProps.style) {
        component.defaultProps.style = [component.defaultProps.style, fontStyle];
      } else {
        component.defaultProps.style = fontStyle;
      }
    };

    ensureFont(TextWithDefault);
    ensureFont(TextInputWithDefault);

    SplashScreen.hideAsync().catch(() => {
      /* no-op */
    });
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const screenOptions = useMemo(
    () => ({
      headerTitle: 'YRC CANTEEN WIDGET',
      headerTitleStyle: { fontFamily: FONT_REGULAR },
    }),
    [],
  );

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
