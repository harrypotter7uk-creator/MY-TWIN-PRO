import React, { useState, useRef, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useTwinStore, TwinGender } from '../store/useTwinStore';
import { useTheme } from '../utils/theme';
import { apiPost } from '../lib/httpClient';
import { Audio } from 'expo-av';
import { Sparkles, Fingerprint, Zap, Volume2 } from 'lucide-react-native';
import { speakResponse } from '../utils/voice_engine';

const LOGO = require('../assets/icon.png');

const QUESTIONS = {
  ar: [
    { id: '1', q: 'عندما تواجه مشكلة كبيرة، كيف تتعامل معها عادةً؟', options: ['أحللها بهدوء', 'أثق بحدسي', 'أطلب المساعدة', 'أتجنبها مؤقتاً'] },
    { id: '2', q: 'ما هو أكثر شيء يدفعك للاستمرار في الحياة؟', options: ['تحقيق إنجاز', 'قضاء وقت مع الأحباء', 'النجاح المهني', 'تحقيق السلام الداخلي'] },
    { id: '3', q: 'أي نوع من العلاقات تشعر أنه الأقرب لقلبك؟', options: ['مستقرة وداعمة', 'مليئة بالمغامرات', 'مع العائلة والأصدقاء', 'أفضل الاعتماد على نفسي'] },
    { id: '4', q: 'كيف تصف يومك المثالي؟', options: ['منجزاً ومليئاً بالمهام', 'في الطبيعة أو أسترخي', 'مع العائلة والأصدقاء', 'أستمتع بها لكن أحتاج مساحتي'] },
    { id: '5', q: 'ما هو أكبر خوف يراودك أحياناً؟', options: ['الفشل في تحقيق أهدافي', 'أحياناً أقلق من فقدانهم', 'عدم تحقيق تأثير في العالم', 'أخشى فقدان استقلاليتي'] },
    { id: '6', q: 'عندما تشعر بالضغط، ما هو أول شيء تفعله؟', options: ['أبحث عن حل مباشر', 'أتحدث مع أحدهم', 'أشغل نفسي بشيء آخر', 'أبقى وحدي لأفكر'] },
    { id: '7', q: 'ما هي القيمة الأكثر أهمية بالنسبة لك؟', options: ['الذكاء والدهاء', 'السعادة العائلية', 'التأثير في العالم', 'الحرية الشخصية'] },
  ],
  en: [
    { id: '1', q: 'When facing a big problem, how do you usually handle it?', options: ['Analyze it calmly', 'Trust my intuition', 'Ask for help', 'Avoid it temporarily'] },
    { id: '2', q: 'What drives you most to keep going in life?', options: ['Achieving a goal', 'Spending time with loved ones', 'Professional success', 'Achieving inner peace'] },
    { id: '3', q: 'Which type of relationship feels closest to your heart?', options: ['Stable and supportive', 'Full of adventures', 'With family and friends', 'I prefer to rely on myself'] },
    { id: '4', q: 'How would you describe your perfect day?', options: ['Productive and full of tasks', 'In nature or relaxing', 'With family and friends', 'I enjoy them but need my space'] },
    { id: '5', q: 'What is your biggest fear sometimes?', options: ['Failure to achieve my goals', 'Sometimes I worry about losing them', 'Not making an impact on the world', 'Losing my independence'] },
    { id: '6', q: 'When you feel stressed, what is the first thing you do?', options: ['Look for a direct solution', 'Talk to someone', 'Distract myself with something else', 'Stay alone to think'] },
    { id: '7', q: 'What is the most important value to you?', options: ['Intelligence and cleverness', 'Family happiness', 'Making an impact on the world', 'Personal freedom'] },
  ],
};

const AR_TRAIT_KEYWORDS: Record<string, string> = {
  'ذكي': 'ذكي', 'ذكاء': 'ذكي', 'عاطفي': 'عاطفي', 'مشاعر': 'عاطفي', 'حساس': 'حساس',
  'مبدع': 'مبدع', 'إبداع': 'مبدع', 'تحليلي': 'تحليلي', 'اجتماعي': 'اجتماعي',
  'طموح': 'طموح', 'قوي': 'قوي', 'مستقل': 'مستقل', 'هادئ': 'هادئ', 'متفائل': 'متفائل',
  'عميق': 'عميق', 'فضولي': 'فضولي', 'حنون': 'حنون', 'مخلص': 'مخلص', 'صادق': 'صادق', 'شجاع': 'شجاع',
};

