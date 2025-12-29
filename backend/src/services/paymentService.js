const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

class PaymentService {
  // Create a payment intent for skill exchange
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error('Payment intent creation error:', error);
      return { success: false, error: error.message };
    }
  }

  // Confirm a payment
  async confirmPayment(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return {
        success: true,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
      };
    } catch (error) {
      console.error('Payment confirmation error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create a customer
  async createCustomer(email, name, metadata = {}) {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata,
      });
      return { success: true, customerId: customer.id };
    } catch (error) {
      console.error('Customer creation error:', error);
      return { success: false, error: error.message };
    }
  }

  // Attach payment method to customer
  async attachPaymentMethod(customerId, paymentMethodId) {
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      return { success: true };
    } catch (error) {
      console.error('Payment method attach error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create a subscription for premium features
  async createSubscription(customerId, priceId) {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      return {
        success: true,
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      };
    } catch (error) {
      console.error('Subscription creation error:', error);
      return { success: false, error: error.message };
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return { success: true, status: subscription.status };
    } catch (error) {
      console.error('Subscription cancellation error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create a transfer to instructor (for marketplace model)
  async createTransfer(amount, destinationAccountId, metadata = {}) {
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        destination: destinationAccountId,
        metadata,
      });
      return { success: true, transferId: transfer.id };
    } catch (error) {
      console.error('Transfer creation error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create connected account for instructors
  async createConnectedAccount(email, country = 'US') {
    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country,
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      return { success: true, accountId: account.id };
    } catch (error) {
      console.error('Connected account creation error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create account link for onboarding
  async createAccountLink(accountId, refreshUrl, returnUrl) {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });
      return { success: true, url: accountLink.url };
    } catch (error) {
      console.error('Account link creation error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get payment history for a customer
  async getPaymentHistory(customerId, limit = 10) {
    try {
      const paymentIntents = await stripe.paymentIntents.list({
        customer: customerId,
        limit,
      });
      return {
        success: true,
        payments: paymentIntents.data.map(pi => ({
          id: pi.id,
          amount: pi.amount / 100,
          currency: pi.currency,
          status: pi.status,
          created: new Date(pi.created * 1000).toISOString(),
          metadata: pi.metadata,
        })),
      };
    } catch (error) {
      console.error('Payment history error:', error);
      return { success: false, error: error.message };
    }
  }

  // Process refund
  async createRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
    try {
      const refundData = {
        payment_intent: paymentIntentId,
        reason,
      };
      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }
      const refund = await stripe.refunds.create(refundData);
      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
      };
    } catch (error) {
      console.error('Refund creation error:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle webhook events
  async handleWebhook(payload, signature) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    try {
      const event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
      
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object);
          break;
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCanceled(event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
      
      return { success: true, eventType: event.type };
    } catch (error) {
      console.error('Webhook handling error:', error);
      return { success: false, error: error.message };
    }
  }

  // Internal handlers for webhook events
  async handlePaymentSuccess(paymentIntent) {
    console.log('Payment succeeded:', paymentIntent.id);
    // Update database, send notifications, etc.
  }

  async handlePaymentFailure(paymentIntent) {
    console.log('Payment failed:', paymentIntent.id);
    // Notify user, update status, etc.
  }

  async handleSubscriptionCreated(subscription) {
    console.log('Subscription created:', subscription.id);
    // Update user's subscription status
  }

  async handleSubscriptionCanceled(subscription) {
    console.log('Subscription canceled:', subscription.id);
    // Update user's subscription status
  }
}

module.exports = new PaymentService();
