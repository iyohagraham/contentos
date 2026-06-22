# Deploy Postiz to Railway - Connect Real Social Accounts

## Why Postiz?

Postiz is an open-source social media scheduler that handles OAuth for TikTok, Instagram, YouTube, and Facebook. Instead of building custom integrations for each platform (which requires app approval, business verification, etc.), you deploy Postiz once and connect all your accounts through its UI.

## Step 1: Deploy Postiz to Railway

### Option A: One-Click Deploy (Recommended)

1. **Sign up for Railway**
   - Go to https://railway.app
   - Sign up with GitHub (free tier: $5 credit/month)

2. **Deploy Postiz Template**
   - Click: https://railway.app/template/postiz
   - Or: Railway Dashboard → New Project → Deploy from Template → Search "Postiz"
   - Click "Deploy"

3. **Wait for Deployment** (~2-3 minutes)
   - Railway will create 3 services: Postiz app, PostgreSQL database, Redis cache
   - You'll see a URL like: `https://postiz-xxxx.up.railway.app`

4. **Configure Environment Variables**
   - Click on the Postiz service
   - Go to "Variables" tab
   - Add these (Railway auto-fills some):
     ```
     NEXTAUTH_URL=https://postiz-xxxx.up.railway.app
     NEXT_PUBLIC_BACKEND_URL=https://postiz-xxxx.up.railway.app
     JWT_SECRET=<generate-a-random-string>
     ```
   - Generate JWT_SECRET: `openssl rand -base64 32`

5. **Redeploy** (Railway auto-detects changes)

### Option B: Manual Deploy (If template unavailable)

1. Create new Railway project
2. Add PostgreSQL database
3. Add Redis
4. Add new service → Deploy from GitHub → `git@github.com:gitroomhq/postiz-app.git`
5. Set environment variables (same as above)
6. Deploy

## Step 2: Create Postiz Account

1. Open your Postiz URL: `https://postiz-xxxx.up.railway.app`
2. Click "Sign Up" (first user becomes admin)
3. Create account with email/password
4. Log in

## Step 3: Connect Social Accounts

### TikTok

1. In Postiz, click "Add Channel" → TikTok
2. Click "Connect TikTok"
3. Log in to your TikTok account
4. Grant permissions
5. Select the account(s) you want to post from

### Instagram

1. Click "Add Channel" → Instagram
2. Log in to Instagram (must be Business or Creator account)
3. Grant permissions
4. Select the account

**Note:** Personal Instagram accounts need to be switched to Business/Creator first:
- Instagram app → Settings → Account → Switch to Professional Account

### YouTube

1. Click "Add Channel" → YouTube
2. Log in to Google account
3. Select YouTube channel
4. Grant permissions

### Facebook

1. Click "Add Channel" → Facebook
2. Log in to Facebook
3. Select the Page you want to post from
4. Grant permissions

## Step 4: Get Postiz API Key

1. In Postiz, click your profile icon (top right)
2. Go to "Settings"
3. Click "API Keys" tab
4. Click "Create API Key"
5. Name it: `ContentOS`
6. Copy the key (starts with `pzk_...`)

## Step 5: Connect Postiz to ContentOS

### Local Development

Edit `/Users/iyohagraham/ContentOS/.env.local`:

```bash
# Add these lines:
POSTIZ_URL=https://postiz-xxxx.up.railway.app
POSTIZ_API_KEY=pzk_your_api_key_here
```

Restart the dev server:
```bash
pkill -f "node server.js"
cd /Users/iyohagraham/ContentOS
node server.js &
```

Test locally:
```bash
curl http://localhost:3001/api/postiz/status
# Should return: {"configured":true,"channelCount":2}
```

### Production (Vercel)

1. Go to https://vercel.com/dashboard
2. Select your `contentos` project
3. Go to "Settings" → "Environment Variables"
4. Add:
   - `POSTIZ_URL` = `https://postiz-xxxx.up.railway.app`
   - `POSTIZ_API_KEY` = `pzk_your_api_key_here`
5. Redeploy:
   ```bash
   cd /Users/iyohagraham/ContentOS
   npx vercel --prod
   ```

Test production:
```bash
curl https://contentos-kappa.vercel.app/api/postiz/status
# Should return: {"configured":true,"channelCount":2}
```

## Step 6: Sync Channels in ContentOS

1. Open ContentOS: https://contentos-kappa.vercel.app
2. Go to "Channels" view
3. You'll see "Postiz Social Manager" banner showing "Connected • 2 channels"
4. Click "Sync Channels"
5. Your connected accounts will appear as channel cards
6. Toggle "Auto-Post" for any channel you want to publish to automatically

## Step 7: Test Posting

1. Generate a script (Create view → Generate Script)
2. Create a video (Create view → Generate Video)
3. Go to Channels view
4. Click "Post Now" on any channel
5. Check the platform — your video should appear!

## Troubleshooting

### "Postiz not configured" error

- Verify `POSTIZ_URL` and `POSTIZ_API_KEY` are set in Vercel env vars
- Redeploy to Vercel after adding env vars
- Check Railway deployment is running (not paused)

### OAuth connection fails

- **TikTok**: Must use TikTok Business account (not personal)
- **Instagram**: Must be Business or Creator account
- **YouTube**: Must have YouTube channel created
- **Facebook**: Must be a Page (not personal profile)

### Posts fail to publish

- Check Postiz logs: Railway Dashboard → Postiz service → "Deployments" → "View Logs"
- Verify API key has correct permissions
- Check platform-specific requirements (e.g., Instagram requires video to be < 90 seconds for Reels)

### Railway costs

- Free tier: $5 credit/month (usually enough for light usage)
- Typical cost: $5-10/month for active posting
- Monitor usage: Railway Dashboard → "Usage" tab

## What's Next?

Once Postiz is connected:

1. **Auto-posting scheduler** — ContentOS will automatically post to enabled channels at optimal times
2. **Multi-platform publishing** — Post to TikTok, Instagram, YouTube, Facebook simultaneously
3. **Analytics sync** — Pull engagement data back into ContentOS dashboard
4. **Content calendar** — Schedule posts in advance from the Channels view

## Alternative: Self-Host Postiz (Advanced)

If you want to avoid Railway costs and have Docker experience:

```bash
# Requires: Docker, 2GB RAM, 5GB disk
git clone https://github.com/gitroomhq/postiz-app.git
cd postiz-app
docker compose up -d
```

Then use `http://localhost:3000` as your `POSTIZ_URL`.

**Note:** Your machine has 9.5GB disk and 8GB RAM — tight but possible. Railway is recommended for reliability.
