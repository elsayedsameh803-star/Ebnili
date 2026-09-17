import { useCallback, useEffect, useState } from 'react';
import {
  ensureUser,
  getDeviceFingerprint,
  getLocalUserEmail,
  setLocalUserEmail,
  grantFreeTrial,
  hasUsedFreeTier,
  checkFreeTierAbuse,
  getSubscriptionForUser,
} from '@/lib/auth';
import type { Subscription } from '@/lib/types';

/**
 * React hook around the low-level auth helpers in `src/lib/auth.ts`.
 * Keeps the component layer simple: it only needs an e-mail + a user id to
 * drive the SaaS flow (free trial, paid plan, anti-abuse checks).
 */
export function useAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);

  // Boot the session: make sure a local user id exists and hydrate e-mail/subscription.
  useEffect(() => {
    (async () => {
      const id = await ensureUser();
      setUserId(id);
      setEmail(getLocalUserEmail());
      const sub = await getSubscriptionForUser(id);
      setSubscription(sub);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist e-mail and bind the device fingerprint to the (new) user.
  const saveEmail = useCallback(async (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return;
    setLocalUserEmail(trimmed);
    setEmail(trimmed);
    setLoading(true);
    try {
      const id = await ensureUser(trimmed);
      setUserId(id);
      const sub = await getSubscriptionForUser(id);
      setSubscription(sub);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    userId,
    email,
    saveEmail,
    saving: loading,
    subscription,
    fingerprint: getDeviceFingerprint(),
    grantFreeTrial,
    hasUsedFreeTier,
    checkFreeTierAbuse,
    getSubscriptionForUser,
  };
}
