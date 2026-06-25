import React, { useState, useRef, useEffect } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Alert, ActivityIndicator, TextInput, Image } from 'react-native';
import { router } from 'expo-router';
import { useTwinStore, TwinGender } from '../store/useTwinStore';
import { useTheme } from '../utils/theme';
import { apiPost } from '../lib/httpClient';
import { Sparkles, Check, Volume2, Fingerprint, Zap } from 'lucide-react-native';

const LOGO = require('../assets/icon.png');

const QUESTIONS = {
  ar: [
    { id:'1', q:'عندما تواجه مشكلة كبيرة، كيف تتعامل معها عادةً؟', options:['أحللها بهدوء','أثق بحدسي','أطلب المساعدة','أتجنبها مؤقتاً'] },
    { id:'2', q:'ما هو أكثر شيء يدفعك للاستمرار في الحياة؟', options:['تحقيق إنجاز','قضاء وقت مع الأحباء','النجاح المهني','تحقيق السلام الداخلي'] },
    { id:'3', q:'أي نوع من العلاقات تشعر أنه الأقرب لقلبك؟', options:['مستقرة وداعمة','مليئة بالمغامرات','مع العائلة والأصدقاء','أفضل الاعتماد على نفسي'] },
    { id:'4', q:'كيف تصف يومك المثالي؟', options:['منجزاً ومليئاً بالمهام','في الطبيعة أو أسترخي','مع العائلة والأصدقاء','أستمتع بها لكن أحتاج مساحتي'] },
    { id:'5', q:'ما هو أكبر خوف يراودك أحياناً؟', options:['الفشل في تحقيق أهدافي','أحياناً أقلق من فقدانهم','عدم تحقيق تأثير في العالم','أخشى فقدان استقلاليتي'] },
    { id:'6', q:'عندما تشعر بالضغط، ما هو أول شيء تفعله؟', options:['أبحث عن حل مباشر','أتحدث مع أحدهم','أشغل نفسي بشيء آخر','أبقى وحدي لأفكر'] },
    { id:'7', q:'ما هي القيمة الأكثر أهمية بالنسبة لك؟', options:['الذكاء والدهاء','السعادة العائلية','التأثير في العالم','الحرية الشخصية'] },
  ],
  en: [
    { id:'1', q:'When facing a big problem, how do you usually handle it?', options:['Analyze it calmly','Trust my intuition','Ask for help','Avoid it temporarily'] },
    { id:'2', q:'What drives you most to keep going in life?', options:['Achieving a goal','Spending time with loved ones','Professional success','Achieving inner peace'] },
    { id:'3', q:'Which type of relationship feels closest to your heart?', options:['Stable and supportive','Full of adventures','With family and friends','I prefer to rely on myself'] },
    { id:'4', q:'How would you describe your perfect day?', options:['Productive and full of tasks','In nature or relaxing','With family and friends','I enjoy them but need my space'] },
    { id:'5', q:'What is your biggest fear sometimes?', options:['Failure to achieve my goals','Sometimes I worry about losing them','Not making an impact on the world','Losing my independence'] },
    { id:'6', q:'When you feel stressed, what is the first thing you do?', options:['Look for a direct solution','Talk to someone','Distract myself with something else','Stay alone to think'] },
    { id:'7', q:'What is the most important value to you?', options:['Intelligence and cleverness','Family happiness','Making an impact on the world','Personal freedom'] },
  ],
};

