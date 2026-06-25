import { Platform, Alert, NativeModules } from 'react-native';
import { apiPost, apiGet } from './httpClient';

const PRODUCT_IDS: Record<string, string> = {
  plus: 'mytwin_plus_monthly',
  premium: 'mytwin_premium_monthly',
  pro: 'mytwin_pro_semiannual',
  yearly: 'mytwin_yearly_annual',
};

const { BillingModule } = NativeModules;

// ================================================================
// تهيئة IAP
// ================================================================
export async function initializeIAP(): Promise<boolean> {
  try {
    if (Platform.OS !== 'android') return false;
    if (!BillingModule) {
      console.warn('BillingModule not available');
      return false;
    }
    await BillingModule.startConnection();
    console.log('✅ Google Play Billing initialized');
    return true;
  } catch (e) {
    console.warn('⚠️ Billing not available:', e);
    return false;
  }
}

// ================================================================
// تحميل المنتجات
// ================================================================
export async function loadSubscriptionProducts(): Promise<any[]> {
  try {
    if (Platform.OS !== 'android' || !BillingModule) return [];
    const skus = Object.values(PRODUCT_IDS);
    const products = await BillingModule.queryProductDetails(skus);
    return products || [];
  } catch (e) {
    console.warn('Failed to load products:', e);
    return [];
  }
}

// ================================================================
// شراء اشتراك
// ================================================================
export async function purchaseSubscription(
  tier: string,
  userId: string
): Promise<{ success: boolean; message?: string }> {
  const productId = PRODUCT_IDS[tier];
  if (!productId) {
    return { success: false, message: 'Invalid tier' };
  }

  try {
    if (Platform.OS !== 'android' || !BillingModule) {
      return { success: false, message: 'Store unavailable' };
    }

    const purchase = await BillingModule.launchBillingFlow(productId);

    if (!purchase?.purchaseToken) {
      return { success: false, message: 'Purchase cancelled' };
    }

    // التحقق عبر الخادم
    const result = await apiPost('/api/billing/verify', {
      user_id: userId,
      tier,
      receipt: purchase.purchaseToken,
      platform: 'android',
    });

    if (result?.verified) {
      // إنهاء المعاملة
      await BillingModule.acknowledgePurchase(purchase.purchaseToken);

      const { useTwinStore } = require('../store/useTwinStore');
      useTwinStore.getState().setTier(tier as any);

      Alert.alert('✅', 'تم تفعيل الاشتراك!');
      return { success: true };
    }

    return { success: false, message: 'Verification failed' };
  } catch (e: any) {
    if (e?.code === 'USER_CANCELED') {
      return { success: false, message: 'Purchase cancelled' };
    }
    console.error('Purchase failed:', e);
    Alert.alert('فشل الشراء', 'يرجى المحاولة لاحقاً');
    return { success: false, message: 'Purchase failed' };
  }
}

// ================================================================
// استعادة المشتريات
// ================================================================
export async function restorePurchases(userId: string): Promise<boolean> {
  try {
    if (Platform.OS !== 'android' || !BillingModule) return false;

    const purchases = await BillingModule.queryPurchases();
    if (!purchases || purchases.length === 0) return false;

    for (const purchase of purchases) {
      const tier = Object.keys(PRODUCT_IDS).find(
        key => PRODUCT_IDS[key] === purchase.productId
      ) || 'plus';

      const result = await apiPost('/api/billing/verify', {
        user_id: userId,
        tier,
        receipt: purchase.purchaseToken,
        platform: 'android',
      });

      if (result?.verified) {
        const { useTwinStore } = require('../store/useTwinStore');
        useTwinStore.getState().setTier(tier as any);
      }
    }
    return true;
  } catch (e) {
    console.warn('Restore failed:', e);
    return false;
  }
}

// ================================================================
// التحقق من حالة الاشتراك
// ================================================================
export async function validateSubscriptionStatus(userId: string): Promise<boolean> {
  try {
    const result = await apiGet(`/api/billing/status?user_id=${userId}`);
    if (result?.tier) {
      const { useTwinStore } = require('../store/useTwinStore');
      useTwinStore.getState().setTier(result.tier as any);
      return true;
    }
  } catch (e) {
    console.warn('Status check failed:', e);
  }
  return false;
}

// ================================================================
// إنهاء الاتصال
// ================================================================
export async function disconnectIAP(): Promise<void> {
  try {
    if (Platform.OS === 'android' && BillingModule) {
      await BillingModule.endConnection();
    }
  } catch (e) {
    console.warn('Failed to end billing connection:', e);
  }
}
