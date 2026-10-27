import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { pickImage } from '../media/images';
import { useVoiceInput } from '../media/voice';
import { useChat } from '../state/ChatContext';
import { useSettings } from '../state/SettingsContext';
import { colors, radius, spacing, typography } from '../theme';

interface Props {
  isStreaming: boolean;
  onEditImage: (uri: string) => void;
}

function ToolButton({
  name,
  label,
  onPress,
  active,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={[styles.tool, active && styles.toolActive]}
    >
      <Ionicons name={name} size={20} color={active ? colors.background : colors.textSecondary} />
    </Pressable>
  );
}

export default function Composer({ isStreaming, onEditImage }: Props) {
  const { sendMessage, stopGenerating, draftImage, setDraftImage } = useChat();
  const { settings } = useSettings();
  const [text, setText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const voice = useVoiceInput(settings.voiceLanguage, setText);
  const canSend = (text.trim().length > 0 || draftImage !== null) && !isStreaming;

  const send = () => {
    if (!canSend) return;
    if (voice.listening) voice.stop();
    sendMessage(text);
    setText('');
  };

  const attach = async (source: 'camera' | 'library') => {
    setNotice(null);
    try {
      const image = await pickImage(source);
      if (image) setDraftImage(image);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    }
  };

  const message = notice ?? voice.error;

  return (
    <View>
      {message ? <Text style={styles.notice}>{message}</Text> : null}
      {voice.listening ? <Text style={styles.listening}>Sun raha hoon… boliye</Text> : null}

      <View style={styles.container}>
        {draftImage ? (
          <View style={styles.preview}>
            <Image source={{ uri: draftImage.uri }} style={styles.previewImage} />
            <Pressable
              accessibilityLabel="Edit photo"
              style={[styles.previewButton, styles.previewEdit]}
              onPress={() => onEditImage(draftImage.uri)}
            >
              <Ionicons name="color-wand" size={12} color={colors.textPrimary} />
            </Pressable>
            <Pressable
              accessibilityLabel="Remove photo"
              style={[styles.previewButton, styles.previewRemove]}
              onPress={() => setDraftImage(null)}
            >
              <Ionicons name="close" size={12} color={colors.textPrimary} />
            </Pressable>
          </View>
        ) : null}

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={draftImage ? 'Photo ke baare me poochiye…' : 'Message Nova AI'}
          placeholderTextColor={colors.textMuted}
          multiline
          onKeyPress={(e) => {
            // On web, Enter sends and Shift+Enter adds a new line.
            const event = e.nativeEvent as { key: string; shiftKey?: boolean };
            if (Platform.OS === 'web' && event.key === 'Enter' && !event.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />

        <View style={styles.toolbar}>
          <ToolButton name="camera-outline" label="Take photo" onPress={() => attach('camera')} />
          <ToolButton name="image-outline" label="Attach photo" onPress={() => attach('library')} />
          <ToolButton
            name={voice.listening ? 'mic' : 'mic-outline'}
            label={voice.listening ? 'Stop listening' : 'Speak'}
            active={voice.listening}
            onPress={voice.listening ? voice.stop : voice.start}
          />
          <View style={styles.spacer} />
          {isStreaming ? (
            <Pressable accessibilityLabel="Stop generating" onPress={stopGenerating} style={styles.button}>
              <Ionicons name="stop" size={16} color={colors.background} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityLabel="Send message"
              onPress={send}
              disabled={!canSend}
              style={[styles.button, !canSend && styles.buttonDisabled]}
            >
              <Ionicons name="arrow-up" size={20} color={colors.background} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  preview: {
    width: 64,
    height: 64,
    marginTop: spacing.xs,
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
  },
  previewButton: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEdit: {
    left: -6,
    top: -6,
  },
  previewRemove: {
    right: -6,
    top: -6,
  },
  input: {
    maxHeight: 160,
    minHeight: 36,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.md,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tool: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolActive: {
    backgroundColor: colors.danger,
  },
  spacer: {
    flex: 1,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  notice: {
    color: colors.danger,
    fontSize: typography.xs,
    textAlign: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  listening: {
    color: colors.accent,
    fontSize: typography.sm,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
});
