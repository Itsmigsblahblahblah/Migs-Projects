# Mobile OTP Signup Feature

## Overview

The Majayjay Farm Resource Management System now supports **mobile number registration via SMS OTP** as an alternative to email signup. Users can choose between:

1. **Email Signup** (existing method with email verification)
2. **Mobile Number Signup** (new method with SMS OTP verification)
3. **Google Sign-in** (existing method)

## Features

### User Experience
- ✅ **Method Selection Toggle**: Clear choice between Email and Mobile signup
- ✅ **Philippine Mobile Number Validation**: Supports formats (09xxxxxxxxx, +639xxxxxxxxx, 9xxxxxxxxx)
- ✅ **SMS OTP Verification**: 6-digit code sent via Semaphore SMS API
- ✅ **5-Minute OTP Expiry**: Secure time-limited codes
- ✅ **Resend Cooldown**: 60-second cooldown for OTP resend
- ✅ **Attempt Limiting**: Maximum 5 verification attempts
- ✅ **Countdown Timer**: Visual feedback for OTP validity
- ✅ **Step-by-Step Flow**: Clean, guided signup process

### Security
- ✅ **Hashed OTP Storage**: bcrypt hashing before storage
- ✅ **Secure Verification**: Server-side OTP validation
- ✅ **Rate Limiting**: Prevents abuse via cooldown mechanisms
- ✅ **API Key Protection**: Backend-only API key storage
- ✅ **Firebase Integration**: Secure account creation after verification

## Architecture

### Backend Components

#### 1. OTP Service (`Backend/services/otp_service.py`)
Core service handling OTP lifecycle:
- **OTP Generation**: Random 6-digit codes
- **Secure Storage**: Hashed OTP with metadata (expiry, attempts, status)
- **SMS Integration**: Semaphore API for message delivery
- **Validation**: Phone number format verification
- **Cleanup**: Automatic expiration of unused OTPs

#### 2. Auth Routes (`Backend/routes/auth_routes.py`)
RESTful API endpoints:
- `POST /auth/send-otp`: Send OTP to phone number
- `POST /auth/verify-otp`: Verify OTP code
- `POST /auth/resend-otp`: Resend OTP with cooldown
- `POST /auth/validate-phone`: Validate phone format
- `GET /auth/health`: Health check endpoint

### Frontend Components

#### 1. OTP Auth Service (`Frontend/src/services/otpAuthService.ts`)
TypeScript service for API communication:
- `sendOTP()`: Request OTP sending
- `verifyOTP()`: Verify code with backend
- `resendOTP()`: Request new OTP
- `validatePhoneNumber()`: Format validation
- `formatPhoneNumber()`: Display formatting

#### 2. Updated Login Page (`Frontend/src/pages/Login.tsx`)
Enhanced UI with:
- **Method Toggle**: Email vs Mobile selection buttons
- **Conditional Fields**: Show/hide based on method
- **OTP Flow**: Send → Verify → Create Account
- **Countdown Timer**: Visual OTP expiry indicator
- **Resend Button**: Available after cooldown

## Setup Instructions

### 1. Backend Setup

#### Install Dependencies
```bash
cd Backend
pip install -r requirements.txt
```

New dependencies added:
- `requests>=2.26.0` - HTTP client for Semaphore API
- `bcrypt>=4.0.0` - Password/OTP hashing
- `python-dotenv>=0.19.0` - Environment variable management

#### Configure Environment
1. Create `.env` file in `Backend/` directory:
```env
SEMAPHORE_API_KEY=your_api_key_here
```

2. Get your Semaphore API key:
   - Sign up at https://www.semaphore.co/
   - Navigate to API Settings
   - Copy your API key

#### Run Backend
```bash
python main.py
# or
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API documentation available at:
- Swagger UI: http://localhost:8000/docs
- Auth endpoints: http://localhost:8000/auth/docs

### 2. Frontend Setup

#### Configure Environment
Create `.env` file in `Frontend/` directory:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_BACKEND_URL=http://localhost:8000
```

#### Install & Run
```bash
cd Frontend
npm install
npm run dev
```

## Usage Flow

### Mobile Signup Flow

```
1. User clicks "Sign Up" tab
2. Selects "Mobile" method
3. Fills in:
   - First Name
   - Last Name
   - Farm Address
   - Mobile Number
   - Password
4. Clicks "Send OTP"
5. Receives SMS with 6-digit code
6. Enters OTP in verification field
7. Clicks "Verify & Create Account"
8. Account created in Firebase
9. User signed out (requires login)
10. Success message displayed
```

### Email Signup Flow (Unchanged)

```
1. User clicks "Sign Up" tab
2. Selects "Email" method (default)
3. Fills in:
   - First Name
   - Last Name
   - Farm Address
   - Mobile Number (optional)
   - Email
   - Password
4. Clicks "Create Account"
5. Email verification sent
6. User signed out (requires email verification)
7. Success message displayed
```

## API Request/Response Examples

### Send OTP

**Request:**
```http
POST http://localhost:8000/auth/send-otp
Content-Type: application/json

{
  "phone_number": "09123456789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "phone_number": "09123456789",
  "expires_in_minutes": 5
}
```

### Verify OTP

**Request:**
```http
POST http://localhost:8000/auth/verify-otp
Content-Type: application/json

{
  "phone_number": "09123456789",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "phone_number": "09123456789"
}
```

### Resend OTP

**Request:**
```http
POST http://localhost:8000/auth/resend-otp
Content-Type: application/json

{
  "phone_number": "09123456789"
}
```

