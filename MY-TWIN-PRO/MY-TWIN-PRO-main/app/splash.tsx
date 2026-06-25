import React, { useEffect, useRef } from 'react';
import { View, Image, Text, StyleSheet, Animated, Dimensions, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { useTwinStore } from '../store/useTwinStore';
import { Audio } from 'expo-av';

const SPLASH_BG = require('../assets/splash.png');
const LOGO = require('../assets/logo.png');
const { width, height } = Dimensions.get('window');

// ============================================================
// 1. NEURON NETWORK – خلايا عصبية كونية نابضة
// ============================================================
const NeuronNetwork = () => {
  const neurons = Array.from({ length: 15 }).map((_, i) => ({
    x: width * (0.2 + Math.random() * 0.6),
    y: height * (0.2 + Math.random() * 0.6),
    size: 4 + Math.random() * 6,
    pulse: useRef(new Animated.Value(0.3 + Math.random() * 0.4)).current,
    delay: Math.random() * 2000,
  }));

  useEffect(() => {
    neurons.forEach(n => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(n.delay),
          Animated.timing(n.pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(n.pulse, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      {neurons.map((n, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: n.x,
            top: n.y,
            width: n.size,
            height: n.size,
            borderRadius: n.size / 2,
            backgroundColor: i % 2 === 0 ? '#FBBF24' : '#A855F7',
            opacity: n.pulse,
            shadowColor: i % 2 === 0 ? '#FBBF24' : '#A855F7',
            shadowRadius: 10,
            shadowOpacity: 0.9,
          }}
        />
      ))}
    </View>
  );
};

// ============================================================
// 2. SPLASH SCREEN – الشاشة الرئيسية
// ============================================================
export default function Splash() {
  const logoScale = useRef(new Animated.Value(0.2)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const byOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 🛡️ تشغيل الصوت الكوني بأمان
    let soundObject: any = null;
    try {
      Audio.Sound.createAsync(require('../assets/chime_start.mp3')).then(({ sound }) => {
        soundObject = sound;
        sound.playAsync().catch(() => {});
      }).catch(() => {});
    } catch (e) {}

    // تسلسل الحركات الكونية
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
      Animated.timing(titleOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(byOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // الانتقال بعد 6 ثوانٍ
    const timer = setTimeout(() => {
      try {
        if (soundObject) soundObject.unloadAsync().catch(() => {});
      } catch (e) {}
      const store = useTwinStore.getState();
      if (store.userId) {
        router.replace('/twin-mind');
      } else {
        router.replace('/login');
      }
    }, 6000);

    return () => {
      clearTimeout(timer);
      if (soundObject) soundObject.unloadAsync().catch(() => {});
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Image source={SPLASH_BG} style={styles.bgImage} resizeMode="cover" />
      <NeuronNetwork />
      <View style={styles.content}>
        <Animated.View style={[styles.logoWrapper, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
          <View style={styles.logoGlow}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          </View>
        </Animated.View>
        <Animated.Text style={[styles.appName, { opacity: titleOpacity }]}>My Twin</Animated.Text>
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>Your Twin AI .. Always There</Animated.Text>
      </View>
      <Animated.View style={[styles.footer, { opacity: byOpacity }]}>
        <Text style={styles.by}>By SOULSYNC</Text>
        <Text style={styles.copy}>© 2026 Soul Sync Ltd.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0014', justifyContent: 'center', alignItems: 'center' },
  bgImage: { position: 'absolute', width, height },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  logoWrapper: { marginBottom: 25 },
  logoGlow: { 
    shadowColor: '#A855F7', 
    shadowOffset: { width: 0, height: 0 }, 
    shadowOpacity: 0.9, 
    shadowRadius: 30, 
    elevation: 25,
  },
  logo: { width: 170, height: 170, borderRadius: 34 },
  appName: { 
    fontSize: 48, 
    fontWeight: '900', 
    letterSpacing: 2, 
    color: '#FFFFFF', 
    textShadowColor: 'rgba(168, 85, 247, 0.8)', 
    textShadowRadius: 25, 
    marginBottom: 15,
  },
  tagline: { 
    fontSize: 16, 
    fontWeight: '500', 
    letterSpacing: 2, 
    textAlign: 'center', 
    paddingHorizontal: 40, 
    color: 'rgba(255, 255, 255, 0.9)', 
    marginBottom: 40,
  },
  footer: { position: 'absolute', bottom: 70, alignItems: 'center', zIndex: 10 },
  by: { fontSize: 17, fontWeight: '700', letterSpacing: 5, color: '#FBBF24', textTransform: 'uppercase', marginBottom: 10 },
  copy: { fontSize: 12, color: 'rgba(255, 255, 255, 0.7)' },
});
