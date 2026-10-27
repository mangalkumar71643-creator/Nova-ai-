import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { floating, type Palette, radius, spacing, typography, useStyles, useTheme } from '../theme';

export type IconName = keyof typeof Ionicons.glyphMap;

/** The floating white circle buttons ChatGPT uses in its headers. */
export function RoundButton({
  icon,
  label,
  onPress,
  children,
  style,
}: {
  icon?: IconName;
  label: string;
  onPress: () => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles(createStyles);
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.round, style]}
    >
      {children ?? <Ionicons name={icon!} size={22} color={colors.textPrimary} />}
    </Pressable>
  );
}

/** Two lines of different length — the ChatGPT menu icon. */
export function MenuIcon() {
  const styles = useStyles(createStyles);
  return (
    <View style={styles.menuIcon}>
      <View style={[styles.menuLine, { width: 22 }]} />
      <View style={[styles.menuLine, { width: 14 }]} />
    </View>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  const styles = useStyles(createStyles);
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.card}>
      {items.map((child, i) => (
        <View key={i} style={i > 0 && styles.divider}>
          {child}
        </View>
      ))}
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  const styles = useStyles(createStyles);
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

/** A settings-style row: icon, title (and optional subtitle), value and chevron. */
export function Row({
  icon,
  title,
  subtitle,
  value,
  dot,
  chevron,
  danger,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  value?: string;
  /** Colour swatch shown before the value (accent colour picker). */
  dot?: string;
  chevron?: 'down' | 'up' | 'forward';
  danger?: boolean;
  onPress?: () => void;
}) {
  const styles = useStyles(createStyles);
  const { colors } = useTheme();
  const tint = danger ? colors.danger : colors.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Ionicons name={icon} size={24} color={tint} />
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: tint }]}>{title}</Text>
        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {chevron ? (
        <Ionicons
          name={chevron === 'forward' ? 'chevron-forward' : chevron === 'up' ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      ) : null}
    </Pressable>
  );
}

/** Small choice list shown under an expanded row (Appearance, Accent colour, Voice). */
export function Choices<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; dot?: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const styles = useStyles(createStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.choices}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="radio"
          accessibilityState={{ selected: option.value === value }}
          onPress={() => onChange(option.value)}
          style={styles.choice}
        >
          {option.dot ? <View style={[styles.dot, { backgroundColor: option.dot }]} /> : null}
          <Text style={styles.choiceText}>{option.label}</Text>
          {option.value === value ? <Ionicons name="checkmark" size={20} color={colors.textPrimary} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

export function Avatar({ name, size }: { name: string; size: number }) {
  const styles = useStyles(createStyles);
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join('') || 'N';
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    round: {
      ...floating(c),
      width: 48,
      height: 48,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuIcon: {
      gap: 6,
    },
    menuLine: {
      height: 2.5,
      borderRadius: 2,
      backgroundColor: c.textPrimary,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      overflow: 'hidden',
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    sectionLabel: {
      color: c.textMuted,
      fontSize: typography.md,
      fontWeight: '500',
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
      marginLeft: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg + 2,
    },
    rowPressed: {
      backgroundColor: c.muted,
    },
    rowText: {
      flex: 1,
    },
    rowTitle: {
      fontSize: typography.lg,
      fontWeight: '500',
    },
    rowSubtitle: {
      color: c.textSecondary,
      fontSize: typography.sm,
      marginTop: 2,
    },
    rowValue: {
      color: c.textSecondary,
      fontSize: typography.md,
    },
    dot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    choices: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.sm,
    },
    choice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingLeft: 40,
    },
    choiceText: {
      flex: 1,
      color: c.textPrimary,
      fontSize: typography.md,
    },
    avatar: {
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: c.onAccent,
      fontWeight: '600',
    },
  });
