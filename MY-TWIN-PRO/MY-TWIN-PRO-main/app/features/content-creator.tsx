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
  ArrowLeft, PenLine, Sparkles, Copy, Check, Instagram,
  Youtube, FileText, Briefcase, Music, Globe,
} from 'lucide-react-native';
import * as ClipboardModule from 'expo-clipboard';

const T = {
  ar: {
    title: 'كتابة المحتوى', topic: 'عن ماذا تريد الكتابة؟', placeholder: 'اكتب موضوعك...',
    generate: 'توليد المحتوى', result: 'المحتوى', copy: 'نسخ', copied: 'تم النسخ!',
    loading: 'جاري التوليد...', platforms: { instagram: 'Instagram', twitter: 'X', linkedin: 'LinkedIn', tiktok: 'TikTok', youtube: 'YouTube', blog: 'Blog' },
  },
  en: {
    title: 'Content Creator', topic: 'What do you want to write about?', placeholder: 'Write your topic...',
    generate: 'Generate Content', result: 'Content', copy: 'Copy', copied: 'Copied!',
    loading: 'Generating...', platforms: { instagram: 'Instagram', twitter: 'X', linkedin: 'LinkedIn', tiktok: 'TikTok', youtube: 'YouTube', blog: 'Blog' },
  },
};

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: '#E1306C' },
  { id: 'twitter', label: 'X (Twitter)', icon: PenLine, color: '#1DA1F2' },
  { id: 'linkedin', label: 'LinkedIn', icon: Briefcase, color: '#0A66C2' },
  { id: 'tiktok', label: 'TikTok', icon: Music, color: '#000000' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, color: '#FF0000' },
  { id: 'blog', label: 'Blog', icon: FileText, color: '#10B981' },
];

export default function ContentCreator() {
  const insets = useSafeAreaInsets();
  const { lang, userId } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = useTheme().isDark;
  const t = T[lang] || T['ar'];

  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [copied, setCopied] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const colors = {
    bg: isDark ? '#0A0014' : '#FAFAF8', card: isDark ? '#1A1226' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#2D2D2D', subtext: isDark ? '#A78BFA' : '#6B7280',
    accent: '#D946EF', accentLight: '#D946EF20', border: isDark ? '#2D1B4D' : '#E8E8E3',
    inputBg: isDark ? '#161122' : '#FDFDF9', success: '#10B981',
  };

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return;
    setLoading(true); setReply('');
    try {
      const result = await apiPost('/api/content/generate', { user_id: userId, type: platform, topic: topic.trim(), lang });
      setReply(typeof result === 'string' ? result : result?.outline || result?.content || JSON.stringify(result));
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (e) { setReply(isAr ? 'فشل التوليد' : 'Generation failed'); }
    finally { setLoading(false); }
  }, [topic, platform, userId, lang]);

  const handleCopy = async () => { await ClipboardModule.setStringAsync(reply); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <View style={[st.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <View style={[st.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} stroke={colors.text} /></TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.text }]}>{t.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
        <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[st.iconWrap, { backgroundColor: colors.accentLight }]}><PenLine size={40} stroke={colors.accent} /></View>

          <Text style={[st.label, { color: colors.text }]}>{isAr ? 'المنصة' : 'Platform'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.scroll}>
            {PLATFORMS.map(p => { const Icon = p.icon; return (
              <TouchableOpacity key={p.id} style={[st.chip, { borderColor: platform === p.id ? p.color : colors.border }, platform === p.id && { backgroundColor: p.color + '15' }]} onPress={() => setPlatform(p.id)}>
                <Icon size={16} stroke={platform === p.id ? p.color : colors.subtext} />
                <Text style={[st.chipText, { color: platform === p.id ? p.color : colors.subtext }]}>{p.label}</Text>
              </TouchableOpacity>
            );})}
          </ScrollView>

          <TextInput style={[st.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder={t.placeholder} placeholderTextColor={colors.subtext} value={topic} onChangeText={setTopic} multiline numberOfLines={4} textAlignVertical="top" />
          <TouchableOpacity style={[st.submitBtn, { backgroundColor: colors.accent, opacity: topic.trim() ? 1 : 0.6 }]} onPress={handleGenerate} disabled={loading || !topic.trim()}>
            {loading ? <ActivityIndicator color="#FFF" /> : <><Sparkles size={18} stroke="#FFF" /><Text style={st.submitBtnText}>{t.generate}</Text></>}
          </TouchableOpacity>
        </View>

        {reply ? (
          <Animated.View style={[st.resultCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: fadeAnim }]}>
            <View style={st.resultHeader}>
              <Text style={[st.resultTitle, { color: colors.text }]}>{t.result}</Text>
              <TouchableOpacity onPress={handleCopy} style={[st.copyBtn, copied && { backgroundColor: colors.success + '20' }]}>
                {copied ? <Check size={18} stroke={colors.success} /> : <Copy size={18} stroke={colors.accent} />}
              </TouchableOpacity>
            </View>
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
  label: { fontSize: 14, fontWeight: '600', marginBottom: 10, marginTop: 12, alignSelf: 'flex-start' },
  scroll: { marginBottom: 12 }, chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, marginRight: 8 },
  chipText: { fontSize: 13, fontWeight: '600' },
  input: { width: '100%', borderRadius: 16, padding: 16, fontSize: 15, borderWidth: 1, minHeight: 100, marginBottom: 16 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, width: '100%', gap: 8 },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  resultCard: { borderRadius: 20, borderWidth: 1, padding: 20 }, resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultTitle: { fontSize: 16, fontWeight: '700' }, copyBtn: { padding: 8, borderRadius: 10 }, resultText: { fontSize: 15, lineHeight: 26 },
});
