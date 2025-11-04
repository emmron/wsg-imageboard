import type { APIRoute } from 'astro';
import { constructWebhookEvent } from '../../../lib/stripe';
import { supabaseAdmin } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return new Response('Missing stripe signature', { status: 400 });
    }

    const body = await request.text();
    const event = constructWebhookEvent(body, signature);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(`Webhook error: ${error.message}`, { status: 400 });
  }
};

async function handleCheckoutCompleted(session: any) {
  const { creator_id, subscriber_id } = session.metadata;
  const subscriptionId = session.subscription;

  // Create or update subscription in database
  const { error } = await supabaseAdmin!.from('subscriptions').upsert({
    subscriber_id,
    creator_id,
    stripe_subscription_id: subscriptionId,
    status: 'active',
    current_period_start: new Date(session.created * 1000).toISOString(),
    current_period_end: new Date(
      (session.created + 30 * 24 * 60 * 60) * 1000
    ).toISOString(),
  });

  if (error) {
    console.error('Error creating subscription:', error);
  }

  // Record earning
  await supabaseAdmin!.from('earnings').insert({
    creator_id,
    amount: session.amount_total / 100,
    type: 'subscription',
    source_id: subscriptionId,
    status: 'pending',
  });
}

async function handleSubscriptionUpdated(subscription: any) {
  const subscriptionId = subscription.id;

  // Update subscription in database
  const { error } = await supabaseAdmin!
    .from('subscriptions')
    .update({
      status: subscription.status === 'active' ? 'active' : 'cancelled',
      current_period_start: new Date(
        subscription.current_period_start * 1000
      ).toISOString(),
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Error updating subscription:', error);
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  const subscriptionId = subscription.id;

  // Update subscription status to cancelled
  const { error } = await supabaseAdmin!
    .from('subscriptions')
    .update({
      status: 'cancelled',
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Error cancelling subscription:', error);
  }
}

async function handlePaymentSucceeded(invoice: any) {
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) return;

  // Get subscription from database
  const { data: subscription } = await supabaseAdmin!
    .from('subscriptions')
    .select('creator_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!subscription) return;

  // Record earning
  await supabaseAdmin!.from('earnings').insert({
    creator_id: subscription.creator_id,
    amount: invoice.amount_paid / 100,
    type: 'subscription',
    source_id: subscriptionId,
    status: 'paid',
  });
}

async function handlePaymentFailed(invoice: any) {
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) return;

  // You might want to notify the user about payment failure
  console.log(`Payment failed for subscription: ${subscriptionId}`);

  // Update subscription status
  const { error } = await supabaseAdmin!
    .from('subscriptions')
    .update({
      status: 'expired',
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Error updating subscription:', error);
  }
}
