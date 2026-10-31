import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pickImage } from '../media/images';
import { useVoiceInput } from '../media/voice';
import { useChat } from '../state/ChatContext';
import { useSettings } from '../state/SettingsContext';
import {
  floating,
  type Palette,
  radius,
  spacing,
  typography,
  useStyles,
  useTheme,
  noFocusRing,
} from '../theme';
import type { IconName } from './ui';

// Below this width the Voice button drops its label so the placeholder fits on one line.
const COMPACT_WIDTH = 400;
// Caps how far the phone's font-size setting can grow the composer text.
const MAX_FONT_SCALE = 1.2;

export interface ComposerHandle {
  /** Puts text in the box and focuses it (used by the suggestion rows). */
  prefill: (text: string) => void;
  attach: (source: 'camera' | 'library') => void;
}

interface Props {
  isStreaming: boolean;
  onEditImage: (uri?: string) => void;
  /** Called when a spoken question was sent, so the reply can be read aloud. */
  onVoiceTurn: () => void;
}

const Composer = forwardRef<ComposerHandle, Props>(function Composer(
  { isStreaming, onEditImage, onVoiceTurn },
  ref,
) {
  const styles = useStyles(createStyles);
  const { colors } = useTheme();
  const { sendMessage, stopGenerating, draftImage, setDraftImage } = useChat();
  const { settings } = useSettings();
  const [text, setText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const compact = useWindowDimensions().width < COMPACT_WIDTH;
  // Voice button = talk and get a spoken answer; mic icon = just dictate into the box.
  const conversationRef = useRef(false);

  const voice = useVoiceInput(settings.voiceLanguage, setText, (transcript) => {
    if (!conversationRef.current) return;
    conversationRef.current = false;
    if (transcript.trim()) {
      sendMessage(transcript);
      setText('');
      onVoiceTurn();
    }
  });

  const hasContent = text.trim().length > 0 || draftImage !== null;

  const send = () => {
    if (!hasContent || isStreaming) return;
    if (voice.listening) voice.stop();
    sendMessage(text);
    setText('');
  };

  const attach = async (source: 'camera' | 'library') => {
    setSheetOpen(false);
    setNotice(null);
    try {
      const image = await pickImage(source);
      if (image) setDraftImage(image);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    }
  };

  useImperativeHandle(ref, () => ({
    prefill: (value: string) => {
      setText(value);
      inputRef.current?.focus();
    },
    attach,
  }));

  const startVoice = (conversation: boolean) => {
    conversationRef.current = conversation;
    voice.start();
  };

  const message = notice ?? voice.error;

  const sheetItems: { icon: IconName; label: string; onPress: () => void }[] = [
    { icon: 'camera-outline', label: 'Camera', onPress: () => attach('camera') },
    { icon: 'image-outline', label: 'Photos', onPress: () => attach('library') },
    {
      icon: 'color-wand-outline',
      label: 'Photo editor',
      onPress: () => {
        setSheetOpen(false);
        onEditImage();
      },
    },
  ];

  return (
    <View style={styles.wrapper}>
      {message ? <Text style={styles.notice}>{message}</Text> : null}

      <View style={styles.pill}>
        {draftImage ? (
          <View style={styles.preview}>
            <Pressable accessibilityLabel="Edit photo" onPress={() => onEditImage(draftImage.uri)}>
              <Image source={{ uri: draftImage.uri }} style={styles.previewImage} />
            </Pressable>
            <Pressable
              accessibilityLabel="Remove photo"
              style={styles.previewRemove}
              onPress={() => setDraftImage(null)}
            >
              <Ionicons name="close" size={14} color={colors.onInverse} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.row}>
          <Pressable
            accessibilityLabel="Add photos and files"
            hitSlop={8}
            onPress={() => setSheetOpen(true)}
            style={styles.plus}
          >
            <Ionicons name="add" size={28} color={colors.textPrimary} />
          </Pressable>

          <TextInput
            ref={inputRef}
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={voice.listening ? 'Sun raha hoon…' : 'Nova se poochho'}
            placeholderTextColor={colors.textMuted}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
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

          {!hasContent && !isStreaming ? (
            <Pressable
              accessibilityLabel={voice.listening ? 'Stop listening' : 'Dictate'}
              hitSlop={8}
              onPress={voice.listening ? voice.stop : () => startVoice(false)}
              style={styles.mic}
            >
              <Ionicons
                name={voice.listening ? 'mic' : 'mic-outline'}
                size={24}
                color={voice.listening ? colors.danger : colors.textPrimary}
              />
            </Pressable>
          ) : null}

          {isStreaming ? (
            <Pressable accessibilityLabel="Stop generating" onPress={stopGenerating} style={styles.circle}>
              <View style={styles.stopSquare} />
            </Pressable>
          ) : hasContent ? (
            <Pressable accessibilityLabel="Send message" onPress={send} style={styles.circle}>
              <Ionicons name="arrow-up" size={22} color={colors.onInverse} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityLabel="Voice"
              onPress={voice.listening ? voice.stop : () => startVoice(true)}
              style={[compact ? styles.circle : styles.voice, voice.listening && styles.voiceActive]}
            >
              <Ionicons name="pulse" size={20} color={colors.onInverse} />
              {compact ? null : (
                <Text style={styles.voiceText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  {voice.listening ? 'Ruko' : 'Voice'}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </View>

      <AttachSheet visible={sheetOpen} items={sheetItems} onClose={() => setSheetOpen(false)} />
    </View>
  );
});

export default Composer;

function AttachSheet({
  visible,
  items,
  onClose,
}: {
  visible: boolean;
  items: { icon: IconName; label: string; onPress: () => void }[];
  onClose: () => void;
}) {
  const styles = useStyles(createStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.handle} />
        <View style={styles.sheetRow}>
          {items.map((item) => (
            <Pressable key={item.label} style={styles.sheetItem} onPress={item.onPress}>
              <View style={styles.sheetIcon}>
                <Ionicons name={item.icon} size={26} color={colors.textPrimary} />
              </View>
              <Text style={styles.sheetLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    wrapper: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    notice: {
      color: c.danger,
      fontSize: typography.xs,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    pill: {
      ...floating(c),
      borderRadius: radius.xl + 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.xs,
    },
    plus: {
      width: 40,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 160,
      paddingTop: 11,
      paddingBottom: 11,
      color: c.textPrimary,
      fontSize: typography.md + 1,
      ...noFocusRing,
    },
    mic: {
      width: 36,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circle: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      backgroundColor: c.inverse,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stopSquare: {
      width: 14,
      height: 14,
      borderRadius: 3,
      backgroundColor: c.onInverse,
    },
    voice: {
      height: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
      backgroundColor: c.inverse,
    },
    voiceActive: {
      backgroundColor: c.danger,
    },
    voiceText: {
      color: c.onInverse,
      fontSize: typography.md,
      fontWeight: '600',
    },
    preview: {
      width: 72,
      height: 72,
      margin: spacing.sm,
    },
    previewImage: {
      width: 72,
      height: 72,
      borderRadius: radius.md,
    },
    previewRemove: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 24,
      height: 24,
      borderRadius: radius.pill,
      backgroundColor: c.inverse,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backdrop: {
      flex: 1,
      backgroundColor: c.overlay,
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingTop: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: c.border,
      marginBottom: spacing.lg,
    },
    sheetRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    sheetItem: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.sm,
    },
    sheetIcon: {
      width: '100%',
      height: 80,
      borderRadius: radius.lg,
      backgroundColor: c.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetLabel: {
      color: c.textPrimary,
      fontSize: typography.sm,
    },
  });
