# Complete Render Deployment Tutorial

## What is Render?

Render is a cloud hosting platform that makes deploying web apps super easy. It automatically:
- Deploys your code when you push to GitHub
- Manages servers for you
- Provides free SSL certificates (HTTPS)
- Scales automatically

---

## Prerequisites

Before starting, you need:

1. **GitHub Account** - [github.com](https://github.com)
2. **Your code pushed to GitHub** - Your project repository
3. **Render Account** - [render.com](https://render.com)

### Step 0: Push Your Code to GitHub

If you haven't already:

```bash
# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Add remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Step 1: Create a Render Account

1. Go to **[render.com](https://render.com)**
2. Click **"Sign Up"** (top right)
3. Choose **"Sign up with GitHub"** (easiest option)
4. Authorize Render to access your GitHub account
5. You're in! ✓

---

## Step 2: Create a New Web Service

1. In Render dashboard, click **"New +"** (top right)
2. Select **"Web Service"**
3. You'll see a list of your GitHub repositories
4. Find your project and click **"Connect"**

---

## Step 3: Configure Your Web Service

After clicking Connect, you'll see a form. Fill it out:

### **Name**
- Enter: `varsivice` (or your app name)
- This becomes part of your URL: `varsivice.onrender.com`

### **Environment**
- Select: **Python 3**

### **Build Command**
- Enter: `pip install -r requirements.txt`
- This installs all your Python packages

### **Start Command**
- Enter: `gunicorn app:app`
- This starts your Flask app using Gunicorn (production server)

### **Instance Type**
- Select: **Free** (for testing)
- Paid plans available if you need more power

### **Auto-Deploy**
- Toggle: **ON** (recommended)
- This auto-deploys when you push to GitHub

---

## Step 4: Add Environment Variables

Environment variables are secret settings (like passwords) that your app needs.

1. Scroll down to **"Environment"** section
2. Click **"Add Environment Variable"**
3. Add these variables:

| Key | Value | Notes |
|-----|-------|-------|
| `MAIL_USERNAME` | your-email@gmail.com | Your Gmail address |
| `MAIL_PASSWORD` | xxxx xxxx xxxx xxxx | Gmail App Password (see below) |
| `MAIL_FROM` | your-email@gmail.com | Same as MAIL_USERNAME |

### **How to Get Gmail App Password:**

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Click **"Security"** (left sidebar)
3. Enable **"2-Step Verification"** (if not already enabled)
4. Scroll down to **"App passwords"**
5. Select: Phone: **Your device** → App: **Mail** → Device: **Windows Computer**
6. Google generates a 16-character password
7. Copy it and paste into Render's `MAIL_PASSWORD` field

---

## Step 5: Deploy!

1. Scroll to the bottom
2. Click **"Create Web Service"**
3. Render starts building and deploying
4. Watch the logs in real-time
5. When you see **"Your service is live"**, it's done! ✓

Your app is now live at: `https://varsivice.onrender.com`

---

## Step 6: Test Your App

1. Go to your Render dashboard
2. Click on your service name
3. Click the URL at the top (e.g., `https://varsivice.onrender.com`)
4. Your app should load!

---

## Understanding the Render Dashboard

### **Logs Tab**
- Shows what's happening with your app
- Useful for debugging errors
- Click **"Tail logs"** to see live updates

### **Events Tab**
- Shows deployment history
- When you pushed code, when it deployed, etc.

### **Settings Tab**
- Change environment variables
- Update build/start commands
- Manage custom domains

### **Metrics Tab**
- CPU usage, memory, requests
- Helps you see if your app is healthy

---

## Auto-Deploy: How It Works

When you push code to GitHub:

1. Render detects the push
2. Pulls your latest code
3. Runs build command: `pip install -r requirements.txt`
4. Runs start command: `gunicorn app:app`
5. Your app updates automatically (no manual redeploy needed!)

### Example:
```bash
# Make a change locally
# Edit app.py, save it

# Push to GitHub
git add .
git commit -m "Fixed bug"
git push

# Render automatically deploys! ✓
# Check your app in 1-2 minutes
```

---

## Common Issues & Fixes

### **"Build failed"**
- Check the logs for errors
- Usually missing package in `requirements.txt`
- Add it and push again

### **"ModuleNotFoundError: No module named 'flask'"**
- Your `requirements.txt` is missing packages
- Add them and push again

### **"Port already in use"**
- Render handles this automatically
- Not an issue on Render

### **"Database not found"**
- Make sure `freedom_wall.db` is in your root directory
- Commit it to GitHub
- Push and redeploy

### **"Static files not loading"**
- Check that `static/` folder exists in root
- Commit it to GitHub
- Push and redeploy

### **"Email not sending"**
- Verify Gmail app password is correct
- Check environment variables in Render dashboard
- Make sure 2FA is enabled on Gmail

---

## Database: Important Note

### Current Setup (SQLite)
- Your `freedom_wall.db` file is stored on Render's server
- **Problem:** Free tier has "ephemeral storage" = data resets when app restarts
- **Solution:** Use PostgreSQL (persistent database)

### Upgrade to PostgreSQL (Optional)

If you want data to persist:

1. In Render dashboard, click **"New +"**
2. Select **"PostgreSQL"**
3. Name it: `varsivice-db`
4. Click **"Create Database"**
5. Copy the connection string
6. Update your `app.py` to use PostgreSQL instead of SQLite
7. Redeploy

---

## File Uploads: Important Note

Currently, uploaded images are saved to `static/uploads/` on the server.

### Problem:
- Free tier deletes files when app restarts
- Uploaded images disappear

### Solution:
Use cloud storage like:
- **Cloudinary** (easiest, free tier)
- **AWS S3** (more powerful)
- **Firebase Storage**

For now, uploads work fine for testing. For production, set up cloud storage.

---

## Custom Domain (Optional)

Want your own domain instead of `varsivice.onrender.com`?

1. Buy a domain (GoDaddy, Namecheap, etc.)
2. In Render, go to **Settings** → **Custom Domains**
3. Add your domain
4. Update DNS settings at your domain provider
5. Render provides instructions

---

## Monitoring Your App

### Check if it's running:
- Go to your Render dashboard
- Look for green **"Live"** indicator

### View logs:
- Click **"Logs"** tab
- See what's happening in real-time

### Check performance:
- Click **"Metrics"** tab
- See CPU, memory, requests

---

## Updating Your App

### To make changes:

1. **Edit code locally**
   ```bash
   # Make changes to app.py, etc.
   ```

2. **Test locally**
   ```bash
   python app.py
   # Visit http://localhost:5000
   ```

3. **Commit and push**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```

4. **Render auto-deploys** (1-2 minutes)

5. **Check your live app**
   - Visit `https://varsivice.onrender.com`

---

## Pricing

### Free Tier:
- ✓ 1 web service
- ✓ 0.5 GB RAM
- ✓ Shared CPU
- ✗ Spins down after 15 min of inactivity (slow first request)
- ✗ Ephemeral storage (data resets)

### Paid Tiers:
- **Starter ($7/month):** Always on, 1 GB RAM
- **Standard ($12/month):** 2 GB RAM, better performance
- **Pro ($25+/month):** More power, priority support

---

## Summary: Quick Checklist

- [ ] Code pushed to GitHub
- [ ] Render account created
- [ ] Web Service created
- [ ] Build command: `pip install -r requirements.txt`
- [ ] Start command: `gunicorn app:app`
- [ ] Environment variables added (MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM)
- [ ] Deployed and live!
- [ ] Tested at your Render URL

---

## Next Steps

1. **Deploy now** using this guide
2. **Test your app** at the Render URL
3. **Make changes** and push to GitHub (auto-deploys)
4. **Monitor logs** if anything goes wrong
5. **Upgrade to paid** if you need persistent storage

---

## Need Help?

- **Render Docs:** https://render.com/docs
- **Flask Docs:** https://flask.palletsprojects.com
- **GitHub Help:** https://docs.github.com

Good luck! 🚀
