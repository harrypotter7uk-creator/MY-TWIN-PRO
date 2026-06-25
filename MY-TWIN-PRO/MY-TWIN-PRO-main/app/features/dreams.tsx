import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Animated, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTwinStore } from '../../store/useTwinStore';
import { useTheme } from '../../utils/theme';
import { router } from 'expo-router';
import { apiPost } from '../../lib/httpClient';
import { ArrowLeft, Moon, Sparkles, Brain, Cloud, Zap, Heart, BookOpen, Layers, Lightbulb, X, Check } from 'lucide-react-native';

const T = {
  ar: { title: 'تفسير الأحلام', dream: 'احكِ لي حلمك', placeholder: 'اكتب حلمك هنا...', interpret: 'فسر حلمي', result: 'التفسير', symbols: 'الرموز', emotions: 'المشاعر', reflection: 'سؤال تأملي', newDream: 'حلم جديد', loading: 'جاري التفسير...', schools: { all: 'جميع المدارس', freud: 'فرويد', jung: 'يونج', cayce: 'إدجار كايس', ibn_sirine: 'ابن سيرين', nabulsi: 'النابلسي' } },
  en: { title: 'Dream Journal', dream: 'Tell me your dream', placeholder: 'Write your dream...', interpret: 'Interpret Dream', result: 'Interpretation', symbols: 'Symbols', emotions: 'Emotions', reflection: 'Reflection Question', newDream: 'New Dream', loading: 'Interpreting...', schools: { all: 'All Schools', freud: 'Freud', jung: 'Jung', cayce: 'Cayce', ibn_sirine: 'Ibn Sirine', nabulsi: 'Al-Nabulsi' } },
};

const SCHOOLS: { id: string; label_ar: string; label_en: string; icon: any; color: string }[] = [
  { id: 'all', label_ar: 'جميع المدارس', label_en: 'All Schools', icon: Layers, color: '#6366F1' },
  { id: 'freud', label_ar: 'فرويد', label_en: 'Freud', icon: Brain, color: '#EC4899' },
  { id: 'jung', label_ar: 'يونج', label_en: 'Jung', icon: Sparkles, color: '#F59E0B' },
  { id: 'cayce', label_ar: 'إدجار كايس', label_en: 'Cayce', icon: Cloud, color: '#3B82F6' },
  { id: 'ibn_sirine', label_ar: 'ابن سيرين', label_en: 'Ibn Sirine', icon: BookOpen, color: '#10B981' },
  { id: 'nabulsi', label_ar: 'النابلسي', label_en: 'Al-Nabulsi', icon: Lightbulb, color: '#8B5CF6' },
];

