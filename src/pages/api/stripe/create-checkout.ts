import type { APIRoute } from 'astro';
import { createSubscriptionCheckoutSession } from '../../../lib/stripe';
import { supabaseAdmin } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { creatorId, subscriberId } = body;

    if (!creatorId || !subscriberId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get creator profile to get subscription price
    const { data: creator, error: creatorError } = await supabaseAdmin!
      .from('profiles')
      .select('subscription_price, username, display_name')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) {
      return new Response(
        JSON.stringify({ error: 'Creator not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (creator.subscription_price <= 0) {
      return new Response(
        JSON.stringify({ error: 'Creator does not have paid subscriptions enabled' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const appUrl = import.meta.env.PUBLIC_APP_URL || 'http://localhost:4321';
    const successUrl = `${appUrl}/profile/${creator.username}?subscribed=true`;
    const cancelUrl = `${appUrl}/profile/${creator.username}`;

    const session = await createSubscriptionCheckoutSession(
      creatorId,
      subscriberId,
      creator.subscription_price,
      successUrl,
      cancelUrl
    );

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create checkout session' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
