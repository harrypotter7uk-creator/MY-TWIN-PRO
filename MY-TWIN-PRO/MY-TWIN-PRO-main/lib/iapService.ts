/**
 * iapService.ts – SoulSync MyTwin AI
 * نظام الفوترة المتكامل مع expo-iap (SDK 52)
 * بديل كامل لـ react-native-iap المتعارض
 */

import { Platform, Alert } from 'react-native';
import {
  setup,
  getSubscriptions,
  requestSubscription,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  endConnection,
  initConnection,
} from 'expo-iap';
import { apiPost, apiGet } from './httpClient';

// ================================================================
// معرفات المنتجات – يجب أن تطابق Google Play Console بالضبط
// ================================================================
export const PRODUCT_IDS: Record<string, string> = {
  plus:    'mytwin_plus_monthly',
  premium: 'mytwin_premium_monthly',
  pro:     'mytwin_pro_semiannual',
  yearly:  'mytwin_yearly_annual',
};

export const ALL_SKUS = Object.values(PRODUCT_IDS);

// ================================================================
// الحالة الداخلية
// ================================================================
let _isInitialized = false;
let _purchaseListener: any = null;
let _errorListener:   any = null;

// ================================================================
// تهيئة IAP
// ================================================================
export async function initializeIAP(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (_isInitialized) return true;

  try {
    const connected = await initConnection();
    if (!connected) {
      console.warn('[IAP] Google Play غير متاح');
      return false;
    }

    _purchaseListener = purchaseUpdatedListener(async (purchase: any) => {
      if (!purchase?.transactionReceipt && !purchase?.purchaseToken) return;
      try {
        await finishTransaction({ purchase, isConsumable: false });
        console.log('[IAP] ✅ Transaction finished:', purchase.productId);
      } catch (err) {
        console.warn('[IAP] finishTransaction error:', err);
      }
    });

    _errorListener = purchaseErrorListener((error: any) => {
      if (error?.code !== 'E_USER_CANCELLED') {
        console.error('[IAP] Purchase error:', error?.code, error?.message);
      }
    });

    _isInitialized = true;
    console.log('[IAP] ✅ Google Play Billing initialized');
    return true;
  } catch (err) {
    console.error('[IAP] initConnection failed:', err);
    return false;
  }
}

// ================================================================
// تحميل الاشتراكات المتاحة من Google Play
// ================================================================
export async function loadSubscriptionProducts(): Promise<any[]> {
  if (Platform.OS !== 'android') return [];
  try {
    await ensureInitialized();
    const subs = await getSubscriptions({ skus: ALL_SKUS });
    console.log('[IAP] Products loaded:', subs.length);
    return subs;
  } catch (err) {
    console.warn('[IAP] loadSubscriptionProducts failed:', err);
    return [];
  }
}

// ================================================================
// شراء اشتراك
// ================================================================
export async function purchaseSubscription(
  tier: string,
  userId: string
): Promise<{ success: boolean; tier?: string; message?: string }> {
  if (Platform.OS !== 'android') {
    return { success: false, message: 'Android only' };
  }

  const productId = PRODUCT_IDS[tier];
  if (!productId) {
    return { success: false, message: `Invalid tier: ${tier}` };
  }

  try {
    await ensureInitialized();
    console.log('[IAP] Starting purchase:', productId);

    const purchase = await requestSubscription({ sku: productId });
    if (!purchase) {
      return { success: false, message: 'Purchase returned null' };
    }

    const token = extractPurchaseToken(purchase);
    if (!token) {
      return { success: false, message: 'No purchase token received' };
    }

    const result = await verifyWithServer(productId, token, userId);

    if (result.success) {
      updateLocalTier(tier);
      try {
        await finishTransaction({ purchase: purchase as any, isConsumable: false });
      } catch (_) {}
      return { success: true, tier: result.tier };
    }

    return { success: false, message: result.message || 'Server verification failed' };

  } catch (err: any) {
    if (err?.code === 'E_USER_CANCELLED') {
      return { success: false, message: 'cancelled' };
    }
    console.error('[IAP] purchaseSubscription error:', err);
    return { success: false, message: err?.message || 'Purchase failed' };
  }
}

