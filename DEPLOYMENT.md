# Deployment Guide for VarsiVoice (Freedom Wall)

## Quick Start: Deploy to Render (Recommended)

### Step 1: Prepare Your Code
1. Make sure all files are committed to Git
2. Push to GitHub (or GitLab)

### Step 2: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub account
3. Click "New +" → "Web Service"

### Step 3: Connect Repository
1. Select your GitHub repository
2. Name: `varsivice` (or your choice)
3. Environment: `Python 3`
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `gunicorn app:app`

### Step 4: Set Environment Variables
In Render dashboard, go to "Environment" and add:
```
MAIL_USERNAME=your-gmail@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=your-gmail@gmail.com
```

**Important:** For Gmail, use an [App Password](https://myaccount.google.com/apppasswords), not your regular password.

### Step 5: Deploy
Click "Deploy" and wait 2-5 minutes. Your app will be live at `https://varsivice.onrender.com`

---

## Database Considerations

### SQLite (Current Setup)
- Works on Render's free tier
- Database file persists in the app directory
- **Limitation:** Data resets if the app restarts (free tier)

### Better for Production: PostgreSQL
If you want persistent data, upgrade to PostgreSQL:
1. In Render, create a PostgreSQL database
2. Update your app to use PostgreSQL instead of SQLite
3. Modify `app.py` to connect to PostgreSQL

---

## Alternative Hosting Options

### PythonAnywhere
1. Go to [pythonanywhere.com](https://pythonanywhere.com)
2. Sign up (free tier available)
3. Upload your files via web interface
4. Configure web app settings
5. Set up WSGI file to point to your Flask app

### Railway
1. Go to [railway.app](https://railway.app)
2. Connect GitHub
3. Select your repo
4. Add environment variables
5. Deploy

### Fly.io
1. Go to [fly.io](https://fly.io)
2. Install Fly CLI
3. Run `flyctl launch` in your project directory
4. Follow prompts
5. Deploy with `flyctl deploy`

---

## Important Notes

### File Uploads
- Render's free tier has ephemeral storage (files deleted on restart)
- For production, use cloud storage (AWS S3, Cloudinary, etc.)
- Currently, uploaded images are stored locally in `static/uploads/`

### Database Backups
- Download your `freedom_wall.db` regularly
- Consider migrating to PostgreSQL for production

### Email Configuration
- Gmail requires "App Passwords" (not your regular password)
- Enable 2-factor authentication first
- Get app password from: https://myaccount.google.com/apppasswords

### CORS & Security
- Update `ALLOWED_HOSTS` if needed
- Set `FLASK_ENV=production` in production
- Use HTTPS (automatic on Render)

---

## Troubleshooting

### "ModuleNotFoundError"
- Make sure all imports are in `requirements.txt`
- Check Python version compatibility

### Database Not Found
- Ensure `freedom_wall.db` is in the root directory
- Check file permissions

### Email Not Sending
- Verify Gmail app password is correct
- Check MAIL_USERNAME and MAIL_PASSWORD in environment variables
- Ensure 2FA is enabled on Gmail account

### Static Files Not Loading
- Run `flask --app app run` locally to test
- Check that `static/` folder is in the root directory

---

## Local Testing Before Deployment

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
python app.py

# Test at http://localhost:5000
```

---

## Next Steps

1. **Choose a hosting provider** (Render recommended)
2. **Push code to GitHub**
3. **Create account and connect repository**
4. **Set environment variables**
5. **Deploy and test**

Good luck! 🚀
