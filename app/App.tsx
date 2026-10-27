import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { ChatProvider } from './src/state/ChatContext';
import { SettingsProvider } from './src/state/SettingsContext';
import { useTheme } from './src/theme';

function ThemedApp() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ChatProvider>
          <ThemedApp />
        </ChatProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
