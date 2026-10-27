import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { checkHealth } from '../api/chat';
import { useSettings } from '../state/SettingsContext';
import type { VoiceLanguage } from '../types';
import { colors, radius, spacing, typography } from '../theme';

const VOICE_LANGUAGES: { value: VoiceLanguage; label: string }[] = [
  { value: 'hi-IN', label: 'हिंदी / Hinglish' },
  { value: 'en-IN', label: 'English' },
];

function Field({
  label,
  hint,
  ...inputProps
}: { label: string; hint: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, inputProps.multiline && styles.inputMultiline]}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        {...inputProps}
      />
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

export default function SettingsScreen() {
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Field
        label="Server URL"
        hint="Nova AI server ka address. Asli phone par apne computer ka IP use karein, jaise http://192.168.1.5:8787"
        value={settings.serverUrl}
        onChangeText={(serverUrl) => updateSettings({ serverUrl })}
        keyboardType="url"
        placeholder="http://localhost:8787"
      />
      <Field
        label="API token (optional)"
        hint="Agar server par API_TOKEN set hai to wahi yahan likhein."
        value={settings.apiToken}
        onChangeText={(apiToken) => updateSettings({ apiToken })}
        secureTextEntry
        placeholder="—"
      />
      <Field
        label="Custom instructions (optional)"
        hint="AI ko kaise behave karna hai. Khali chhodne par server ka SYSTEM_PROMPT use hoga."
        value={settings.systemPrompt}
        onChangeText={(systemPrompt) => updateSettings({ systemPrompt })}
        multiline
        autoCapitalize="sentences"
        autoCorrect
        placeholder="e.g. Hamesha Hinglish me chhota jawab do."
      />

      <View style={styles.field}>
        <Text style={styles.label}>Voice language</Text>
        <View style={styles.chips}>
          {VOICE_LANGUAGES.map(({ value, label }) => (
            <Pressable
              key={value}
              style={[styles.chip, settings.voiceLanguage === value && styles.chipActive]}
              onPress={() => updateSettings({ voiceLanguage: value })}
            >
              <Text style={styles.chipText}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>Bolkar sawal poochne aur jawab sunne ki bhasha.</Text>
      </View>

      <Pressable style={styles.button} onPress={testConnection} disabled={testing}>
        <Text style={styles.buttonText}>{testing ? 'Checking…' : 'Test connection'}</Text>
      </Pressable>
      {status ? (
        <Text style={[styles.status, { color: status.ok ? colors.accent : colors.danger }]}>
          {status.text}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: typography.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hint: {
    color: colors.textMuted,
    fontSize: typography.xs,
    lineHeight: 16,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textPrimary,
    fontSize: typography.sm,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: '600',
  },
  status: {
    fontSize: typography.sm,
    textAlign: 'center',
  },
});
