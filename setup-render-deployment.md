# 🚀 Render Deployment Setup Guide

## Step 1: Create PostgreSQL Database on Render

1. **Go to [render.com](https://render.com) and sign in**
2. **Click "New +" → "PostgreSQL"**
3. **Configure the database:**
   - **Name:** `calldocker-db`
   - **Database:** `calldocker`
   - **User:** `calldocker_user`
   - **Region:** Choose closest to your users
   - **Plan:** Start with "Free" for demo

4. **After creation, copy the connection details:**
   - **External Database URL** (looks like: `postgresql://calldocker_user:password@dpg-xxxxx-a.oregon-postgres.render.com/calldocker`)

## Step 2: Create Web Service

1. **Click "New +" → "Web Service"**
2. **Connect your GitHub repository:** `dudekarech/Calldock-render`
3. **Configure the service:**
   - **Name:** `calldocker-app`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free (for demo)

## Step 3: Set Environment Variables

In your Web Service settings, add these environment variables:

### Required Variables:
```bash
# Database Configuration (from your PostgreSQL service)
DATABASE_URL=postgresql://calldocker_user:password@dpg-xxxxx-a.oregon-postgres.render.com/calldocker

# Application Configuration
NODE_ENV=production
PORT=10000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SESSION_SECRET=your-session-secret-key-change-this-in-production

# Optional Redis (can be left empty for demo)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### How to get DATABASE_URL:
1. Go to your PostgreSQL service on Render
2. Click on the service name
3. Go to "Info" tab
4. Copy the "External Database URL"

## Step 4: Deploy

1. **Click "Create Web Service"**
2. **Wait for the build to complete** (usually 2-3 minutes)
3. **Check the logs** for any errors

## Step 5: Initialize Database

After successful deployment, you need to initialize the database:

1. **Go to your Web Service logs**
2. **Look for database connection success message**
3. **If you see database errors, check the DATABASE_URL format**

## Troubleshooting

### Common Issues:

1. **Database Connection Failed:**
   - Verify DATABASE_URL is correct
   - Check that PostgreSQL service is running
   - Ensure SSL is enabled (our code handles this)

2. **Build Failed:**
   - Check that all dependencies are in package.json
   - Verify Node.js version compatibility

3. **App Crashes on Start:**
   - Check environment variables
   - Verify database permissions
   - Check logs for specific error messages

### Database Initialization:

If the database is empty, you may need to run the initialization script. The app should handle this automatically, but if not:

1. **Connect to your database** using the External Database URL
2. **Run the SQL from `database/init.sql`**
3. **Restart your web service**

## Expected Result

After successful deployment, you should have:
- ✅ Web service running on `https://your-app-name.onrender.com`
- ✅ PostgreSQL database connected
- ✅ Admin dashboard accessible at `/admin`
- ✅ IVR system working
- ✅ Widget functionality available

## Demo Credentials

Use these credentials to test the admin dashboard:
- **Username:** `admin`
- **Password:** `admin123`

## Next Steps

1. **Test all functionality**
2. **Set up custom domain** (optional)
3. **Configure monitoring** (optional)
4. **Scale up** when ready for production

---

**Need Help?** Check the Render documentation or contact support.
