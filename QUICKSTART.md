# Quick Start Guide - Get Your Platform Running

## The Issue

The signup isn't working because **Supabase environment variables aren't configured yet**. The platform needs a database backend to store users.

## ⚡ Quick Setup (5 Minutes)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click "New Project"
3. Name it (e.g., "fanconnect")
4. Create a strong database password
5. Choose a region close to you
6. Click "Create new project" (takes ~2 minutes)

### Step 2: Get Your API Keys

Once your project is ready:

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **API** in the settings menu
3. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)
   - **service_role** key (another long string)

### Step 3: Run Database Schema

1. In Supabase, go to **SQL Editor** (in the sidebar)
2. Click **New Query**
3. Copy the ENTIRE contents of `supabase-schema.sql` from your project
4. Paste it into the SQL editor
5. Click **Run** (bottom right)
6. You should see "Success. No rows returned"

### Step 4: Create Environment File

In your project root, create a file named `.env`:

```bash
# Supabase (REQUIRED - get from supabase.com)
PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Stripe (Optional - for payments)
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Vercel Blob (Optional - for image uploads)
BLOB_READ_WRITE_TOKEN=vercel_blob_token

# Application
PUBLIC_APP_URL=http://localhost:4321
```

**Important**: Replace the placeholder values with your actual Supabase keys!

### Step 5: Restart Dev Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### Step 6: Test Signup

1. Go to http://localhost:4321/signup
2. Fill in the form
3. Click "Create Account"
4. You should see "Account created! Check your email to verify."
5. Check your Supabase Dashboard → Authentication → Users to see the new user

## 🐛 Troubleshooting

### Error: "Missing Supabase environment variables"

- You forgot to create the `.env` file
- Make sure it's in the project root (same folder as `package.json`)
- Check that variable names are exactly: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### Error: "Invalid API key"

- Double-check you copied the right keys from Supabase
- Make sure there are no extra spaces before/after the keys
- Verify you're using the **anon** key, not the service_role key for PUBLIC_SUPABASE_ANON_KEY

### Error: "Failed to create account"

- Check the browser console (F12) for detailed errors
- Verify the SQL schema was run successfully
- Make sure your Supabase project is active (not paused)

### Users created but can't login

- Check Supabase Dashboard → Authentication → Users
- Look for email confirmation status
- For development, disable email confirmation:
  - Go to Authentication → Settings
  - Uncheck "Enable email confirmations"

## 🧪 Test Without Email Verification (Development)

To skip email verification during development:

1. Supabase Dashboard → **Authentication** → **Settings**
2. Under **Auth Settings**, find **Email** section
3. **Disable** "Enable email confirmations"
4. Now users can login immediately after signup

## ✅ Verify Everything Works

Test these features:

1. **Signup**: Create a new account at `/signup`
2. **Login**: Sign in at `/login`
3. **Profile**: View your profile in the navigation dropdown
4. **Settings**: Edit your profile at `/settings`
5. **Explore**: Browse at `/explore`
6. **Creator Mode**: Enable in `/settings` → Creator Settings

## 📊 Check Your Data

View your data in Supabase:

- **Users**: Authentication → Users
- **Profiles**: Table Editor → profiles
- **Posts**: Table Editor → posts
- **Subscriptions**: Table Editor → subscriptions

## 🚀 Optional: OAuth Setup

To enable Apple/Google Sign-In, follow the detailed instructions in `SETUP.md`

## 💡 Pro Tips

1. **Auto-reload**: The dev server auto-reloads when you save files
2. **Check logs**: Look at terminal for server errors
3. **Browser console**: Press F12 to see client-side errors
4. **Supabase logs**: Check Supabase Dashboard → Logs for database errors

## Need Help?

1. Check the browser console (F12) for error messages
2. Check terminal for server errors
3. Verify all environment variables are set correctly
4. Make sure Supabase project is active
5. Confirm SQL schema ran without errors

---

**Once configured, the platform is fully functional with all features working!**