// ================================================================
// استعادة المشتريات السابقة
// ================================================================
export async function restorePurchases(
  userId: string
): Promise<{ success: boolean; tier?: string; count: number }> {
  if (Platform.OS !== 'android') return { success: false, count: 0 };

  try {
    await ensureInitialized();
    const purchases = await getAvailablePurchases();

    if (!purchases || purchases.length === 0) {
      console.log('[IAP] No purchases to restore');
      return { success: false, count: 0 };
    }

    console.log('[IAP] Restoring', purchases.length, 'purchases');
    let restoredTier: string | undefined;
    let restoredCount = 0;

    for (const purchase of purchases) {
      const token = extractPurchaseToken(purchase);
      if (!token) continue;

      const tier = Object.keys(PRODUCT_IDS).find(
        k => PRODUCT_IDS[k] === (purchase as any).productId
      );
      if (!tier) continue;

      const result = await verifyWithServer((purchase as any).productId, token, userId);
      if (result.success) {
        restoredTier = result.tier || tier;
        restoredCount++;
        try {
          await finishTransaction({ purchase: purchase as any, isConsumable: false });
        } catch (_) {}
      }
    }

    if (restoredTier) updateLocalTier(restoredTier);
    return { success: restoredCount > 0, tier: restoredTier, count: restoredCount };

  } catch (err) {
    console.error('[IAP] restorePurchases failed:', err);
    return { success: false, count: 0 };
  }
}

// ================================================================
// التحقق من حالة الاشتراك عبر الخادم
// ================================================================
export async function validateSubscriptionStatus(
  userId: string
): Promise<{ tier: string; isActive: boolean; expiresAt?: string }> {
  try {
    const result = await apiGet('/api/billing/status');
    if (result?.tier) {
      updateLocalTier(result.tier);
      return {
        tier:      result.tier,
        isActive:  result.is_active ?? true,
        expiresAt: result.expires_at,
      };
    }
  } catch (err) {
    console.warn('[IAP] validateSubscriptionStatus failed:', err);
  }
  return { tier: 'free', isActive: false };
}

// ================================================================
// إنهاء الاتصال
// ================================================================
export async function disconnectIAP(): Promise<void> {
  try {
    _purchaseListener?.remove();
    _errorListener?.remove();
    _purchaseListener = null;
    _errorListener   = null;
    if (_isInitialized) {
      await endConnection();
      _isInitialized = false;
      console.log('[IAP] Connection ended');
    }
  } catch (err) {
    console.warn('[IAP] disconnectIAP error:', err);
  }
}

// ================================================================
// دوال مساعدة داخلية
// ================================================================
async function ensureInitialized(): Promise<void> {
  if (!_isInitialized) {
    const ok = await initializeIAP();
    if (!ok) throw new Error('Google Play Billing unavailable');
  }
}

function extractPurchaseToken(purchase: any): string | null {
  return (
    purchase?.purchaseToken ||
    purchase?.transactionReceipt ||
    null
  );
}

async function verifyWithServer(
  productId:     string,
  purchaseToken: string,
  userId:        string
): Promise<{ success: boolean; tier?: string; message?: string }> {
  try {
    const response = await apiPost('/api/billing/verify', {
      product_id:     productId,
      purchase_token: purchaseToken,
    });
    if (response?.success) {
      return { success: true, tier: response.tier };
    }
    return { success: false, message: response?.message || 'Verification failed' };
  } catch (err: any) {
    console.error('[IAP] Server verification failed:', err);
    return { success: false, message: err?.message || 'Network error' };
  }
}

function updateLocalTier(tier: string): void {
  try {
    const { useTwinStore } = require('../store/useTwinStore');
    useTwinStore.getState().setTier(tier as any);
    console.log('[IAP] Tier updated locally:', tier);
  } catch (err) {
    console.warn('[IAP] updateLocalTier failed:', err);
  }
}
