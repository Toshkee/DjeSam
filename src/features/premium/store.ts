import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/** One-time, non-consumable unlock. Must match the product created in App Store Connect / Play Console. */
export const PREMIUM_PRODUCT_ID = 'com.toshkee.desam.premium';

type ExpoIap = typeof import('expo-iap');

let cached: ExpoIap | null | undefined;

/**
 * The native store module is not part of Expo Go, so it is loaded lazily and the rest of the
 * app keeps working (with Premium unavailable) when it is missing.
 */
function iap(): ExpoIap | null {
  if (cached !== undefined) return cached;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient || Platform.OS === 'web') {
    cached = null;
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-iap') as ExpoIap;
  } catch {
    cached = null;
  }
  return cached;
}

export function isStoreAvailable(): boolean {
  return iap() !== null;
}

export interface StoreProduct {
  id: string;
  /** Localised price string from the store, e.g. "2,99 €". */
  displayPrice: string;
}

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'pending' | 'failed';

let connected: Promise<boolean> | null = null;

export function connect(): Promise<boolean> {
  const m = iap();
  if (!m) return Promise.resolve(false);
  if (!connected) {
    connected = m.initConnection().then(
      () => true,
      () => {
        connected = null;
        return false;
      },
    );
  }
  return connected;
}

export async function fetchPremiumProduct(): Promise<StoreProduct | null> {
  const m = iap();
  if (!m || !(await connect())) return null;
  const products = await m.fetchProducts({ skus: [PREMIUM_PRODUCT_ID], type: 'in-app' });
  const product = (products ?? []).find((p) => p.id === PREMIUM_PRODUCT_ID);
  return product ? { id: product.id, displayPrice: product.displayPrice } : null;
}

/** True when the store reports the Premium unlock as owned (also used for "restore"). */
export async function ownsPremium(): Promise<boolean> {
  const m = iap();
  if (!m || !(await connect())) return false;
  const purchases = await m.getAvailablePurchases();
  return purchases.some((p) => p.productId === PREMIUM_PRODUCT_ID && p.purchaseState === 'purchased');
}

export async function restore(): Promise<boolean> {
  const m = iap();
  if (!m || !(await connect())) return false;
  await m.restorePurchases();
  return ownsPremium();
}

/**
 * Starts the purchase sheet and resolves when the store reports the outcome through its
 * listeners. The transaction is finished only after the unlock has been recorded.
 */
export async function purchasePremium(onOwned: () => Promise<void>): Promise<PurchaseOutcome> {
  const m = iap();
  if (!m || !(await connect())) return 'failed';

  return new Promise<PurchaseOutcome>((resolve) => {
    let settled = false;
    const done = (outcome: PurchaseOutcome) => {
      if (settled) return;
      settled = true;
      updated.remove();
      failed.remove();
      resolve(outcome);
    };

    const updated = m.purchaseUpdatedListener(async (purchase) => {
      if (purchase.productId !== PREMIUM_PRODUCT_ID) return;
      if (purchase.purchaseState === 'pending') return done('pending');
      if (purchase.purchaseState !== 'purchased') return;
      try {
        await onOwned();
        await m.finishTransaction({ purchase, isConsumable: false });
        done('purchased');
      } catch {
        done('failed');
      }
    });
    const failed = m.purchaseErrorListener((error) => done(m.isUserCancelledError(error) ? 'cancelled' : 'failed'));

    m.requestPurchase({
      request: { apple: { sku: PREMIUM_PRODUCT_ID }, google: { skus: [PREMIUM_PRODUCT_ID] } },
      type: 'in-app',
    }).catch((error: unknown) => done(m.isUserCancelledError(error) ? 'cancelled' : 'failed'));
  });
}

/**
 * Transactions completed while the app was closed (e.g. "Ask to Buy" approval) are replayed by
 * the store; this keeps the local unlock in sync and finishes them.
 */
export function listenForPremium(onOwned: () => Promise<void>): () => void {
  const m = iap();
  if (!m) return () => undefined;
  const sub = m.purchaseUpdatedListener(async (purchase) => {
    if (purchase.productId !== PREMIUM_PRODUCT_ID || purchase.purchaseState !== 'purchased') return;
    try {
      await onOwned();
      await m.finishTransaction({ purchase, isConsumable: false });
    } catch {
      // Will be replayed on the next launch.
    }
  });
  return () => sub.remove();
}
