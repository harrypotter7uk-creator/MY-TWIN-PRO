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
  ArrowLeft, TrendingUp, Lightbulb, Search, DollarSign,
  Target, PieChart, Megaphone, Sparkles, ChevronRight,
  Clipboard, Check, RefreshCw, Copy,
} from 'lucide-react-native';
import * as ClipboardModule from 'expo-clipboard';

type Stage = 'idea' | 'market' | 'feasibility' | 'canvas' | 'marketing';

const T = {
  ar: {
    title: 'تحليل الأعمال', idea: 'فكرة', market: 'سوق', feasibility: 'جدوى',
    canvas: 'نموذج', marketing: 'تسويق', budget: 'الميزانية',
    interests: 'اهتماماتك', location: 'الموقع',
    execute: 'تنفيذ', result: 'النتيجة', copy: 'نسخ', copied: 'تم النسخ!',
    retry: 'إعادة', loading: 'جاري التحليل...',
  },
  en: {
    title: 'Business Analyzer', idea: 'Idea', market: 'Market', feasibility: 'Feasibility',
    canvas: 'Canvas', marketing: 'Marketing', budget: 'Budget',
    interests: 'Interests', location: 'Location',
    execute: 'Execute', result: 'Result', copy: 'Copy', copied: 'Copied!',
    retry: 'Retry', loading: 'Analyzing...',
  },
};

const STAGES: { id: Stage; label_ar: string; label_en: string; icon: any; color: string }[] = [
  { id: 'idea', label_ar: 'فكرة', label_en: 'Idea', icon: Lightbulb, color: '#F59E0B' },
  { id: 'market', label_ar: 'سوق', label_en: 'Market', icon: Search, color: '#3B82F6' },
  { id: 'feasibility', label_ar: 'جدوى', label_en: 'Feasibility', icon: DollarSign, color: '#10B981' },
  { id: 'canvas', label_ar: 'نموذج', label_en: 'Canvas', icon: Clipboard, color: '#8B5CF6' },
  { id: 'marketing', label_ar: 'تسويق', label_en: 'Marketing', icon: Megaphone, color: '#EC4899' },
];

