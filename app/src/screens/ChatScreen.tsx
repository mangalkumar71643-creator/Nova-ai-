import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Composer, { type ComposerHandle } from '../components/Composer';
import MessageBubble from '../components/MessageBubble';
import { type IconName, MenuIcon, RoundButton } from '../components/ui';
import { useSpeaker } from '../media/voice';
import type { RootStackParamList } from '../navigation/types';
import { useChat } from '../state/ChatContext';
import { useSettings } from '../state/SettingsContext';
import { type Palette, spacing, typography, useStyles, useTheme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export default function ChatScreen({ navigation }: Props) {
  const styles = useStyles(createStyles);
  const { colors } = useTheme();
  const { activeConversation, streamingId, startNewChat } = useChat();
  const { settings } = useSettings();
  const speaker = useSpeaker(settings.voiceLanguage);
  const listRef = useRef<FlatList>(null);
  const composerRef = useRef<ComposerHandle>(null);
  const messages = activeConversation?.messages ?? [];
  const isStreaming = streamingId !== null;
  const openEditor = (uri?: string) => navigation.navigate('PhotoEditor', { uri });

  // In voice mode the reply is read out loud as soon as it has finished streaming.
  const speakNextReply = useRef(false);
  const wasStreaming = useRef(false);
  useEffect(() => {
    if (wasStreaming.current && !isStreaming && speakNextReply.current) {
      speakNextReply.current = false;
      const last = messages.at(-1);
      if (last?.role === 'assistant' && last.content) speaker.toggle(last.id, last.content);
    }
    wasStreaming.current = isStreaming;
  }, [isStreaming, messages, speaker]);

  const suggestions: { icon: IconName; label: string; onPress: () => void }[] = [
    {
      icon: 'image-outline',
      label: 'Photo dikhao aur poochho',
      onPress: () => composerRef.current?.attach('library'),
    },
    { icon: 'color-wand-outline', label: 'Photo edit karo', onPress: () => openEditor() },
    {
      icon: 'pencil-outline',
      label: 'Likhna ya edit karna',
      onPress: () => composerRef.current?.prefill('Mere liye likho: '),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <RoundButton label="Open menu" onPress={() => navigation.navigate('Drawer')}>
          <MenuIcon />
        </RoundButton>
        <Text style={styles.title} numberOfLines={1}>
          {activeConversation?.title ?? ''}
        </Text>
        <RoundButton icon="create-outline" label="New chat" onPress={startNewChat} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.flex} />
            {suggestions.map((s) => (
              <Pressable key={s.label} style={styles.suggestion} onPress={s.onPress}>
                <Ionicons name={s.icon} size={26} color={colors.textSecondary} />
                <Text style={styles.suggestionText}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <FlatList
            ref={listRef}
            style={styles.flex}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item, index }) => (
              <MessageBubble
                message={item}
                isStreaming={isStreaming && index === messages.length - 1}
                isSpeaking={speaker.speakingId === item.id}
                onSpeak={(m) => speaker.toggle(m.id, m.content)}
                onOpenImage={openEditor}
              />
            )}
            extraData={speaker.speakingId}
            contentContainerStyle={styles.list}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <Composer
          ref={composerRef}
          isStreaming={isStreaming}
          onEditImage={openEditor}
          onVoiceTurn={() => (speakNextReply.current = true)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    flex: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    title: {
      flex: 1,
      color: c.textPrimary,
      fontSize: typography.md,
      fontWeight: '600',
      textAlign: 'center',
    },
    list: {
      paddingVertical: spacing.md,
    },
    empty: {
      flex: 1,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.md,
    },
    suggestion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      paddingVertical: spacing.lg,
    },
    suggestionText: {
      color: c.textSecondary,
      fontSize: typography.lg,
      fontWeight: '500',
    },
  });