**Response (within cooldown):**
```json
{
  "success": false,
  "message": "Please wait 45 seconds before requesting a new OTP",
  "phone_number": "09123456789",
  "can_resend": false,
  "cooldown_seconds": 45
}
```

## Phone Number Validation

### Supported Formats
- `09123456789` → Converted to `+639123456789`
- `+639123456789` → Used as-is
- `9123456789` → Converted to `+639123456789`
- `09X XXX XXXX` → Cleaned and converted

### Validation Rules
- Must start with `9` (after removing country code)
- Must be exactly 10 digits (Philippine format)
- All characters must be numeric

## OTP Security Features

### 1. Hashing
- OTPs are hashed using bcrypt before storage
- Salt rounds: Default (12)
- Constant-time comparison for verification

### 2. Expiry
- **Lifetime**: 5 minutes from generation
- **Auto-expiration**: Marked as expired after time limit
- **Cleanup**: Periodic removal of expired OTPs

### 3. Attempt Limiting
- **Maximum attempts**: 5 per OTP
- **Lockout**: Account locked after max attempts
- **Remaining attempts**: Shown in error messages

### 4. Resend Protection
- **Cooldown period**: 60 seconds
- **Timer**: Server-side enforcement
- **New OTP**: Invalidates previous code

## Database Schema

### Firestore User Document (Mobile Signup)
```typescript
{
  email: "mobile_+639123456789@harvestify.local",
  fullName: "Juan Dela Cruz",
  contactNumber: "+639123456789",
  farmAddress: "Brgy. San Roque",
  role: "farmer",
  createdAt: "2025-04-15T10:30:00.000Z",
  uid: "firebase-uid-here",
  emailVerified: false,
  phoneVerified: true,
  registrationMethod: "mobile"
}
```

### Firestore User Document (Email Signup)
```typescript
{
  email: "user@example.com",
  fullName: "Juan Dela Cruz",
  contactNumber: "+639123456789",
  farmAddress: "Brgy. San Roque",
  role: "farmer",
  createdAt: "2025-04-15T10:30:00.000Z",
  uid: "firebase-uid-here",
  emailVerified: false,
  registrationMethod: "email"
}
```

## Error Handling

### Common Errors

#### Frontend
- **"Please enter a valid Philippine mobile number"**
  - Solution: Use correct format (09xxxxxxxxx or +639xxxxxxxxx)
  
- **"Failed to send OTP"**
  - Solution: Check backend is running and API key is configured

- **"OTP verification failed"**
  - Solution: Ensure correct OTP entered within 5 minutes

- **"This mobile number is already registered"**
  - Solution: Use login instead or different number

#### Backend
- **"Invalid format. Use 09xxxxxxxxx..."**
  - HTTP 400: Invalid phone number format

- **"No OTP found for this phone number"**
  - HTTP 400: No active OTP session

- **"OTP has expired"**
  - HTTP 400: OTP older than 5 minutes

- **"Maximum attempts exceeded"**
  - HTTP 400: Too many failed verifications

## Testing

### Manual Testing Checklist

- [ ] Mobile number format validation
- [ ] OTP sending via SMS
- [ ] OTP verification (correct code)
- [ ] OTP verification (incorrect code)
- [ ] OTP expiry (wait 5+ minutes)
- [ ] OTP resend with cooldown
- [ ] Account creation after verification
- [ ] Duplicate account prevention
- [ ] Email signup still works
- [ ] Google signup still works
- [ ] Login with mobile-created account
- [ ] Password reset functionality

### Test Phone Numbers (Development)
Contact Semaphore for test numbers or use production mode.

## Troubleshooting

### OTP Not Received
1. Check phone number format
2. Verify backend logs for API errors
3. Confirm Semaphore API key is valid
4. Check Semaphore account balance/credits
5. Verify network connectivity

### OTP Verification Fails
1. Check OTP entered correctly
2. Verify OTP not expired (5-minute limit)
3. Confirm max attempts not exceeded
4. Check server time synchronization

### Backend Import Errors
```bash
# Install missing dependencies
cd Backend
pip install requests bcrypt python-dotenv
```

### Frontend TypeScript Errors
```bash
# Install dependencies
cd Frontend
npm install
```

## Future Enhancements

- [ ] OTP for password reset
- [ ] Two-factor authentication (2FA)
- [ ] OTP via email (alternative to SMS)
- [ ] WhatsApp OTP integration
- [ ] Voice call OTP
- [ ] Rate limiting by IP address
- [ ] OTP usage analytics
- [ ] Custom OTP message templates
- [ ] Multi-language SMS support
- [ ] Redis-based OTP storage (production)

## Security Considerations

### Production Deployment
1. **Environment Variables**: Never commit `.env` files
2. **HTTPS**: Use secure connections for API calls
3. **CORS**: Configure allowed origins properly
4. **Rate Limiting**: Implement IP-based restrictions
5. **Monitoring**: Log all OTP operations
6. **Audit Trail**: Track OTP lifecycle events
7. **Backup**: Regular backup of user data

### Compliance
- **Data Privacy**: Comply with Philippine Data Privacy Act
- **SMS Regulations**: Follow telecommunications guidelines
- **User Consent**: Explicit consent for SMS communications
- **Data Retention**: Define OTP storage duration

## Support

For issues or questions:
1. Check this documentation
2. Review backend logs for errors
3. Test with Swagger UI (`/docs`)
4. Contact development team

---

**Last Updated**: April 15, 2025  
**Version**: 1.0.0
