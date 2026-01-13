# 🔐 User Guide - Authentication & Account Recovery

**Last Updated:** January 11, 2026  
**Version:** 1.0.0

Welcome to the FieldView.Live authentication guide! This document helps you manage your account, reset passwords, and restore access to streams.

---

## 📋 Table of Contents

1. [Password Reset (Owner/Staff)](#password-reset-ownerstaffÂ)
2. [Password Reset (Super Admin)](#password-reset-super-admin)
3. [Viewer Access Refresh](#viewer-access-refresh)
4. [Troubleshooting](#troubleshooting)
5. [FAQ](#faq)

---

## 🔑 Password Reset (Owner/Staff)

If you've forgotten your password as a team owner or staff member, follow these steps:

### Step 1: Request Password Reset

1. Go to [fieldview.live/forgot-password](https://fieldview.live/forgot-password)
2. Select **"Team Owner / Staff"** (default option)
3. Enter your email address
4. Click **"Send Reset Link"**
5. Check your inbox for an email from `noreply@fieldview.live`

**Expected Email Arrival:** Within 2-5 minutes

### Step 2: Check Your Email

You'll receive an email with the subject: **"Reset Your FieldView.Live Password"**

The email contains:
- A secure reset link
- Link expiration time (15 minutes)
- Security information

**⚠️ Important:** The link expires in **15 minutes**. If it expires, request a new one.

### Step 3: Reset Your Password

1. Click the reset link in your email
2. Enter your new password
3. Confirm your new password
4. Click **"Reset Password"**

**Password Requirements:**
- ✅ Minimum 8 characters
- ✅ At least 1 uppercase letter (A-Z)
- ✅ At least 1 lowercase letter (a-z)
- ✅ At least 1 number (0-9)
- ✅ At least 1 special character (!@#$%^&*)

**Password Strength Indicator:**
- 🔴 **Weak:** Less than 3 requirements met
- 🟡 **Fair:** 3-4 requirements met
- 🔵 **Good:** All 5 requirements met
- 🟢 **Strong:** All requirements + 12+ characters (recommended)

### Step 4: Login with New Password

After successful reset:
- ✅ You'll be redirected to the login page
- ✅ All existing sessions are logged out (security)
- ✅ You can immediately login with your new password

---

## 🔒 Password Reset (Super Admin)

Super Admins have additional security measures:

### Differences from Owner/Staff Reset

1. **Shorter Expiration:** Reset links expire in **10 minutes** (instead of 15)
2. **MFA Reset Required:** If you have Multi-Factor Authentication (MFA) enabled, you'll need to set it up again after resetting your password
3. **Security Email:** Your reset email includes an MFA warning

### Steps

1. Go to [fieldview.live/forgot-password](https://fieldview.live/forgot-password)
2. Select **"🔒 Super Admin"**
3. Enter your admin email address
4. Click **"Send Reset Link"**
5. Check your inbox (link expires in 10 minutes)
6. Click the reset link
7. Create a strong new password
8. Login with your new password
9. **Re-setup MFA** on your next login (if previously enabled)

**Why MFA Reset?**
For security reasons, password resets invalidate existing MFA configurations to prevent unauthorized access.

---

## 🎬 Viewer Access Refresh

If you're watching a stream and your access expires, you can quickly restore it:

### When Do I Need This?

- Your viewing link has expired
- You see an "Access Expired" overlay
- You're asked to verify your email

### Step 1: Request New Access

When you see the "Access Expired" overlay:

1. Enter your email address (the one you registered with)
2. Click **"Request New Access"**
3. Check your inbox

**Expected Email Arrival:** Within 2-5 minutes

### Step 2: Verify Your Access

1. Open the email from `noreply@fieldview.live`
2. Subject: **"🎬 Continue watching: [Stream Name]"**
3. Click **"Continue Watching"**
4. Your access will be verified automatically
5. You'll be redirected back to the stream in 3 seconds

**⚠️ Important:** The verification link expires in **15 minutes**.

### What Happens After Verification?

- ✅ Your access is immediately restored
- ✅ You can participate in chat (if registered)
- ✅ You can interact with the scoreboard
- ✅ You're redirected back to where you were watching

---

## 🔧 Troubleshooting

### "I Didn't Receive the Email"

**Check These First:**
1. **Spam/Junk Folder:** Check your spam folder for emails from `noreply@fieldview.live`
2. **Wait 5-10 Minutes:** Email delivery can take a few minutes
3. **Correct Email:** Ensure you entered the correct email address
4. **Request Again:** You can request a new link if the first one doesn't arrive

**Still Not Working?**
- Contact support: support@fieldview.live
- Include your email address (we won't share it)

### "My Reset Link Expired"

**What Happened:**
- Owner/Staff links expire after 15 minutes
- Admin links expire after 10 minutes
- This is a security feature

**Solution:**
1. Go back to [fieldview.live/forgot-password](https://fieldview.live/forgot-password)
2. Request a new reset link
3. Check your email immediately
4. Complete the reset within the time limit

### "My Password Doesn't Meet Requirements"

**Common Issues:**

❌ **"Too short"** → Must be at least 8 characters  
❌ **"No uppercase"** → Add at least one capital letter (A-Z)  
❌ **"No lowercase"** → Add at least one lowercase letter (a-z)  
❌ **"No number"** → Add at least one digit (0-9)  
❌ **"No special character"** → Add !@#$%^&*() or similar  

**Example Strong Passwords:**
- `MyStream2026!`
- `FieldView#2026`
- `Soccer@Game24`

**Pro Tip:** Use the password strength indicator to see what's missing!

### "I'm Being Rate Limited"

**What This Means:**
You've requested too many password resets in a short time (security protection).

**How Many Requests:**
- Maximum: **3 requests per hour**
- Window: Rolling 60 minutes

**Solution:**
1. Wait 1 hour from your first request
2. The counter resets automatically
3. Try again after the hour is up

**Why This Limit?**
- Protects against automated attacks
- Prevents abuse
- Industry standard security practice

**Need Urgent Help?**
Contact support: support@fieldview.live

### "Passwords Don't Match"

**What Happened:**
The password and confirmation password don't match exactly.

**Solution:**
1. Carefully re-enter your desired password
2. Copy/paste the same password in both fields
3. Check for extra spaces
4. Ensure Caps Lock is off

### "Invalid Reset Link"

**Possible Reasons:**

1. **Link Expired:** Request a new one
2. **Link Already Used:** You can only use each link once
3. **Incomplete Link:** Make sure you copied the entire URL
4. **Tampered Link:** Don't modify the token in the URL

**Solution:**
Request a new reset link and try again.

---

## ❓ FAQ

### How long do reset links last?

- **Team Owner/Staff:** 15 minutes
- **Super Admin:** 10 minutes  
- **Viewer Refresh:** 15 minutes

### Can I reuse a reset link?

No. Each reset link is **single-use only** for security. Once used, you must request a new one.

### Why didn't I get a confirmation about my reset request?

For security reasons, we show the same message whether your email exists in our system or not. This prevents attackers from discovering valid email addresses.

**What you'll see:**
> "If an account exists with that email, you will receive a password reset link."

### How many times can I request a reset?

You can request up to **3 password resets per hour**. After that, you'll need to wait before requesting another.

### Will my password reset log me out everywhere?

Yes. When you reset your password, all active sessions are invalidated for security. You'll need to log in again on all devices.

### What happens if I reset my admin password?

Super Admins will need to **re-setup MFA** (Multi-Factor Authentication) after a password reset. This is a security feature to ensure your account remains protected.

### Can I reset my password from mobile?

Yes! The password reset flow works on all devices:
- 📱 iOS (iPhone, iPad)
- 📱 Android (phone, tablet)
- 💻 Desktop (Windows, Mac, Linux)
- 🌐 Any modern web browser

### Is my password stored securely?

Yes! We use **industry-standard bcrypt hashing** with salt. We never store passwords in plain text, and we can't see your password.

### What if I forget my email address?

Contact support at support@fieldview.live with any identifying information (team name, etc.) and we'll help you recover your account.

### Can I change my email address?

Yes, but you'll need to contact support. Email changes require verification to ensure account security.

### Why do I need to refresh my viewer access?

Viewer access links expire for security and licensing reasons. This ensures only authorized viewers can watch streams.

### How do I avoid frequent viewer refreshes?

- Use the same email address each time
- Check your inbox immediately when prompted
- Complete verification within 15 minutes

### Is my email shared with anyone?

No. Your email is private and used only for authentication and communication about your account. We never sell or share your email.

### What if I'm watching on public WiFi?

Password reset and viewer refresh links work on any network. However, we recommend:
- Using HTTPS (automatic on our site)
- Not sharing your reset links
- Logging out after using public devices

---

## 📞 Need More Help?

### Support Contact

**Email:** support@fieldview.live  
**Response Time:** Within 24 hours (usually faster)

**When Contacting Support, Include:**
- Your email address
- What you were trying to do
- Any error messages you saw
- Your device and browser (e.g., "iPhone 13, Safari")

### Security Concerns

**Security Email:** security@fieldview.live  
**For:** Account security issues, suspicious activity, or security questions

---

## 🎯 Quick Reference

### Password Reset Flow
```
Forgot Password → Enter Email → Check Inbox → 
Click Link → Enter New Password → Login
```

### Viewer Refresh Flow
```
Access Expired → Enter Email → Check Inbox → 
Click Link → Access Restored → Continue Watching
```

### Need Help?
- 📧 support@fieldview.live
- 🔒 security@fieldview.live

---

**Thank you for using FieldView.Live! Enjoy the game! 🎬⚽🏈**

