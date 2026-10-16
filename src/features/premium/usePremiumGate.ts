import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { usePremium } from './PremiumProvider';

/** Returns a guard: true when Premium is unlocked, otherwise opens the paywall and returns false. */
export function usePremiumGate() {
  const { isPremium } = usePremium();
  const router = useRouter();
  return useCallback(() => {
    if (isPremium) return true;
    router.push('/premium');
    return false;
  }, [isPremium, router]);
}
