import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExpoSpeechRecognitionModule as SpeechModule } from 'expo-speech-recognition';

// The speech-recognition native module only exists in a real build (APK) and
// on web. Loading it lazily keeps the rest of the app working in Expo Go.
let recognition: typeof SpeechModule | null = null;
try {
  recognition = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
} catch {
  recognition = null;
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone ki permission nahi mili.',
  'no-speech': 'Kuch sunai nahi diya. Dobara boliye.',
  'speech-timeout': 'Kuch sunai nahi diya. Dobara boliye.',
  network: 'Awaaz pehchanne ke liye internet chahiye.',
  'language-not-supported': 'Yeh bhasha is phone par supported nahi hai.',
  'service-not-allowed': 'Is phone par voice recognition available nahi hai.',
};

/**
 * Speech-to-text for the composer. `onText` receives the full transcript so far
 * (interim results included), so the input box fills in while the user talks.
 * `onEnd` gets the final transcript once the user stops speaking.
 */
export function useVoiceInput(
  lang: string,
  onText: (text: string) => void,
  onEnd?: (transcript: string) => void,
) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const transcriptRef = useRef('');

  useEffect(() => {
    if (!recognition) return;
    const subscriptions = [
      recognition.addListener('start', () => {
        transcriptRef.current = '';
        setListening(true);
      }),
      recognition.addListener('end', () => {
        setListening(false);
        onEndRef.current?.(transcriptRef.current);
      }),
      recognition.addListener('result', (event) => {
        const transcript = event.results[0]?.transcript;
        if (!transcript) return;
        transcriptRef.current = transcript;
        onTextRef.current(transcript);
      }),
      recognition.addListener('error', (event) => {
        if (event.error === 'aborted') return;
        setError(ERROR_MESSAGES[event.error] ?? event.message);
      }),
    ];
    return () => subscriptions.forEach((s) => s.remove());
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!recognition) {
      setError('Voice ke liye APK wala app chahiye (Expo Go me nahi chalta).');
      return;
    }
    const permission = await recognition.requestPermissionsAsync();
    if (!permission.granted) {
      setError(ERROR_MESSAGES['not-allowed']);
      return;
    }
    recognition.start({ lang, interimResults: true, continuous: false });
  }, [lang]);

  const stop = useCallback(() => recognition?.stop(), []);

  return { available: recognition !== null, listening, error, start, stop };
}

// Markdown symbols and code read out loud sound like noise, so strip them first.
function toSpeakable(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, ' code. ')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Reads assistant replies aloud; only one message speaks at a time. */
export function useSpeaker(lang: string) {
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(() => () => void Speech.stop(), []);

  const toggle = useCallback(
    (id: string, text: string) => {
      Speech.stop();
      if (speakingId === id) {
        setSpeakingId(null);
        return;
      }
      setSpeakingId(id);
      const done = () => setSpeakingId((current) => (current === id ? null : current));
      Speech.speak(toSpeakable(text), { language: lang, onDone: done, onStopped: done, onError: done });
    },
    [lang, speakingId],
  );

  return { speakingId, toggle };
}
