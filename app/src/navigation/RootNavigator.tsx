import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import ChatScreen from '../screens/ChatScreen';
import DrawerScreen from '../screens/DrawerScreen';
import PersonalizationScreen from '../screens/PersonalizationScreen';
import PhotoEditorScreen from '../screens/PhotoEditorScreen';
import ServerScreen from '../screens/ServerScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useTheme } from '../theme';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { colors, isDark } = useTheme();
  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.background,
        text: colors.textPrimary,
        border: colors.border,
        primary: colors.accent,
      },
    };
  }, [colors, isDark]);

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="Drawer"
          component={DrawerScreen}
          options={{ headerShown: false, presentation: 'transparentModal', animation: 'slide_from_left' }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Personalization" component={PersonalizationScreen} />
        <Stack.Screen name="Server" component={ServerScreen} options={{ title: 'Server connection' }} />
        <Stack.Screen name="PhotoEditor" component={PhotoEditorScreen} options={{ title: 'Photo editor' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
