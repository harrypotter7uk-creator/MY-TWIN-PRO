import React from "react";
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  Image, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { useTwinStore } from '../store/useTwinStore';
import { useTheme } from '../utils/theme';
import { apiPost } from '../lib/httpClient';
import {
  Mail, Lock, Eye, EyeOff, LogIn, UserPlus, Globe,
} from 'lucide-react-native';

const APP_LOGO = require('../assets/logo.png');

// ============================================================
// NEURON NETWORK – خلايا عصبية ذهبية لشاشة الدخول
// ============================================================
const NeuronNetwork = ({ isDark }: { isDark: boolean }) => {
  const neurons = useRef(
    Array.from({ length: 10 }).map(() => ({
      x: 10 + Math.random() * 80,
      y: 5 + Math.random() * 90,
      pulse: new Animated.Value(0.2 + Math.random() * 0.3),
      size: 3 + Math.random() * 4,
      delay: Math.random() * 2000,
    }))
  ).current;

  useEffect(() => {
    neurons.forEach(n => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(n.delay),
          Animated.timing(n.pulse, { toValue: 0.8, duration: 1800, useNativeDriver: true }),
          Animated.timing(n.pulse, { toValue: 0.2, duration: 1800, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  const lineColor = isDark ? 'rgba(251, 191, 36, 0.12)' : 'rgba(217, 119, 6, 0.15)';
  const nodeColor = isDark ? '#FBBF24' : '#D97706';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {neurons.map((n, i) => (
        <React.Fragment key={i}>
          {neurons.slice(i + 1).map((n2, j) => {
            const dx = n2.x - n.x;
            const dy = n2.y - n.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 30) return null;
            return (
              <View
                key={`${i}-${j}`}
                style={{
                  position: 'absolute',
                  left: `${n.x}%`,
                  top: `${n.y}%`,
                  width: `${dist}%`,
                  height: 1,
                  backgroundColor: lineColor,
                  transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                }}
              />
            );
          })}
          <Animated.View
            style={{
              position: 'absolute',
              left: `${n.x}%`,
              top: `${n.y}%`,
              width: n.size,
              height: n.size,
              borderRadius: n.size / 2,
              backgroundColor: nodeColor,
              opacity: n.pulse,
              shadowColor: '#FBBF24',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 4,
            }}
          />
        </React.Fragment>
      ))}
    </View>
  );
};

export default function Login() {
  const { setAuth, lang, setLang } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = useTheme().isDark;

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
      const data = await apiPost('/api/auth/signup', {
        email: email.trim(), password,
        lang: isAr ? 'ar' : 'en',
        twin_name: isAr ? 'توأمك' : 'MyTwin',
      });
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
    bg: isDark ? '#0A0014' : '#FAFAF8',
    card: isDark ? '#1A1226' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1226',
    subtext: isDark ? '#A78BFA' : '#6B5B8A',
    accent: '#7C3AED',
    accentLight: '#7C3AED15',
    border: isDark ? '#2D1B4D' : '#E0D9F5',
    inputBg: isDark ? '#161122' : '#F8F6F2',
  };

  return (
    <View style={[st.root, { backgroundColor: colors.bg }]}>
      {/* شبكة عصبية ذهبية */}
      <NeuronNetwork isDark={isDark} />

      {/* زر اللغة */}
      <TouchableOpacity style={st.langBtn} onPress={toggleLanguage}>
        <Globe size={22} stroke={colors.accent} />
        <Text style={[st.langText, { color: colors.accent }]}>
          {isAr ? 'English' : 'العربية'}
        </Text>
      </TouchableOpacity>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={st.container}>
          <Animated.View style={[st.logoContainer, { transform: [{ scale: logoScale }] }]}>
            <View style={st.logoGlow}>
              <Image source={APP_LOGO} style={st.logo} resizeMode="contain" />
            </View>
          </Animated.View>

          <Animated.Text style={[st.heading, { color: colors.text, opacity: fadeAnim }]}>
            My Twin
          </Animated.Text>

          <Animated.Text style={[st.tagline, { color: colors.subtext, opacity: fadeAnim }]}>
            {isAr ? 'توأمك الرقمي .. دائماً معك' : 'Your Twin AI .. Always There'}
          </Animated.Text>

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
  langBtn: { position: 'absolute', top: 50, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 20, backgroundColor: '#7C3AED15', zIndex: 10 },
  langText: { fontWeight: '600', fontSize: 14 },
  logoContainer: { alignItems: 'center', marginBottom: 20 },
  logoGlow: { shadowColor: '#A855F7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 },
  logo: { width: 130, height: 130, borderRadius: 34 },
  heading: { fontSize: 38, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  tagline: { fontSize: 15, textAlign: 'center', marginBottom: 28, lineHeight: 22, paddingHorizontal: 20 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14, gap: 12, width: '100%' },
  input: { flex: 1, fontSize: 16 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, marginBottom: 12, gap: 8 },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 17 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, borderWidth: 1.5, gap: 8, marginBottom: 16 },
  outlineBtnText: { fontWeight: '700', fontSize: 17 },
});
