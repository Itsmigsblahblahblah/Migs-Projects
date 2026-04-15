# 🚀 Mobile OTP Signup - Setup Checklist

## Pre-Deployment Checklist

### Backend Setup
- [ ] Navigate to `Backend/` directory
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Create `.env` file with Semaphore API key
- [ ] Verify `.env` contains: `SEMAPHORE_API_KEY=your_key_here`
- [ ] Start backend: `python main.py`
- [ ] Verify backend running at: http://localhost:8000
- [ ] Test health endpoint: http://localhost:8000/auth/health
- [ ] Check Swagger UI: http://localhost:8000/docs

### Frontend Setup
- [ ] Navigate to `Frontend/` directory
- [ ] Install dependencies: `npm install`
- [ ] Create `.env` file (copy from `.env.example`)
- [ ] Verify `.env` contains: `VITE_BACKEND_URL=http://localhost:8000`
- [ ] Verify Firebase config in `.env`
- [ ] Start frontend: `npm run dev`
- [ ] Verify frontend running at: http://localhost:5173
- [ ] Navigate to login page

## Testing Checklist

### Manual Testing - Mobile Signup
- [ ] Click "Sign Up" tab
- [ ] Verify "Email" and "Mobile" buttons visible
- [ ] Click "Mobile" button (should highlight)
- [ ] Fill in First Name
- [ ] Fill in Last Name
- [ ] Select Farm Address from dropdown
- [ ] Enter mobile number (e.g., 09123456789)
- [ ] Verify phone number format validation works
- [ ] Enter Password (min 6 characters)
- [ ] Click "Send OTP" button
- [ ] Verify "Sending OTP..." loading state
- [ ] Wait for OTP SMS on phone
- [ ] Verify OTP input field appears
- [ ] Verify countdown timer starts (5:00)
- [ ] Enter 6-digit OTP
- [ ] Click "Verify & Create Account"
- [ ] Verify success message appears
- [ ] Verify form clears after success
- [ ] Try logging in with created account

### Manual Testing - Error Cases
- [ ] Enter invalid phone number → See error
- [ ] Enter wrong OTP → See error with remaining attempts
- [ ] Wait 5+ minutes, enter OTP → See expired message
- [ ] Click "Send OTP" twice quickly → See cooldown message
- [ ] Try resend before 60s → See countdown
- [ ] Try resend after 60s → New OTP sent
- [ ] Leave required fields empty → See validation errors
- [ ] Use weak password → See password error

### Manual Testing - Email Signup (Regression)
- [ ] Click "Email" button
- [ ] Fill in all fields including email
- [ ] Click "Create Account"
- [ ] Verify email signup still works
- [ ] Check email for verification link
- [ ] Verify account created in Firestore

### Manual Testing - Google Signup (Regression)
- [ ] Click "Sign up with Google"
- [ ] Select Google account
- [ ] Verify Google signup still works
- [ ] Verify account created in Firestore

### Backend API Testing
- [ ] Test `/auth/health` → Returns healthy status
- [ ] Test `/auth/validate-phone` with valid number
- [ ] Test `/auth/validate-phone` with invalid number
- [ ] Test `/auth/send-otp` with valid number
- [ ] Test `/auth/send-otp` with invalid number
- [ ] Test `/auth/verify-otp` with correct code
- [ ] Test `/auth/verify-otp` with wrong code
- [ ] Test `/auth/resend-otp` within cooldown
- [ ] Test `/auth/resend-otp` after cooldown
- [ ] Verify all responses match documentation

### Phone Number Validation
- [ ] Test `09123456789` → Valid, formatted to `+639123456789`
- [ ] Test `+639123456789` → Valid, used as-is
- [ ] Test `9123456789` → Valid, formatted to `+639123456789`
- [ ] Test `1234567890` → Invalid (doesn't start with 9)
- [ ] Test `0912345678` → Invalid (only 9 digits)
- [ ] Test `091234567890` → Invalid (11 digits)
- [ ] Test with spaces → Cleaned properly
- [ ] Test with dashes → Cleaned properly

### OTP Lifecycle Testing
- [ ] Generate OTP → Stored with 5-min expiry
- [ ] Verify correct OTP → Success, marked as used
- [ ] Generate new OTP for same number → Old invalidated
- [ ] Wait 5 minutes → OTP expires
- [ ] Try expired OTP → Error message
- [ ] Exceed 5 attempts → Account locked
- [ ] Resend after cooldown → New OTP generated
- [ ] Verify cleanup of expired OTPs

### Database Verification
- [ ] Check Firestore after mobile signup
- [ ] Verify `phoneVerified: true` set
- [ ] Verify `registrationMethod: "mobile"` set
- [ ] Verify `contactNumber` formatted correctly
- [ ] Verify unique email generated
- [ ] Check Firestore after email signup
- [ ] Verify `registrationMethod: "email"` set
- [ ] Verify `emailVerified: false` set initially

### Security Testing
- [ ] Verify OTPs are hashed in storage
- [ ] Verify API key not exposed in frontend
- [ ] Verify rate limiting works (rapid requests)
- [ ] Verify cooldown enforcement server-side
- [ ] Verify attempt limiting works
- [ ] Test with expired OTPs
- [ ] Test with used OTPs
- [ ] Verify HTTPS in production (deployed)

## Performance Testing

### Load Testing
- [ ] Test with 10 concurrent OTP requests
- [ ] Test with 50 concurrent OTP requests
- [ ] Monitor backend CPU/memory usage
- [ ] Monitor SMS API rate limits
- [ ] Check response times under load

### Stress Testing
- [ ] Send 100 OTPs in 10 minutes
- [ ] Verify cooldown prevents abuse
- [ ] Verify storage doesn't leak memory
- [ ] Check cleanup of expired OTPs

## Browser Compatibility

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] Chrome Mobile
- [ ] Safari iOS
- [ ] Samsung Internet

