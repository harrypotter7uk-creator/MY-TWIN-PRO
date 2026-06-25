import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Animated, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTwinStore } from '../../store/useTwinStore';
import { useTheme } from '../../utils/theme';
import { router } from 'expo-router';
import { apiPost } from '../../lib/httpClient';
import {
  ArrowLeft, Code2, Sparkles, Zap, Play, RefreshCw,
  Copy, Check, Terminal, Bug, BookOpen, Globe,
  Server, Layers, Monitor, Palette, Cpu, Braces,
  Clipboard, Search,
} from 'lucide-react-native';
import * as ClipboardModule from 'expo-clipboard';

const T = {
  ar: {
    title: 'مختبر البرمجة',
    subtitle: 'كتابة، مراجعة، تصحيح الأكواد',
    language: 'اللغة',
    action: 'الإجراء',
    task: 'اكتب المهمة البرمجية...',
    debugPlaceholder: 'الصق الكود هنا...',
    execute: 'تنفيذ',
    result: 'النتيجة',
    copy: 'نسخ',
    copied: 'تم النسخ!',
    retry: 'إعادة',
    write: 'كتابة كود',
    review: 'مراجعة',
    explain: 'شرح',
    debug: 'تصحيح',
    webTemplate: 'قوالب الويب',
    loading: 'جاري التنفيذ...',
    error: 'حدث خطأ',
  },
  en: {
    title: 'Code Lab',
    subtitle: 'Write, Review, Debug code',
    language: 'Language',
    action: 'Action',
    task: 'Write the coding task...',
    debugPlaceholder: 'Paste code here...',
    execute: 'Execute',
    result: 'Result',
    copy: 'Copy',
    copied: 'Copied!',
    retry: 'Retry',
    write: 'Write Code',
    review: 'Review',
    explain: 'Explain',
    debug: 'Debug',
    webTemplate: 'Web Templates',
    loading: 'Executing...',
    error: 'Error occurred',
  },
};

const LANGUAGES = [
  { id: 'python', label: 'Python', color: '#3776AB' },
  { id: 'javascript', label: 'JavaScript', color: '#F7DF1E' },
  { id: 'typescript', label: 'TypeScript', color: '#3178C6' },
  { id: 'java', label: 'Java', color: '#ED8B00' },
  { id: 'go', label: 'Go', color: '#00ADD8' },
  { id: 'rust', label: 'Rust', color: '#DEA584' },
];

const ACTIONS = [
  { id: 'write', label_ar: 'كتابة كود', label_en: 'Write Code', icon: Code2 },
  { id: 'review', label_ar: 'مراجعة', label_en: 'Review', icon: Search },
  { id: 'explain', label_ar: 'شرح', label_en: 'Explain', icon: BookOpen },
  { id: 'debug', label_ar: 'تصحيح', label_en: 'Debug', icon: Bug },
];

const WEB_TEMPLATES = [
  { id: 'react', label: 'React', icon: Globe, color: '#61DAFB' },
  { id: 'nextjs', label: 'Next.js', icon: Server, color: '#000000' },
  { id: 'fastapi', label: 'FastAPI', icon: Cpu, color: '#009688' },
  { id: 'express', label: 'Express', icon: Layers, color: '#68A063' },
  { id: 'fullstack', label: 'Full-Stack', icon: Monitor, color: '#8B5CF6' },
];

