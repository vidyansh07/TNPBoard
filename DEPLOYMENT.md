# Vercel Deployment Guide for SRM Application

## 🚀 Quick Deployment Steps

### 1. **Prepare Your Database**

You'll need a PostgreSQL database. Choose one of these options:

#### Option A: Vercel Postgres (Recommended - Easiest)
1. Go to your Vercel project dashboard
2. Navigate to "Storage" tab
3. Click "Create Database" → "Postgres"
4. Vercel will automatically add `DATABASE_URL` to your environment variables

#### Option B: Supabase (Free Tier Available)
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Project Settings → Database
4. Copy the "Connection string" (URI format)
5. Replace `[YOUR-PASSWORD]` with your database password

#### Option C: Railway (Free Tier Available)
1. Go to [railway.app](https://railway.app)
2. Create new project → "Provision PostgreSQL"
3. Copy the `DATABASE_URL` from the "Connect" tab

#### Option D: Neon (Serverless PostgreSQL - Free Tier)
1. Go to [neon.tech](https://neon.tech)
2. Create new project
3. Copy the connection string

### 2. **Deploy to Vercel**

#### Method 1: Via Vercel Dashboard (Recommended for First Time)

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - SRM Application"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**
   
   Add these in Vercel Dashboard (Project Settings → Environment Variables):
   
   ```
   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=your_secret_key_minimum_32_characters
   ```

   Example DATABASE_URL formats:
   ```
   # Vercel Postgres
   postgres://default:xxxxx@xxxx-pooler.aws-region.vercel.com:5432/verceldb?sslmode=require
   
   # Supabase
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   
   # Railway
   postgresql://postgres:xxxxx@containers-us-west-xx.railway.app:5432/railway
   
   # Neon
   postgresql://user:password@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require
   ```

4. **Add Prisma Generate to Build Command**
   - In Vercel project settings
   - Build & Development Settings
   - Override Build Command: `prisma generate && next build`

5. **Deploy!**
   - Click "Deploy"
   - Vercel will build and deploy your app

#### Method 2: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (this will prompt for environment variables)
vercel

# For production deployment
vercel --prod
```

### 3. **Run Database Migrations**

After first deployment, you need to apply database migrations:

#### Option A: Using Vercel CLI locally
```bash
# Set environment variable temporarily
$env:DATABASE_URL="your_production_database_url"

# Run migrations
npx prisma migrate deploy

# Seed the database (optional but recommended)
npx prisma db seed
```

#### Option B: Using Prisma Data Platform
1. Go to [cloud.prisma.io](https://cloud.prisma.io)
2. Connect your database
3. Run migrations from the dashboard

#### Option C: Direct Database Access
If your database provider has a SQL editor (like Supabase):
1. Run `npx prisma migrate dev` locally
2. Copy the SQL from `prisma/migrations` folder
3. Execute in your database's SQL editor

### 4. **Verify Deployment**

After deployment completes:

1. Visit your Vercel URL (e.g., `your-app.vercel.app`)
2. Try logging in with seeded credentials:
   - **Admin**: `admin@srm.com` / `password123`
   - **Leader**: `leader1@srm.com` / `password123`
   - **Member**: `member1@srm.com` / `password123`

---

## 📝 Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret key for JWT tokens (min 32 chars) | `your-very-long-secret-key-here` |

### How to Generate JWT_SECRET

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use online generator:
# https://generate-secret.vercel.app/32
```

---

## 🔧 Troubleshooting

### Build Fails with "Cannot find module 'prisma'"

**Solution**: Make sure build command includes `prisma generate`:
```bash
prisma generate && next build
```

### Database Connection Errors

**Solution**: 
1. Check `DATABASE_URL` format is correct
2. Ensure database allows connections from Vercel IPs
3. Add `?sslmode=require` to connection string if using SSL

### Prisma Client Not Generated

**Solution**: Add postinstall script to `package.json`:
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### API Routes Return 500 Errors

**Solution**:
1. Check Vercel function logs (Project → Deployments → View Function Logs)
2. Verify all environment variables are set
3. Check database is accessible

---

## 🎯 Post-Deployment Checklist

- [ ] Database is created and accessible
- [ ] Environment variables are set correctly
- [ ] Database migrations are applied
- [ ] Test users are seeded (or create manually)
- [ ] Login works correctly
- [ ] All API routes are functional
- [ ] Images/assets load properly
- [ ] Custom domain configured (optional)

---

## 🔐 Security Recommendations

1. **Change Default Passwords**: After deployment, change all seeded user passwords
2. **Rotate JWT Secret**: Use a strong, unique JWT secret
3. **Database Security**: Use connection pooling and SSL
4. **Environment Variables**: Never commit `.env` files to Git
5. **CORS Configuration**: Add proper CORS headers if needed

---

## 📊 Database Providers Comparison

| Provider | Free Tier | Pros | Best For |
|----------|-----------|------|----------|
| **Vercel Postgres** | 256MB | Integrated, easy setup | Quick deployment |
| **Supabase** | 500MB | Full PostgreSQL, dashboard | Full-featured apps |
| **Railway** | $5 credit | Simple, good DX | Development |
| **Neon** | 3GB | Serverless, branching | Production apps |

---

## 🚀 Advanced: Custom Domain

1. Go to Vercel Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as shown by Vercel
4. Wait for DNS propagation (can take up to 48 hours)

---

## 📞 Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Docs**: https://nextjs.org/docs

---

**Deployment Checklist Summary**:
1. ✅ Database provider chosen and setup
2. ✅ Code pushed to GitHub
3. ✅ Vercel project created and connected
4. ✅ Environment variables configured
5. ✅ Build command updated
6. ✅ Deployed successfully
7. ✅ Database migrated
8. ✅ Test login works

**Your app is now live! 🎉**
