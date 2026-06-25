import React, { useEffect, useRef } from 'react';
import { View, Image, Text, StyleSheet, Animated, Dimensions, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { useTwinStore } from '../store/useTwinStore';
import { Audio } from 'expo-av';
import { useFonts, Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { Tajawal_400Regular, Tajawal_500Medium } from '@expo-google-fonts/tajawal';

const SPLASH_BG = require('../assets/splash.png');
const LOGO = require('../assets/logo.png');
const { width, height } = Dimensions.get('window');

// ============================================================
// STARFIELD – نجوم خلفية متلألئة
// ============================================================
const StarField = () => {
  const stars = Array.from({ length: 40 }).map(() => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: 1.5 + Math.random() * 4,
    opacity: useRef(new Animated.Value(0.2 + Math.random() * 0.5)).current,
    duration: 1500 + Math.random() * 3500,
  }));

  useEffect(() => {
    stars.forEach(star => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(star.opacity, { toValue: 0.9, duration: star.duration, useNativeDriver: true }),
          Animated.timing(star.opacity, { toValue: 0.2, duration: star.duration, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  return (
    <>
      {stars.map((star, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute', left: star.x, top: star.y,
            width: star.size, height: star.size, borderRadius: star.size / 2,
            backgroundColor: i % 3 === 0 ? '#FBBF24' : i % 3 === 1 ? '#A855F7' : '#FFFFFF',
            opacity: star.opacity,
            shadowColor: i % 3 === 0 ? '#FBBF24' : '#A855F7',
            shadowRadius: 6, shadowOpacity: 0.8,
          }}
        />
      ))}
    </>
  );
};

// ============================================================
// COSMIC RAYS – أشعة ضوئية كونية
// ============================================================
const CosmicRays = () => {
  const rays = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i * 30) * (Math.PI / 180);
    const rayAnim = useRef(new Animated.Value(0)).current;
    const rayOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(rayAnim, { toValue: 1, duration: 3000 + i * 200, useNativeDriver: true }),
            Animated.timing(rayOpacity, { toValue: 0.4, duration: 1500, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(rayAnim, { toValue: 0, duration: 3000 + i * 200, useNativeDriver: true }),
            Animated.timing(rayOpacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
          ]),
        ])
      ).start();
    }, []);

    return (
      <Animated.View
        key={i}
        style={{
          position: 'absolute',
          width: 2,
          height: 200,
          backgroundColor: i % 2 === 0 ? '#A855F7' : '#FBBF24',
          opacity: rayOpacity,
          transform: [
            { rotate: `${angle}rad` },
            { scaleY: rayAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.8] }) },
          ],
          shadowColor: i % 2 === 0 ? '#A855F7' : '#FBBF24',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 12,
        }}
      />
    );
  });

  return <View style={styles.raysContainer}>{rays}</View>;
};

// ============================================================
// SPLASH SCREEN
// ============================================================
export default function Splash() {
  const [fontsLoaded] = useFonts({
    Orbitron_700Bold,
    Tajawal_400Regular,
    Tajawal_500Medium,
  });

  const logoScale = useRef(new Animated.Value(0.1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(50)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(30)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const byOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!fontsLoaded) return;

    // 🛡️ تشغيل الصوت بأمان
    try {
      Audio.Sound.createAsync(require('../assets/chime_start.mp3')).then(({ sound }) => {
        sound.playAsync().catch(() => {});
      }).catch(() => {});
    } catch (e) {}

    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(titleY, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
      Animated.spring(lineWidth, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(taglineY, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(byOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      try {
        const store = useTwinStore.getState();
        router.replace(store.userId ? '/twin-mind' : '/login');
      } catch (e) {
        router.replace('/login');
      }
    }, 6000);

    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={styles.container} />; // شاشة فارغة حتى تحميل الخطوط
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Image source={SPLASH_BG} style={styles.bgImage} resizeMode="cover" />
      <StarField />
      <CosmicRays />
      
      <View style={styles.content}>
        <Animated.View style={[styles.logoWrapper, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
          <View style={styles.logoGlow}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          </View>
        </Animated.View>
        
        {/* اسم التطبيق بخط Orbitron */}
        <Animated.Text style={[styles.appName, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}>
          My Twin
        </Animated.Text>
        
        <Animated.View style={[styles.goldLine, { transform: [{ scaleX: lineWidth }] }]} />
        
        {/* الجملة التسويقية بخط Tajawal */}
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity, transform: [{ translateY: taglineY }] }]}>
          Your Twin AI .. Always There
        </Animated.Text>
      </View>
      
      {/* التذييل مع اسم الشركة والملكية */}
      <Animated.View style={[styles.footer, { opacity: byOpacity }]}>
        <Text style={styles.by}>By SOULSYNC</Text>
        <Text style={styles.copy}>© 2026 Soul Sync Ltd.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0014', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  bgImage: { position: 'absolute', width, height },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  
  logoWrapper: { marginBottom: 30 },
  logoGlow: { 
    shadowColor: '#A855F7', 
    shadowOffset: { width: 0, height: 0 }, 
    shadowOpacity: 0.9, 
    shadowRadius: 35, 
    elevation: 30,
  },
  logo: { width: 190, height: 190, borderRadius: 34 }, // تم تكبير الحجم
  
  appName: { 
    fontSize: 52, 
    letterSpacing: 3, 
    color: '#FFFFFF', 
    textShadowColor: 'rgba(168, 85, 247, 0.8)', 
    textShadowOffset: { width: 0, height: 0 }, 
    textShadowRadius: 30, 
    marginBottom: 16,
    fontFamily: 'Orbitron_700Bold', // خط كوني احترافي
  },
  goldLine: { width: 80, height: 3, backgroundColor: '#FBBF24', borderRadius: 2, marginBottom: 18 },
  tagline: { 
    fontSize: 17, 
    letterSpacing: 2.5, 
    textAlign: 'center', 
    paddingHorizontal: 45, 
    color: 'rgba(255, 255, 255, 0.9)', 
    marginBottom: 50,
    fontFamily: 'Tajawal_400Regular', // خط عربي أنيق
  },
  
  footer: { position: 'absolute', bottom: 70, alignItems: 'center', zIndex: 10 },
  by: { 
    fontSize: 18, 
    letterSpacing: 6, 
    color: '#FBBF24', 
    textTransform: 'uppercase', 
    marginBottom: 12,
    fontFamily: 'Tajawal_500Medium',
  },
  copy: { 
    fontSize: 13, 
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Tajawal_400Regular',
  },
  
  raysContainer: { 
    position: 'absolute', 
    top: height / 2 - 100, 
    left: width / 2, 
    justifyContent: 'center', 
    alignItems: 'center',
    zIndex: 1,
  },
});
