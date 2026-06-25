import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  Image, Animated, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useTwinStore } from '../store/useTwinStore';
import { useTheme } from '../utils/theme';
import { apiPost } from '../lib/httpClient';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as LocalAuthentication from 'expo-local-authentication';
import { Audio } from 'expo-av';
import {
  Mail, Lock, Eye, EyeOff, LogIn, UserPlus, ArrowLeft,
  Sparkles, Chrome, Fingerprint, Shield,
} from 'lucide-react-native';

WebBrowser.maybeCompleteAuthSession();

const APP_LOGO = require('../assets/icon.png');
const { width } = Dimensions.get('window');

// ثوابت Google – استبدلها بقيمك الحقيقية عند النشر
const GOOGLE_ANDROID_ID = '';
const GOOGLE_IOS_ID = '';
const GOOGLE_WEB_ID = '';

export default function Login() {
  const { setAuth, clearHistory, lang } = useTwinStore();
  const isDark = useTheme().isDark;
  const isAr = lang === 'ar';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const particle1 = useRef(new Animated.Value(0)).current;
  const particle2 = useRef(new Animated.Value(0)).current;

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_ANDROID_ID,
    iosClientId: GOOGLE_IOS_ID,
    webClientId: GOOGLE_WEB_ID || GOOGLE_ANDROID_ID,
  });

  useEffect(() => {
    // تأثيرات الدخول
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(particle1, { toValue: 1, duration: 3000, useNativeDriver: true }),
          Animated.timing(particle1, { toValue: 0, duration: 3000, useNativeDriver: true }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(particle2, { toValue: 1, duration: 4000, useNativeDriver: true }),
          Animated.timing(particle2, { toValue: 0, duration: 4000, useNativeDriver: true }),
        ])
      ),
    ]).start();

    // تشغيل صوت البداية الكوني
    try {
      Audio.Sound.createAsync(require('../assets/chime_start.mp3')).then(({ sound }) => {
        sound.playAsync();
      });
    } catch {}

    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (compatible) {
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (enrolled) {
          setIsBiometricSupported(true);
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('Face ID');
          } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricType('Touch ID');
          } else {
            setBiometricType('Biometric');
          }
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      handleGoogleLogin(response.authentication.accessToken);
    }
  }, [response]);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleGoogleLogin = async (accessToken: string) => {
    setLoading(true);
    try {
      const data = await apiPost('/api/auth/google', { access_token: accessToken, lang: isAr ? 'ar' : 'en' });
      if (data?.token && data?.user_id) {
        await onLoginSuccess(data);
      } else {
        throw new Error('Invalid response');
      }
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message || (isAr ? 'فشل تسجيل الدخول' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'أدخل البريد وكلمة المرور' : 'Enter email and password');
      return;
    }
    if (!validateEmail(email.trim())) {
      Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'بريد إلكتروني غير صالح' : 'Invalid email format');
      return;
    }
    setLoading(true);
    try {
      const data = await apiPost('/api/auth/login', { email: email.trim(), password });
      if (data?.token && data?.user_id) {
        await onLoginSuccess(data);
      } else {
        Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'بيانات دخول غير صحيحة' : 'Invalid credentials');
      }
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message || (isAr ? 'فشل تسجيل الدخول' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'أدخل البريد وكلمة المرور' : 'Enter email and password');
      return;
    }
    if (!validateEmail(email.trim())) {
      Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'بريد إلكتروني غير صالح' : 'Invalid email format');
      return;
    }
    if (password.length < 6) {
      Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'كلمة المرور 6 أحرف على الأقل' : 'Min 6 characters');
      return;
    }
    setLoading(true);
    try {
      const data = await apiPost('/api/auth/signup', {
        email: email.trim(),
        password,
        lang: isAr ? 'ar' : 'en',
        twin_name: isAr ? 'توأمك' : 'MyTwin',
      });
      if (data?.token && data?.user_id) {
        await onLoginSuccess(data);
      } else {
        Alert.alert(isAr ? 'تم ✅' : 'Done ✅', isAr ? 'تم إنشاء الحساب. سجل دخول الآن.' : 'Account created. Sign in now.');
      }
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message || (isAr ? 'فشل إنشاء الحساب' : 'Signup failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: isAr ? 'سجل دخولك بتوأمك' : 'Login to MyTwin',
        fallbackLabel: isAr ? 'استخدم كلمة المرور' : 'Use password',
        disableDeviceFallback: false,
      });
      if (result.success) {
        Alert.alert(
          isAr ? 'مطلوب' : 'Required',
          isAr
            ? `يرجى تسجيل الدخول مرة واحدة على الأقل لتفعيل ${biometricType}`
            : `Please sign in at least once to enable ${biometricType}`
        );
      }
    } catch {}
  };

  const onLoginSuccess = async (data: any) => {
    setAuth(data.user_id);
    clearHistory();

    try {
      const OneSignal = require('react-native-onesignal');
      const deviceState = await OneSignal.getDeviceState();
      if (deviceState?.userId) {
        await apiPost('/api/awareness/register-player', {
          user_id: data.user_id,
          player_id: deviceState.userId,
          platform: Platform.OS,
        });
      }
    } catch {}

    try {
      await apiPost('/api/awareness/digital-fingerprint', { user_id: data.user_id });
    } catch {}

    router.replace('/twin-mind');
  };

  const colors = {
    bg: isDark ? '#0A0014' : '#FAFAF8',
    text: isDark ? '#FFFFFF' : '#1A1226',
    subtext: isDark ? '#A78BFA' : '#6B5B8A',
    accent: '#7C3AED',
    accentLight: '#7C3AED20',
    border: isDark ? '#2D1B4D' : '#E0D9F5',
    inputBg: isDark ? '#1A1226' : '#F8F6F2',
    card: isDark ? '#1A1226' : '#FFFFFF',
    googleBg: isDark ? '#1C1C1E' : '#FFFFFF',
    googleText: isDark ? '#FFFFFF' : '#444444',
    glow: '#A855F7',
  };

  return (
    <View style={[st.root, { backgroundColor: colors.bg }]}>
      <Animated.View style={[st.particle, {
        top: '20%', left: '10%',
        opacity: particle1.interpolate({ inputRange: [0,1], outputRange: [0.1, 0.3] }),
        transform: [{ translateY: particle1.interpolate({ inputRange: [0,1], outputRange: [-20, 20] }) }],
        backgroundColor: colors.glow,
      }]} />
      <Animated.View style={[st.particle, {
        top: '60%', right: '15%',
        opacity: particle2.interpolate({ inputRange: [0,1], outputRange: [0.1, 0.25] }),
        transform: [{ translateX: particle2.interpolate({ inputRange: [0,1], outputRange: [-30, 30] }) }],
        backgroundColor: colors.accent,
      }]} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={st.container}>
          <TouchableOpacity style={st.backBtn} onPress={() => router.replace('/splash')}>
            <ArrowLeft size={24} stroke={colors.text} />
          </TouchableOpacity>

          <Animated.View style={[st.logoContainer, { transform: [{ scale: logoScale }] }]}>
            <Image source={APP_LOGO} style={st.logo} resizeMode="contain" />
            <View style={[st.logoGlow, { backgroundColor: colors.glow + '30' }]} />
          </Animated.View>

          <Animated.Text style={[st.heading, { color: colors.text, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            MyTwin
          </Animated.Text>
          <Animated.Text style={[st.sub, { color: colors.subtext, opacity: fadeAnim }]}>
            {isAr ? 'تؤامك الرقمي... وعي حقيقي، دائمًا معك' : 'Your Digital Twin... Real awareness, always with you'}
          </Animated.Text>

          {/* Google */}
          <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
            <TouchableOpacity
              style={[st.googleBtn, { backgroundColor: colors.googleBg, borderColor: colors.border }]}
              onPress={() => promptAsync()}
              disabled={!request || loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.googleText} />
              ) : (
                <>
                  <Chrome size={22} stroke="#4285F4" />
                  <Text style={[st.googleBtnText, { color: colors.googleText }]}>
                    {isAr ? 'تسجيل الدخول بحساب Google' : 'Sign in with Google'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* فاصل */}
          <Animated.View style={[st.divider, { opacity: fadeAnim }]}>
            <View style={[st.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[st.dividerText, { color: colors.subtext }]}>{isAr ? 'أو' : 'or'}</Text>
            <View style={[st.dividerLine, { backgroundColor: colors.border }]} />
          </Animated.View>

          {/* بريد */}
          <Animated.View style={[st.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border, opacity: fadeAnim }]}>
            <Mail size={20} stroke={colors.subtext} />
            <TextInput
              style={[st.input, { color: colors.text, textAlign: isAr ? 'right' : 'left' }]}
              placeholder={isAr ? 'البريد الإلكتروني' : 'Email'}
              placeholderTextColor={colors.subtext}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Animated.View>

          {/* كلمة مرور */}
          <Animated.View style={[st.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border, opacity: fadeAnim }]}>
            <Lock size={20} stroke={colors.subtext} />
            <TextInput
              style={[st.input, { color: colors.text, flex: 1, textAlign: isAr ? 'right' : 'left' }]}
              placeholder={isAr ? 'كلمة المرور' : 'Password'}
              placeholderTextColor={colors.subtext}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={20} stroke={colors.subtext} /> : <Eye size={20} stroke={colors.subtext} />}
            </TouchableOpacity>
          </Animated.View>

          {/* دخول */}
          <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
            <TouchableOpacity style={[st.primaryBtn, { backgroundColor: colors.accent }]} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <LogIn size={20} stroke="#FFF" />
                  <Text style={st.primaryBtnText}>{isAr ? 'تسجيل الدخول' : 'Sign In'}</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* تسجيل جديد */}
          <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
            <TouchableOpacity style={[st.outlineBtn, { borderColor: colors.accent }]} onPress={handleSignup} disabled={loading}>
              <UserPlus size={20} stroke={colors.accent} />
              <Text style={[st.outlineBtnText, { color: colors.accent }]}>{isAr ? 'إنشاء حساب جديد' : 'Create Account'}</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Biometric */}
          {isBiometricSupported && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <TouchableOpacity style={[st.biometricBtn, { borderColor: colors.border }]} onPress={handleBiometricLogin}>
                <Fingerprint size={20} stroke={colors.accent} />
                <Text style={[st.biometricBtnText, { color: colors.subtext }]}>
                  {isAr ? `تسجيل الدخول بـ ${biometricType}` : `Login with ${biometricType}`}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* أمان */}
          <Animated.View style={[st.securityBadge, { opacity: fadeAnim }]}>
            <Shield size={14} stroke={colors.subtext} />
            <Text style={[st.securityText, { color: colors.subtext }]}>
              {isAr ? 'محادثاتك محمية بتشفير كامل' : 'Your conversations are end-to-end encrypted'}
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  backBtn: { position: 'absolute', top: 50, left: 24, zIndex: 10, padding: 6 },
  logoContainer: { alignItems: 'center', marginBottom: 16, position: 'relative' },
  logo: { width: 90, height: 90, borderRadius: 22, zIndex: 2 },
  logoGlow: { position: 'absolute', width: 110, height: 110, borderRadius: 55, top: -10, left: -10, opacity: 0.5 },
  heading: { fontSize: 36, fontWeight: '800', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  sub: { fontSize: 14, textAlign: 'center', marginBottom: 28, lineHeight: 22, paddingHorizontal: 20 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 20, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  googleBtnText: { fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, width: '100%' },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 14, fontWeight: '600' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1,
    padding: 16, marginBottom: 14, gap: 12, width: '100%',
  },
  input: { flex: 1, fontSize: 16 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 16, marginBottom: 12, gap: 8,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 17 },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 16, borderWidth: 1.5, gap: 8, marginBottom: 16,
  },
  outlineBtnText: { fontWeight: '700', fontSize: 17 },
  biometricBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 12, borderRadius: 16, borderWidth: 1, gap: 8, marginBottom: 20,
  },
  biometricBtnText: { fontSize: 14, fontWeight: '500' },
  securityBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 12 },
  securityText: { fontSize: 11, fontWeight: '500' },
  particle: { position: 'absolute', width: 120, height: 120, borderRadius: 60, opacity: 0.2 },
});
