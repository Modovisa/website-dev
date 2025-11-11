// src/hooks/useProfile.ts

// React Query hooks for profile data
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  getUserProfile,
  getWebsites,
  updateWebsite,
  deleteWebsite,
  getBillingInfo,
  getInvoices,
  changePassword,
  setup2FA,
  verify2FA,
  reset2FA,
  getDeletionPolicy,
  deleteAccount,
  getDashboardStats,
  getPricingTiers,
} from '@/services/profileService';
import type {
  PasswordChangeData,
  TwoFactorVerifyData,
  AccountDeleteData,
  UpdateWebsiteData,
  DeleteWebsiteData,
} from '@/types/profile';

// ==================== User Profile ====================
export function useUserProfile() {
  return useQuery({
    queryKey: ['userProfile'],
    queryFn: getUserProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ==================== Dashboard Stats ====================
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStats,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });
}

// ==================== Websites ====================
export function useWebsites() {
  return useQuery({
    queryKey: ['websites'],
    queryFn: getWebsites,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateWebsite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: UpdateWebsiteData) => updateWebsite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      toast({
        title: 'Success',
        description: 'Website updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update website',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteWebsite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: DeleteWebsiteData) => deleteWebsite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      toast({
        title: 'Success',
        description: 'Website deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete website',
        variant: 'destructive',
      });
    },
  });
}

// ==================== Billing ====================
export function useBillingInfo() {
  return useQuery({
    queryKey: ['billingInfo'],
    queryFn: getBillingInfo,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePricingTiers() {
  return useQuery({
    queryKey: ['pricingTiers'],
    queryFn: getPricingTiers,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: getInvoices,
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== Security ====================
export function useChangePassword() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: PasswordChangeData) => changePassword(data),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Password changed successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      });
    },
  });
}

export function useSetup2FA() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => setup2FA(),
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to setup 2FA',
        variant: 'destructive',
      });
    },
  });
}

export function useVerify2FA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: TwoFactorVerifyData) => verify2FA(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      toast({
        title: 'Success',
        description: '2FA enabled successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to verify 2FA code',
        variant: 'destructive',
      });
    },
  });
}

export function useReset2FA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => reset2FA(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      toast({
        title: 'Success',
        description: '2FA has been reset',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset 2FA',
        variant: 'destructive',
      });
    },
  });
}

// ==================== Account Management ====================
export function useDeletionPolicy() {
  return useQuery({
    queryKey: ['deletionPolicy'],
    queryFn: getDeletionPolicy,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useDeleteAccount() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: AccountDeleteData) => deleteAccount(data),
    onSuccess: () => {
      // Redirect to goodbye page after successful deletion
      window.location.href = '/goodbye';
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete account',
        variant: 'destructive',
      });
    },
  });
}