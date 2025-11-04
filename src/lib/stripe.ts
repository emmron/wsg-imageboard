import Stripe from 'stripe';

const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY not found. Payment features will not work.');
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    })
  : null;

export const STRIPE_WEBHOOK_SECRET = import.meta.env.STRIPE_WEBHOOK_SECRET;

// Helper functions
export async function createSubscriptionCheckoutSession(
  creatorId: string,
  subscriberId: string,
  priceAmount: number,
  successUrl: string,
  cancelUrl: string
) {
  if (!stripe) throw new Error('Stripe not configured');

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Creator Subscription',
            description: 'Monthly subscription to creator content',
          },
          recurring: {
            interval: 'month',
          },
          unit_amount: Math.round(priceAmount * 100), // Convert to cents
        },
        quantity: 1,
      },
    ],
    metadata: {
      creator_id: creatorId,
      subscriber_id: subscriberId,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: undefined, // Will be filled by Stripe
  });

  return session;
}

export async function createTipPaymentIntent(
  senderId: string,
  recipientId: string,
  amount: number,
  message?: string
) {
  if (!stripe) throw new Error('Stripe not configured');

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    metadata: {
      sender_id: senderId,
      recipient_id: recipientId,
      message: message || '',
      type: 'tip',
    },
  });

  return paymentIntent;
}

export async function cancelSubscription(subscriptionId: string) {
  if (!stripe) throw new Error('Stripe not configured');

  const subscription = await stripe.subscriptions.cancel(subscriptionId);
  return subscription;
}

export async function getSubscription(subscriptionId: string) {
  if (!stripe) throw new Error('Stripe not configured');

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
}

export function constructWebhookEvent(payload: string | Buffer, signature: string) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhook not configured');
  }

  return stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
}
