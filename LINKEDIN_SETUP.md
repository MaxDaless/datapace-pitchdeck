# LinkedIn OAuth Integration Setup

## 🔗 **LinkedIn OAuth + Access Code + NDA Flow**

Your Datapace pitch deck now supports LinkedIn OAuth authentication while maintaining security through access codes and NDA signing.

## 🔄 **Authentication Flow:**

1. **Click "Continue with LinkedIn"** → Simulated LinkedIn OAuth (demo mode)
2. **Auto-populate form** with LinkedIn profile data (name, email, company)  
3. **Enter access code** for security validation (still required)
4. **Review and sign NDA** with pre-filled full name (signature still manual)

## 🛠️ **Database Schema Update Required:**

Run this SQL in your **Supabase SQL Editor**:

```sql
-- Add LinkedIn profile columns to auth_sessions table
ALTER TABLE auth_sessions ADD COLUMN linkedin_id TEXT;
ALTER TABLE auth_sessions ADD COLUMN linkedin_profile_url TEXT;
ALTER TABLE auth_sessions ADD COLUMN linkedin_profile_picture TEXT;
ALTER TABLE auth_sessions ADD COLUMN auth_method TEXT DEFAULT 'manual';

-- Update existing records to have 'manual' auth method
UPDATE auth_sessions SET auth_method = 'manual' WHERE auth_method IS NULL;

-- Add index for LinkedIn ID lookups
CREATE INDEX IF NOT EXISTS idx_auth_sessions_linkedin_id ON auth_sessions(linkedin_id);

-- Add comments for documentation
COMMENT ON COLUMN auth_sessions.linkedin_id IS 'LinkedIn user ID from OAuth';
COMMENT ON COLUMN auth_sessions.linkedin_profile_url IS 'LinkedIn profile URL';
COMMENT ON COLUMN auth_sessions.linkedin_profile_picture IS 'LinkedIn profile picture URL';
COMMENT ON COLUMN auth_sessions.auth_method IS 'Authentication method: manual or linkedin';
```

## 🎯 **Features Implemented:**

✅ **LinkedIn OAuth button** with proper styling
✅ **Auto-populate authentication form** with LinkedIn data
✅ **Pre-fill NDA form** with full name from LinkedIn
✅ **Still requires access code** for security validation
✅ **Digital signature field** remains manual entry
✅ **Enhanced database schema** to store LinkedIn profile data
✅ **Session management** supports both auth methods

## 📱 **User Experience:**

### **LinkedIn OAuth Path:**
1. Click "Continue with LinkedIn"
2. LinkedIn data auto-fills email, company, full name
3. Enter access code (DATAPACE2024, INVESTOR001, or DEMO123)
4. NDA form shows with pre-filled full name
5. User manually types signature and agrees to NDA
6. Access granted to presentation

### **Manual Entry Path:**
1. Manually enter email, company, access code
2. NDA form shows with empty fields
3. User manually fills name, signature, and agrees to NDA
4. Access granted to presentation

## 🔒 **Security Features:**

- **Access codes still required** even with LinkedIn OAuth
- **LinkedIn profile data stored** for audit trail
- **Authentication method tracked** in database (linkedin vs manual)
- **Digital signature verification** (must match full name)
- **Session validation** works for both auth methods

## 🚀 **Production Deployment:**

For production use with real LinkedIn OAuth:

1. **Update LinkedIn redirect URI** in your LinkedIn Developer App
2. **Replace mock LinkedIn data** with real OAuth flow
3. **Add server-side token exchange** for security
4. **Configure CORS** for your GitHub Pages domain

## 📊 **Database Tracking:**

The system now tracks:
- **Authentication method** (linkedin or manual)
- **LinkedIn profile data** (ID, profile URL, picture)
- **Enhanced audit trail** with OAuth information
- **User journey tracking** for analytics

Your pitch deck now offers the convenience of LinkedIn OAuth while maintaining enterprise security! 🎉