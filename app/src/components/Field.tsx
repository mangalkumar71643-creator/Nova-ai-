import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { noFocusRing, type Palette, radius, spacing, typography, useStyles, useTheme } from '../theme';

export default function Field({
  label,
  hint,
  ...inputProps
}: { label: string; hint?: string } & React.ComponentProps<typeof TextInput>) {
  const styles = useStyles(createStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, inputProps.multiline && styles.multiline]}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        {...inputProps}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    field: {
      gap: spacing.sm,
    },
    label: {
      color: c.textPrimary,
      fontSize: typography.md,
      fontWeight: '600',
    },
    input: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      color: c.textPrimary,
      fontSize: typography.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      ...noFocusRing,
    },
    multiline: {
      minHeight: 120,
      textAlignVertical: 'top',
    },
    hint: {
      color: c.textMuted,
      fontSize: typography.xs,
      lineHeight: 17,
    },
  });
