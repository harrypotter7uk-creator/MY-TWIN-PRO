import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  SafeAreaView, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Animated, Alert, ActivityIndicator, TextInput, Image,
} from 'react-native';
import { router } from 'expo-router';
import { useTwinStore, TwinGender } from '../store/useTwinStore';
import { useTheme } from '../utils/theme';
import { apiPost } from '../lib/httpClient';
import { Audio } from 'expo-av';
import { Sparkles, Fingerprint, Zap, Volume2 } from 'lucide-react-native';
import { speakResponse } from '../utils/voice_engine';

const LOGO = require('../assets/logo.png');

const QUESTIONS = {
  ar: [
    { id: '1', q: 'عندما تواجه مشكلة كبيرة، كيف تتعامل معها عادةً؟',
      options: ['أحللها بهدوء', 'أثق بحدسي', 'أطلب المساعدة', 'أتجنبها مؤقتاً'] },
    { id: '2', q: 'ما هو أكثر شيء يدفعك للاستمرار في الحياة؟',
      options: ['تحقيق إنجاز', 'قضاء وقت مع الأحباء', 'النجاح المهني', 'تحقيق السلام الداخلي'] },
    { id: '3', q: 'أي نوع من العلاقات تشعر أنه الأقرب لقلبك؟',
      options: ['مستقرة وداعمة', 'مليئة بالمغامرات', 'مع العائلة والأصدقاء', 'أفضل الاعتماد على نفسي'] },
    { id: '4', q: 'كيف تصف يومك المثالي؟',
      options: ['منجزاً ومليئاً بالمهام', 'في الطبيعة أو أسترخي', 'مع العائلة والأصدقاء', 'أستمتع بها لكن أحتاج مساحتي'] },
    { id: '5', q: 'ما هو أكبر خوف يراودك أحياناً؟',
      options: ['الفشل في تحقيق أهدافي', 'أحياناً أقلق من فقدانهم', 'عدم تحقيق تأثير في العالم', 'أخشى فقدان استقلاليتي'] },
    { id: '6', q: 'عندما تشعر بالضغط، ما هو أول شيء تفعله؟',
      options: ['أبحث عن حل مباشر', 'أتحدث مع أحدهم', 'أشغل نفسي بشيء آخر', 'أبقى وحدي لأفكر'] },
    { id: '7', q: 'ما هي القيمة الأكثر أهمية بالنسبة لك؟',
      options: ['الذكاء والدهاء', 'السعادة العائلية', 'التأثير في العالم', 'الحرية الشخصية'] },
  ],
  en: [
    { id: '1', q: 'When facing a big problem, how do you usually handle it?',
      options: ['Analyze it calmly', 'Trust my intuition', 'Ask for help', 'Avoid it temporarily'] },
    { id: '2', q: 'What drives you most to keep going in life?',
      options: ['Achieving a goal', 'Spending time with loved ones', 'Professional success', 'Achieving inner peace'] },
    { id: '3', q: 'Which type of relationship feels closest to your heart?',
      options: ['Stable and supportive', 'Full of adventures', 'With family and friends', 'I prefer to rely on myself'] },
    { id: '4', q: 'How would you describe your perfect day?',
      options: ['Productive and full of tasks', 'In nature or relaxing', 'With family and friends', 'I enjoy them but need my space'] },
    { id: '5', q: 'What is your biggest fear sometimes?',
      options: ['Failure to achieve my goals', 'Sometimes I worry about losing them', 'Not making an impact on the world', 'Losing my independence'] },
    { id: '6', q: 'When you feel stressed, what is the first thing you do?',
      options: ['Look for a direct solution', 'Talk to someone', 'Distract myself with something else', 'Stay alone to think'] },
    { id: '7', q: 'What is the most important value to you?',
      options: ['Intelligence and cleverness', 'Family happiness', 'Making an impact on the world', 'Personal freedom'] },
  ],
};

