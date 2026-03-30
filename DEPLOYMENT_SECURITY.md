# 🔒 Deployment Security Guide

This document outlines the security configurations that have been implemented for production deployment.

## ✅ Security Fixes Applied

### 1. **Environment Variables Protection**
- ✅ `.env` file is already added to `.gitignore` (never committed to git)
- ✅ Use `.env.example` as a template for setting up new environments
- **Action**: When deploying, set environment variables on your hosting platform instead of using local `.env` file

### 2. **CORS (Cross-Origin Resource Sharing)**
- ✅ Changed from `origin: '*'` (insecure) to whitelist-based approach
- ✅ Uses `ALLOWED_ORIGINS` environment variable to control which domains can access your API
- **Action**: Set `ALLOWED_ORIGINS` on your deployment platform

### 3. **JWT Secret**
- ✅ Not changed (as per your request)
- ⚠️ **Recommendation**: For production, generate a strong random string (32+ characters) and update the JWT_SECRET environment variable on your hosting platform

---

## 🚀 Pre-Deployment Checklist

### Local Development (Already Configured)
```bash
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Production Deployment

Before deploying, set these environment variables on your hosting platform:

| Variable | Value | Example |
|----------|-------|---------|
| `NODE_ENV` | `production` | `production` |
| `MONGO_URI` | Your MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `PORT` | Server port | `3000` |
| `ADMIN_USER` | Admin username | Your secure username |
| `ADMIN_PASS` | Admin password | Your secure password |
| `JWT_SECRET` | Strong random secret (32+ chars) | `kR9mL2$xQ!nT5vB@wJ4cD7pF8sH3nM0` |
| `ALLOWED_ORIGINS` | Your domain (comma-separated) | `https://yourdomain.com,https://www.yourdomain.com` |

---

## 📋 CORS Configuration

### How It Works
The `ALLOWED_ORIGINS` environment variable controls which domains can make requests to your API.

### For Different Platforms

**Render.com Example:**
```
ALLOWED_ORIGINS=https://yourdomain-name.onrender.com,https://yourdomain.com
```

**Heroku Example:**
```
ALLOWED_ORIGINS=https://your-app-name.herokuapp.com,https://yourdomain.com
```

**Custom Domain:**
```
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Oracle Cloud Infrastructure (OCI):**
```
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

On OCI, set environment variables via SSH in your `.env` file:
```bash
ssh -i your-key.key ubuntu@YOUR_INSTANCE_IP
cd ~/Drycleaningbusinesswebsite
sudo nano .env
# Edit ALLOWED_ORIGINS with your domain(s)
pm2 restart drycleaningapp
```

---

## 🔑 Generating a Strong JWT Secret

Use this command to generate a secure random string:

**On Linux/Mac:**
```bash
openssl rand -base64 32
```

**On Windows (PowerShell):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 } | % { [Byte]$_ }))
```

**Or use an online generator:** [randomkeygen.com](https://randomkeygen.com)

---

## 🛡️ Additional Security Recommendations

1. **HTTPS Only**: Always use HTTPS (not HTTP) for your production domain
2. **Password Security**: Use a strong admin password in production
3. **MongoDB Security**: 
   - Ensure MongoDB Atlas has IP whitelist configured
   - Use strong database passwords
4. **API Rate Limiting**: Consider adding rate limiting middleware for production
5. **Request Validation**: All form inputs are validated on the backend
6. **Logging**: Enable logs on your hosting platform to monitor suspicious activity

---

## 🧪 Testing CORS Before Deployment

Test your CORS configuration locally:
```bash
# Terminal 1: Start backend
npm run server

# Terminal 2: Start frontend
npm run dev

# The frontend should communicate with backend without CORS errors
```

For production, your frontend domain must be included in `ALLOWED_ORIGINS`.

---

## ❓ Troubleshooting

### "CORS policy: No 'Access-Control-Allow-Origin' header"
- Check if your frontend domain is in `ALLOWED_ORIGINS` on the hosting platform
- Ensure `NODE_ENV=production` is set correctly

### "Invalid Token"
- Verify JWT_SECRET is set correctly on hosting platform
- Make sure it matches across all instances if multiple servers are running

### MongoDB Connection Failed
- Check if MONGO_URI connection string is correct
- Verify MongoDB Atlas IP whitelist includes your server's IP
- Check MongoDB credentials are correct

---

## 🌐 Oracle Cloud Infrastructure (OCI) - Specific Security

### Setting Environment Variables on OCI

When deployed on OCI Compute Instance:

```bash
# SSH into your instance
ssh -i your-key.key ubuntu@YOUR_INSTANCE_IP

# Navigate to your app
cd ~/Drycleaningbusinesswebsite

# Edit environment variables
sudo nano .env
```

**Critical Variables to Set:**
- `NODE_ENV=production`
- `ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com`
- `MONGO_URI=` (your MongoDB Atlas URI)
- `ADMIN_PASS=` (strong password, not the default)

After editing, restart the app:
```bash
pm2 restart drycleaningapp
```

### OCI Network Security

1. **Security List Configuration:**
   - Only open ports you need (80, 443, 3000)
   - Restrict port 3000 to your IP if not behind load balancer
   - Deny all by default, allow specific IPs

2. **MongoDB Atlas Whitelist:**
   - Go to MongoDB Atlas dashboard
   - Add your OCI instance's public IP to IP whitelist
   - Or use IP access list with CIDR block

3. **File Permissions:**
   ```bash
   # Make .env readable only by owner
   chmod 600 .env
   
   # Don't expose sensitive files
   chmod 700 ~/Drycleaningbusinesswebsite
   ```

### Monitoring on OCI

```bash
# Check app logs
pm2 logs drycleaningapp --lines 50

# Monitor in real-time
pm2 monit

# Check system resources
free -h        # Memory usage
df -h          # Disk usage
iostat -x  # I/O stats
```

