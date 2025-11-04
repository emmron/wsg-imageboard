# FanConnect - Premium Content Subscription Platform

A modern content subscription platform similar to OnlyFans, built with Astro, Supabase, and Stripe.

## Features

- 🔐 **User Authentication** - Secure signup/login with Supabase Auth
- 👤 **Creator Profiles** - Customizable profiles with bio, avatar, and cover images
- 💳 **Subscription System** - Monthly subscriptions with Stripe payments
- 📹 **Content Uploads** - Support for video, image, and text content (up to 2GB)
- 🔒 **Access Control** - Free and subscriber-only content
- 📊 **Creator Dashboard** - Analytics, earnings, and subscriber management
- 💬 **Social Features** - Likes, comments, and follows
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

## Tech Stack

- **Frontend**: Astro 5.13.2
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Storage**: Vercel Blob
- **Deployment**: Vercel

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase and Stripe credentials

# Run development server
npm run dev
```

Visit http://localhost:4321

## Project Structure

```text
/
├── public/
│   └── uploads/          # Local file storage
├── src/
│   ├── components/       # Reusable components
│   │   ├── Navigation.astro
│   │   ├── VideoCard.astro
│   │   └── UploadForm.astro
│   ├── layouts/          # Page layouts
│   │   └── Layout.astro
│   ├── lib/              # Utilities and helpers
│   │   ├── supabase.ts   # Supabase client
│   │   ├── stripe.ts     # Stripe client
│   │   ├── auth-store.ts # Auth state management
│   │   └── stores.ts     # App state
│   └── pages/            # Routes
│       ├── index.astro   # Homepage
│       ├── feed.astro    # Subscription feed
│       ├── dashboard.astro # Creator dashboard
│       ├── login.astro   # Login page
│       ├── signup.astro  # Signup page
│       ├── profile/
│       │   └── [username].astro
│       └── api/          # API endpoints
│           ├── stripe/   # Stripe integration
│           └── video/    # Video upload
├── supabase-schema.sql   # Database schema
└── SETUP.md              # Detailed setup guide
```

## Setup

For detailed setup instructions, see [SETUP.md](./SETUP.md)

### Quick Setup Checklist

1. ✅ Install dependencies: `npm install`
2. ✅ Create Supabase project
3. ✅ Run database schema from `supabase-schema.sql`
4. ✅ Create Stripe account
5. ✅ Configure environment variables in `.env`
6. ✅ Start dev server: `npm run dev`

## Environment Variables

Required environment variables:

```bash
# Supabase
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Stripe
PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_pk
STRIPE_SECRET_KEY=your_stripe_sk
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Vercel Blob
BLOB_READ_WRITE_TOKEN=your_blob_token

# App
PUBLIC_APP_URL=http://localhost:4321
```

## Commands

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |

## Database Schema

The platform uses the following main tables:

- **profiles** - User profiles and creator info
- **posts** - Content (videos, images, text)
- **subscriptions** - Active subscriptions
- **messages** - Direct messages
- **likes** - Post likes
- **comments** - Post comments
- **follows** - User follows
- **tips** - Creator tips/donations
- **earnings** - Creator earnings

All tables have Row Level Security (RLS) enabled for data protection.

## API Endpoints

### Stripe Integration
- `POST /api/stripe/create-checkout` - Create subscription checkout session
- `POST /api/stripe/webhook` - Handle Stripe events

### Video Upload
- `POST /api/video/upload` - Direct video upload
- `POST /api/video/upload/init` - Initialize chunked upload
- `POST /api/video/upload/chunk` - Upload video chunk
- `POST /api/video/upload/complete` - Complete chunked upload

## Key Features

### For Creators
- Upload and manage content
- Set subscription prices
- View earnings and analytics
- Manage subscribers
- Create free and paid content

### For Subscribers
- Browse and discover creators
- Subscribe to favorite creators
- Access exclusive content
- Like and comment on posts
- Follow creators

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

### Other Platforms

The app can be deployed to any platform that supports Astro:
- Netlify
- Cloudflare Pages
- AWS Amplify
- Self-hosted

## Security

- All sensitive operations require authentication
- Row Level Security (RLS) on all database tables
- Stripe webhook signature verification
- File upload validation and sanitization
- HTTPS enforced in production

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

## Learn More

- [Astro Documentation](https://docs.astro.build)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Setup Guide](./SETUP.md)
