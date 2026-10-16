import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getRepositories, resyncReminders } from '@/features/parking/service';

import {
  fetchPremiumProduct,
  isStoreAvailable,
  listenForPremium,
  ownsPremium,
  purchasePremium,
  restore as restoreFromStore,
  type PurchaseOutcome,
  type StoreProduct,
} from './store';

interface PremiumValue {
  isPremium: boolean;
  /** False until the local cache has been read, so screens don't flash locked states. */
  ready: boolean;
  storeAvailable: boolean;
  product: StoreProduct | null;
  purchase: () => Promise<PurchaseOutcome>;
  restore: () => Promise<boolean>;
  /** Development-only switch for testing locked/unlocked states where the store is unavailable. */
  setDevUnlocked: ((unlocked: boolean) => Promise<void>) | null;
}

const PremiumContext = createContext<PremiumValue | null>(null);

async function persist(unlocked: boolean) {
  const { entitlement } = await getRepositories();
  await entitlement.save(unlocked);
  // Reminders are a Premium feature: schedule or cancel them to match.
  await resyncReminders();
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [ready, setReady] = useState(false);
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const storeAvailable = isStoreAvailable();

  const unlock = useCallback(async () => {
    await persist(true);
    setIsPremium(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { entitlement } = await getRepositories();
        const cached = await entitlement.load();
        if (!cancelled) setIsPremium(cached);
      } finally {
        if (!cancelled) setReady(true);
      }
      if (!storeAvailable) return;
      // Refresh from the store: grants restored purchases, revokes refunded ones.
      try {
        const owned = await ownsPremium();
        if (cancelled) return;
        await persist(owned);
        setIsPremium(owned);
      } catch {
        // Offline or store hiccup: keep the cached state.
      }
      fetchPremiumProduct().then(
        (p) => !cancelled && setProduct(p),
        () => undefined,
      );
    })();
    const stop = listenForPremium(unlock);
    return () => {
      cancelled = true;
      stop();
    };
  }, [storeAvailable, unlock]);

  const purchase = useCallback(() => purchasePremium(unlock), [unlock]);

  const restore = useCallback(async () => {
    const owned = await restoreFromStore();
    if (owned) await unlock();
    return owned;
  }, [unlock]);

  const setDevUnlocked = useMemo(
    () =>
      __DEV__ && !storeAvailable
        ? async (unlocked: boolean) => {
            await persist(unlocked);
            setIsPremium(unlocked);
          }
        : null,
    [storeAvailable],
  );

  const value = useMemo<PremiumValue>(
    () => ({ isPremium, ready, storeAvailable, product, purchase, restore, setDevUnlocked }),
    [isPremium, ready, storeAvailable, product, purchase, restore, setDevUnlocked],
  );
  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium(): PremiumValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used inside PremiumProvider');
  return ctx;
}
