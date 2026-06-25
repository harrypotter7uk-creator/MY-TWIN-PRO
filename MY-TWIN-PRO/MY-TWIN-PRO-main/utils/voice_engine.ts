import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { apiPost } from '../lib/httpClient';
import { getEdgeVoiceId } from '../utils/voice_profiles';

export type TwinGender = 'male' | 'female';
export type EmotionTone = 'neutral' | 'happy' | 'sad' | 'excited' | 'calm' | 'serious';

export interface VoiceProfile {
  pitch: number; rate: number; language: string; iosVoiceIdentifier?: string;
}

export interface STTResult {
  transcript: string; confidence: number;
}

const IOS_VOICES: Record<TwinGender, string> = {
  male: 'com.apple.ttsbundle.Maged-compact',
  female: 'com.apple.ttsbundle.Laila-compact',
};

const VOICE_PROFILES: Record<TwinGender, Record<EmotionTone, VoiceProfile>> = {
  male: {
    neutral:  { pitch: 0.88, rate: 0.90, language: 'ar-SA', iosVoiceIdentifier: IOS_VOICES.male },
    happy:    { pitch: 0.95, rate: 1.08, language: 'ar-SA', iosVoiceIdentifier: IOS_VOICES.male },
    sad:      { pitch: 0.80, rate: 0.78, language: 'ar-SA', iosVoiceIdentifier: IOS_VOICES.male },
    excited:  { pitch: 1.05, rate: 1.15, language: 'ar-SA', iosVoiceIdentifier: IOS_VOICES.male },
    calm:     { pitch: 0.82, rate: 0.80, language: 'ar-SA', iosVoiceIdentifier: IOS_VOICES.male },
    serious:  { pitch: 0.90, rate: 0.88, language: 'ar-SA', iosVoiceIdentifier: IOS_VOICES.male },
  },
  female: {
    neutral:  { pitch: 1.22, rate: 1.02, language: 'ar-SA', iosVoiceIdentifier: IOS_VOICES.female },
    happy:    { pitch: 1.30, rate: 1.12, language: 'ar-SA', iosVoiceIdentifier: IOS_VOICES.female },
    sad:      { pitch: 1.05, rate: 0.85, language: 'ar-SA', iosVoiceIdentifier: IOS_VOICES.female },
    excited:  { pitch: 1.40, rate: 1.20, language: 'ar-SA', iosVoiceIdentifier: IOS_VOICES.female },
    calm:     { pitch: 1.10, rate: 0.88, language: 'ar-SA', iosVoiceIdentifier: IOS_VOICES.female },
    serious:  { pitch: 1.15, rate: 0.95, language: 'ar-SA', iosVoiceIdentifier: IOS_VOICES.female },
  },
};

let _speakingQueue: Array<{ text: string; resolve: () => void; profile: VoiceProfile; voiceId: string }> = [];
let _isProcessingQueue = false;

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')
    .replace(/#{1,6}\s*/g, '').replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/>\s*/g, '').replace(/[-*+]\s+/g, '').replace(/\d+\.\s+/g, '')
    .replace(/\|.*?\|/g, '').replace(/\n{2,}/g, ' ').replace(/\s+/g, ' ').trim();
}

async function uriToBase64(uri: string): Promise<string> {
  try {
    const FileSystem = require('expo-file-system');
    return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  } catch {
    try {
      const res = await fetch(uri); const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf); let binary = '';
      bytes.forEach((b) => (binary += String.fromCharCode(b)));
      return btoa(binary);
    } catch { return ''; }
  }
}

