import React from 'react';
import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';
import { useNotificationStore, useAuthStore } from '../store';
import { apiClient } from '../lib/api';

// Initialize Stripe
const stripePromise = loadStripe(
  (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here'
);

interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
}

interface Subscription {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  plan: {
    id: string;
    name: string;
    amount: number;
    interval: string;
  };
}

interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

class PaymentService {
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;

  async initializeStripe(): Promise<Stripe | null> {
    if (this.stripe) return this.stripe;
    
    try {
      this.stripe = await stripePromise;
      if (!this.stripe) {
        throw new Error('Failed to load Stripe');
      }
      return this.stripe;
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      throw error;
    }
  }

  // Create payment intent for premium sessions
  async createPaymentIntent(params: {
    amount: number;
    currency?: string;
    exchangeId: string;
    description?: string;
  }): Promise<PaymentIntent> {
    try {
      const response = await apiClient.createPaymentIntent({
        amount: params.amount,
        currency: params.currency || 'usd',
        exchangeId: params.exchangeId,
        description: params.description,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      throw error;
    }
  }

  // Confirm payment with card element
  async confirmPayment(
    clientSecret: string,
    cardElement: StripeCardElement,
    billingDetails?: {
      name?: string;
      email?: string;
      address?: {
        line1?: string;
        city?: string;
        state?: string;
        postal_code?: string;
        country?: string;
      };
    }
  ): Promise<{ success: boolean; error?: string; paymentIntent?: any }> {
    try {
      const stripe = await this.initializeStripe();
      if (!stripe) {
        throw new Error('Stripe not initialized');
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: billingDetails,
        },
      });

      if (result.error) {
        return {
          success: false,
          error: result.error.message,
        };
      }

      return {
        success: true,
        paymentIntent: result.paymentIntent,
      };
    } catch (error) {
      console.error('Payment confirmation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }

  // Create subscription for premium membership
  async createSubscription(params: {
    priceId: string;
    paymentMethodId: string;
    trialPeriodDays?: number;
  }): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
    try {
      const response = await apiClient.createSubscription({
        priceId: params.priceId,
        paymentMethodId: params.paymentMethodId,
        trialPeriodDays: params.trialPeriodDays,
      });

      if (response.error) {
        return {
          success: false,
          error: response.error,
        };
      }

      return {
        success: true,
        subscription: response.data,
      };
    } catch (error) {
      console.error('Failed to create subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Subscription creation failed',
      };
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.cancelSubscription(subscriptionId);

      if (response.error) {
        return {
          success: false,
          error: response.error,
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Subscription cancellation failed',
      };
    }
  }

  // Update subscription
  async updateSubscription(params: {
    subscriptionId: string;
    priceId?: string;
    quantity?: number;
  }): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
    try {
      const response = await apiClient.updateSubscription(params);

      if (response.error) {
        return {
          success: false,
          error: response.error,
        };
      }

      return {
        success: true,
        subscription: response.data,
      };
    } catch (error) {
      console.error('Failed to update subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Subscription update failed',
      };
    }
  }

  // Get customer payment methods
  async getPaymentMethods(): Promise<{ success: boolean; paymentMethods?: PaymentMethod[]; error?: string }> {
    try {
      const response = await apiClient.getPaymentMethods();

      if (response.error) {
        return {
          success: false,
          error: response.error,
        };
      }

      return {
        success: true,
        paymentMethods: response.data,
      };
    } catch (error) {
      console.error('Failed to get payment methods:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve payment methods',
      };
    }
  }

  // Add payment method
  async addPaymentMethod(cardElement: StripeCardElement): Promise<{ success: boolean; paymentMethod?: PaymentMethod; error?: string }> {
    try {
      const stripe = await this.initializeStripe();
      if (!stripe) {
        throw new Error('Stripe not initialized');
      }

      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // Save payment method to customer
      const response = await apiClient.attachPaymentMethod(paymentMethod!.id);

      if (response.error) {
        return {
          success: false,
          error: response.error,
        };
      }

      return {
        success: true,
        paymentMethod: response.data,
      };
    } catch (error) {
      console.error('Failed to add payment method:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add payment method',
      };
    }
  }

  // Delete payment method
  async deletePaymentMethod(paymentMethodId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.detachPaymentMethod(paymentMethodId);

      if (response.error) {
        return {
          success: false,
          error: response.error,
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete payment method:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete payment method',
      };
    }
  }

  // Get payment history
  async getPaymentHistory(): Promise<{ success: boolean; payments?: any[]; error?: string }> {
    try {
      const response = await apiClient.getPaymentHistory();

      if (response.error) {
        return {
          success: false,
          error: response.error,
        };
      }

      return {
        success: true,
        payments: response.data,
      };
    } catch (error) {
      console.error('Failed to get payment history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve payment history',
      };
    }
  }

  // Request refund
  async requestRefund(params: {
    paymentIntentId: string;
    amount?: number;
    reason?: string;
  }): Promise<{ success: boolean; refund?: any; error?: string }> {
    try {
      const response = await apiClient.createRefund(params);

      if (response.error) {
        return {
          success: false,
          error: response.error,
        };
      }

      return {
        success: true,
        refund: response.data,
      };
    } catch (error) {
      console.error('Failed to request refund:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process refund',
      };
    }
  }

  // Calculate fees for marketplace
  calculateMarketplaceFee(amount: number): {
    platformFee: number;
    processingFee: number;
    totalFees: number;
    netAmount: number;
  } {
    const platformFeeRate = 0.05; // 5% platform fee
    const processingFeeRate = 0.029; // 2.9% + $0.30 processing fee
    const processingFixed = 30; // $0.30 in cents

    const platformFee = Math.round(amount * platformFeeRate);
    const processingFee = Math.round(amount * processingFeeRate) + processingFixed;
    const totalFees = platformFee + processingFee;
    const netAmount = amount - totalFees;

    return {
      platformFee,
      processingFee,
      totalFees,
      netAmount,
    };
  }

  // Format amount for display
  formatAmount(amount: number, currency: string = 'usd'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  // Create elements instance
  createElements(options?: any): StripeElements | null {
    if (!this.stripe) return null;
    
    this.elements = this.stripe.elements({
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#3b82f6',
          colorBackground: '#ffffff',
          colorText: '#1f2937',
          colorDanger: '#ef4444',
          fontFamily: 'system-ui, sans-serif',
          spacingUnit: '4px',
          borderRadius: '6px',
        },
      },
      ...options,
    });

    return this.elements;
  }

  // Get elements instance
  getElements(): StripeElements | null {
    return this.elements;
  }
}

export const paymentService = new PaymentService();

// React hook for payment functionality
export function usePayment() {
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const [loading, setLoading] = React.useState(false);
  const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethod[]>([]);
  const [subscriptions, setSubscriptions] = React.useState<Subscription[]>([]);

  // Initialize Stripe
  const initializeStripe = React.useCallback(async () => {
    try {
      setLoading(true);
      const stripe = await paymentService.initializeStripe();
      return stripe;
    } catch (error) {
      addNotification({
        type: 'system',
        title: 'Payment Error',
        message: 'Failed to initialize payment system',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Create payment intent
  const createPaymentIntent = React.useCallback(async (params: {
    amount: number;
    currency?: string;
    exchangeId: string;
    description?: string;
  }) => {
    try {
      setLoading(true);
      const paymentIntent = await paymentService.createPaymentIntent(params);
      
      addNotification({
        type: 'system',
        title: 'Payment Ready',
        message: 'Please complete your payment',
      });
      
      return paymentIntent;
    } catch (error) {
      addNotification({
        type: 'system',
        title: 'Payment Error',
        message: error instanceof Error ? error.message : 'Failed to create payment',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Confirm payment
  const confirmPayment = React.useCallback(async (
    clientSecret: string,
    cardElement: StripeCardElement,
    billingDetails?: any
  ) => {
    try {
      setLoading(true);
      const result = await paymentService.confirmPayment(clientSecret, cardElement, billingDetails);
      
      if (result.success) {
        addNotification({
          type: 'system',
          title: 'Payment Successful',
          message: 'Your payment has been processed successfully',
        });
      } else {
        addNotification({
          type: 'system',
          title: 'Payment Failed',
          message: result.error || 'Payment failed',
        });
      }
      
      return result;
    } catch (error) {
      addNotification({
        type: 'system',
        title: 'Payment Error',
        message: error instanceof Error ? error.message : 'Payment processing failed',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Create subscription
  const createSubscription = React.useCallback(async (params: {
    priceId: string;
    paymentMethodId: string;
    trialPeriodDays?: number;
  }) => {
    try {
      setLoading(true);
      const result = await paymentService.createSubscription(params);
      
      if (result.success) {
        addNotification({
          type: 'system',
          title: 'Subscription Active',
          message: 'Your premium subscription is now active',
        });
        // Refresh subscriptions
        await loadSubscriptions();
      } else {
        addNotification({
          type: 'system',
          title: 'Subscription Failed',
          message: result.error || 'Failed to create subscription',
        });
      }
      
      return result;
    } catch (error) {
      addNotification({
        type: 'system',
        title: 'Subscription Error',
        message: error instanceof Error ? error.message : 'Subscription creation failed',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Load payment methods
  const loadPaymentMethods = React.useCallback(async () => {
    try {
      const result = await paymentService.getPaymentMethods();
      if (result.success && result.paymentMethods) {
        setPaymentMethods(result.paymentMethods);
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    }
  }, []);

  // Load subscriptions
  const loadSubscriptions = React.useCallback(async () => {
    try {
      // This would need to be implemented in the API client
      // const response = await apiClient.getSubscriptions();
      // if (response.success) setSubscriptions(response.subscriptions);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    }
  }, []);

  // Add payment method
  const addPaymentMethod = React.useCallback(async (cardElement: StripeCardElement) => {
    try {
      setLoading(true);
      const result = await paymentService.addPaymentMethod(cardElement);
      
      if (result.success) {
        addNotification({
          type: 'system',
          title: 'Payment Method Added',
          message: 'Your payment method has been saved',
        });
        await loadPaymentMethods();
      } else {
        addNotification({
          type: 'system',
          title: 'Failed to Add Payment Method',
          message: result.error || 'Failed to save payment method',
        });
      }
      
      return result;
    } catch (error) {
      addNotification({
        type: 'system',
        title: 'Payment Error',
        message: error instanceof Error ? error.message : 'Failed to add payment method',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addNotification, loadPaymentMethods]);

  // Calculate marketplace fees
  const calculateFees = React.useCallback((amount: number) => {
    return paymentService.calculateMarketplaceFee(amount);
  }, []);

  // Load data on mount
  React.useEffect(() => {
    if (user) {
      loadPaymentMethods();
      loadSubscriptions();
    }
  }, [user, loadPaymentMethods, loadSubscriptions]);

  return {
    loading,
    paymentMethods,
    subscriptions,
    initializeStripe,
    createPaymentIntent,
    confirmPayment,
    createSubscription,
    addPaymentMethod,
    calculateFees,
    loadPaymentMethods,
    loadSubscriptions,
    formatAmount: paymentService.formatAmount.bind(paymentService),
    createElements: paymentService.createElements.bind(paymentService),
    getElements: paymentService.getElements.bind(paymentService),
  };
}