export default function BusinessAnalyzer() {
  const insets = useSafeAreaInsets();
  const { lang, userId } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = useTheme().isDark;
  const t = T[lang] || T['ar'];

  const [budget, setBudget] = useState('');
  const [interests, setInterests] = useState('');
  const [location, setLocation] = useState('');
  const [activeStage, setActiveStage] = useState<Stage>('idea');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [copied, setCopied] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const colors = {
    bg: isDark ? '#0A0014' : '#FAFAF8', card: isDark ? '#1A1226' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#2D2D2D', subtext: isDark ? '#A78BFA' : '#6B7280',
    accent: '#F59E0B', accentLight: '#F59E0B20', border: isDark ? '#2D1B4D' : '#E8E8E3',
    inputBg: isDark ? '#161122' : '#FDFDF9', success: '#10B981',
  };

  const handleExecute = useCallback(async () => {
    setLoading(true); setReply('');
    try {
      const b = parseFloat(budget) || 1000;
      let endpoint = '/api/business/generate-idea';
      let payload: any = { user_id: userId, budget: b, interests: interests.trim(), location: location.trim(), lang };
      if (activeStage === 'market') { endpoint = '/api/business/market-research'; payload = { user_id: userId, query: interests, lang }; }
      else if (activeStage === 'feasibility') { endpoint = '/api/business/feasibility'; payload = { user_id: userId, idea: interests, budget: b, lang }; }
      else if (activeStage === 'canvas') { endpoint = '/api/business/canvas'; payload = { user_id: userId, idea: interests, lang }; }
      else if (activeStage === 'marketing') { endpoint = '/api/business/marketing-plan'; payload = { user_id: userId, idea: interests, budget: b, lang }; }
      
      const result = await apiPost(endpoint, payload);
      setReply(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (e) { setReply(isAr ? 'فشل التحليل' : 'Analysis failed'); }
    finally { setLoading(false); }
  }, [activeStage, budget, interests, location, userId, lang]);

  const handleCopy = async () => {
    await ClipboardModule.setStringAsync(reply);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const currentStage = STAGES.find(s => s.id === activeStage)!;

  return (
    <View style={[st.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <View style={[st.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} stroke={colors.text} /></TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.text }]}>{t.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
        {/* المراحل */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.stagesScroll}>
          {STAGES.map((stage, i) => {
            const Icon = stage.icon; const isActive = activeStage === stage.id;
            return (
              <TouchableOpacity key={stage.id} style={[st.stageChip, { borderColor: isActive ? stage.color : colors.border }, isActive && { backgroundColor: stage.color + '20' }]} onPress={() => setActiveStage(stage.id)}>
                <Icon size={16} stroke={isActive ? stage.color : colors.subtext} />
                <Text style={[st.stageChipText, { color: isActive ? stage.color : colors.subtext }]}>{isAr ? stage.label_ar : stage.label_en}</Text>
                {i < STAGES.length - 1 && <ChevronRight size={12} stroke={colors.subtext} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* بطاقة الإدخال */}
        <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[st.iconWrap, { backgroundColor: currentStage.color + '20' }]}>
            {React.createElement(currentStage.icon, { size: 40, stroke: currentStage.color })}
          </View>

          {activeStage === 'idea' && (
            <>
              <Text style={[st.label, { color: colors.text }]}>{t.budget}</Text>
              <TextInput style={[st.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder="5000" placeholderTextColor={colors.subtext} value={budget} onChangeText={setBudget} keyboardType="numeric" />
            </>
          )}
          <Text style={[st.label, { color: colors.text }]}>{t.interests}</Text>
          <TextInput style={[st.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder={isAr ? 'مثلاً: برمجة' : 'e.g., Coding'} placeholderTextColor={colors.subtext} value={interests} onChangeText={setInterests} multiline />
          {activeStage === 'idea' && (
            <>
              <Text style={[st.label, { color: colors.text }]}>{t.location}</Text>
              <TextInput style={[st.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder={isAr ? 'مثلاً: مصر' : 'e.g., Egypt'} placeholderTextColor={colors.subtext} value={location} onChangeText={setLocation} />
            </>
          )}

          <TouchableOpacity style={[st.submitBtn, { backgroundColor: currentStage.color, opacity: interests.trim() ? 1 : 0.6 }]} onPress={handleExecute} disabled={loading || !interests.trim()}>
            {loading ? <ActivityIndicator color="#FFF" /> : <><Sparkles size={18} stroke="#FFF" /><Text style={st.submitBtnText}>{t.execute} {isAr ? currentStage.label_ar : currentStage.label_en}</Text></>}
          </TouchableOpacity>
        </View>

        {/* النتيجة */}
        {reply ? (
          <Animated.View style={[st.resultCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: fadeAnim }]}>
            <View style={st.resultHeader}>
              <Text style={[st.resultTitle, { color: colors.text }]}>{t.result}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={handleCopy} style={[st.copyBtn, copied && { backgroundColor: colors.success + '20' }]}>{copied ? <Check size={18} stroke={colors.success} /> : <Copy size={18} stroke={currentStage.color} />}</TouchableOpacity>
                <TouchableOpacity onPress={handleExecute} style={[st.copyBtn, { backgroundColor: currentStage.color + '20' }]}><RefreshCw size={18} stroke={currentStage.color} /></TouchableOpacity>
              </View>
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
  stagesScroll: { marginBottom: 20 }, stageChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, marginRight: 8 },
  stageChipText: { fontSize: 13, fontWeight: '600' },
  card: { borderRadius: 24, padding: 24, borderWidth: 1, alignItems: 'center', marginBottom: 24 },
  iconWrap: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12, alignSelf: 'flex-start' },
  input: { width: '100%', borderRadius: 14, padding: 14, fontSize: 15, borderWidth: 1, marginBottom: 8 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, width: '100%', marginTop: 16, gap: 8 },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  resultCard: { borderRadius: 24, padding: 24, borderWidth: 1 }, resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultTitle: { fontSize: 16, fontWeight: '700' }, copyBtn: { padding: 8, borderRadius: 10 }, resultText: { fontSize: 15, lineHeight: 24 },
});
