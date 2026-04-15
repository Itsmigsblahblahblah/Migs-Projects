# Quick Start Guide: Mobile OTP Signup

## 🚀 Setup (5 Minutes)

### 1. Backend Configuration

```bash
# Navigate to Backend directory
cd Backend

# Install new dependencies
pip install requests bcrypt python-dotenv

# Create .env file
```

Create `Backend/.env`:
```env
SEMAPHORE_API_KEY=your_api_key_here
```

Get your API key from: https://www.semaphore.co/

### 2. Frontend Configuration

Create `Frontend/.env` (if not exists):
```env
VITE_BACKEND_URL=http://localhost:8000
# ... other Firebase variables
```

### 3. Start Servers

```bash
# Terminal 1 - Backend
cd Backend
python main.py

# Terminal 2 - Frontend
cd Frontend
npm run dev
```

## 📱 User Signup Flow

### Mobile Signup
1. Open http://localhost:5173
2. Click **Sign Up** tab
3. Click **Mobile** button (toggle from Email)
4. Fill in:
   - First Name
   - Last Name
   - Farm Address (search/select)
   - Mobile Number (Philippine format: 09xxxxxxxxx)
   - Password (min 6 characters)
5. Click **Send OTP**
6. Wait for SMS with 6-digit code
7. Enter OTP in verification field
8. Click **Verify & Create Account**
9. Success! Now login with your credentials

### Email Signup (Still Works)
1. Click **Sign Up** tab
2. Keep **Email** selected (default)
3. Fill in all fields including email
4. Click **Create Account**
5. Check email for verification link

## 🔧 Testing the Feature

### Test Phone Number Format
- ✅ Valid: `09123456789`
- ✅ Valid: `+639123456789`
- ✅ Valid: `9123456789`
- ❌ Invalid: `1234567890` (doesn't start with 9)
- ❌ Invalid: `0912345678` (only 9 digits)

### Test OTP Flow
1. Enter valid phone number
2. Click "Send OTP"
3. Check phone for SMS
4. Enter 6-digit code
5. Click "Verify & Create Account"

### Test Error Cases
- Wrong OTP code → Shows remaining attempts
- Expired OTP (5+ min) → Request new OTP
- Resend within 60s → Shows cooldown timer
- Duplicate account → Error message

## 📊 API Endpoints

Test with Swagger UI: http://localhost:8000/docs

### Send OTP
```bash
curl -X POST "http://localhost:8000/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "09123456789"}'
```

### Verify OTP
```bash
curl -X POST "http://localhost:8000/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "09123456789", "otp": "123456"}'
```

### Resend OTP
```bash
curl -X POST "http://localhost:8000/auth/resend-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "09123456789"}'
```

## 🐛 Troubleshooting

### OTP Not Sending
```bash
# Check Backend logs
# Look for: "SMS sent to +63..."

# Verify API key
cat Backend/.env

# Test Semaphore API
curl "https://api.semaphore.co/api/v4/otp" \
  -H "Content-Type: application/json" \
  -d '{"apikey": "YOUR_KEY", "number": "+639123456789", "message": "Test"}'
```

### Import Errors
```bash
# Install missing packages
pip install --upgrade requests bcrypt python-dotenv
```

### Frontend Errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors
```bash
# In Frontend directory
npm run build
# Fix any reported errors
```

## ✅ Validation Checklist

Before deploying:
- [ ] Backend dependencies installed
- [ ] `.env` files created with correct values
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Can send OTP successfully
- [ ] Can verify OTP successfully
- [ ] Account created after verification
- [ ] Email signup still works
- [ ] Google signup still works
- [ ] Login works for all account types

## 📸 Screenshots

### Signup Method Selection
- Two buttons: "Email" and "Mobile"
- Click to switch between methods
- Form updates based on selection

### Mobile Signup Flow
1. **Before OTP**: Phone number field + "Send OTP" button
2. **After OTP**: Verification code field + countdown timer
3. **Success**: Account created message

## 🎯 Key Features

### What Changed
✅ New mobile signup option  
✅ SMS OTP verification  
✅ Countdown timer for OTP  
✅ Resend with cooldown  
✅ Phone number validation  
✅ Step-by-step signup flow  

### What Stayed the Same
✅ Email signup (fully functional)  
✅ Google signup (fully functional)  
✅ Login process (unchanged)  
✅ Password reset (unchanged)  
✅ All existing features  

## 📚 Documentation

Full documentation: `MOBILE_OTP_SIGNUP.md`

### Topics Covered
- Architecture overview
- Security features
- API request/response examples
- Database schema
- Error handling
- Production deployment
- Compliance guidelines

## 🆘 Need Help?

1. Check `MOBILE_OTP_SIGNUP.md` for detailed docs
2. Review backend/frontend logs
3. Test endpoints with Swagger UI
4. Verify Semaphore API key is valid
5. Check Semaphore account balance

---

**Ready to test?** 🎉

```bash
# Start Backend
cd Backend && python main.py

# Start Frontend (new terminal)
cd Frontend && npm run dev

# Open browser
http://localhost:5173
```