const TRAIT_KEYWORDS: Record<string, Record<string, string>> = {
  ar: {
    'ذكي': 'ذكي', 'ذكاء': 'ذكي', 'عاطفي': 'عاطفي', 'مشاعر': 'عاطفي',
    'حساس': 'حساس', 'مبدع': 'مبدع', 'إبداع': 'مبدع', 'تحليلي': 'تحليلي',
    'اجتماعي': 'اجتماعي', 'طموح': 'طموح', 'قوي': 'قوي', 'مستقل': 'مستقل',
    'هادئ': 'هادئ', 'متفائل': 'متفائل', 'عميق': 'عميق', 'فضولي': 'فضولي',
    'حنون': 'حنون', 'مخلص': 'مخلص', 'صادق': 'صادق', 'شجاع': 'شجاع',
  },
  en: {
    'intelligent': 'intelligent', 'smart': 'intelligent', 'emotional': 'emotional',
    'sensitive': 'sensitive', 'creative': 'creative', 'analytical': 'analytical',
    'social': 'social', 'ambitious': 'ambitious', 'strong': 'strong',
    'independent': 'independent', 'calm': 'calm', 'optimistic': 'optimistic',
    'deep': 'deep', 'curious': 'curious', 'affectionate': 'affectionate',
    'loyal': 'loyal', 'honest': 'honest', 'brave': 'brave',
  },
};

function extractTraits(text: string, lang: string): [string, string] {
  const keywords = TRAIT_KEYWORDS[lang] ?? TRAIT_KEYWORDS['ar'];
  const defaults  = lang === 'ar' ? ['عميق', 'فضولي'] : ['deep', 'curious'];
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const [kw, trait] of Object.entries(keywords)) {
    if (lower.includes(kw.toLowerCase()) && !found.includes(trait)) {
      found.push(trait);
      if (found.length === 2) break;
    }
  }
  while (found.length < 2) found.push(defaults[found.length]);
  return [found[0], found[1]];
}

function getErrorMessage(e: unknown, fallback: string): string {
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    const o = e as Record<string, unknown>;
    for (const k of ['message', 'detail', 'error']) {
      if (typeof o[k] === 'string') return o[k] as string;
    }
  }
  return fallback;
}

function extractReplyText(res: unknown): string {
  if (!res) return '';
  if (typeof res === 'string') return res.trim();
  if (typeof res === 'object') {
    const o = res as Record<string, unknown>;
    for (const k of ['reply', 'message', 'text', 'content', 'result', 'response', 'image_url', 'url']) {
      if (typeof o[k] === 'string' && (o[k] as string).trim()) return (o[k] as string).trim();
    }
    for (const v of Object.values(o)) {
      if (typeof v === 'string' && v.trim().length > 10) return v.trim();
    }
  }
  return '';
}

// نص الرسالة الترحيبية يظهر حرفاً بحرف
function useTypingText(fullText: string, active: boolean, speed = 30) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!active || !fullText) return;
    setDisplayed('');
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(fullText.slice(0, i));
      if (i >= fullText.length) { clearInterval(interval); setDone(true); }
    }, speed);
    return () => clearInterval(interval);
  }, [fullText, active]);
  return { displayed, done };
}