## Responsive Design
- [ ] Test on desktop (1920x1080)
- [ ] Test on tablet (768x1024)
- [ ] Test on mobile (375x667)
- [ ] Verify form fields are usable on small screens
- [ ] Verify OTP input is easy on mobile

## Documentation Review
- [ ] Read `MOBILE_OTP_QUICKSTART.md`
- [ ] Follow setup instructions
- [ ] Verify all steps work
- [ ] Read `MOBILE_OTP_SIGNUP.md`
- [ ] Verify API examples work
- [ ] Check troubleshooting guide accuracy

## Environment Verification

### Backend `.env` File
```env
SEMAPHORE_API_KEY=your_actual_key_here
```
- [ ] File exists at `Backend/.env`
- [ ] Contains valid API key
- [ ] Not committed to git (in `.gitignore`)

### Frontend `.env` File
```env
VITE_BACKEND_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=...
# ... other Firebase config
```
- [ ] File exists at `Frontend/.env`
- [ ] Backend URL correct
- [ ] Firebase config present
- [ ] Not committed to git

## Semaphore Account Verification
- [ ] Account active at https://www.semaphore.co/
- [ ] API key valid
- [ ] Sufficient SMS credits/balance
- [ ] Account not in sandbox mode (for production)
- [ ] Test SMS received successfully

## Common Issues & Solutions

### Issue: OTP not sending
- [ ] Check backend logs for errors
- [ ] Verify API key in `.env`
- [ ] Check Semaphore balance
- [ ] Test Semaphore API directly

### Issue: Import errors
- [ ] Run `pip install -r requirements.txt`
- [ ] Check Python version (3.8+)
- [ ] Try `pip install requests bcrypt python-dotenv`

### Issue: Frontend errors
- [ ] Run `npm install`
- [ ] Check Node version (16+)
- [ ] Clear cache: `rm -rf node_modules && npm install`

### Issue: TypeScript errors
- [ ] Run `npm run build`
- [ ] Check for type errors
- [ ] Update TypeScript if needed

### Issue: OTP not received
- [ ] Verify phone number format
- [ ] Check backend logs
- [ ] Verify Semaphore API status
- [ ] Check phone network coverage
- [ ] Try different phone number

## Final Verification

### Before Demo/Presentation
- [ ] Both backend and frontend running
- [ ] Can complete mobile signup end-to-end
- [ ] Can complete email signup end-to-end
- [ ] Can complete Google signup end-to-end
- [ ] Can login with all account types
- [ ] No console errors in browser
- [ ] Backend logs clean
- [ ] SMS received on test phone

### Before Production Deployment
- [ ] All tests passing
- [ ] Security review completed
- [ ] Environment variables secured
- [ ] HTTPS enabled
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Monitoring setup
- [ ] Backup strategy in place
- [ ] Documentation reviewed

## Sign-Off

### Developer Checklist
- [ ] Code reviewed
- [ ] Tests written and passing
- [ ] Documentation complete
- [ ] No security vulnerabilities
- [ ] Performance acceptable
- [ ] Ready for QA testing

### QA Checklist
- [ ] All test cases passing
- [ ] No critical bugs found
- [ ] UX meets requirements
- [ ] Performance meets requirements
- [ ] Security review complete
- [ ] Ready for production

### Product Owner Checklist
- [ ] Features meet requirements
- [ ] UX approved
- [ ] Documentation reviewed
- [ ] Ready for release

---

**Status**: Ready for Testing ✅  
**Date**: April 15, 2025  
**Version**: 1.0.0

**Notes**: 
- All core features implemented
- Comprehensive documentation provided
- Backward compatibility maintained
- Security best practices followed
