import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Animated, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTwinStore } from '../../store/useTwinStore';
import { useTheme } from '../../utils/theme';
import { router } from 'expo-router';
import { apiPost, apiGet } from '../../lib/httpClient';
import {
  ArrowLeft, Brain, Sparkles, Zap, Lightbulb, Award,
  TrendingUp, Target, BookOpen, Layers, RefreshCw,
  CheckCircle2, Circle, Star,
} from 'lucide-react-native';

const { width: SCREEN_W } = Dimensions.get('window');

const T = {
  ar: {
    title: 'أثينا – المذاكرة الذكية',
    subtitle: 'نظام تعلم تكيفي مع شرح SCAFFOLD وأسئلة Bloom',
    concept: 'ماذا تريد أن تتعلم؟',
    placeholder: 'مثلاً: قانون الجاذبية، التفاضل...',
    start: 'ابدأ التعلم',
    loading: 'جاري تحليل المفهوم...',
    simplified: 'الشرح المبسط',
    analogy: 'تشبيه',
    fragments: 'الأجزاء',
    question: 'اختبر فهمي',
    answer: 'اكتب إجابتك...',
    submit: 'إرسال الإجابة',
    correct: 'إجابة صحيحة! 🎉',
    incorrect: 'حاول مرة أخرى 💪',
    next: 'السؤال التالي',
    back: 'العودة للشرح',
    end: 'إنهاء الجلسة',
    review: 'أحسنت! 🎉',
    questions: 'الأسئلة',
    correctAnswers: 'الإجابات الصحيحة',
    accuracy: 'الدقة',
    depth: 'العمق',
    newConcept: 'مفهوم جديد',
    sessionStats: 'إحصائيات الجلسة',
  },
  en: {
    title: 'Athena – Smart Study',
    subtitle: 'Adaptive learning with SCAFFOLD & Bloom',
    concept: 'What do you want to learn?',
    placeholder: 'e.g., Gravity, Calculus...',
    start: 'Start Learning',
    loading: 'Analyzing concept...',
    simplified: 'Simplified',
    analogy: 'Analogy',
    fragments: 'Fragments',
    question: 'Test Me',
    answer: 'Write your answer...',
    submit: 'Submit Answer',
    correct: 'Correct! 🎉',
    incorrect: 'Try again 💪',
    next: 'Next Question',
    back: 'Back to Explanation',
    end: 'End Session',
    review: 'Well Done! 🎉',
    questions: 'Questions',
    correctAnswers: 'Correct',
    accuracy: 'Accuracy',
    depth: 'Depth',
    newConcept: 'New Concept',
    sessionStats: 'Session Stats',
  },
};

