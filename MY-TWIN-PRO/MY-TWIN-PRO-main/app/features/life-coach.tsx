import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTwinStore } from '../../store/useTwinStore';
import { useTheme } from '../../utils/theme';
import { router } from 'expo-router';
import { apiPost } from '../../lib/httpClient';
import {
  ArrowLeft, Heart, Sparkles, Brain, Dumbbell, Utensils,
  Target, MessageCircle,
} from 'lucide-react-native';

const T = {
  ar: {
    title: 'مدرب الحياة', topic: 'عن ماذا تريد التحدث؟', placeholder: 'اكتب موضوعك...',
    execute: 'تنفيذ', result: 'الرد', loading: 'جاري المعالجة...',
    advice: 'نصيحة', nutrition: 'تغذية', fitness: 'لياقة', lifeplan: 'خطة حياة',
  },
  en: {
    title: 'Life Coach', topic: 'What do you want to talk about?', placeholder: 'Write your topic...',
    execute: 'Execute', result: 'Response', loading: 'Processing...',
    advice: 'Advice', nutrition: 'Nutrition', fitness: 'Fitness', lifeplan: 'Life Plan',
  },
};

const MODES = [
  { id: 'advice', icon: MessageCircle, label_ar: 'نصيحة', label_en: 'Advice' },
  { id: 'nutrition', icon: Utensils, label_ar: 'تغذية', label_en: 'Nutrition' },
  { id: 'fitness', icon: Dumbbell, label_ar: 'لياقة', label_en: 'Fitness' },
  { id: 'lifeplan', icon: Target, label_ar: 'خطة حياة', label_en: 'Life Plan' },
];

export default function LifeCoach() {
  const insets = useSafeAreaInsets();
  const { lang, userId } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = useTheme().isDark;
  const t = T[lang] || T['ar'];

  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState('advice');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const colors = {
    bg: isDark ? '#0A0014' : '#FAFAF8', card: isDark ? '#1A1226' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#2D2D2D', subtext: isDark ? '#A78BFA' : '#6B7280',
    accent: '#EC4899', accentLight: '#EC489920', border: isDark ? '#2D1B4D' : '#E8E8E3',
    inputBg: isDark ? '#161122' : '#FDFDF9',
  };

  const handleExecute = useCallback(async () => {
    if (!topic.trim()) return;
    setLoading(true); setReply('');
    try {
      let endpoint = '/api/life-coach/advice';
      if (mode === 'nutrition') endpoint = '/api/life-coach/nutrition';
      else if (mode === 'fitness') endpoint = '/api/life-coach/fitness';
      else if (mode === 'lifeplan') endpoint = '/api/life-coach/plan';
      const result = await apiPost(endpoint, { user_id: userId, topic: topic.trim(), lang });
      setReply(typeof result === 'string' ? result : result?.advice || result?.plan || JSON.stringify(result));
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (e) { setReply(isAr ? 'فشل المعالجة' : 'Processing failed'); }
    finally { setLoading(false); }
  }, [topic, mode, userId, lang]);

  return (
    <View style={[st.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <View style={[st.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} stroke={colors.text} /></TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.text }]}>{t.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
        <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[st.iconWrap, { backgroundColor: colors.accentLight }]}>
            <Heart size={40} stroke={colors.accent} />
          </View>

          <View style={st.modesRow}>
            {MODES.map(m => { const Icon = m.icon; return (
              <TouchableOpacity key={m.id} style={[st.modeBtn, { borderColor: mode === m.id ? colors.accent : colors.border }, mode === m.id && { backgroundColor: colors.accentLight }]} onPress={() => setMode(m.id)}>
                <Icon size={16} stroke={mode === m.id ? colors.accent : colors.subtext} />
                <Text style={[st.modeText, { color: mode === m.id ? colors.accent : colors.subtext }]}>{isAr ? m.label_ar : m.label_en}</Text>
              </TouchableOpacity>
            );})}
          </View>

          <TextInput style={[st.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder={t.placeholder} placeholderTextColor={colors.subtext} value={topic} onChangeText={setTopic} multiline numberOfLines={4} textAlignVertical="top" />
          <TouchableOpacity style={[st.submitBtn, { backgroundColor: colors.accent, opacity: topic.trim() ? 1 : 0.6 }]} onPress={handleExecute} disabled={loading || !topic.trim()}>
            {loading ? <ActivityIndicator color="#FFF" /> : <><Sparkles size={18} stroke="#FFF" /><Text style={st.submitBtnText}>{t.execute}</Text></>}
          </TouchableOpacity>
        </View>

        {reply ? (
          <Animated.View style={[st.resultCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: fadeAnim }]}>
            <Text style={[st.resultTitle, { color: colors.text }]}>{t.result}</Text>
            <Text style={[st.resultText, { color: colors.subtext }]}>{reply}</Text>
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: '700' }, content: { padding: 20, paddingBottom: 50 },
  card: { borderRadius: 24, padding: 24, borderWidth: 1, alignItems: 'center', marginBottom: 24 },
  iconWrap: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modesRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  modeText: { fontSize: 13, fontWeight: '600' },
  input: { width: '100%', borderRadius: 16, padding: 16, fontSize: 15, borderWidth: 1, minHeight: 100, marginBottom: 16 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, width: '100%', gap: 8 },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  resultCard: { borderRadius: 20, borderWidth: 1, padding: 20 }, resultTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  resultText: { fontSize: 15, lineHeight: 26 },
});