export default function DreamJournal() {
  const insets = useSafeAreaInsets();
  const { lang, userId } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = useTheme().isDark;
  const t = T[lang] || T['ar'];
  const [dream, setDream] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedSchool, setSelectedSchool] = useState('all');
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const colors = {
    bg: isDark ? '#0A0014' : '#FAFAF8', card: isDark ? '#1A1226' : '#FFFFFF', text: isDark ? '#FFFFFF' : '#2D2D2D', subtext: isDark ? '#A78BFA' : '#6B7280', accent: '#6366F1', accentLight: '#6366F120', border: isDark ? '#2D1B4D' : '#E8E8E3', inputBg: isDark ? '#161122' : '#FDFDF9', success: '#10B981', warning: '#F59E0B', danger: '#EF4444',
  };

  const handleAnalyze = useCallback(async () => {
    if (!dream.trim()) return;
    setLoading(true); setResult(null);
    try {
      const res = await apiPost('/api/dreams/interpret', { user_id: userId, dream_text: dream.trim(), lang, school: selectedSchool });
      setResult(res?.data || res);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (e) { setResult({ error: isAr ? 'فشل التحليل' : 'Analysis failed' }); }
    finally { setLoading(false); }
  }, [dream, selectedSchool, userId, lang]);

  const handleReset = () => { setDream(''); setResult(null); fadeAnim.setValue(0); };

  return (
    <View style={[st.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <View style={[st.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} stroke={colors.text} /></TouchableOpacity>
        <View style={st.headerCenter}><Moon size={22} stroke={colors.accent} /><Text style={[st.headerTitle, { color: colors.text }]}>{t.title}</Text></View>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
        <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[st.iconWrap, { backgroundColor: colors.accentLight }]}><Brain size={40} stroke={colors.accent} /></View>
          <Text style={[st.label, { color: colors.text }]}>{t.dream}</Text>
          <TouchableOpacity style={[st.schoolPicker, { borderColor: colors.border }]} onPress={() => setShowSchoolPicker(true)}>
            <Text style={[st.schoolPickerText, { color: colors.text }]}>{isAr ? SCHOOLS.find(s => s.id === selectedSchool)?.label_ar : SCHOOLS.find(s => s.id === selectedSchool)?.label_en}</Text>
          </TouchableOpacity>
          <TextInput style={[st.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder={t.placeholder} placeholderTextColor={colors.subtext} value={dream} onChangeText={setDream} multiline numberOfLines={5} textAlignVertical="top" />
          <TouchableOpacity style={[st.submitBtn, { backgroundColor: colors.accent, opacity: dream.trim() ? 1 : 0.6 }]} onPress={handleAnalyze} disabled={loading || !dream.trim()}>
            {loading ? <ActivityIndicator color="#FFF" /> : <><Sparkles size={18} stroke="#FFF" /><Text style={st.submitBtnText}>{t.interpret}</Text></>}
          </TouchableOpacity>
        </View>
        {result && !result.error && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={[st.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[st.resultTitle, { color: colors.text }]}>{t.result}</Text>
              <Text style={[st.resultBody, { color: colors.subtext }]}>{result.interpretation}</Text>
            </View>
            <TouchableOpacity style={[st.resetBtn, { borderColor: colors.border }]} onPress={handleReset}><Sparkles size={16} stroke={colors.subtext} /><Text style={[st.resetBtnText, { color: colors.subtext }]}>{t.newDream}</Text></TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
      <Modal visible={showSchoolPicker} transparent animationType="fade" onRequestClose={() => setShowSchoolPicker(false)}>
        <TouchableOpacity style={st.modalOverlay} activeOpacity={1} onPress={() => setShowSchoolPicker(false)}>
          <View style={[st.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[st.modalTitle, { color: colors.text }]}>{isAr ? 'اختر مدرسة التفسير' : 'Select School'}</Text>
            {SCHOOLS.map(school => (
              <TouchableOpacity key={school.id} style={[st.schoolOption, { borderColor: selectedSchool === school.id ? school.color : 'transparent' }, selectedSchool === school.id && { backgroundColor: school.color + '10' }]} onPress={() => { setSelectedSchool(school.id); setShowSchoolPicker(false); }}>
                <school.icon size={20} stroke={school.color} />
                <Text style={[st.schoolOptionText, { color: colors.text }]}>{isAr ? school.label_ar : school.label_en}</Text>
                {selectedSchool === school.id && <Check size={18} stroke={school.color} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 }, headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 }, headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 50 }, card: { borderRadius: 24, padding: 24, borderWidth: 1, alignItems: 'center', marginBottom: 24 }, iconWrap: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }, label: { fontSize: 16, fontWeight: '600', marginBottom: 16 }, schoolPicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 16 }, schoolPickerText: { fontSize: 14, fontWeight: '500' },
  input: { width: '100%', borderRadius: 16, padding: 16, fontSize: 15, borderWidth: 1, minHeight: 120, marginBottom: 16 }, submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, width: '100%', gap: 8 }, submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  resultCard: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16 }, resultTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 }, resultBody: { fontSize: 15, lineHeight: 26 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1 }, resetBtnText: { fontWeight: '600', fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }, modalContent: { width: '85%', borderRadius: 20, padding: 20 }, modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  schoolOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 8 }, schoolOptionText: { flex: 1, fontSize: 15, fontWeight: '600' },
});
