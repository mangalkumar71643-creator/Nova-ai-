import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { checkHealth } from '../api/chat';
import Field from '../components/Field';
import { useSettings } from '../state/SettingsContext';
import { type Palette, radius, spacing, typography, useStyles, useTheme } from '../theme';

export default function ServerScreen() {
  const styles = useStyles(createStyles);
  const { colors } = useTheme();
  const { settings, updateSettings } = useSettings();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    setStatus(null);
    try {
      const health = await checkHealth(settings);
      setStatus({ ok: true, text: `Connected · provider: ${health.provider} · model: ${health.model}` });
    } catch (err) {
      setStatus({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Field
        label="Server URL"
        hint="Nova AI server ka address. Default: https://nova-ai-server.vercel.app (internet par chalne wala server)."
        value={settings.serverUrl}
        onChangeText={(serverUrl) => updateSettings({ serverUrl })}
        keyboardType="url"
        placeholder="https://nova-ai-server.vercel.app"
      />
      <Field
        label="API token (optional)"
        hint="Agar server par API_TOKEN set hai to wahi yahan likhein."
        value={settings.apiToken}
        onChangeText={(apiToken) => updateSettings({ apiToken })}
        secureTextEntry
        placeholder="—"
      />
      <Pressable style={styles.button} onPress={testConnection} disabled={testing}>
        <Text style={styles.buttonText}>{testing ? 'Checking…' : 'Test connection'}</Text>
      </Pressable>
      {status ? (
        <Text style={[styles.status, { color: status.ok ? colors.textPrimary : colors.danger }]}>
          {status.ok ? '✓ ' : ''}
          {status.text}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      padding: spacing.lg,
      gap: spacing.xl,
    },
    button: {
      backgroundColor: c.inverse,
      borderRadius: radius.pill,
      paddingVertical: spacing.md + 2,
      alignItems: 'center',
    },
    buttonText: {
      color: c.onInverse,
      fontSize: typography.md,
      fontWeight: '600',
    },
    status: {
      fontSize: typography.sm,
      textAlign: 'center',
    },
  });
