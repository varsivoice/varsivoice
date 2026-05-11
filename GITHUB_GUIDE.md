# Complete GitHub Guide: Push Your Code Step-by-Step

## What is GitHub?

GitHub is a platform where you store your code online. It:
- Backs up your code
- Lets you track changes
- Allows collaboration
- Integrates with Render for auto-deployment

---

## Prerequisites

1. **Git installed** - Download from [git-scm.com](https://git-scm.com)
2. **GitHub account** - Sign up at [github.com](https://github.com)
3. **Your project folder** - Your Flask app directory

---

## Step 1: Create a GitHub Account

1. Go to **[github.com](https://github.com)**
2. Click **"Sign up"** (top right)
3. Enter email, password, username
4. Verify your email
5. Done! ✓

---

## Step 2: Install Git

### On Windows:

1. Go to **[git-scm.com](https://git-scm.com)**
2. Click **"Download for Windows"**
3. Run the installer
4. Click **"Next"** through all screens (default settings are fine)
5. Click **"Install"**
6. Click **"Finish"**

### Verify Git is installed:

Open Command Prompt (cmd) and type:
```bash
git --version
```

You should see something like: `git version 2.40.0`

---

## Step 3: Configure Git (First Time Only)

Open Command Prompt and run these commands:

```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@gmail.com"
```

Replace:
- `Your Name` with your actual name
- `your-email@gmail.com` with your GitHub email

Example:
```bash
git config --global user.name "Fullerine Alcuino"
git config --global user.email "foalcuino@universityofbohol.edu.ph"
```

---

## Step 4: Create a Repository on GitHub

1. Go to **[github.com](https://github.com)** (logged in)
2. Click **"+"** (top right) → **"New repository"**
3. Fill in the form:

| Field | Value |
|-------|-------|
| Repository name | `varsivice` (or your project name) |
| Description | `Freedom Wall - Student Publication Platform` |
| Public/Private | **Public** (so Render can access it) |
| Add .gitignore | Select **Python** |
| Add license | Optional (MIT is good) |

4. Click **"Create repository"**
5. You'll see a page with instructions - **keep this page open!**

---

## Step 5: Push Your Code to GitHub

### Option A: Using Command Prompt (Recommended)

1. **Open Command Prompt**
   - Press `Win + R`
   - Type `cmd`
   - Press Enter

2. **Navigate to your project folder**
   ```bash
   cd "c:\Users\Fullerine Alcuino\OneDrive\PROGRAMMING PROGRAMMING\HTML\Trial"
   ```

3. **Initialize Git** (one time only)
   ```bash
   git init
   ```

4. **Add all your files**
   ```bash
   git add .
   ```

5. **Create your first commit**
   ```bash
   git commit -m "Initial commit - Freedom Wall app"
   ```

6. **Rename branch to main** (GitHub uses "main" by default)
   ```bash
   git branch -M main
   ```

7. **Add remote repository** (replace YOUR_USERNAME and REPO_NAME)
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/varsivice.git
   ```

   Example:
   ```bash
   git remote add origin https://github.com/fullerinealcuino/varsivice.git
   ```

8. **Push to GitHub**
   ```bash
   git push -u origin main
   ```

9. **Enter your GitHub credentials**
   - Username: Your GitHub username
   - Password: Your GitHub personal access token (see below)

---

## Step 6: Create a GitHub Personal Access Token

GitHub now requires a token instead of your password for command-line access.

1. Go to **[github.com/settings/tokens](https://github.com/settings/tokens)**
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Fill in:
   - **Note:** `Git Push Token`
   - **Expiration:** 90 days (or longer)
   - **Scopes:** Check `repo` (full control of private repositories)
4. Click **"Generate token"**
5. **Copy the token** (you won't see it again!)
6. Use this token as your password when pushing

---

## Step 7: Verify Your Code is on GitHub

1. Go to **[github.com](https://github.com)**
2. Click your profile (top right) → **"Your repositories"**
3. Click **"varsivice"** (your repo)
4. You should see all your files! ✓

---

## Making Changes and Pushing Updates

After you've done the initial push, updating is easy:

### 1. Make changes to your code locally
```bash
# Edit app.py, add new features, etc.
```

### 2. Check what changed
```bash
git status
```

You'll see a list of modified files.

### 3. Add your changes
```bash
git add .
```

### 4. Commit with a message
```bash
git commit -m "Fixed bug in login system"
```

Good commit messages:
- ✓ "Added user authentication"
- ✓ "Fixed database connection issue"
- ✓ "Updated email verification"
- ✗ "stuff"
- ✗ "asdf"

### 5. Push to GitHub
```bash
git push
```

That's it! Your changes are now on GitHub.

---

## Common Git Commands

| Command | What it does |
|---------|-------------|
| `git status` | See what files changed |
| `git add .` | Stage all changes |
| `git commit -m "message"` | Save changes with a message |
| `git push` | Upload to GitHub |
| `git pull` | Download latest from GitHub |
| `git log` | See commit history |
| `git diff` | See exact changes made |

---

## Step-by-Step Example: Your First Push

Let's say you're in your project folder. Here's the complete workflow:

```bash
# 1. Check current folder
cd "c:\Users\Fullerine Alcuino\OneDrive\PROGRAMMING PROGRAMMING\HTML\Trial"

# 2. Initialize Git
git init

# 3. Add all files
git add .

# 4. Create first commit
git commit -m "Initial commit - Freedom Wall app"

# 5. Rename to main
git branch -M main

# 6. Add remote (replace with YOUR username)
git remote add origin https://github.com/YOUR_USERNAME/varsivice.git

# 7. Push to GitHub
git push -u origin main

# When prompted:
# Username: your-github-username
# Password: your-personal-access-token (from Step 6)
```

---

## Troubleshooting

### "fatal: not a git repository"
- You're not in the right folder
- Use `cd` to navigate to your project folder
- Run `git init` first

### "fatal: remote origin already exists"
- You already added the remote
- Run: `git remote remove origin`
- Then add it again

### "Permission denied (publickey)"
- Your SSH key isn't set up
- Use HTTPS instead: `https://github.com/username/repo.git`
- Or create a personal access token (Step 6)

### "fatal: The current branch main has no upstream branch"
- Use: `git push -u origin main` (with the `-u` flag)

### "nothing to commit, working tree clean"
- You haven't made any changes
- Edit a file and try again

---

## Using GitHub Desktop (Easier Alternative)

If command line is intimidating, use GitHub Desktop:

1. Download from **[desktop.github.com](https://desktop.github.com)**
2. Install and sign in with GitHub account
3. Click **"File"** → **"Add Local Repository"**
4. Select your project folder
5. Click **"Publish repository"**
6. Make changes to your code
7. GitHub Desktop shows changes automatically
8. Click **"Commit to main"**
9. Click **"Push origin"**

Much easier! No command line needed.

---

## Connecting to Render

Once your code is on GitHub:

1. Go to **[render.com](https://render.com)**
2. Click **"New +"** → **"Web Service"**
3. Select your GitHub repository
4. Render automatically deploys!

Every time you push to GitHub, Render automatically redeploys your app.

---

## Best Practices

### Good commit messages:
```bash
git commit -m "Add user authentication system"
git commit -m "Fix database connection timeout"
git commit -m "Update email verification template"
```

### Bad commit messages:
```bash
git commit -m "stuff"
git commit -m "fix"
git commit -m "asdf"
```

### Commit frequently:
- Don't wait until you've made 100 changes
- Commit after each feature or bug fix
- Makes it easier to track changes

### Push regularly:
- Push at least once a day
- Backs up your code
- Allows Render to auto-deploy

---

## Summary: Quick Checklist

- [ ] Git installed
- [ ] GitHub account created
- [ ] Git configured with your name and email
- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] Verified files appear on GitHub.com
- [ ] Ready to connect to Render!

---

## Next Steps

1. **Follow this guide** to push your code
2. **Verify on GitHub.com** that your files are there
3. **Connect to Render** (see RENDER_TUTORIAL.md)
4. **Your app goes live!**

---

## Need Help?

- **Git Docs:** https://git-scm.com/doc
- **GitHub Docs:** https://docs.github.com
- **GitHub Desktop:** https://desktop.github.com

Good luck! 🚀
