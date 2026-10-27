import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Field from '../components/Field';
import { useSettings } from '../state/SettingsContext';
import { type Palette, spacing, useStyles } from '../theme';

export default function PersonalizationScreen() {
  const styles = useStyles(createStyles);
  const { settings, updateSettings } = useSettings();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Field
        label="Aapka naam"
        hint="Menu aur Settings me dikhta hai. (Login baad me judega.)"
        value={settings.displayName}
        onChangeText={(displayName) => updateSettings({ displayName })}
        autoCapitalize="words"
        placeholder="Jaise: Mangal Kumar"
      />
      <Field
        label="Custom instructions"
        hint="Nova ko kaise jawab dena hai. Khali chhodne par server ka SYSTEM_PROMPT use hoga."
        value={settings.systemPrompt}
        onChangeText={(systemPrompt) => updateSettings({ systemPrompt })}
        multiline
        autoCapitalize="sentences"
        autoCorrect
        placeholder="Jaise: Hamesha Hinglish me chhota aur seedha jawab do."
      />
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
  });
