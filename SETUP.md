# FanConnect - OnlyFans Clone Setup Guide

A premium content subscription platform similar to OnlyFans, built with Astro, Supabase, and Stripe.

## Features

✅ User authentication (email/password, Apple Sign-In, Google Sign-In)
✅ OAuth integration with Apple and Google
✅ Creator profiles with customizable bios and avatars
✅ Subscription-based content access
✅ Payment processing with Stripe
✅ Video, image, and text content support
✅ Subscriber feed showing content from subscribed creators
✅ Creator dashboard with analytics and earnings
✅ Direct messaging between users (coming soon)
✅ Tipping system (coming soon)
✅ Content moderation tools (coming soon)

## Tech Stack

- **Framework**: Astro 5.13.2
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Storage**: Vercel Blob
- **Deployment**: Vercel
- **UI**: Vanilla JavaScript/TypeScript with nanostores

## Prerequisites

- Node.js 18+ installed
- A Supabase account
- A Stripe account
- A Vercel account (for deployment)

## Installation Steps

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API to get your project URL and anon key
3. Go to Project Settings > Database and get your service role key
4. Run the SQL schema from `supabase-schema.sql` in the Supabase SQL Editor

### 3. Configure OAuth Providers (Apple & Google Sign-In)

#### Apple Sign-In Setup

1. **Apple Developer Account**:
   - Go to [Apple Developer Console](https://developer.apple.com)
   - Navigate to Certificates, Identifiers & Profiles
   - Create a new App ID or use existing one
   - Enable "Sign in with Apple" capability

2. **Create Service ID**:
   - Go to Identifiers and create a new Service ID
   - Enable "Sign in with Apple"
   - Configure domains and return URLs:
     - Domains: `your-project-ref.supabase.co`
     - Return URLs: `https://your-project-ref.supabase.co/auth/v1/callback`

3. **Create Key**:
   - Go to Keys and create a new key
   - Enable "Sign in with Apple"
   - Download the key file (.p8)
   - Note the Key ID

4. **Configure in Supabase**:
   - Go to Authentication > Providers in Supabase Dashboard
   - Enable Apple provider
   - Enter:
     - Services ID (Identifier from step 2)
     - Team ID (from Apple Developer Account)
     - Key ID (from step 3)
     - Private Key (contents of .p8 file)

#### Google Sign-In Setup

1. **Google Cloud Console**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing one
   - Enable Google+ API

2. **Create OAuth Credentials**:
   - Go to Credentials > Create Credentials > OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs:
     - `https://your-project-ref.supabase.co/auth/v1/callback`
     - `http://localhost:4321/auth/callback` (for development)

3. **Configure in Supabase**:
   - Go to Authentication > Providers in Supabase Dashboard
   - Enable Google provider
   - Enter:
     - Client ID (from Google Console)
     - Client Secret (from Google Console)

4. **Update OAuth Consent Screen**:
   - Configure app name, logo, and support email
   - Add scopes: email, profile
   - Add test users for development

### 4. Set Up Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe Dashboard
3. Set up a webhook endpoint pointing to `https://your-domain.com/api/stripe/webhook`
4. Get your webhook signing secret

### 5. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Supabase
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Vercel Blob (for file uploads)
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# Application
PUBLIC_APP_URL=http://localhost:4321
```

### 6. Run Database Migrations

Execute the SQL schema in your Supabase project:

```sql
-- Open supabase-schema.sql and run all SQL commands
-- in your Supabase SQL Editor
```

This will create all necessary tables:
- `profiles` - User profiles
- `posts` - Content posts
- `subscriptions` - Creator subscriptions
- `messages` - Direct messages
- `tips` - Tips/donations
- `follows` - User follows
- `likes` - Post likes
- `comments` - Post comments
- `earnings` - Creator earnings

### 7. Start Development Server

```bash
npm run dev
```

Visit http://localhost:4321

## Key Pages

### Public Pages
- `/` - Homepage
- `/explore` - Discover creators
- `/login` - User login
- `/signup` - User registration
- `/profile/[username]` - Creator profile

### Authenticated Pages
- `/feed` - Subscription feed
- `/dashboard` - Creator dashboard
- `/settings` - User settings
- `/messages` - Direct messages (coming soon)

## Stripe Webhook Configuration

### Development (using Stripe CLI)

```bash
stripe listen --forward-to localhost:4321/api/stripe/webhook
```

### Production

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

## Deployment to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy

### Update Stripe Webhook After Deployment

Update your Stripe webhook URL to point to your production domain:
```
https://your-vercel-domain.vercel.app/api/stripe/webhook
```

## Database Schema Overview

### Core Tables

**profiles** - Extended user data
- `id` - UUID (references auth.users)
- `username` - Unique username
- `display_name` - Display name
- `bio` - Profile bio
- `avatar_url` - Profile picture
- `is_creator` - Creator flag
- `subscription_price` - Monthly subscription price

**subscriptions** - Active subscriptions
- `subscriber_id` - User who subscribed
- `creator_id` - Creator being subscribed to
- `status` - active/cancelled/expired
- `stripe_subscription_id` - Stripe subscription ID

**posts** - Content posts
- `creator_id` - Creator who posted
- `title` - Post title
- `content_type` - video/image/text/audio
- `media_url` - URL to media file
- `is_free` - Public or subscriber-only

## Row Level Security (RLS)

All tables have RLS enabled to ensure:
- Users can only update their own profiles
- Free posts are public
- Paid posts are only visible to subscribers
- Users can only access their own messages
- Earnings are only visible to the creator

## API Endpoints

### Video Upload
- `POST /api/video/upload` - Upload video
- `POST /api/video/upload/init` - Initialize chunked upload
- `POST /api/video/upload/chunk` - Upload chunk
- `POST /api/video/upload/complete` - Complete chunked upload

### Stripe
- `POST /api/stripe/create-checkout` - Create subscription checkout
- `POST /api/stripe/webhook` - Stripe webhook handler

## Customization

### Branding
- Update logo in `src/components/Navigation.astro`
- Modify color scheme in component styles
- Update metadata in `src/layouts/Layout.astro`

### Pricing
- Set default subscription prices in creator profiles
- Modify pricing tiers in Stripe integration
- Add custom pricing features

### Content Types
- Currently supports: video, image, text, audio
- Extend `posts` table for new content types
- Update upload forms for new formats

## Security Best Practices

1. **Never commit `.env` file** - Use `.env.example` as template
2. **Use Supabase RLS** - All queries respect row-level security
3. **Validate Stripe webhooks** - Always verify webhook signatures
4. **Sanitize user input** - Validation on both client and server
5. **HTTPS only** - Enable HTTPS in production
6. **Rate limiting** - Add rate limiting to API endpoints

## Troubleshooting

### Supabase Connection Issues
- Verify environment variables are correct
- Check if Supabase project is active
- Ensure RLS policies are correctly set up

### Stripe Payment Issues
- Test with Stripe test mode first
- Verify webhook endpoint is accessible
- Check webhook signing secret is correct

### Upload Failures
- Verify Vercel Blob token is set
- Check file size limits (default: 2GB)
- Ensure MIME types are allowed

## Support & Resources

- [Astro Documentation](https://docs.astro.build)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

## License

MIT License - feel free to use for your own projects!

## Next Steps

- [ ] Implement direct messaging system
- [ ] Add tipping functionality
- [ ] Build content moderation tools
- [ ] Add analytics dashboard
- [ ] Implement referral system
- [ ] Add email notifications
- [ ] Build mobile app (React Native/Flutter)
