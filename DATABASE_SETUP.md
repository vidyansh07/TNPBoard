# 🔧 Fix: Database Setup for Vercel Deployment

## ⚠️ Current Issue
The Prisma database URL is not connecting. We need to set up a proper PostgreSQL database.

---

## ✅ **Solution: Use Neon (Recommended - FREE)**

### **Step 1: Create Neon Database**

1. Go to **https://neon.tech**
2. Sign up (free account)
3. Click **"Create Project"**
4. Choose:
   - Project name: `srm-database`
   - Region: Choose closest to you
   - PostgreSQL version: 16 (or latest)
5. Click **"Create Project"**

### **Step 2: Get Connection String**

1. After project creation, you'll see the connection string
2. Copy the **Connection string** (it looks like this):
   ```
   postgresql://username:password@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require
   ```

### **Step 3: Update Vercel Environment Variables**

1. Go to your Vercel project: https://vercel.com/vidyansh07/tnpboard
2. Go to **Settings** → **Environment Variables**
3. **Edit** the `DATABASE_URL` variable
4. Replace with your new Neon connection string
5. Make sure to apply to: **Production, Preview, Development**
6. Click **Save**

### **Step 4: Apply Database Schema**

Run these commands locally with your new DATABASE_URL:

```powershell
# Set the new DATABASE_URL
$env:DATABASE_URL="postgresql://your-neon-connection-string-here"

# Push schema to database
npx prisma db push

# Seed the database with test users
npx prisma db seed
```

### **Step 5: Redeploy on Vercel**

1. Go to your Vercel project
2. Click **"Redeploy"** button
3. Or push a new commit to trigger deployment

---

## 🔄 **Alternative: Use Supabase (Also FREE)**

### **Step 1: Create Supabase Project**

1. Go to **https://supabase.com**
2. Sign up (free account)
3. Click **"New Project"**
4. Fill in:
   - Project name: `srm-database`
   - Database Password: (create a strong password)
   - Region: Choose closest to you
5. Click **"Create new project"** (takes ~2 minutes)

### **Step 2: Get Connection String**

1. In your project dashboard, go to **Settings** (gear icon)
2. Click **Database** in the left sidebar
3. Scroll down to **"Connection string"**
4. Select **"URI"** format
5. Copy the connection string
6. **Replace `[YOUR-PASSWORD]`** with the password you created
7. **Add `?sslmode=require`** at the end

Example:
```
postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require
```

### **Step 3: Update Vercel and Apply Schema**

Follow the same steps as Neon (Step 3, 4, 5 above)

---

## 🎯 **Quick Commands Reference**

```powershell
# Test connection to new database
$env:DATABASE_URL="your_new_connection_string"
npx prisma db push

# Create tables and seed data
npx prisma db seed

# Generate Prisma Client
npx prisma generate

# View database in browser
npx prisma studio
```

---

## ✅ **Verification Checklist**

After setting up the new database:

- [ ] Database created on Neon/Supabase
- [ ] Connection string copied
- [ ] Vercel environment variable updated
- [ ] `npx prisma db push` successful locally
- [ ] `npx prisma db seed` successful
- [ ] Vercel redeployed
- [ ] Test login works on deployed site

---

## 🆘 **Troubleshooting**

### Error: "Can't reach database server"
- **Solution**: Check if SSL is required, add `?sslmode=require` to connection string
- Verify the connection string is correct (no spaces, no line breaks)

### Error: "Authentication failed"
- **Solution**: Double-check password in connection string
- Make sure password special characters are URL-encoded

### Tables still don't exist
- **Solution**: Run `npx prisma db push` with the production DATABASE_URL
- Then run `npx prisma db seed` to add test users

---

## 📝 **Test Users After Seeding**

- **Admin**: `admin@srm.com` / `password123`
- **Leader**: `leader1@srm.com` / `password123`
- **Member**: `member1@srm.com` / `password123`

---

## 🚀 **Expected Result**

After completing these steps:
1. ✅ Database tables created
2. ✅ Test users seeded
3. ✅ Vercel deployment works
4. ✅ Login successful
5. ✅ All features functional

**Database Issue Fixed! 🎉**
