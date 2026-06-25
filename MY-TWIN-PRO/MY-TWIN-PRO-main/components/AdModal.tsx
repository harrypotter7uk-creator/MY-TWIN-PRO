import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { useTheme } from '../utils/theme';
import { Play, BatteryCharging, X, Zap } from 'lucide-react-native';

interface AdModalProps {
  visible: boolean;
  onClose: () => void;
  onReward?: (energy: number) => void;
}

export function AdModal({ visible, onClose, onReward }: AdModalProps) {
  const { lang, twinEnergy, setTwinEnergy, tier } = useTwinStore();
  const theme = useTheme();
  const isAr = lang === 'ar';
  const isDark = theme.isDark; // ✅ استخدام الخاصية الصحيحة
  const t = (ar: string, en: string) => isAr ? ar : en;

  const [loading, setLoading] = useState(false);
  const [adStatus, setAdStatus] = useState<any>(null);
  const [energyBefore, setEnergyBefore] = useState(twinEnergy);
  const [errorMsg, setErrorMsg] = useState('');

  const isFree = tier === 'free';

  useEffect(() => {
    if (visible) {
      setEnergyBefore(twinEnergy);
      // جلب حالة الإعلانات
      fetch('https://my-twin-pro-production-b744.up.railway.app/api/ads/status')
        .then(r => r.json())
        .then(setAdStatus)
        .catch(() => {});
    }
  }, [visible, twinEnergy]);

  const colors = {
    bg: isDark ? '#0F0A1A' : '#FAFAF8',
    card: isDark ? '#1A1226' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1226',
    subtext: isDark ? '#A78BFA' : '#6B7280',
    accent: '#7C3AED',
    accentLight: '#7C3AED15',
    border: isDark ? '#2D1B4D' : '#E8E8E3',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    gold: '#F59E0B',
  };

  const handleWatchAd = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await fetch('https://my-twin-pro-production-b744.up.railway.app/api/ads/reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad_type: 'rewarded' }),
      }).then(r => r.json());

      if (result.success) {
        const newEnergy = Math.min(100, twinEnergy + 20);
        setTwinEnergy(newEnergy);
        onReward?.(newEnergy);
        // تحديث حالة الإعلانات
        fetch('https://my-twin-pro-production-b744.up.railway.app/api/ads/status')
          .then(r => r.json())
          .then(setAdStatus)
          .catch(() => {});
      } else {
        setErrorMsg(t('تم استنفاد الإعلانات اليومية', 'Daily ads exhausted'));
      }
    } catch (e) {
      setErrorMsg(t('فشل تحميل الإعلان', 'Failed to load ad'));
    } finally {
      setLoading(false);
    }
  };

  const remainingAds = adStatus?.remaining_today ?? 0;
  const canWatch = remainingAds > 0 && isFree;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={st.overlay}>
        <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={st.closeBtn}>
            <X size={20} stroke={colors.subtext} />
          </TouchableOpacity>

          {/* أيقونة الطاقة */}
          <View style={[st.iconWrap, { backgroundColor: colors.accentLight }]}>
            <BatteryCharging size={40} stroke={colors.accent} />
          </View>

          <Text style={[st.title, { color: colors.text }]}>
            {t('هل تريد شحن الطاقة؟', 'Want to recharge?')}
          </Text>

          {/* معلومات الطاقة */}
          <View style={st.energyInfo}>
            <View style={st.energyRow}>
              <Text style={[st.energyLabel, { color: colors.subtext }]}>
                {t('الطاقة الحالية', 'Current Energy')}
              </Text>
              <View style={st.energyValueWrap}>
                <Zap size={14} stroke={colors.warning} />
                <Text style={[st.energyValue, { color: colors.text }]}>{energyBefore}%</Text>
              </View>
            </View>
            <View style={st.energyRow}>
              <Text style={[st.energyLabel, { color: colors.subtext }]}>
                {t('بعد المشاهدة', 'After watching')}
              </Text>
              <View style={st.energyValueWrap}>
                <Zap size={14} stroke={colors.success} />
                <Text style={[st.energyValue, { color: colors.success }]}>
                  {Math.min(100, energyBefore + 20)}%
                </Text>
              </View>
            </View>
          </View>

          <Text style={[st.body, { color: colors.subtext }]}>
            {t(
              'شاهد إعلاناً قصيراً واحصل على 20% طاقة إضافية و3 رسائل',
              'Watch a short ad and get 20% extra energy + 3 messages'
            )}
          </Text>

          {/* عدد الإعلانات المتبقية */}
          {adStatus && (
            <Text style={[st.remainingText, { color: canWatch ? colors.success : colors.danger }]}>
              {canWatch
                ? t(`متبقي ${remainingAds} إعلانات اليوم`, `${remainingAds} ads remaining today`)
                : t('تم استنفاد الإعلانات اليومية', 'Daily ads exhausted')}
            </Text>
          )}

          {errorMsg && (
            <Text style={[st.errorText, { color: colors.danger }]}>{errorMsg}</Text>
          )}

          {/* زر المشاهدة */}
          <TouchableOpacity
            style={[st.watchBtn, { backgroundColor: canWatch ? colors.accent : colors.border }]}
            onPress={handleWatchAd}
            disabled={loading || !canWatch}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Play size={18} stroke="#FFF" />
                <Text style={st.watchText}>
                  {canWatch ? t('مشاهدة الإعلان', 'Watch Ad') : t('غير متاح', 'Unavailable')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={st.skipBtn}>
            <Text style={[st.skipText, { color: colors.subtext }]}>
              {t('تخطي', 'Skip')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 24,
  },
  card: {
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 6,
    borderRadius: 10,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  energyInfo: {
    width: '100%',
    gap: 8,
    marginBottom: 16,
  },
  energyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  energyLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  energyValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  energyValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  remainingText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  watchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    marginBottom: 12,
  },
  watchText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  skipBtn: {
    padding: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