export default function StudyMode() {
  const insets = useSafeAreaInsets();
  const { lang, userId } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = useTheme().isDark;
  const t = T[lang] || T['ar'];

  const [concept, setConcept] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionState, setSessionState] = useState<'idle' | 'explaining' | 'questioning' | 'reviewing'>('idle');
  const [explanation, setExplanation] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionId, setQuestionId] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [answerResult, setAnswerResult] = useState<any>(null);
  const [sessionStats, setSessionStats] = useState({ depth: 0, questionsAsked: 0, correctAnswers: 0, accuracy: '0%' });
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const colors = {
    bg: isDark ? '#0A0014' : '#FAFAF8',
    card: isDark ? '#1A1226' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#2D2D2D',
    subtext: isDark ? '#A78BFA' : '#6B7280',
    accent: '#3B82F6',
    accentLight: '#3B82F620',
    border: isDark ? '#2D1B4D' : '#E8E8E3',
    inputBg: isDark ? '#161122' : '#FDFDF9',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
  };

  const handleStartSession = useCallback(async () => {
    if (!concept.trim()) return;
    setLoading(true);
    setSessionState('explaining');
    try {
      const result = await apiPost('/api/study/start', {
        user_id: userId, concept: concept.trim(), age_group: 'young_adult', language: lang,
      });
      setExplanation(result?.explanation || { simplified: 'تم تحليل المفهوم بنجاح' });
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (e) {
      setExplanation({ simplified: 'تعذر تحليل المفهوم. حاول مرة أخرى.' });
    } finally { setLoading(false); }
  }, [concept, userId, lang]);

  const handleAnswer = useCallback(async () => {
    if (!userAnswer.trim() || !questionId) return;
    setLoading(true);
    try {
      const result = await apiPost('/api/study/answer', {
        user_id: userId, question_id: questionId, answer: userAnswer.trim(), lang,
      });
      setAnswerResult(result);
      setSessionStats(prev => ({
        depth: result?.current_depth || prev.depth,
        questionsAsked: prev.questionsAsked + 1,
        correctAnswers: prev.correctAnswers + (result?.is_correct ? 1 : 0),
        accuracy: prev.questionsAsked > 0
          ? `${Math.round(((prev.correctAnswers + (result?.is_correct ? 1 : 0)) / (prev.questionsAsked + 1)) * 100)}%`
          : (result?.is_correct ? '100%' : '0%'),
      }));
      setUserAnswer('');
    } catch (e) {} finally { setLoading(false); }
  }, [userAnswer, questionId, userId, lang]);

  const startQuestioning = () => {
    setSessionState('questioning');
    setCurrentQuestion(explanation?.check_question || 'ما هو فهمك للمفهوم؟');
    setQuestionId(Math.random().toString(36).substr(2, 9));
  };

  const handleEndSession = async () => {
    try { await apiPost('/api/study/end', { user_id: userId }); } catch (e) {}
    setSessionState('reviewing');
  };

  const handleReset = () => {
    setConcept(''); setSessionState('idle'); setExplanation(null);
    setCurrentQuestion(''); setQuestionId(''); setUserAnswer('');
    setAnswerResult(null); fadeAnim.setValue(0);
  };

  return (
    <View style={[st.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <View style={[st.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} stroke={colors.text} /></TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.text }]}>{t.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
        {/* حالة الخمول */}
        {sessionState === 'idle' && (
          <View style={st.idleContainer}>
            <View style={[st.iconWrap, { backgroundColor: colors.accentLight }]}>
              <Brain size={50} stroke={colors.accent} />
            </View>
            <Text style={[st.idleTitle, { color: colors.text }]}>{t.subtitle}</Text>
            <TextInput
              style={[st.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: isAr ? 'right' : 'left' }]}
              placeholder={t.placeholder} placeholderTextColor={colors.subtext}
              value={concept} onChangeText={setConcept} multiline numberOfLines={3} textAlignVertical="top"
            />
            <TouchableOpacity style={[st.submitBtn, { backgroundColor: colors.accent, opacity: concept.trim() ? 1 : 0.6 }]} onPress={handleStartSession} disabled={loading || !concept.trim()}>
              {loading ? <ActivityIndicator color="#FFF" /> : <><Sparkles size={20} stroke="#FFF" /><Text style={st.submitBtnText}>{t.start}</Text></>}
            </TouchableOpacity>
          </View>
        )}

        {/* حالة الشرح */}
        {sessionState === 'explaining' && explanation && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={st.cardHeader}><Lightbulb size={20} stroke={colors.warning} /><Text style={[st.cardTitle, { color: colors.text }]}>{t.simplified}</Text></View>
              <Text style={[st.cardBody, { color: colors.subtext }]}>{explanation.simplified || explanation.error}</Text>
            </View>
            {explanation.analogy && (
              <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={st.cardHeader}><Zap size={20} stroke={colors.warning} /><Text style={[st.cardTitle, { color: colors.text }]}>{t.analogy}</Text></View>
                <Text style={[st.cardBody, { color: colors.subtext }]}>{explanation.analogy}</Text>
              </View>
            )}
            <View style={st.actionRow}>
              <TouchableOpacity style={[st.actionBtn, { backgroundColor: colors.accent }]} onPress={startQuestioning}>
                <Target size={18} stroke="#FFF" /><Text style={st.actionBtnText}>{t.question}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.actionBtn, { backgroundColor: colors.danger }]} onPress={handleEndSession}>
                <CheckCircle2 size={18} stroke="#FFF" /><Text style={st.actionBtnText}>{t.end}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* حالة الأسئلة */}
        {sessionState === 'questioning' && (
          <View style={st.questionContainer}>
            <Text style={[st.questionText, { color: colors.text }]}>{currentQuestion}</Text>
            <TextInput
              style={[st.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: isAr ? 'right' : 'left', minHeight: 100 }]}
              placeholder={t.answer} placeholderTextColor={colors.subtext}
              value={userAnswer} onChangeText={setUserAnswer} multiline textAlignVertical="top"
            />
            <TouchableOpacity style={[st.submitBtn, { backgroundColor: colors.accent, opacity: userAnswer.trim() ? 1 : 0.6 }]} onPress={handleAnswer} disabled={loading || !userAnswer.trim()}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={st.submitBtnText}>{t.submit}</Text>}
            </TouchableOpacity>
            {answerResult && (
              <View style={[st.resultCard, { backgroundColor: (answerResult.is_correct ? colors.success : colors.danger) + '15', borderColor: answerResult.is_correct ? colors.success : colors.danger }]}>
                <Text style={[st.resultTitle, { color: answerResult.is_correct ? colors.success : colors.danger }]}>{answerResult.is_correct ? t.correct : t.incorrect}</Text>
                {answerResult.next_question && (
                  <TouchableOpacity style={[st.nextBtn, { backgroundColor: colors.accentLight }]} onPress={() => { setCurrentQuestion(answerResult.next_question); setQuestionId(Math.random().toString(36).substr(2, 9)); setAnswerResult(null); }}>
                    <Text style={[st.nextBtnText, { color: colors.accent }]}>{t.next}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <TouchableOpacity style={[st.backBtn, { borderColor: colors.border }]} onPress={() => { setSessionState('explaining'); setAnswerResult(null); }}>
              <RefreshCw size={16} stroke={colors.subtext} /><Text style={[st.backBtnText, { color: colors.subtext }]}>{t.back}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* حالة المراجعة */}
        {sessionState === 'reviewing' && (
          <View style={st.reviewContainer}>
            <View style={[st.iconWrap, { backgroundColor: colors.success + '15' }]}><Award size={50} stroke={colors.success} /></View>
            <Text style={[st.reviewTitle, { color: colors.text }]}>{t.review}</Text>
            <View style={[st.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[st.statsTitle, { color: colors.text }]}>{t.sessionStats}</Text>
              {[
                { label: t.questions, val: sessionStats.questionsAsked, color: colors.text },
                { label: t.correctAnswers, val: sessionStats.correctAnswers, color: colors.success },
                { label: t.accuracy, val: sessionStats.accuracy, color: colors.accent },
                { label: t.depth, val: `${sessionStats.depth}/6`, color: colors.warning },
              ].map((s, i) => (
                <View key={i} style={st.statRow}><Text style={[st.statLabel, { color: colors.subtext }]}>{s.label}</Text><Text style={[st.statValue, { color: s.color }]}>{s.val}</Text></View>
              ))}
            </View>
            <TouchableOpacity style={[st.submitBtn, { backgroundColor: colors.accent }]} onPress={handleReset}>
              <BookOpen size={20} stroke="#FFF" /><Text style={st.submitBtnText}>{t.newConcept}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: '700' }, content: { padding: 20, paddingBottom: 50 },
  idleContainer: { alignItems: 'center', paddingVertical: 20 },
  iconWrap: { width: 90, height: 90, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  idleTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 20 },
  input: { width: '100%', borderRadius: 16, padding: 16, fontSize: 15, borderWidth: 1, marginBottom: 20 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, width: '100%', gap: 8 },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700' }, cardBody: { fontSize: 15, lineHeight: 26 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, gap: 8 },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  questionContainer: { gap: 16 }, questionText: { fontSize: 18, fontWeight: '600', lineHeight: 28 },
  resultCard: { borderRadius: 16, borderWidth: 1, padding: 16 }, resultTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  nextBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  nextBtnText: { fontWeight: '600', fontSize: 14 },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  backBtnText: { fontWeight: '600', fontSize: 14 },
  reviewContainer: { alignItems: 'center', paddingVertical: 20 }, reviewTitle: { fontSize: 24, fontWeight: '800', marginBottom: 20 },
  statsCard: { width: '100%', borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 24 },
  statsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statLabel: { fontSize: 15, fontWeight: '500' }, statValue: { fontSize: 17, fontWeight: '700' },
});