async function speakViaServer(text: string, voiceId: string, lang: string): Promise<boolean> {
  try {
    const response = await apiPost('/api/tts', { text, voice_id: voiceId, language: lang });
    if (response?.audio_base64) {
      const FileSystem = require('expo-file-system');
      const path = FileSystem.cacheDirectory + 'tts_temp.mp3';
      await FileSystem.writeAsStringAsync(path, response.audio_base64, { encoding: FileSystem.EncodingType.Base64 });
      const { sound } = await Audio.Sound.createAsync({ uri: path });
      await sound.playAsync();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// دالة مساعدة لتشغيل صوت النهاية (تستخدم داخلياً فقط)
function playEndChime(): void {
  try {
    Audio.Sound.createAsync(require('../assets/chime_end.mp3')).then(({ sound }) => {
      sound.playAsync();
    });
  } catch {}
}

export async function speakResponse(
  text: string, options?: { emotion?: EmotionTone; onStart?: () => void; onDone?: () => void }
): Promise<void> {
  const clean = stripMarkdown(text).slice(0, 800);
  if (!clean.trim()) { options?.onDone?.(); return; }

  const store = useTwinStore.getState();
  const gender: TwinGender = store.twinGender === 'male' ? 'male' : 'female';
  const emotion = options?.emotion || 'neutral';
  const profile = VOICE_PROFILES[gender][emotion];
  const voiceId = getEdgeVoiceId(gender, store.lang || 'ar');

  return new Promise((resolve) => {
    _speakingQueue.push({ text: clean, resolve, profile, voiceId });
    if (!_isProcessingQueue) processQueue();
    options?.onStart?.();
  });
}

async function processQueue(): Promise<void> {
  if (_speakingQueue.length === 0) { _isProcessingQueue = false; return; }
  _isProcessingQueue = true;
  const { text, resolve, profile, voiceId } = _speakingQueue.shift()!;

  try {
    // تشغيل صوت البداية
    try {
      const { sound } = await Audio.Sound.createAsync(require('../assets/chime_start.mp3'));
      await sound.playAsync();
      await new Promise(r => setTimeout(r, 300));
    } catch {}

    // محاولة Edge TTS
    const serverSuccess = await speakViaServer(text, voiceId, profile.language);
    if (!serverSuccess) {
      // احتياطي: expo-speech
      await Speech.stop();
      const opts: Speech.SpeechOptions = {
        language: profile.language,
        pitch: profile.pitch,
        rate: profile.rate,
        onDone: () => {
          playEndChime();
          resolve();
          processQueue();
        },
        onError: () => {
          resolve();
          processQueue();
        },
        onStopped: () => {
          resolve();
          processQueue();
        },
      };
      if (Platform.OS === 'ios' && profile.iosVoiceIdentifier) {
        opts.voice = profile.iosVoiceIdentifier;
      }
      Speech.speak(text, opts);
    } else {
      // Edge TTS نجح
      playEndChime();
      resolve();
      processQueue();
    }
  } catch {
    resolve();
    processQueue();
  }
}

export async function stopSpeaking(): Promise<void> { await Speech.stop(); }
export async function isSpeaking(): Promise<boolean> { return Speech.isSpeakingAsync(); }

let _recording: Audio.Recording | null = null;
const MAX_BASE64_SIZE = 5 * 1024 * 1024;

export async function startRecording(): Promise<void> {
  try {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) throw new Error('microphone_permission_denied');
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true, shouldDuckAndroid: true, playThroughEarpieceAndroid: false });
    const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    _recording = recording;
  } catch (err) { _recording = null; throw err; }
}

export async function stopRecordingAndTranscribe(lang: 'ar' | 'en' = 'ar'): Promise<STTResult> {
  if (!_recording) return { transcript: '', confidence: 0 };
  try {
    await _recording.stopAndUnloadAsync();
    const uri = _recording.getURI(); _recording = null;
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, shouldDuckAndroid: true, playThroughEarpieceAndroid: false });
    if (!uri) return { transcript: '', confidence: 0 };

    const base64 = await uriToBase64(uri);
    if (!base64 || base64.length > MAX_BASE64_SIZE) return { transcript: '', confidence: 0 };

    const data = await apiPost('/api/stt', { audio: base64, language: lang });
    if (data?.text) return { transcript: data.text, confidence: data.confidence || 0.9 };
    return { transcript: '', confidence: 0 };
  } catch { _recording = null; return { transcript: '', confidence: 0 }; }
}

export async function cancelRecording(): Promise<void> {
  if (!_recording) return;
  try { await _recording.stopAndUnloadAsync(); } catch {}
  _recording = null;
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, shouldDuckAndroid: true, playThroughEarpieceAndroid: false }).catch(() => {});
}
