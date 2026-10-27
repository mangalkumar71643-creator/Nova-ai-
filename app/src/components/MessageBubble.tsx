import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { type Palette, radius, spacing, typography, useStyles, useTheme } from '../theme';
import type { Message } from '../types';
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
  const styles = useStyles(createStyles);
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);

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

  const copy = async () => {
    await Clipboard.setStringAsync(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View style={styles.assistant}>
      {message.content ? <MarkdownText>{message.content}</MarkdownText> : null}
      {isStreaming && !message.content ? <View style={styles.thinking} /> : null}
      {isStreaming && message.content ? (
        <ActivityIndicator size="small" color={colors.textMuted} style={styles.loader} />
      ) : null}
      {message.error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{message.error}</Text>
        </View>
      ) : null}
      {message.content && !isStreaming ? (
        <View style={styles.actions}>
          <Pressable accessibilityLabel="Copy" hitSlop={8} onPress={copy}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable
            accessibilityLabel={isSpeaking ? 'Stop reading aloud' : 'Read aloud'}
            hitSlop={8}
            onPress={() => onSpeak(message)}
          >
            <Ionicons
              name={isSpeaking ? 'stop-circle-outline' : 'volume-medium-outline'}
              size={20}
              color={isSpeaking ? colors.textPrimary : colors.textMuted}
            />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default React.memo(MessageBubble);

const createStyles = (c: Palette) =>
  StyleSheet.create({
    userRow: {
      alignItems: 'flex-end',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      gap: spacing.xs,
    },
    userImage: {
      width: IMAGE_WIDTH,
      maxHeight: 320,
      borderRadius: radius.lg,
    },
    userBubble: {
      maxWidth: '80%',
      backgroundColor: c.muted,
      borderRadius: 22,
      paddingHorizontal: spacing.lg + 2,
      paddingVertical: spacing.md - 1,
    },
    userText: {
      color: c.textPrimary,
      fontSize: typography.md + 1,
      lineHeight: 24,
    },
    assistant: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    // ChatGPT shows a pulsing dot while it thinks; a solid one keeps this simple.
    thinking: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: c.textPrimary,
      marginTop: spacing.xs,
    },
    loader: {
      alignSelf: 'flex-start',
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.lg,
      paddingTop: spacing.xs,
    },
    errorBox: {
      flexDirection: 'row',
      gap: spacing.sm,
      backgroundColor: c.muted,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    errorText: {
      flex: 1,
      color: c.danger,
      fontSize: typography.sm,
      lineHeight: 19,
    },
  });
