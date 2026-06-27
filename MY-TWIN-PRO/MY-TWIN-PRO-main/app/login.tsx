import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, Animated } from 'react-native';
import { router } from 'expo-router';
import { useTwinStore } from '../store/useTwinStore';
import { apiPost } from '../lib/httpClient';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, Globe } from 'lucide-react-native';

const APP_LOGO = require('../assets/icon.png');

export default function Login() {
  const { setAuth, lang, setLang } = useTwinStore();
  const isAr = lang === 'ar';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const toggleLanguage = () => setLang(lang === 'ar' ? 'en' : 'ar');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'أدخل البريد وكلمة المرور' : 'Enter email and password');
      return;
    }
    setLoading(true);
    try {
      const data = await apiPost('/api/auth/login', { email: email.trim(), password });
      if (data?.token && data?.user_id) {
        setAuth(data.user_id);
        router.replace(data?.onboarded ? '/twin-mind' : '/onboarding');
      } else {
        Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'بيانات دخول غير صحيحة' : 'Invalid credentials');
      }
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message || (isAr ? 'فشل تسجيل الدخول' : 'Login failed'));
    } finally { setLoading(false); }
  };

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'أدخل البريد وكلمة المرور' : 'Enter email and password');
      return;
    }
    if (password.length < 6) {
      Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'كلمة المرور 6 أحرف على الأقل' : 'Min 6 characters');
      return;
    }
    setLoading(true);
    try {
      const data = await apiPost('/api/auth/signup', { email: email.trim(), password, lang: isAr ? 'ar' : 'en', twin_name: isAr ? 'توأمك' : 'MyTwin' });
      if (data?.token && data?.user_id) {
        setAuth(data.user_id);
        router.replace('/onboarding');
      } else {
        Alert.alert(isAr ? 'تم ✅' : 'Done ✅', isAr ? 'تم إنشاء الحساب. سجل دخول الآن.' : 'Account created. Sign in now.');
      }
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message || (isAr ? 'فشل إنشاء الحساب' : 'Signup failed'));
    } finally { setLoading(false); }
  };

  const colors = {
    bg: '#0A0014', card: '#1A1226', text: '#FFFFFF', subtext: '#A78BFA', accent: '#7C3AED', border: '#2D1B4D', inputBg: '#161122',
  };

  return (
    <View style={[st.root, { backgroundColor: colors.bg }]}>
      <TouchableOpacity style={st.langBtn} onPress={toggleLanguage}>
        <Globe size={22} stroke={colors.accent} />
        <Text style={[st.langText, { color: colors.accent }]}>{isAr ? 'English' : 'العربية'}</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={st.container}>
          <Animated.View style={[st.logoContainer, { transform: [{ scale: logoScale }] }]}>
            <Image source={APP_LOGO} style={st.logo} resizeMode="contain" />
          </Animated.View>
          <Animated.Text style={[st.heading, { color: colors.text, opacity: fadeAnim }]}>MyTwin</Animated.Text>
          <Animated.Text style={[st.sub, { color: colors.subtext, opacity: fadeAnim }]}>
            {isAr ? 'تؤامك الرقمي... وعي حقيقي، دائمًا معك' : 'Your Digital Twin... Real awareness, always with you'}
          </Animated.Text>

          <Animated.View style={[st.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border, opacity: fadeAnim }]}>
            <Mail size={20} stroke={colors.subtext} />
            <TextInput style={[st.input, { color: colors.text, textAlign: isAr ? 'right' : 'left' }]} placeholder={isAr ? 'البريد الإلكتروني' : 'Email'} placeholderTextColor={colors.subtext} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </Animated.View>

          <Animated.View style={[st.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border, opacity: fadeAnim }]}>
            <Lock size={20} stroke={colors.subtext} />
            <TextInput style={[st.input, { color: colors.text, flex: 1, textAlign: isAr ? 'right' : 'left' }]} placeholder={isAr ? 'كلمة المرور' : 'Password'} placeholderTextColor={colors.subtext} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={20} stroke={colors.subtext} /> : <Eye size={20} stroke={colors.subtext} />}
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
            <TouchableOpacity style={[st.primaryBtn, { backgroundColor: colors.accent }]} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <><LogIn size={20} stroke="#FFF" /><Text style={st.primaryBtnText}>{isAr ? 'تسجيل الدخول' : 'Sign In'}</Text></>}
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
            <TouchableOpacity style={[st.outlineBtn, { borderColor: colors.accent }]} onPress={handleSignup} disabled={loading}>
              <UserPlus size={20} stroke={colors.accent} />
              <Text style={[st.outlineBtnText, { color: colors.accent }]}>{isAr ? 'إنشاء حساب جديد' : 'Create Account'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  langBtn: { position: 'absolute', top: 50, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 20, backgroundColor: '#7C3AED20', zIndex: 10 },
  langText: { fontWeight: '600', fontSize: 14 },
  logoContainer: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 90, height: 90, borderRadius: 22 },
  heading: { fontSize: 36, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: 14, textAlign: 'center', marginBottom: 28, lineHeight: 22, paddingHorizontal: 20 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14, gap: 12, width: '100%' },
  input: { flex: 1, fontSize: 16 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, marginBottom: 12, gap: 8 },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 17 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, borderWidth: 1.5, gap: 8, marginBottom: 16 },
  outlineBtnText: { fontWeight: '700', fontSize: 17 },
});