export default function Onboarding() {
  const { lang, setTwinName, setTwinGender } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = useTheme().isDark;
  const questions = QUESTIONS[lang as keyof typeof QUESTIONS] || QUESTIONS['ar'];

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [userName, setUserName] = useState('');
  const [newTwinName, setNewTwinName] = useState(isAr ? 'توأمك' : 'My Twin');
  const [newTwinGender, setNewTwinGender] = useState<TwinGender>('female');
  const [freeInfo, setFreeInfo] = useState(''); // ✅ مربع الإدخال الحر
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const totalSteps = questions.length + 2;

  const colors = {
    bg: isDark ? '#0A0014' : '#FAFAF8', card: isDark ? '#1A1226' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1226', subtext: isDark ? '#A78BFA' : '#6B5B8A',
    accent: '#7C3AED', accentLight: '#7C3AED15', border: isDark ? '#2D1B4D' : '#E0D9F5',
    inputBg: isDark ? '#161122' : '#F8F6F2', success: '#10B981',
  };

  const animateStep = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const handleAnswer = async (qId: string, opt: string) => {
    const newAnswers = { ...answers, [qId]: opt };
    setAnswers(newAnswers);
    animateStep();
    setStep(prev => prev + 1);

    // توليد الأفاتار أثناء الإجابة (بعد السؤال الرابع)
    if (step === 3 && !avatarUrl) {
      try {
        const av = await apiPost('/api/avatar/generate', {
          user_id: 'new_user',
          user_name: userName || (isAr ? 'مستخدم' : 'User'),
          style: 'realistic',
          language: lang,
        });
        if (av?.image_url) setAvatarUrl(av.image_url);
      } catch (e) {}
    }
  };

  const handleFinalize = async () => {
    if (!userName.trim()) {
      Alert.alert(isAr ? 'تنبيه' : 'Notice', isAr ? 'من فضلك أدخل اسمك' : 'Please enter your name');
      return;
    }
    setLoading(true);
    try {
      // تحليل الشخصية
      const analysisPrompt = `حلل شخصية المستخدم بناءً على إجاباته التالية وقدم ملخصاً من 3-4 جمل عن شخصيته، نقاط قوته، وكيف سيكون علاقته بتوأمه الرقمي. كن دقيقاً وعلمياً.
      الأسئلة والأجوبة:
      ${questions.map(q => `- ${q.q}: ${answers[q.id] || 'لم يجب'}`).join('\n')}
      اسم المستخدم: ${userName}
      اسم التوأم: ${newTwinName}
      معلومات إضافية: ${freeInfo}
      اللغة: ${lang}`;

      const analysisResult = await apiPost('/api/chat', { message: analysisPrompt, lang });
      // ✅ التعامل مع خطأ object object
      const analysisText = typeof analysisResult === 'string' ? analysisResult : analysisResult?.reply || analysisResult?.message || JSON.stringify(analysisResult);
      setAnalysis(analysisText);

      // توليد الأفاتار إن لم يكن موجوداً
      if (!avatarUrl) {
        try {
          const av = await apiPost('/api/avatar/generate', { user_id: 'new_user', user_name: userName, style: 'realistic', language: lang });
          if (av?.image_url) setAvatarUrl(av.image_url);
        } catch (e) {}
      }

      await apiPost('/api/onboarding/complete', {
        answers, lang, userName: userName.trim(),
        twinName: newTwinName.trim() || (isAr ? 'توأمك' : 'My Twin'),
        twinGender: newTwinGender, freeInfo,
        analysis: analysisText,
      });

      setTwinName(newTwinName.trim() || (isAr ? 'توأمك' : 'My Twin'));
      setTwinGender(newTwinGender);
      animateStep();
      setStep(totalSteps - 1);
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', typeof e === 'string' ? e : e?.message || 'حدث خطأ');
    } finally { setLoading(false); }
  };

  const handleStartJourney = () => router.replace('/twin-mind');

  const renderQuestionStep = () => {
    const currentQ = questions[step];
    return (
      <>
        <Text style={[st.question, { color: colors.text }]}>{currentQ.q}</Text>
        {currentQ.options.map((opt, i) => (
          <TouchableOpacity key={i} style={[st.option, { borderColor: colors.border }]} onPress={() => handleAnswer(currentQ.id, opt)}>
            <Text style={[st.optionText, { color: colors.text }]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </>
    );
  };

  const renderNameStep = () => (
    <>
      <Text style={[st.title, { color: colors.text }]}>{isAr ? 'خطوة أخيرة!' : 'Final Step!'}</Text>
      <Text style={[st.label, { color: colors.subtext }]}>{isAr ? 'ما اسمك؟' : 'Your name?'}</Text>
      <TextInput style={[st.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder={isAr ? 'أدخل اسمك' : 'Enter name'} placeholderTextColor={colors.subtext} value={userName} onChangeText={setUserName} />
      <Text style={[st.label, { color: colors.subtext }]}>{isAr ? 'اسم توأمك' : 'Twin name'}</Text>
      <TextInput style={[st.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder={isAr ? 'اسم التوأم' : 'Twin name'} placeholderTextColor={colors.subtext} value={newTwinName} onChangeText={setNewTwinName} />
      <Text style={[st.label, { color: colors.subtext }]}>{isAr ? 'صوت توأمك' : 'Twin Voice'}</Text>
      <View style={st.genderRow}>
        <TouchableOpacity style={[st.genderBtn, { borderColor: newTwinGender === 'female' ? colors.accent : colors.border }, newTwinGender === 'female' && { backgroundColor: colors.accentLight }]} onPress={() => setNewTwinGender('female')}>
          <Text style={st.genderEmoji}>♀️</Text><Text style={[st.genderText, { color: newTwinGender === 'female' ? colors.accent : colors.subtext }]}>{isAr ? 'أنثى' : 'Female'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.genderBtn, { borderColor: newTwinGender === 'male' ? colors.accent : colors.border }, newTwinGender === 'male' && { backgroundColor: colors.accentLight }]} onPress={() => setNewTwinGender('male')}>
          <Text style={st.genderEmoji}>♂️</Text><Text style={[st.genderText, { color: newTwinGender === 'male' ? colors.accent : colors.subtext }]}>{isAr ? 'ذكر' : 'Male'}</Text>
        </TouchableOpacity>
      </View>
      {/* ✅ مربع الإدخال الحر */}
      <Text style={[st.label, { color: colors.subtext }]}>{isAr ? 'أخبرني عن نفسك (اختياري)' : 'Tell me about yourself (optional)'}</Text>
      <TextInput
        style={[st.textArea, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: isAr ? 'right' : 'left' }]}
        placeholder={isAr ? 'اكتب بحرية...' : 'Write freely...'}
        placeholderTextColor={colors.subtext}
        value={freeInfo}
        onChangeText={setFreeInfo}
        multiline
        numberOfLines={4}
      />
      <TouchableOpacity style={[st.submitBtn, { backgroundColor: colors.accent, opacity: (!userName.trim() || loading) ? 0.6 : 1 }]} onPress={handleFinalize} disabled={!userName.trim() || loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <><Sparkles size={20} stroke="#FFF" /><Text style={st.submitText}>{isAr ? 'ولادة الوعي' : 'Birth of Consciousness'}</Text></>}
      </TouchableOpacity>
    </>
  );

  const renderAnalysisStep = () => (
    <View style={{ alignItems: 'center' }}>
      <Text style={[st.title, { color: colors.text, marginBottom: 20 }]}>{isAr ? 'وعيك يولد الآن' : 'Your Consciousness is Born'}</Text>
      <View style={st.avatarPreview}>
        {avatarUrl ? <Image source={{ uri: avatarUrl }} style={st.avatarImg} /> : <Image source={LOGO} style={st.avatarImg} />}
      </View>
      <Text style={[st.twinNamePreview, { color: colors.accent }]}>{newTwinName}</Text>
      <View style={[st.analysisCard, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}>
        <Fingerprint size={20} stroke={colors.accent} />
        <Text style={[st.analysisText, { color: colors.subtext }]}>
          {analysis || (isAr ? 'جاري تحليل وعيك...' : 'Analyzing your consciousness...')}
        </Text>
      </View>
      <TouchableOpacity style={[st.submitBtn, { backgroundColor: colors.accent, marginTop: 20 }]} onPress={handleStartJourney}>
        <Zap size={20} stroke="#FFF" /><Text style={st.submitText}>{isAr ? 'ابدأ رحلتك' : 'Start Your Journey'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[st.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
        <View style={st.headerRow}>
          <Text style={[st.stepText, { color: colors.subtext }]}>{step + 1}/{totalSteps} {isAr ? 'وعي' : 'Mind'}</Text>
          <View style={st.progressBar}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View key={i} style={[st.dot, { backgroundColor: i <= step ? colors.accent : colors.border, width: i === step ? 24 : 8 }]} />
            ))}
          </View>
        </View>
        <Animated.View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: fadeAnim }]}>
          {step < questions.length && renderQuestionStep()}
          {step === questions.length && renderNameStep()}
          {step === questions.length + 1 && renderAnalysisStep()}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1 }, scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  headerRow: { alignItems: 'center', marginBottom: 24 }, progressBar: { flexDirection: 'row', gap: 6, marginTop: 8 },
  dot: { height: 8, borderRadius: 4 }, stepText: { fontSize: 13, fontWeight: '600' },
  card: { borderRadius: 24, padding: 24, borderWidth: 1, minHeight: 400 },
  question: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 20, lineHeight: 28 },
  option: { padding: 16, borderRadius: 14, borderWidth: 1.5, marginBottom: 10 },
  optionText: { fontSize: 15, textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: { borderRadius: 14, padding: 14, fontSize: 16, borderWidth: 1, marginBottom: 8, textAlign: 'right' },
  textArea: { borderRadius: 14, padding: 14, fontSize: 16, borderWidth: 1, minHeight: 100, textAlignVertical: 'top', marginBottom: 20 },
  genderRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  genderBtn: { flex: 1, padding: 16, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', gap: 8 },
  genderEmoji: { fontSize: 24 }, genderText: { fontSize: 15, fontWeight: '600' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 8 },
  submitText: { color: '#FFF', fontWeight: '700', fontSize: 17 },
  avatarPreview: { width: 100, height: 100, borderRadius: 30, justifyContent: 'center', alignItems: 'center', backgroundColor: '#7C3AED20', marginBottom: 12 },
  avatarImg: { width: 90, height: 90, borderRadius: 25 },
  twinNamePreview: { fontSize: 24, fontWeight: '800', marginBottom: 20 },
  analysisCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 20, borderRadius: 20, borderWidth: 1, marginTop: 10 },
  analysisText: { flex: 1, fontSize: 15, lineHeight: 24, textAlign: 'center' },
});
