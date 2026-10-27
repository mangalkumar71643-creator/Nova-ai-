import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, type IconName, RoundButton } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { useChat } from '../state/ChatContext';
import { useSettings } from '../state/SettingsContext';
import { type Palette, radius, spacing, typography, useStyles, useTheme, noFocusRing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Drawer'>;

function confirmDelete(title: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`"${title}" delete karein?`)) onConfirm();
    return;
  }
  Alert.alert('Chat delete karein?', title, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

/** ChatGPT-style side menu: shown as a transparent modal over the chat. */
export default function DrawerScreen({ navigation }: Props) {
  const styles = useStyles(createStyles);
  const { colors } = useTheme();
  const { settings } = useSettings();
  const { conversations, activeConversation, startNewChat, openConversation, deleteConversation } = useChat();
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');

  const close = () => navigation.goBack();
  const visible = query.trim()
    ? conversations.filter((c) =>
        [c.title, ...c.messages.map((m) => m.content)].some((t) =>
          t.toLowerCase().includes(query.trim().toLowerCase()),
        ),
      )
    : conversations;

  const links: { icon: IconName; label: string; onPress: () => void }[] = [
    { icon: 'color-wand-outline', label: 'Photo editor', onPress: () => navigation.replace('PhotoEditor') },
    { icon: 'happy-outline', label: 'Personalization', onPress: () => navigation.replace('Personalization') },
    { icon: 'settings-outline', label: 'Settings', onPress: () => navigation.replace('Settings') },
  ];

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.panel} edges={['top', 'bottom', 'left']}>
        <View style={styles.top}>
          {searching ? (
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Chats me dhoondo"
              placeholderTextColor={colors.textMuted}
              style={styles.search}
            />
          ) : (
            <Text style={styles.brand}>Nova AI</Text>
          )}
          <RoundButton
            icon={searching ? 'close' : 'search'}
            label={searching ? 'Close search' : 'Search chats'}
            onPress={() => {
              setSearching(!searching);
              setQuery('');
            }}
          />
        </View>

        <FlatList
          data={visible}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            searching ? null : (
              <View style={styles.links}>
                {links.map((link) => (
                  <Pressable key={link.label} style={styles.link} onPress={link.onPress}>
                    <Ionicons name={link.icon} size={26} color={colors.textPrimary} />
                    <Text style={styles.linkText}>{link.label}</Text>
                  </Pressable>
                ))}
                <View style={styles.separator} />
              </View>
            )
          }
          ListEmptyComponent={
            <Text style={styles.empty}>{query ? 'Kuch nahi mila.' : 'Abhi koi chat nahi hai.'}</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.chat, item.id === activeConversation?.id && styles.chatActive]}
              onPress={() => {
                openConversation(item.id);
                close();
              }}
              onLongPress={() => confirmDelete(item.title, () => deleteConversation(item.id))}
              delayLongPress={400}
            >
              <Text style={styles.chatTitle} numberOfLines={1}>
                {item.title}
              </Text>
            </Pressable>
          )}
        />

        <View style={styles.bottom}>
          <Pressable
            accessibilityLabel="New chat"
            style={styles.newChat}
            onPress={() => {
              startNewChat();
              close();
            }}
          >
            <Ionicons name="create-outline" size={22} color={colors.onAccent} />
            <Text style={styles.newChatText}>Chat</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Profile and settings"
            onPress={() => navigation.replace('Settings')}
            style={styles.avatarRing}
          >
            <Avatar name={settings.displayName} size={44} />
          </Pressable>
        </View>
      </SafeAreaView>

      <Pressable style={styles.scrim} onPress={close} accessibilityLabel="Close menu" />
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    root: {
      flex: 1,
      flexDirection: 'row',
    },
    panel: {
      width: '80%',
      maxWidth: 360,
      backgroundColor: c.background,
    },
    scrim: {
      flex: 1,
      backgroundColor: c.overlay,
    },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingLeft: spacing.xl + 4,
      paddingRight: spacing.lg,
      paddingVertical: spacing.sm,
    },
    brand: {
      flex: 1,
      color: c.textPrimary,
      fontSize: typography.xxl,
      fontWeight: '600',
    },
    search: {
      flex: 1,
      minWidth: 0, // web inputs have an intrinsic width; without this the close button is pushed off the panel
      height: 44,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
      backgroundColor: c.muted,
      color: c.textPrimary,
      fontSize: typography.md,
      ...noFocusRing,
    },
    list: {
      paddingBottom: spacing.lg,
    },
    links: {
      paddingTop: spacing.lg,
    },
    link: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg + 2,
      paddingHorizontal: spacing.xl + 4,
      paddingVertical: spacing.md + 2,
    },
    linkText: {
      color: c.textPrimary,
      fontSize: typography.lg + 2,
      fontWeight: '500',
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginHorizontal: spacing.xl + 4,
      marginVertical: spacing.lg,
    },
    chat: {
      marginHorizontal: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md + 2,
      borderRadius: radius.md,
    },
    chatActive: {
      backgroundColor: c.muted,
    },
    chatTitle: {
      color: c.textPrimary,
      fontSize: typography.lg,
    },
    empty: {
      color: c.textMuted,
      paddingHorizontal: spacing.xl + 4,
      paddingTop: spacing.md,
    },
    bottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    newChat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl + 4,
      height: 52,
      borderRadius: radius.pill,
      backgroundColor: c.accent,
    },
    newChatText: {
      color: c.onAccent,
      fontSize: typography.lg + 2,
      fontWeight: '600',
    },
    avatarRing: {
      padding: 4,
      borderRadius: radius.pill,
      backgroundColor: c.surface,
    },
  });