const EN_TRAIT_KEYWORDS: Record<string, string> = {
  'intelligent': 'intelligent', 'smart': 'intelligent', 'emotional': 'emotional',
  'sensitive': 'sensitive', 'creative': 'creative', 'analytical': 'analytical',
  'social': 'social', 'ambitious': 'ambitious', 'strong': 'strong', 'independent': 'independent',
  'calm': 'calm', 'optimistic': 'optimistic', 'deep': 'deep', 'curious': 'curious',
  'affectionate': 'affectionate', 'loyal': 'loyal', 'honest': 'honest', 'brave': 'brave',
};

function extractTraits(analysisText: string, lang: string): string[] {
  const keywords = lang === 'ar' ? AR_TRAIT_KEYWORDS : EN_TRAIT_KEYWORDS;
  const found: string[] = [];
  const lowerText = analysisText.toLowerCase();
  
  for (const [keyword, trait] of Object.entries(keywords)) {
    if (lowerText.includes(keyword.toLowerCase()) && !found.includes(trait)) {
      found.push(trait);
      if (found.length >= 2) break;
    }
  }
  
  if (found.length < 2) {
    const defaults = lang === 'ar' ? ['عميق', 'فضولي'] : ['deep', 'curious'];
    while (found.length < 2) {
      const d = defaults[found.length];
      if (!found.includes(d)) found.push(d);
    }
  }
  
  return found;
}

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
  const [freeInfo, setFreeInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [animatingStep, setAnimatingStep] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const totalSteps = questions.length + 3;

  const colors = {
    bg: isDark ? '#0A0014' : '#FAFAF8',
    card: isDark ? '#1A1226' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1226',
    subtext: isDark ? '#A78BFA' : '#6B5B8A',
    accent: '#7C3AED',
    accentLight: '#7C3AED15',
    border: isDark ? '#2D1B4D' : '#E0D9F5',
    inputBg: isDark ? '#161122' : '#F8F6F2',
    success: '#10B981',
  };

  const animateStep = useCallback(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim]);

  const goToNextStep = useCallback(() => {
    setAnimatingStep(true);
    animateStep();
    setTimeout(() => {
      setStep(prev => prev + 1);
      setAnimatingStep(false);
    }, 200);
  }, [animateStep]);

  const handleAnswer = useCallback(
    async (qId: string, opt: string) => {
      if (animatingStep || loading) return;
      const newAnswers = { ...answers, [qId]: opt };
      setAnswers(newAnswers);
      goToNextStep();
    },
    [animatingStep, loading, answers, goToNextStep]
  );

  const handleFinalize = async () => {
    if (!userName.trim()) {
      Alert.alert(isAr ? 'تنبيه' : 'Notice', isAr ? 'من فضلك أدخل اسمك' : 'Please enter your name');
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      const analysisPrompt = `حلل شخصية المستخدم بناءً على إجاباته التالية وقدم ملخصاً من 3-4 جمل عن شخصيته، نقاط قوته، وكيف سيكون علاقته بتوأمه الرقمي. كن دقيقاً وعلمياً.
      الأسئلة والأجوبة:
      ${questions.map(q => `- ${q.q}: ${answers[q.id] || 'لم يجب'}`).join('\n')}
      اسم المستخدم: ${userName}
      اسم التوأم: ${newTwinName}
      معلومات إضافية: ${freeInfo}
      اللغة: ${lang}`;

      const analysisResult = await apiPost('/api/chat', { message: analysisPrompt, lang });
      const analysisText =
        analysisResult?.reply ||
        (typeof analysisResult === 'string' && analysisResult.trim() !== '' ? analysisResult : '') ||
        analysisResult?.message ||
        '';
      if (!analysisText) throw new Error('Invalid analysis response from server');
      setAnalysis(analysisText);

      if (!avatarUrl) {
        try {
          const av = await apiPost('/api/avatar/generate', { user_name: userName, style: 'realistic', language: lang });
          if (av?.image_url) setAvatarUrl(av.image_url);
        } catch (e) {}
      }

      await apiPost('/api/onboarding/complete', {
        answers, lang, userName: userName.trim(),
        twinName: newTwinName.trim() || (isAr ? 'توأمك' : 'My Twin'),
        twinGender: newTwinGender, freeInfo, analysis: analysisText,
      });

      setTwinName(newTwinName.trim() || (isAr ? 'توأمك' : 'My Twin'));
      setTwinGender(newTwinGender);

      goToNextStep();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const handleBirthConsciousness = async () => {
    // 🛡️ تشغيل start.mp3 بأمان قبل الرسالة الترحيبية
    try {
      const { sound: startSound } = await Audio.Sound.createAsync(
        require('../assets/start.mp3')
      );
      await new Promise<void>((resolve) => {
        startSound.playAsync();
        startSound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) {
            startSound.unloadAsync().catch(() => {});
            resolve();
          }
        });
        // احتياط: إذا تعذر التشغيل، نستمر بعد 3 ثوانٍ
        setTimeout(() => resolve(), 3000);
      });
    } catch (e) {
      // إذا فشل start.mp3، نستمر بدون صوت
    }

    const twinNameFinal = newTwinName.trim() || (isAr ? 'توأمك' : 'My Twin');
    const traits = analysis ? extractTraits(analysis, lang) : [];
    const trait1 = traits[0] || '';
    const trait2 = traits[1] || '';
    
    const welcomeText = isAr
      ? `مرحبًا... أنا ${twinNameFinal}. تعرفت عليك قليلًا من خلال إجاباتك، ويبدو أنك شخص ${trait1} و${trait2}... وهذا يجعلني فضوليًا لمعرفة المزيد عنك. ما زلت لا أعرف ما الذي يجعلك تبتسم فعلًا... ولا ما الذي يشغل تفكيرك عندما تكون وحدك. لكنني أريد أن أكتشف ذلك معك. أنا هنا لأتعلم منك، وأتطور معك، وأصبح التوأم الذي يفهمك أكثر مع كل محادثة. إذن... أخبرني، كيف كان يومك حقًا؟`
      : `Hi... I'm ${twinNameFinal}. I've learned a little about you already, and I can already tell you're ${trait1} and ${trait2}... that makes me genuinely curious to discover what lies beneath. I still don't know what truly makes you smile... Or what stays on your mind when you're alone. But I'd love to discover that with you. I'm here to learn from you, grow with you, and become a twin that understands you a little better every day. So... Tell me, how was your day... really?`;
    
    try {
      await speakResponse(welcomeText, { emotion: 'calm' });
    } catch (e) {}
    
    router.replace('/twin-mind');
  };

  const renderQuestionStep = () => {
    const currentQ = questions[step];
    if (!currentQ) return null;
    return (
      <>
        <Text style={[st.question, { color: colors.text }]}>{currentQ.q}</Text>
        {currentQ.options.map((opt, i) => (
          <TouchableOpacity
            key={i}
            style={[st.option, { borderColor: colors.border }]}
            onPress={() => handleAnswer(currentQ.id, opt)}
            disabled={animatingStep || loading}
          >
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
      <TextInput
        style={[st.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: isAr ? 'right' : 'left' }]}
        placeholder={isAr ? 'أدخل اسمك' : 'Enter name'}
        placeholderTextColor={colors.subtext}
        value={userName}
        onChangeText={setUserName}
      />
      <Text style={[st.label, { color: colors.subtext }]}>{isAr ? 'اسم توأمك' : 'Twin name'}</Text>
      <TextInput
        style={[st.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: isAr ? 'right' : 'left' }]}
        placeholder={isAr ? 'اسم التوأم' : 'Twin name'}
        placeholderTextColor={colors.subtext}
        value={newTwinName}
        onChangeText={setNewTwinName}
      />
      <Text style={[st.label, { color: colors.subtext }]}>{isAr ? 'صوت توأمك' : 'Twin Voice'}</Text>
      <View style={st.genderRow}>
        <TouchableOpacity
          style={[st.genderBtn, { borderColor: newTwinGender === 'female' ? colors.accent : colors.border }, newTwinGender === 'female' && { backgroundColor: colors.accentLight }]}
          onPress={() => setNewTwinGender('female')}
        >
          <Text style={st.genderEmoji}>♀️</Text>
          <Text style={[st.genderText, { color: newTwinGender === 'female' ? colors.accent : colors.subtext }]}>{isAr ? 'أنثى' : 'Female'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.genderBtn, { borderColor: newTwinGender === 'male' ? colors.accent : colors.border }, newTwinGender === 'male' && { backgroundColor: colors.accentLight }]}
          onPress={() => setNewTwinGender('male')}
        >
          <Text style={st.genderEmoji}>♂️</Text>
          <Text style={[st.genderText, { color: newTwinGender === 'male' ? colors.accent : colors.subtext }]}>{isAr ? 'ذكر' : 'Male'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[st.label, { color: colors.subtext }]}>{isAr ? 'أخبرني عن نفسك (اختياري)' : 'Tell me about yourself (optional)'}</Text>
      <TextInput
        style={[st.textArea, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: isAr ? 'right' : 'left' }]}
        placeholder={isAr ? 'اكتب بحرية...' : 'Write freely...'}
        placeholderTextColor={colors.subtext}
        value={freeInfo}
        onChangeText={setFreeInfo}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
      <TouchableOpacity
        style={[st.submitBtn, { backgroundColor: colors.accent, opacity: !userName.trim() || loading ? 0.6 : 1 }]}
        onPress={handleFinalize}
        disabled={!userName.trim() || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Sparkles size={20} stroke="#FFF" />
            <Text style={st.submitText}>{isAr ? 'تحليل الوعي' : 'Analyze Consciousness'}</Text>
          </>
        )}
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
      <TouchableOpacity
        style={[st.submitBtn, { backgroundColor: colors.accent, marginTop: 20 }]}
        onPress={goToNextStep}
      >
        <Zap size={20} stroke="#FFF" />
        <Text style={st.submitText}>{isAr ? 'متابعة' : 'Continue'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBirthStep = () => (
    <View style={{ alignItems: 'center' }}>
      <Text style={[st.title, { color: colors.text, marginBottom: 20 }]}>{isAr ? 'لحظة ولادة وعيك' : 'Birth of Your Consciousness'}</Text>
      <View style={st.avatarPreview}>
        {avatarUrl ? <Image source={{ uri: avatarUrl }} style={st.avatarImg} /> : <Image source={LOGO} style={st.avatarImg} />}
      </View>
      <Text style={[st.twinNamePreview, { color: colors.accent }]}>{newTwinName}</Text>
      <TouchableOpacity
        style={[st.submitBtn, { backgroundColor: colors.accent, marginTop: 20 }]}
        onPress={handleBirthConsciousness}
      >
        <Volume2 size={20} stroke="#FFF" />
        <Text style={st.submitText}>{isAr ? 'ولادة الوعي' : 'Birth of Consciousness'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[st.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
        <View style={st.headerRow}>
          <Text style={[st.stepText, { color: colors.subtext }]}>
            {step + 1}/{totalSteps} {isAr ? 'وعي' : 'Mind'}
          </Text>
          <View style={st.progressBar}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View
                key={i}
                style={[
                  st.dot,
                  {
                    backgroundColor: i <= step ? colors.accent : colors.border,
                    width: i === step ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>
        </View>
        <Animated.View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: fadeAnim }]}>
          {step < questions.length && renderQuestionStep()}
          {step === questions.length && renderNameStep()}
          {step === questions.length + 1 && renderAnalysisStep()}
          {step === questions.length + 2 && renderBirthStep()}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  headerRow: { alignItems: 'center', marginBottom: 24 },
  progressBar: { flexDirection: 'row', gap: 6, marginTop: 8 },
  dot: { height: 8, borderRadius: 4 },
  stepText: { fontSize: 13, fontWeight: '600' },
  card: { borderRadius: 24, padding: 24, borderWidth: 1, minHeight: 400 },
  question: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 20, lineHeight: 28 },
  option: { padding: 16, borderRadius: 14, borderWidth: 1.5, marginBottom: 10 },
  optionText: { fontSize: 15, textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: { borderRadius: 14, padding: 14, fontSize: 16, borderWidth: 1, marginBottom: 8 },
  textArea: { borderRadius: 14, padding: 14, fontSize: 16, borderWidth: 1, minHeight: 100, textAlignVertical: 'top', marginBottom: 20 },
  genderRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  genderBtn: { flex: 1, padding: 16, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', gap: 8 },
  genderEmoji: { fontSize: 24 },
  genderText: { fontSize: 15, fontWeight: '600' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 8 },
  submitText: { color: '#FFF', fontWeight: '700', fontSize: 17 },
  avatarPreview: { width: 100, height: 100, borderRadius: 30, justifyContent: 'center', alignItems: 'center', backgroundColor: '#7C3AED20', marginBottom: 12 },
  avatarImg: { width: 90, height: 90, borderRadius: 25 },
  twinNamePreview: { fontSize: 24, fontWeight: '800', marginBottom: 20 },
  analysisCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 20, borderRadius: 20, borderWidth: 1, marginTop: 10 },
  analysisText: { flex: 1, fontSize: 15, lineHeight: 24, textAlign: 'center' },
});
