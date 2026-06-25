import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { router } from 'expo-router';

const APP_ICON = require('../assets/icon.png');

interface PresenceBubbleProps {
  visible: boolean;
  onPress?: () => void;
}

export default function PresenceBubble({ visible, onPress }: PresenceBubbleProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    } else {
      Animated.timing(scaleAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity onPress={onPress || (() => router.push('/chat'))} activeOpacity={0.8}>
        <Animated.View style={[styles.ring, { transform: [{ scale: pulseAnim }] }]} />
        <View style={styles.bubble}>
          <Image source={APP_ICON} style={styles.icon} />
          <Text style={styles.text}>أنا هنا</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 30, right: 20, zIndex: 9999,
    alignItems: 'center', justifyContent: 'center',
  },
  ring: {
    position: 'absolute', width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#7C3AED40', opacity: 0.5,
  },
  bubble: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#7C3AED',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  icon: { width: 32, height: 32, borderRadius: 16 },
  text: { color: '#FFF', fontSize: 8, fontWeight: '700', marginTop: 1 },
});
