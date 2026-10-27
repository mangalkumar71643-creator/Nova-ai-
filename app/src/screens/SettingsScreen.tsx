import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Card, Choices, type IconName, RoundButton, Row, SectionLabel } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { useChat } from '../state/ChatContext';
import { useSettings } from '../state/SettingsContext';
import {
  ACCENTS,
  type AccentName,
  type Appearance,
  floating,
  type Palette,
  radius,
  spacing,
  typography,
  useStyles,
  useTheme,
  noFocusRing,
} from '../theme';
import type { VoiceLanguage } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const APPEARANCES: { value: Appearance; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const VOICE_LANGUAGES: { value: VoiceLanguage; label: string }[] = [
  { value: 'hi-IN', label: 'हिंदी / Hinglish' },
  { value: 'en-IN', label: 'English' },
];

interface SettingRow {
  key: string;
  icon: IconName;
  title: string;
  subtitle?: string;
  value?: string;
  dot?: string;
  danger?: boolean;
  /** Rows with `expand` open an inline choice list; others navigate or act. */
  expand?: React.ReactNode;
  onPress?: () => void;
}

function confirm(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function SettingsScreen({ navigation }: Props) {
  const styles = useStyles(createStyles);
  const { colors } = useTheme();
  const { settings, updateSettings } = useSettings();
  const { conversations, deleteAllConversations } = useChat();
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();

  const toggle = (key: string) => setOpen((current) => (current === key ? null : key));
  const accentColor = (name: AccentName) => (name === 'black' ? colors.inverse : ACCENTS[name].color);

  const sections: { label?: string; rows: SettingRow[] }[] = [
    {
      label: 'Mera Nova',
      rows: [
        {
          key: 'personalization',
          icon: 'happy-outline',
          title: 'Personalization',
          subtitle: settings.systemPrompt ? 'Custom instructions on' : undefined,
          onPress: () => navigation.navigate('Personalization'),
        },
        {
          key: 'voice',
          icon: 'pulse-outline',
          title: 'Voice',
          value: VOICE_LANGUAGES.find((v) => v.value === settings.voiceLanguage)?.label,
          expand: (
            <Choices
              options={VOICE_LANGUAGES}
              value={settings.voiceLanguage}
              onChange={(voiceLanguage) => updateSettings({ voiceLanguage })}
            />
          ),
        },
      ],
    },
    {
      rows: [
        {
          key: 'appearance',
          icon: 'sunny-outline',
          title: 'Appearance',
          value: APPEARANCES.find((a) => a.value === settings.appearance)?.label,
          expand: (
            <Choices
              options={APPEARANCES}
              value={settings.appearance}
              onChange={(appearance) => updateSettings({ appearance })}
            />
          ),
        },
        {
          key: 'accent',
          icon: 'color-palette-outline',
          title: 'Accent color',
          value: ACCENTS[settings.accent].label,
          dot: accentColor(settings.accent),
          expand: (
            <Choices
              options={(Object.keys(ACCENTS) as AccentName[]).map((name) => ({
                value: name,
                label: ACCENTS[name].label,
                dot: accentColor(name),
              }))}
              value={settings.accent}
              onChange={(accent) => updateSettings({ accent })}
            />
          ),
        },
      ],
    },
    {
      rows: [
        {
          key: 'server',
          icon: 'server-outline',
          title: 'Server connection',
          subtitle: settings.serverUrl,
          onPress: () => navigation.navigate('Server'),
        },
        {
          key: 'editor',
          icon: 'color-wand-outline',
          title: 'Photo editor',
          onPress: () => navigation.navigate('PhotoEditor'),
        },
        {
          key: 'about',
          icon: 'information-circle-outline',
          title: 'About',
          value: `v${Constants.expoConfig?.version ?? '1.0.0'}`,
        },
      ],
    },
    {
      rows: [
        {
          key: 'delete',
          icon: 'trash-outline',
          title: 'Saari chats delete karo',
          subtitle: `${conversations.length} chats`,
          danger: true,
          onPress: () =>
            confirm('Saari chats delete karein?', 'Yeh wapas nahi aayengi.', deleteAllConversations),
        },
      ],
    },
  ];

  const q = query.trim().toLowerCase();
  const filtered = sections
    .map((section) => ({
      ...section,
      rows: section.rows.filter((r) => !q || r.title.toLowerCase().includes(q)),
    }))
    .filter((section) => section.rows.length > 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.content, q ? styles.contentSearching : null]}
        keyboardShouldPersistTaps="handled"
      >
        {!q ? (
          <View style={styles.profile}>
            <Pressable
              accessibilityLabel="Edit profile"
              onPress={() => navigation.navigate('Personalization')}
            >
              <Avatar name={settings.displayName} size={96} />
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={16} color={colors.textPrimary} />
              </View>
            </Pressable>
            <Text style={styles.name}>{settings.displayName || 'Apna naam jodiye'}</Text>
          </View>
        ) : null}

        {filtered.map((section, i) => (
          <View key={i}>
            {section.label ? <SectionLabel>{section.label}</SectionLabel> : <View style={styles.gap} />}
            <Card>
              {section.rows.map((row) => (
                <View key={row.key}>
                  <Row
                    icon={row.icon}
                    title={row.title}
                    subtitle={row.subtitle}
                    value={row.value}
                    dot={row.dot}
                    danger={row.danger}
                    chevron={
                      row.expand ? (open === row.key ? 'up' : 'down') : row.onPress ? 'forward' : undefined
                    }
                    onPress={row.expand ? () => toggle(row.key) : row.onPress}
                  />
                  {row.expand && open === row.key ? row.expand : null}
                </View>
              ))}
            </Card>
          </View>
        ))}
        {filtered.length === 0 ? <Text style={styles.noResults}>Koi setting nahi mili.</Text> : null}
      </ScrollView>

      <RoundButton
        icon="arrow-back"
        label="Back"
        onPress={() => navigation.goBack()}
        style={[styles.back, { top: insets.top + spacing.sm }]}
      />

      <View style={[styles.searchPill, { bottom: insets.bottom + spacing.lg }]}>
        <Ionicons name="search" size={22} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search settings"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: 120,
    },
    // Leaves room for the floating back button when the profile header is hidden.
    contentSearching: {
      paddingTop: 64,
    },
    back: {
      position: 'absolute',
      left: spacing.lg,
    },
    profile: {
      alignItems: 'center',
      gap: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    editBadge: {
      position: 'absolute',
      right: -4,
      bottom: -4,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.muted,
      borderWidth: 3,
      borderColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    name: {
      color: c.textPrimary,
      fontSize: typography.xl,
      fontWeight: '600',
    },
    gap: {
      height: spacing.xl,
    },
    noResults: {
      color: c.textMuted,
      textAlign: 'center',
      marginTop: spacing.xxl * 2,
    },
    searchPill: {
      ...floating(c),
      position: 'absolute',
      left: spacing.xxl + spacing.lg,
      right: spacing.xxl + spacing.lg,
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.pill,
    },
    searchInput: {
      flex: 1,
      height: '100%',
      color: c.textPrimary,
      fontSize: typography.lg,
      ...noFocusRing,
    },
  });