export default function CodeLab() {
  const insets = useSafeAreaInsets();
  const { lang, userId } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = useTheme().isDark;
  const t = T[lang] || T['ar'];

  const [task, setTask] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [language, setLanguage] = useState('python');
  const [action, setAction] = useState('write');
  const [webTemplate, setWebTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [copied, setCopied] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const colors = {
    bg: isDark ? '#0A0014' : '#FAFAF8',
    card: isDark ? '#1A1226' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#2D2D2D',
    subtext: isDark ? '#A78BFA' : '#6B7280',
    accent: '#10B981',
    accentLight: '#10B98120',
    border: isDark ? '#2D1B4D' : '#E8E8E3',
    inputBg: isDark ? '#161122' : '#FDFDF9',
    codeBg: '#1E1E2E',
    codeText: '#CDD6F4',
    success: '#10B981',
  };

  const handleExecute = useCallback(async () => {
    setLoading(true); setReply('');
    try {
      let result;
      if (action === 'debug' && codeSnippet.trim()) {
        result = await apiPost('/api/code-lab/debug', { user_id: userId, error: codeSnippet, lang: language });
      } else if (task.trim() || webTemplate) {
        const finalPrompt = webTemplate ? `أنشئ مشروع ${webTemplate}: ${task}` : task;
        result = await apiPost('/api/code-lab/generate-code', { user_id: userId, prompt: finalPrompt, lang: language });
      }
      setReply(typeof result === 'string' ? result : result?.code || result?.solutions || JSON.stringify(result));
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (e: any) {
      setReply(isAr ? 'حدث خطأ أثناء التنفيذ' : 'Execution error');
    } finally { setLoading(false); }
  }, [task, codeSnippet, language, action, webTemplate, userId]);

  const handleCopy = async () => {
    await ClipboardModule.setStringAsync(reply);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const extractCode = (text: string) => { const m = text.match(/```[\w]*\n([\s\S]*?)```/); return m ? m[1] : text; };
  const codeContent = extractCode(reply);
  const hasCode = codeContent !== reply && codeContent.length > 10;

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
            <Terminal size={40} stroke={colors.accent} />
          </View>

          {/* اللغة */}
          <Text style={[st.label, { color: colors.text }]}>{t.language}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.scroll}>
            {LANGUAGES.map(lg => (
              <TouchableOpacity key={lg.id} style={[st.chip, { borderColor: language === lg.id ? lg.color : colors.border }, language === lg.id && { backgroundColor: lg.color + '20' }]} onPress={() => setLanguage(lg.id)}>
                <Text style={[st.chipText, { color: language === lg.id ? lg.color : colors.subtext }]}>{lg.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* قوالب الويب */}
          <Text style={[st.label, { color: colors.text }]}>{t.webTemplate}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.scroll}>
            {WEB_TEMPLATES.map(tpl => {
              const Icon = tpl.icon;
              return (
                <TouchableOpacity key={tpl.id} style={[st.chip, { borderColor: webTemplate === tpl.id ? tpl.color : colors.border }, webTemplate === tpl.id && { backgroundColor: tpl.color + '20' }]} onPress={() => setWebTemplate(webTemplate === tpl.id ? '' : tpl.id)}>
                  <Icon size={14} stroke={webTemplate === tpl.id ? tpl.color : colors.subtext} />
                  <Text style={[st.chipText, { color: webTemplate === tpl.id ? tpl.color : colors.subtext, marginLeft: 4 }]}>{tpl.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* الإجراء */}
          <Text style={[st.label, { color: colors.text }]}>{t.action}</Text>
          <View style={st.actionsGrid}>
            {ACTIONS.map(ac => { const Icon = ac.icon; const active = action === ac.id; return (
              <TouchableOpacity key={ac.id} style={[st.actionCard, { borderColor: active ? colors.accent : colors.border }, active && { backgroundColor: colors.accentLight }]} onPress={() => setAction(ac.id)}>
                <Icon size={22} stroke={active ? colors.accent : colors.subtext} />
                <Text style={[st.actionLabel, { color: active ? colors.accent : colors.subtext }]}>{isAr ? ac.label_ar : ac.label_en}</Text>
              </TouchableOpacity>
            );})}
          </View>

          {/* حقول الإدخال */}
          {(action === 'write' || action === 'explain') && (
            <TextInput style={[st.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder={t.task} placeholderTextColor={colors.subtext} value={task} onChangeText={setTask} multiline numberOfLines={4} textAlignVertical="top" />
          )}
          {(action === 'review' || action === 'debug') && (
            <TextInput style={[st.codeInput, { backgroundColor: colors.codeBg, color: colors.codeText, borderColor: colors.border }]} placeholder={t.debugPlaceholder} placeholderTextColor="#6C7086" value={codeSnippet} onChangeText={setCodeSnippet} multiline numberOfLines={6} textAlignVertical="top" autoCapitalize="none" autoCorrect={false} spellCheck={false} />
          )}

          {/* زر التنفيذ */}
          <TouchableOpacity style={[st.submitBtn, { backgroundColor: webTemplate ? '#8B5CF6' : colors.accent, opacity: (task.trim() || codeSnippet.trim()) ? 1 : 0.6 }]} onPress={handleExecute} disabled={loading || (!task.trim() && !codeSnippet.trim())}>
            {loading ? <ActivityIndicator color="#FFF" /> : <><Play size={18} stroke="#FFF" /><Text style={st.submitBtnText}>{t.execute}</Text></>}
          </TouchableOpacity>
        </View>

        {/* النتيجة */}
        {reply ? (
          <Animated.View style={[st.resultCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: fadeAnim }]}>
            <View style={st.resultHeader}>
              <Text style={[st.resultTitle, { color: colors.text }]}>{t.result}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={handleCopy} style={[st.copyBtn, copied && { backgroundColor: colors.success + '20' }]}>
                  {copied ? <Check size={18} stroke={colors.success} /> : <Copy size={18} stroke={colors.accent} />}
                </TouchableOpacity>
                <TouchableOpacity onPress={handleExecute} style={[st.copyBtn, { backgroundColor: colors.accentLight }]}>
                  <RefreshCw size={18} stroke={colors.accent} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={[st.resultText, { color: colors.subtext }]}>{reply}</Text>
            {hasCode && (
              <View style={st.codeBlock}>
                <View style={st.codeHeader}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <View style={[st.codeDot, { backgroundColor: '#FF5F57' }]} /><View style={[st.codeDot, { backgroundColor: '#FEBC2E' }]} /><View style={[st.codeDot, { backgroundColor: '#28C840' }]} />
                  </View>
                  <TouchableOpacity onPress={async () => { await ClipboardModule.setStringAsync(codeContent); }}><Clipboard size={14} stroke="#6C7086" /></TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}><Text style={st.codeText} selectable>{codeContent}</Text></ScrollView>
              </View>
            )}
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
  scroll: { marginBottom: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, marginRight: 8 },
  chipText: { fontSize: 13, fontWeight: '600' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  actionCard: { width: '47%', padding: 16, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', gap: 6 },
  actionLabel: { fontSize: 14, fontWeight: '600' },
  input: { width: '100%', borderRadius: 16, padding: 16, fontSize: 15, borderWidth: 1, minHeight: 100, marginTop: 8, marginBottom: 16 },
  codeInput: { width: '100%', borderRadius: 16, padding: 16, fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', borderWidth: 1, minHeight: 140, marginTop: 8, marginBottom: 16 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, width: '100%', gap: 8 },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  resultCard: { borderRadius: 24, padding: 24, borderWidth: 1 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  resultTitle: { fontSize: 16, fontWeight: '700' }, copyBtn: { padding: 8, borderRadius: 10 },
  resultText: { fontSize: 15, lineHeight: 24, marginBottom: 16 },
  codeBlock: { backgroundColor: '#1E1E2E', borderRadius: 14, overflow: 'hidden' },
  codeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  codeDot: { width: 10, height: 10, borderRadius: 5 },
  codeText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13, color: '#CDD6F4', padding: 14, lineHeight: 22 },
});
