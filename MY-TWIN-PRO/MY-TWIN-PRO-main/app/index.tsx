import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTwinStore } from '../store/useTwinStore';
import { apiGet } from '../lib/httpClient';

export default function Index() {
  const { userId } = useTwinStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        if (userId) {
          // التحقق مما إذا كان المستخدم قد أكمل التهيئة من قبل
          const profile = await apiGet(`/api/profile?user_id=${userId}`);
          if (profile?.onboarded === true) {
            router.replace('/twin-mind');
          } else {
            router.replace('/onboarding');
          }
        } else {
          router.replace('/splash');
        }
      } catch {
        // في حالة فشل الطلب، نذهب إلى splash بأمان
        router.replace('/splash');
      } finally {
        setChecking(false);
      }
    };

    checkUserStatus();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0014' }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return null;
}