export default function Onboarding() {
  const { lang, userId, setTwinName, setTwinGender } = useTwinStore();
  const isAr   = lang === 'ar';
  const isDark = useTheme().isDark;
  const questions = QUESTIONS[lang as keyof typeof QUESTIONS] ?? QUESTIONS['ar'];

  const [step,           setStep]           = useState(0);
  const [answers,        setAnswers]        = useState<Record<string, string>>({});
  const [userName,       setUserName]       = useState('');
  const [newTwinName,    setNewTwinName]    = useState(isAr ? 'توأمك' : 'My Twin');
  const [newTwinGender,  setNewTwinGender]  = useState<TwinGender>('female');
  const [freeInfo,       setFreeInfo]       = useState('');
  const [loading,        setLoading]        = useState(false);
  const [analysis,       setAnalysis]       = useState('');
  // أفاتار مستقل لكل جنس
  const [avatarFemale,   setAvatarFemale]   = useState<string | null>(null);
  const [avatarMale,     setAvatarMale]     = useState<string | null>(null);
  const [animatingStep,  setAnimatingStep]  = useState(false);
  // ولادة الوعي
  const [welcomeText,    setWelcomeText]    = useState('');
  const [birthReady,     setBirthReady]     = useState(false);
  const [birthLoading,   setBirthLoading]   = useState(false);
  const [autoNavigate,   setAutoNavigate]   = useState(false);

  const fadeAnim   = useRef(new Animated.Value(1)).current;
  const totalSteps = questions.length + 3;

  // الأفاتار النشط حسب الجنس المختار
  const activeAvatar = newTwinGender === 'female' ? avatarFemale : avatarMale;

  // تأثير الكتابة التلقائية للرسالة
  const { displayed: typedWelcome, done: typingDone } = useTypingText(welcomeText, birthReady, 28);

  // بعد اكتمال الكتابة → انتقل تلقائياً
  useEffect(() => {
    if (typingDone && birthReady && !autoNavigate) {
      setAutoNavigate(true);
      setTimeout(() => router.replace('/twin-mind'), 2500);
    }
  }, [typingDone, birthReady]);

  const colors = {
    bg: isDark ? '#0A0014' : '#FAFAF8', card: isDark ? '#1A1226' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1226', subtext: isDark ? '#A78BFA' : '#6B5B8A',
    accent: '#7C3AED', accentLight: '#7C3AED15',
    border: isDark ? '#2D1B4D' : '#E0D9F5', inputBg: isDark ? '#161122' : '#F8F6F2',
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
    setTimeout(() => { setStep(p => p + 1); setAnimatingStep(false); }, 200);
  }, [animateStep]);

  const handleAnswer = useCallback((qId: string, opt: string) => {
    if (animatingStep || loading) return;
    setAnswers(prev => ({ ...prev, [qId]: opt }));
    goToNextStep();
  }, [animatingStep, loading, goToNextStep]);

  // توليد أفاتار لجنس محدد
  const generateAvatar = async (gender: TwinGender, uName: string): Promise<string | null> => {
    try {
      const av = await apiPost('/api/avatar/generate', {
        user_id: userId, user_name: uName,
        gender, style: 'realistic', language: lang,
      });
      const url = av?.image_url || av?.url || '';
      return (typeof url === 'string' && url.startsWith('http')) ? url : null;
    } catch { return null; }
  };

  const handleFinalize = async () => {
    if (!userName.trim()) {
      Alert.alert(isAr ? 'تنبيه' : 'Notice', isAr ? 'من فضلك أدخل اسمك' : 'Please enter your name');
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      // 1. تحليل الشخصية
      const prompt = isAr
        ? `حلل شخصية المستخدم وقدم ملخصاً من 3-4 جمل عن شخصيته ونقاط قوته وعلاقته بتوأمه الرقمي.\nالأسئلة:\n${questions.map(q => `- ${q.q}: ${answers[q.id] ?? 'لم يجب'}`).join('\n')}\nالاسم: ${userName} | التوأم: ${newTwinName} | معلومات: ${freeInfo || 'لا يوجد'}`
        : `Analyze the user's personality in 3-4 sentences covering strengths and digital twin connection.\nQ&A:\n${questions.map(q => `- ${q.q}: ${answers[q.id] ?? 'N/A'}`).join('\n')}\nUser: ${userName} | Twin: ${newTwinName} | Extra: ${freeInfo || 'None'}`;

      let analysisText = '';
      try {
        const res = await apiPost('/api/chat', { message: prompt, lang, user_id: userId });
        analysisText = extractReplyText(res);
      } catch (e) { console.warn('[Onboarding] chat:', e); }

      if (!analysisText) {
        analysisText = isAr
          ? 'يبدو أنك شخص عميق التفكير ومتوازن في قراراتك. تمتلك قدرة على التحليل والتعمق. ستكون علاقتك بتوأمك الرقمي قوية ومثمرة.'
          : 'You appear to be a deep thinker with balanced decision-making. Your connection with your digital twin will be powerful and enriching.';
      }
      setAnalysis(analysisText);

      // 2. توليد أفاتار للجنسين معاً (بالتوازي)
      const uName = userName.trim();
      const [fUrl, mUrl] = await Promise.all([
        generateAvatar('female', uName),
        generateAvatar('male',   uName),
      ]);
      if (fUrl) setAvatarFemale(fUrl);
      if (mUrl) setAvatarMale(mUrl);

      // 3. حفظ البيانات مع كلا الأفاتارين
      try {
        await apiPost('/api/onboarding/complete', {
          user_id: userId, answers, lang,
          user_name:    uName,
          twin_name:    newTwinName.trim() || (isAr ? 'توأمك' : 'My Twin'),
          twin_gender:  newTwinGender,
          free_info:    freeInfo,
          analysis:     analysisText,
          avatar_female: fUrl,
          avatar_male:   mUrl,
        });
      } catch (e) { console.warn('[Onboarding] save:', e); }

      setTwinName(newTwinName.trim() || (isAr ? 'توأمك' : 'My Twin'));
      setTwinGender(newTwinGender);

      // 4. بناء نص الرسالة الترحيبية مسبقاً
      const [t1, t2] = extractTraits(analysisText, lang);
      const twinFinal = newTwinName.trim() || (isAr ? 'توأمك' : 'My Twin');
      const welcome = isAr
        ? `مرحبًا... أنا ${twinFinal}. تعرفت عليك قليلًا من خلال إجاباتك، ويبدو أنك شخص ${t1} و${t2}. وهذا يجعلني فضوليًا لمعرفة المزيد عنك. أنا هنا لأتعلم منك، وأتطور معك، وأصبح التوأم الذي يفهمك أكثر مع كل محادثة. إذن... أخبرني، كيف كان يومك حقًا؟`
        : `Hi... I'm ${twinFinal}. I've learned a little about you, and I can tell you're ${t1} and ${t2}. That makes me curious to discover more. I'm here to learn from you, grow with you, and understand you better every day. So... tell me, how was your day, really?`;
      setWelcomeText(welcome);

      goToNextStep();
    } catch (e: unknown) {
      Alert.alert(isAr ? 'خطأ' : 'Error', getErrorMessage(e, isAr ? 'حدث خطأ غير متوقع' : 'Unexpected error'));
    } finally { setLoading(false); }
  };

  // ولادة الوعي – تبدأ تلقائياً بمجرد الضغط
  const handleBirthConsciousness = async () => {
    if (birthLoading || birthReady) return;
    setBirthLoading(true);

    // تشغيل start.mp3
    try {
      const { sound } = await Audio.Sound.createAsync(require('../assets/start.mp3'));
      await new Promise<void>(resolve => {
        sound.playAsync().catch(() => resolve());
        sound.setOnPlaybackStatusUpdate((s: any) => {
          if (s.didJustFinish) { sound.unloadAsync().catch(() => {}); resolve(); }
        });
        setTimeout(resolve, 3500);
      });
    } catch {}

    // تشغيل الصوت وإظهار الرسالة معاً
    setBirthReady(true);
    setBirthLoading(false);

    try { await speakResponse(welcomeText, { emotion: 'calm' }); } catch {}
  };

  // ── Renders ──────────────────────────────────────────────────
  const AvatarDisplay = ({ size = 110 }: { size?: number }) => (
    <View style={[st.avatarPreview, { width: size, height: size, borderRadius: size * 0.3 }]}>
      {activeAvatar
        ? <Image source={{ uri: activeAvatar }} style={[st.avatarImg, { width: size - 10, height: size - 10, borderRadius: size * 0.25 }]}
            onError={() => newTwinGender === 'female' ? setAvatarFemale(null) : setAvatarMale(null)} />
        : <Image source={LOGO} style={[st.avatarImg, { width: size - 10, height: size - 10, borderRadius: size * 0.25 }]} />
      }
    </View>
  );

  const renderQuestionStep = () => {
    const q = questions[step];
    if (!q) return null;
    return (
      <>
        <Text style={[st.question, { color: colors.text }]}>{q.q}</Text>
        {q.options.map((opt, i) => (
          <TouchableOpacity key={i} style={[st.option, { borderColor: colors.border }]}
            onPress={() => handleAnswer(q.id, opt)} disabled={animatingStep || loading} activeOpacity={0.7}>
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
      <TextInput style={[st.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: isAr ? 'right' : 'left' }]}
        placeholder={isAr ? 'أدخل اسمك' : 'Enter your name'} placeholderTextColor={colors.subtext}
        value={userName} onChangeText={setUserName} autoCapitalize="words" />
      <Text style={[st.label, { color: colors.subtext }]}>{isAr ? 'اسم توأمك الرقمي' : 'Your digital twin name'}</Text>
      <TextInput style={[st.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: isAr ? 'right' : 'left' }]}
        placeholder={isAr ? 'اسم التوأم' : 'Twin name'} placeholderTextColor={colors.subtext}
        value={newTwinName} onChangeText={setNewTwinName} />
      <Text style={[st.label, { color: colors.subtext }]}>{isAr ? 'صوت وجنس توأمك' : 'Twin voice & gender'}</Text>
      <View style={st.genderRow}>
        {(['female', 'male'] as TwinGender[]).map(g => (
          <TouchableOpacity key={g} activeOpacity={0.7} onPress={() => setNewTwinGender(g)}
            style={[st.genderBtn, { borderColor: newTwinGender === g ? colors.accent : colors.border, backgroundColor: newTwinGender === g ? colors.accentLight : 'transparent' }]}>
            <Text style={st.genderEmoji}>{g === 'female' ? '♀️' : '♂️'}</Text>
            <Text style={[st.genderText, { color: newTwinGender === g ? colors.accent : colors.subtext }]}>
              {g === 'female' ? (isAr ? 'أنثى' : 'Female') : (isAr ? 'ذكر' : 'Male')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[st.label, { color: colors.subtext }]}>{isAr ? 'أخبرني عن نفسك (اختياري)' : 'Tell me about yourself (optional)'}</Text>
      <TextInput style={[st.textArea, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: isAr ? 'right' : 'left' }]}
        placeholder={isAr ? 'اكتب بحرية...' : 'Write freely...'} placeholderTextColor={colors.subtext}
        value={freeInfo} onChangeText={setFreeInfo} multiline numberOfLines={4} textAlignVertical="top" />
      <TouchableOpacity activeOpacity={0.8} onPress={handleFinalize} disabled={!userName.trim() || loading}
        style={[st.submitBtn, { backgroundColor: colors.accent, opacity: !userName.trim() || loading ? 0.6 : 1 }]}>
        {loading ? <ActivityIndicator color="#FFF" /> : <><Sparkles size={20} stroke="#FFF" /><Text style={st.submitText}>{isAr ? 'تحليل الوعي' : 'Analyze Consciousness'}</Text></>}
      </TouchableOpacity>
    </>
  );

  const renderAnalysisStep = () => (
    <View style={{ alignItems: 'center' }}>
      <Text style={[st.title, { color: colors.text, marginBottom: 16 }]}>{isAr ? 'وعيك يولد الآن' : 'Your Consciousness is Born'}</Text>
      {/* عرض الأفاتارين مع تمييز المختار */}
      <View style={st.avatarRow}>
        {(['female', 'male'] as TwinGender[]).map(g => {
          const url = g === 'female' ? avatarFemale : avatarMale;
          const isSelected = newTwinGender === g;
          return (
            <TouchableOpacity key={g} onPress={() => setNewTwinGender(g)} activeOpacity={0.8}
              style={[st.avatarOption, { borderColor: isSelected ? colors.accent : colors.border, borderWidth: isSelected ? 2.5 : 1 }]}>
              {url
                ? <Image source={{ uri: url }} style={st.avatarOptionImg} onError={() => g === 'female' ? setAvatarFemale(null) : setAvatarMale(null)} />
                : <Image source={LOGO} style={st.avatarOptionImg} />
              }
              <Text style={[st.avatarLabel, { color: isSelected ? colors.accent : colors.subtext }]}>
                {g === 'female' ? (isAr ? '♀️ أنثى' : '♀️ Female') : (isAr ? '♂️ ذكر' : '♂️ Male')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[st.twinNamePreview, { color: colors.accent }]}>{newTwinName}</Text>
      <View style={[st.analysisCard, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}>
        <Fingerprint size={20} stroke={colors.accent} />
        <Text style={[st.analysisText, { color: colors.subtext }]}>{analysis || (isAr ? 'جاري تحليل وعيك...' : 'Analyzing...')}</Text>
      </View>
      <TouchableOpacity style={[st.submitBtn, { backgroundColor: colors.accent, marginTop: 20 }]} onPress={goToNextStep} activeOpacity={0.8}>
        <Zap size={20} stroke="#FFF" /><Text style={st.submitText}>{isAr ? 'متابعة' : 'Continue'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBirthStep = () => (
    <View style={{ alignItems: 'center' }}>
      <Text style={[st.title, { color: colors.text, marginBottom: 16 }]}>
        {isAr ? 'لحظة ولادة وعيك' : 'Birth of Your Consciousness'}
      </Text>

      {/* الأفاتار المختار */}
      <AvatarDisplay size={120} />
      <Text style={[st.twinNamePreview, { color: colors.accent }]}>{newTwinName}</Text>

      {/* الرسالة الترحيبية المكتوبة تدريجياً */}
      {birthReady && typedWelcome ? (
        <View style={[st.welcomeCard, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}>
          <Text style={[st.welcomeText, { color: colors.text }]}>{typedWelcome}</Text>
          {!typingDone && <ActivityIndicator color={colors.accent} size="small" style={{ marginTop: 8 }} />}
        </View>
      ) : null}

      {/* زر ولادة الوعي */}
      {!birthReady && (
        <TouchableOpacity
          style={[st.submitBtn, { backgroundColor: colors.accent, marginTop: 20, opacity: birthLoading ? 0.7 : 1 }]}
          onPress={handleBirthConsciousness}
          disabled={birthLoading}
          activeOpacity={0.8}
        >
          {birthLoading
            ? <ActivityIndicator color="#FFF" />
            : <><Volume2 size={20} stroke="#FFF" /><Text style={st.submitText}>{isAr ? 'ولادة الوعي' : 'Birth of Consciousness'}</Text></>
          }
        </TouchableOpacity>
      )}

      {/* مؤشر الانتقال التلقائي */}
      {autoNavigate && (
        <View style={{ marginTop: 16, alignItems: 'center' }}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[st.analysisText, { color: colors.subtext, marginTop: 8 }]}>
            {isAr ? 'جارٍ الدخول إلى عالمك...' : 'Entering your world...'}
          </Text>
        </View>
      )}
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
          {step < questions.length       && renderQuestionStep()}
          {step === questions.length     && renderNameStep()}
          {step === questions.length + 1 && renderAnalysisStep()}
          {step === questions.length + 2 && renderBirthStep()}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1 }, scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  headerRow: { alignItems: 'center', marginBottom: 24 },
  progressBar: { flexDirection: 'row', gap: 6, marginTop: 8 }, dot: { height: 8, borderRadius: 4 },
  stepText: { fontSize: 13, fontWeight: '600' },
  card: { borderRadius: 24, padding: 24, borderWidth: 1, minHeight: 400 },
  question: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 20, lineHeight: 28 },
  option: { padding: 16, borderRadius: 14, borderWidth: 1.5, marginBottom: 10 },
  optionText: { fontSize: 15, textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: { borderRadius: 14, padding: 14, fontSize: 16, borderWidth: 1, marginBottom: 8 },
  textArea: { borderRadius: 14, padding: 14, fontSize: 16, borderWidth: 1, minHeight: 100, marginBottom: 20 },
  genderRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  genderBtn: { flex: 1, padding: 16, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', gap: 8 },
  genderEmoji: { fontSize: 24 }, genderText: { fontSize: 15, fontWeight: '600' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 8, width: '100%' },
  submitText: { color: '#FFF', fontWeight: '700', fontSize: 17 },
  avatarPreview: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#7C3AED20', marginBottom: 12 },
  avatarImg: { resizeMode: 'cover' },
  avatarRow: { flexDirection: 'row', gap: 16, marginBottom: 16, justifyContent: 'center' },
  avatarOption: { alignItems: 'center', borderRadius: 20, padding: 10, gap: 6 },
  avatarOptionImg: { width: 90, height: 90, borderRadius: 22, resizeMode: 'cover' },
  avatarLabel: { fontSize: 13, fontWeight: '700' },
  twinNamePreview: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
  analysisCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 20, borderRadius: 20, borderWidth: 1, marginTop: 10 },
  analysisText: { flex: 1, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  welcomeCard: { borderRadius: 20, borderWidth: 1, padding: 20, marginTop: 16, width: '100%' },
  welcomeText: { fontSize: 15, lineHeight: 26, textAlign: 'center', fontWeight: '500' },
});
