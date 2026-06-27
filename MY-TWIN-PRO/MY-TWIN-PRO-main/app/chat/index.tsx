import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, StatusBar, KeyboardAvoidingView,
  Platform, Image, Animated, Text, Alert, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTwinStore } from '../../store/useTwinStore';
import { useTheme } from '../../utils/theme';
import { apiPost, apiGet } from '../../lib/httpClient';
import { speakResponse, stopSpeaking } from '../../utils/voice_engine';
import TypingIndicator from '../../components/TypingIndicator';
import {
  Menu, Volume2, VolumeX, Mic, Heart, BrainCircuit,
} from 'lucide-react-native';
import { COLORS, ThinkingBar, WelcomeState, EnergyModal } from './ChatComponents';
import { UserBubble, TwinBubble, ToolChip } from './ChatBubbles';
import { ChatInput } from './ChatInput';

const APP_LOGO = require('../../assets/logo.png');

export default function Chat() {
  const insets = useSafeAreaInsets();
  const {
    userId, twinName, tier, chatHistory, addMessage,
    lang, twinEnergy, setTwinEnergy, updateBond,
    openMenu, closeMenu, voiceEnabled, setVoiceEnabled,
    bondLevel,
  } = useTwinStore();
  const theme = useTheme();
  const isDark = theme.isDark;
  const isRTL = lang === 'ar';
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [activeToolsList, setActiveToolsList] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showEnergyModal, setShowEnergyModal] = useState(false);
  const [adStatus, setAdStatus] = useState<any>(null);
  const [thinkingStage, setThinkingStage] = useState('idle');
  const flatRef = useRef<FlatList>(null);
  const attachAnim = useRef(new Animated.Value(0)).current;
  const heartbeatAnim = useRef(new Animated.Value(1)).current;

  const contextLimit = tier === 'free' ? 15 : tier === 'plus' ? 40 : 100;
  const isNearLimit = chatHistory.length >= contextLimit - 3;

  const energyColor = twinEnergy > 60 ? '#34C759' : twinEnergy > 25 ? '#FF9500' : '#FF3B30';

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(heartbeatAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(heartbeatAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    apiGet('/api/ads/status').then(setAdStatus).catch(() => {});
  }, []);

  useEffect(() => {
    Animated.spring(attachAnim, { toValue: showAttach ? 1 : 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  }, [showAttach]);

  const sendMessage = useCallback(async (msg?: string, imageBase64?: string) => {
    const message = (msg || input).trim();
    if (!message && !imageBase64 && activeToolsList.length === 0) return;

    if (twinEnergy <= 0 && !activeToolsList.length) {
      const freshAdStatus = await apiGet('/api/ads/status');
      setAdStatus(freshAdStatus);
      setShowEnergyModal(true);
      return;
    }

    addMessage({
      id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
      role: 'user', content: message || (imageBase64 ? '📷 صورة' : ''),
      image: imageBase64, timestamp: Date.now()
    });

    setInput('');
    setLoading(true);
    setThinkingStage('thinking');

    try {
      setThinkingStage('memory');
      await new Promise(resolve => setTimeout(resolve, 400));
      
      setThinkingStage('generating');
      const response = await apiPost('/api/chat', {
        message,
        history: chatHistory.slice(-10).map(m => ({ role: m.role, content: m.content })),
        lang,
      });

      addMessage({
        id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
        role: 'twin', content: response.reply, timestamp: Date.now(),
        emotion: response.emotion?.primary, provider: response.provider || 'orchestrator',
      });

      const newBond = Math.min(bondLevel + (Math.random() * 0.3 + 0.1), 100);
      updateBond(newBond);

      if (voiceEnabled) {
        try { await speakResponse(response.reply); } catch {}
      }
      setThinkingStage('completed');
    } catch (error: any) {
      const errMsg = lang === 'ar' ? 'عذراً، حدث خطأ في الاتصال 💜' : 'Connection error. Please try again 💜';
      addMessage({
        id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
        role: 'twin', content: errMsg, timestamp: Date.now(), failed: true, provider: 'error',
      });
    } finally {
      setLoading(false);
      setTimeout(() => setThinkingStage('idle'), 2000);
    }
  }, [input, loading, voiceEnabled, lang, addMessage, activeToolsList, twinEnergy, chatHistory, bondLevel, updateBond]);

  const send = useCallback(async (msg?: string, imageBase64?: string) => {
    if (loading) return;
    await sendMessage(msg, imageBase64);
  }, [loading, sendMessage]);

  const toggleSound = useCallback(() => {
    if (voiceEnabled) stopSpeaking();
    setVoiceEnabled(!voiceEnabled);
  }, [voiceEnabled, setVoiceEnabled]);

  const handleVoiceInput = useCallback(async () => {
    if (isRecording) { setIsRecording(false); return; }
    setIsRecording(true);
    try { setTimeout(() => { setIsRecording(false); }, 3000); } catch { setIsRecording(false); }
  }, [isRecording]);

  const renderMsg = useCallback(({ item }: any) => {
    if (item.role === 'user') return <UserBubble item={item} isDark={isDark} isRTL={isRTL} />;
    return (
      <TwinBubble
        item={item} isDark={isDark} isRTL={isRTL} isLast={false} userId={userId}
        onCopy={() => {}} onRetry={() => {}} onRegenerate={() => {}} onLike={() => {}} onDislike={() => {}}
        provider={item.provider} lang={lang} twinName={twinName}
      />
    );
  }, [isDark, isRTL, lang, userId, twinName]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={openMenu} style={styles.menuBtn}>
            <Menu size={22} stroke={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Animated.View style={{ transform: [{ scale: heartbeatAnim }] }}>
              <Image source={APP_LOGO} style={{ width: 32, height: 32, borderRadius: 16, marginBottom: 4 }} />
            </Animated.View>
            <Text style={[styles.headerName, { color: colors.text }]}>{twinName}</Text>
            <View style={styles.miniIndicators}>
              <View style={[styles.energyDot, { backgroundColor: energyColor }]} />
              <Text style={[styles.miniText, { color: colors.subtext }]}>⚡ {twinEnergy}%</Text>
              <Heart size={10} stroke={colors.accent} fill={colors.accent} />
              <Text style={[styles.miniText, { color: colors.accent }]}>{Math.round(bondLevel)}%</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TouchableOpacity onPress={handleVoiceInput} style={[styles.iconBtn, isRecording && styles.recordingBtn]}>
              <Mic size={22} stroke={isRecording ? "#FF3B30" : colors.text} fill={isRecording ? "#FF3B3020" : "transparent"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleSound} style={styles.iconBtn}>
              {voiceEnabled ? <Volume2 size={22} stroke={colors.text} /> : <VolumeX size={22} stroke={colors.text} />}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.energyBarContainer}>
          <View style={[styles.energyBarBg, { backgroundColor: isDark ? '#2D1B4D' : '#E8E8E3' }]}>
            <View style={[styles.energyBarFill, { width: `${twinEnergy}%`, backgroundColor: energyColor }]} />
          </View>
        </View>

        <View style={styles.bondBarContainer}>
          <Heart size={10} stroke="#EC4899" fill="#EC4899" />
          <View style={[styles.bondBarBg, { backgroundColor: isDark ? '#2D1B4D' : '#FCE7F3' }]}>
            <View style={[styles.bondBarFill, { width: `${bondLevel}%`, backgroundColor: '#EC4899' }]} />
          </View>
          <Text style={[styles.bondText, { color: '#EC4899' }]}>{Math.round(bondLevel)}%</Text>
        </View>

        {isNearLimit && (
          <View style={styles.limitWarning}>
            <Text style={styles.limitWarningText}>
              {lang === 'ar'
                ? 'يقترب الوعي من الامتلاء. ابدأ وعياً جديداً قريباً.'
                : 'Mind is almost full. Start a new mind soon.'}
            </Text>
          </View>
        )}

        <FlatList
          ref={flatRef}
          data={chatHistory}
          keyExtractor={(item) => item.id}
          renderItem={renderMsg}
          ListHeaderComponent={chatHistory.length === 0 ? <WelcomeState isDark={isDark} lang={lang} twinName={twinName} onSuggestion={(s: string) => send(s)} /> : null}
          ListFooterComponent={loading ? (
            <View>
              <View style={styles.typingRow}>
                <Image source={APP_LOGO} style={{ width: 28, height: 28, borderRadius: 14 }} />
                <TypingIndicator />
              </View>
              <ThinkingBar stage={thinkingStage} isDark={isDark} />
            </View>
          ) : null}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        />

        {activeToolsList.length > 0 && (
          <View style={[styles.toolsRow, { backgroundColor: colors.headerBg }]}>
            {activeToolsList.map((tool: any) => (
              <ToolChip key={tool.id} label={tool.label} icon={tool.icon} color={tool.color} onClose={() => setActiveToolsList(prev => prev.filter(t => t.id !== tool.id))} />
            ))}
          </View>
        )}

        <ChatInput
          input={input} setInput={setInput} loading={loading} isRTL={isRTL} isDark={isDark} colors={colors} lang={lang}
          onSend={send} showAttach={showAttach} setShowAttach={setShowAttach} attachAnim={attachAnim}
          bottomInset={insets.bottom} voiceEnabled={voiceEnabled} toggleSound={toggleSound}
        />
      </KeyboardAvoidingView>

      <EnergyModal visible={showEnergyModal} onClose={() => setShowEnergyModal(false)} onWatchAd={async () => {
        setShowEnergyModal(false);
        try {
          const data = await apiPost('/api/ads/reward', { ad_type: 'rewarded' });
          if (data.success) {
            setTwinEnergy(Math.min(100, twinEnergy + 20));
            const freshStatus = await apiGet('/api/ads/status');
            setAdStatus(freshStatus);
          }
        } catch (e) { Alert.alert('خطأ', 'فشل تحميل الإعلان'); }
      }} adStatus={adStatus} lang={lang} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5 },
  menuBtn: { padding: 6, borderRadius: 10 },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: 10 },
  headerName: { fontSize: 18, fontWeight: '700' },
  miniIndicators: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  energyDot: { width: 6, height: 6, borderRadius: 3 },
  miniText: { fontSize: 11, fontWeight: '600' },
  iconBtn: { padding: 6, borderRadius: 10 },
  recordingBtn: { backgroundColor: '#FF3B3015' },
  energyBarContainer: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 2 },
  energyBarBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  energyBarFill: { height: '100%', borderRadius: 2 },
  bondBarContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 4 },
  bondBarBg: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  bondBarFill: { height: '100%', borderRadius: 2 },
  bondText: { fontSize: 10, fontWeight: '700' },
  limitWarning: {
    padding: 10, marginHorizontal: 16, borderRadius: 12, borderWidth: 1,
    backgroundColor: '#F59E0B20', borderColor: '#F59E0B', marginBottom: 8,
  },
  limitWarningText: { fontSize: 12, fontWeight: '600', textAlign: 'center', color: '#F59E0B' },
  listContent: { paddingHorizontal: 0, paddingVertical: 12, flexGrow: 1 },
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingVertical: 12, gap: 10 },
  memoryIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6, borderRadius: 12, alignSelf: 'center', marginBottom: 8, backgroundColor: '#7C3AED20' },
  memoryText: { fontSize: 11, fontWeight: '600', color: '#7C3AED' },
  toolsRow: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#E5E5EA', gap: 8 },
});
