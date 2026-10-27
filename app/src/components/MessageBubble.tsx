import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';
import type { Message } from '../types';
import Logo from './Logo';
import MarkdownText from './MarkdownText';

interface Props {
  message: Message;
  isStreaming: boolean;
  isSpeaking: boolean;
  onSpeak: (message: Message) => void;
  onOpenImage: (uri: string) => void;
}

const IMAGE_WIDTH = 220;

function MessageBubble({ message, isStreaming, isSpeaking, onSpeak, onOpenImage }: Props) {
  if (message.role === 'user') {
    const { image } = message;
    return (
      <View style={styles.userRow}>
        {image ? (
          <Pressable accessibilityLabel="Open photo in editor" onPress={() => onOpenImage(image.uri)}>
            <Image
              source={{ uri: image.uri }}
              style={[styles.userImage, { height: (IMAGE_WIDTH * image.height) / image.width }]}
            />
          </Pressable>
        ) : null}
        <View style={styles.userBubble}>
          <Text selectable style={styles.userText}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantRow}>
      <Logo size={28} />
      <View style={styles.assistantBody}>
        {message.content ? <MarkdownText>{message.content}</MarkdownText> : null}
        {isStreaming && !message.content ? (
          <ActivityIndicator color={colors.textSecondary} style={styles.loader} />
        ) : null}
        {message.error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{message.error}</Text>
          </View>
        ) : null}
        {message.content && !isStreaming ? (
          <Pressable
            accessibilityLabel={isSpeaking ? 'Stop reading aloud' : 'Read aloud'}
            hitSlop={8}
            onPress={() => onSpeak(message)}
            style={styles.action}
          >
            <Ionicons
              name={isSpeaking ? 'stop-circle-outline' : 'volume-medium-outline'}
              size={18}
              color={isSpeaking ? colors.accent : colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default React.memo(MessageBubble);

const styles = StyleSheet.create({
  userRow: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  userImage: {
    width: IMAGE_WIDTH,
    maxHeight: 320,
    borderRadius: radius.md,
  },
  userBubble: {
    maxWidth: '85%',
    backgroundColor: colors.userBubble,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  userText: {
    color: colors.textPrimary,
    fontSize: typography.md,
    lineHeight: 22,
  },
  assistantRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  assistantBody: {
    flex: 1,
    gap: spacing.sm,
  },
  loader: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  action: {
    alignSelf: 'flex-start',
  },
  errorBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: typography.sm,
    lineHeight: 19,
  },
});
