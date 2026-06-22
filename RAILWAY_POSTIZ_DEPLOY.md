# Deploy Postiz to Railway

This guide walks you through deploying Postiz (an open-source social media scheduler) to Railway, which enables real social media posting from ContentOS.

## Prerequisites

- Railway account (https://railway.app)
- GitHub account
- Social media accounts you want to connect (TikTok, Instagram, YouTube, Facebook)

## Step 1: Deploy Postiz to Railway

1. **Sign up for Railway**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Fork the Postiz repository: https://github.com/gitroomhq/postiz-app
   - Select your forked repo

3. **Configure Environment Variables**
   
   Railway will auto-detect most settings, but you need to add:
   
   ```
   NEXTAUTH_URL=https://your-app.up.railway.app
   NEXT_PUBLIC_BACKEND_URL=https://your-app.up.railway.app
   JWT_SECRET=your-random-secret-here
   ```
   
   Generate a secure JWT_SECRET:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Deploy**
   - Railway will automatically build and deploy
   - Wait for deployment to complete (~2-3 minutes)
   - Note your deployment URL (e.g., `https://postiz-xxxx.up.railway.app`)

## Step 2: Create Postiz Account

1. Open your Postiz URL in browser
2. Click "Sign Up" (first user becomes admin)
3. Create your account with email/password

## Step 3: Connect Social Accounts

### TikTok
1. In Postiz, go to "Channels" → "Add Channel"
2. Select TikTok
3. Authorize with your TikTok account
4. Grant necessary permissions

### Instagram
1. Go to "Channels" → "Add Channel"
2. Select Instagram
3. Log in and authorize
4. Note: Instagram requires Business or Creator account

### YouTube
1. Go to "Channels" → "Add Channel"
2. Select YouTube
3. Authorize with Google account
4. Select which channel to use

### Facebook
1. Go to "Channels" → "Add Channel"
2. Select Facebook
3. Authorize and select Page
4. Grant posting permissions

## Step 4: Get API Key

1. In Postiz, go to Settings → API Keys
2. Click "Create API Key"
3. Name it "ContentOS"
4. Copy the API key (starts with `pk_...`)

## Step 5: Connect to ContentOS

### Local Development

Edit `/Users/iyohagraham/ContentOS/.env.local`:

```bash
POSTIZ_URL=https://your-postiz-app.up.railway.app
POSTIZ_API_KEY=pk_your_api_key_here
```

Restart dev server:
```bash
cd /Users/iyohagraham/ContentOS
npm run dev
```

### Production (Vercel)

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `POSTIZ_URL` = `https://your-postiz-app.up.railway.app`
   - `POSTIZ_API_KEY` = `pk_your_api_key_here`
3. Redeploy

## Step 6: Verify Connection

1. Open ContentOS
2. Go to "Channels" view
3. You should see "Postiz Social Manager" banner showing "Connected"
4. Click "Sync Channels" to import your connected accounts
5. Your social accounts should appear as channel cards

## Step 7: Test Posting

1. Create a video in ContentOS
2. Go through the pipeline (Script → Voice → Visuals → Render)
3. At Step 5 "Publish", select a channel
4. Click "Post Now"
5. Check your social media account - the video should appear!

## Troubleshooting

### "Postiz not configured" error
- Verify `POSTIZ_URL` and `POSTIZ_API_KEY` are set correctly
- Check that Postiz deployment is running (not paused)
- Ensure API key has correct permissions

### OAuth connection fails
- TikTok: Must use Business account (not personal)
- Instagram: Must be Business or Creator account
- YouTube: Must have channel created
- Facebook: Must be a Page (not personal profile)

### Posts fail to publish
- Check Postiz logs in Railway dashboard
- Verify API key is valid
- Check platform-specific requirements (video length, format, etc.)

## Railway Pricing

- Free tier: $5 credit/month (usually enough for light usage)
- Typical cost: $5-10/month for active posting
- Monitor usage in Railway Dashboard → Usage tab

## What's Next?

Once Postiz is connected:
- ✅ Auto-posting scheduler works
- ✅ Multi-platform publishing enabled
- ✅ Analytics sync pulls real data
- ✅ Content calendar shows scheduled posts

You can now post to real social accounts directly from ContentOS!
