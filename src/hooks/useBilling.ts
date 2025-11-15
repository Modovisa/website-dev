// src/hooks/useBilling.ts
/**
 * React hook wrapper around billing.store.ts
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { billingStore } from "@/services/billing.store";
import type {
  BillingInfo,
  PricingTier,
  Invoice,
  EmbeddedCheckoutResult,
} from "@/services/billing.store";

export type { BillingInfo, PricingTier, Invoice };

export function useBilling() {
  const qc = useQueryClient();

  const infoQ = useQuery({
    queryKey: ["billing:info"],
    queryFn: () => billingStore.loadUserBillingInfo(),
    staleTime: 30_000,
  });

  const tiersQ = useQuery({
    queryKey: ["billing:tiers"],
    queryFn: () => billingStore.loadPricingTiers(),
    staleTime: 60_000,
  });

  const invoicesQ = useQuery({
    queryKey: ["billing:invoices"],
    queryFn: () => billingStore.loadInvoices(),
    staleTime: 30_000,
  });

  /* ========================================
     ACTIONS
     ======================================== */

  const startEmbeddedCheckout = async (
    tierId: number,
    interval: "month" | "year",
    onSuccess?: () => void
  ): Promise<EmbeddedCheckoutResult> => {
    const currentPlanId = infoQ.data?.plan_id || 0;
    const currentInterval = infoQ.data?.interval || "month";

    return billingStore.openStripeEmbeddedCheckout(
      tierId,
      interval,
      currentPlanId,
      currentInterval,
      async () => {
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["billing:info"] }),
          qc.invalidateQueries({ queryKey: ["billing:invoices"] }),
        ]);
        onSuccess?.();
      }
    );
  };

  const startUpdateCard = async (onSuccess?: () => void) => {
    return billingStore.openStripeUpdateCardSession(async () => {
      await qc.invalidateQueries({ queryKey: ["billing:info"] });
      onSuccess?.();
    });
  };

  const cancelSubscription = async () => {
    const result = await billingStore.cancelSubscription();
    await qc.invalidateQueries({ queryKey: ["billing:info"] });
    return result;
  };

  const reactivateSubscription = async () => {
    const result = await billingStore.reactivateSubscription();
    await qc.invalidateQueries({ queryKey: ["billing:info"] });
    return result;
  };

  const cancelDowngrade = async () => {
    const result = await billingStore.cancelDowngrade();
    await qc.invalidateQueries({ queryKey: ["billing:info"] });
    return result;
  };

  const confirmDowngrade = async (tierId: number, interval: "month" | "year") => {
    await billingStore.confirmDowngrade(tierId, interval);
    await qc.invalidateQueries({ queryKey: ["billing:info"] });
  };

  const isDowngrade = (tierId: number, interval: "month" | "year") => {
    return billingStore.isDowngrade(tierId, interval);
  };

  const updateSelectedTier = (
    tierId: number,
    interval: "month" | "year",
    tier: PricingTier,
    price: number
  ) => {
    billingStore.updateSelectedTier(tierId, interval, tier, price);
  };

  /* ========================================
     RETURN
     ======================================== */

  return {
    loading: infoQ.isLoading || tiersQ.isLoading || invoicesQ.isLoading,
    info: infoQ.data,
    tiers: tiersQ.data || [],
    invoices: invoicesQ.data || [],
    isFreePlan: billingStore.isFreePlan(),
    isFreeForever: billingStore.isFreeForever(),
    paymentMethod: billingStore.getPaymentMethod(),

    startEmbeddedCheckout,
    startUpdateCard,
    cancelSubscription,
    reactivateSubscription,
    cancelDowngrade,
    confirmDowngrade,
    isDowngrade,
    updateSelectedTier,
  };
}
