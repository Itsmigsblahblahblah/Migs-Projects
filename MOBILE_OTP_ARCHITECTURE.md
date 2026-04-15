# Mobile OTP Signup - Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React)                        │
│                                                                   │
│  ┌──────────────────────┐         ┌───────────────────────────┐ │
│  │   Login Page UI      │◄───────►│   otpAuthService.ts       │ │
│  │                      │         │   - sendOTP()             │ │
│  │  - Method Toggle     │         │   - verifyOTP()           │ │
│  │  - Form Fields       │         │   - resendOTP()           │ │
│  │  - OTP Input         │         │   - validatePhone()       │ │
│  │  - Countdown Timer   │         │                           │ │
│  └──────────────────────┘         └───────────────────────────┘ │
│                                      │                          │
└──────────────────────────────────────┼──────────────────────────┘
                                       │
                              HTTP POST │
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                             │
│                                                                   │
│  ┌──────────────────────┐         ┌───────────────────────────┐ │
│  │   auth_routes.py     │────────►│   otp_service.py          │ │
│  │                      │         │                           │ │
│  │  POST /send-otp      │         │  - generate_otp()         │ │
│  │  POST /verify-otp    │         │  - hash_otp()             │ │
│  │  POST /resend-otp    │         │  - store_otp()            │ │
│  │  POST /validate-phone│         │  - verify_otp_hash()      │ │
│  │  GET  /health        │         │  - send_sms_via_semaphore │ │
│  └──────────────────────┘         └───────────────────────────┘ │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              In-Memory OTP Storage                       │   │
│  │  {                                                         │   │
│  │    "+639123456789": {                                     │   │
│  │      hashed_otp: "$2b$12$...",                           │   │
│  │      expiry: "2025-04-15T10:35:00",                      │   │
│  │      status: "unused",                                    │   │
│  │      attempts: 0                                          │   │
│  │    }                                                      │   │
│  │  }                                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                       │
                              HTTPS POST │
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SEMAPHORE SMS API                               │
│                                                                   │
│  Endpoint: https://api.semaphore.co/api/v4/otp                   │
│                                                                   │
│  Request:                                                          │
│  {                                                                 │
│    apikey: "your_api_key",                                        │
│    number: "+639123456789",                                       │
│    message: "Your Harvestify verification code is: 123456..."     │
│  }                                                                 │
│                                                                   │
│  Response:                                                         │
│  {                                                                 │
│    id: "message_id",                                              │
│    status: "Sent"                                                 │
│  }                                                                 │
└─────────────────────────────────────────────────────────────────┘
                                       │
                                       │ SMS Message
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     USER'S MOBILE PHONE                           │
│                                                                   │
│  📱 SMS Received:                                                │
│  "Your Harvestify verification code is: 123456. Valid for        │
│   5 minutes. Do not share this code."                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                       │
                                       │ User enters OTP
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FIREBASE AUTHENTICATION                         │
│                                                                   │
│  ┌──────────────────────┐         ┌───────────────────────────┐ │
│  │  Firebase Auth       │◄────────│  Firestore Database       │ │
│  │                      │         │                           │ │
│  │  - Create User       │         │  - Store user profile     │ │
│  │  - Generate UID      │         │  - Set phoneVerified:true │ │
│  │  - Sign out          │         │  - Set registrationMethod │ │
│  └──────────────────────┘         └───────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## User Flow - Mobile Signup

```
┌─────────────┐
│  START      │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│ User clicks Sign Up  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────┐
│ Select "Mobile" method   │
│ (toggle from Email)      │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Fill in form:                │
│  - First Name                │
│  - Last Name                 │
│  - Farm Address              │
│  - Mobile Number             │
│  - Password                  │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Click "Send OTP" button      │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Frontend validates phone     │
│ number format                │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ POST /auth/send-otp          │
│ (Backend receives request)   │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Backend validates phone      │
│ number format                │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Check resend cooldown        │
│ (60 seconds)                 │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Generate 6-digit OTP         │
│ (e.g., 123456)               │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Hash OTP with bcrypt         │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Store OTP in memory:         │
│  - hashed OTP               │
│  - expiry (5 min)           │
│  - status: unused           │
│  - attempts: 0              │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ POST to Semaphore API        │
│ (Send SMS to user's phone)   │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ SMS delivered to user        │
│ "Your code: 123456"          │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Frontend shows OTP input     │
│ and countdown timer (5:00)   │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ User enters 6-digit OTP      │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Click "Verify & Create"      │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ POST /auth/verify-otp        │
│ (Backend verifies OTP)       │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Check OTP exists?            │
└──────┬───────────────────────┘
       │
    ┌──┴──┐
    │     │
   Yes    No
    │     │
    │     ▼
    │  ┌──────────────────────┐
    │  │ Error: "No OTP found"│
    │  └──────────────────────┘
    │
    ▼
┌──────────────────────────────┐
│ Check OTP status = unused?   │
└──────┬───────────────────────┘
       │
    ┌──┴──┐
    │     │
   Yes    No
    │     │
    │     ▼
    │  ┌──────────────────────┐
    │  │ Error: "OTP used" or │
    │  │ "OTP expired"        │
    │  └──────────────────────┘
    │
    ▼
┌──────────────────────────────┐
│ Check not expired?           │
│ (current time < expiry)      │
└──────┬───────────────────────┘
       │
    ┌──┴──┐
    │     │
   Yes    No
    │     │
    │     ▼
    │  ┌──────────────────────┐
    │  │ Error: "OTP expired" │
    │  └──────────────────────┘
    │
    ▼
┌──────────────────────────────┐
│ Check attempts < 5?          │
└──────┬───────────────────────┘
       │
    ┌──┴──┐
    │     │
   Yes    No
    │     │
    │     ▼
    │  ┌──────────────────────┐
    │  │ Error: "Max attempts │
    │  │ exceeded"            │
    │  └──────────────────────┘
    │
    ▼
┌──────────────────────────────┐
│ Verify OTP hash matches      │
└──────┬───────────────────────┘
       │
    ┌──┴──┐
    │     │
   Yes    No
    │     │
    │     ▼
    │  ┌──────────────────────┐
    │  │ Increment attempts   │
    │  │ Error: "Invalid OTP" │
    │  └──────────────────────┘
    │
    ▼
┌──────────────────────────────┐
│ Mark OTP as "used"           │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Return success to frontend   │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Create Firebase user:        │
│  - Generate unique email    │
│  - Create auth account      │
│  - Sign out user            │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Store in Firestore:          │
│  - fullName                 │
│  - contactNumber            │
│  - farmAddress              │
│  - phoneVerified: true      │
│  - registrationMethod:      │
│    "mobile"                 │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Show success message         │
│ Clear form                   │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ User can now login           │
└──────┬───────────────────────┘
       │
       ▼
┌─────────────┐
│  SUCCESS    │
└─────────────┘
```

## Security Flow

```
┌─────────────────────────────────────────────────────────┐
│                    OTP Security Layers                    │
└─────────────────────────────────────────────────────────┘

┌──────────────────┐
│ 1. Generation    │
│                  │
│ - Random 6-digit │
│ - Cryptographic  │
└───────┬──────────┘
        │
        ▼
┌──────────────────┐
│ 2. Storage       │
│                  │
│ - Hashed (bcrypt)│
│ - Salt rounds:12 │
└───────┬──────────┘
        │
        ▼
┌──────────────────┐
│ 3. Time Limit    │
│                  │
│ - 5 min expiry   │
│ - Auto-expire    │
└───────┬──────────┘
        │
        ▼
┌──────────────────┐
│ 4. Attempt Limit │
│                  │
│ - Max 5 tries    │
│ - Lockout after  │
└───────┬──────────┘
        │
        ▼
┌──────────────────┐
│ 5. Resend Limit  │
│                  │
│ - 60s cooldown   │
│ - Server enforced│
└───────┬──────────┘
        │
        ▼
┌──────────────────┐
│ 6. Verification  │
│                  │
│ - Server-side    │
│ - Constant-time  │
└───────┬──────────┘
        │
        ▼
┌──────────────────┐
│ 7. Cleanup       │
│                  │
│ - Expire unused  │
│ - Remove used    │
└──────────────────┘
```

## Component Interaction

```
┌──────────────────────────────────────────────────────────────┐
│                        FRONTEND                               │
│                                                                │
│  User Interaction                                             │
│       │                                                       │
│       ▼                                                       │
│  ┌─────────────┐                                              │
│  │ Login.tsx   │  ◄── User clicks, types, submits            │
│  │             │  ──► Shows UI, timers, messages             │
│  └──────┬──────┘                                              │
│         │                                                     │
│         │ Calls                                               │
│         ▼                                                     │
│  ┌─────────────────┐                                          │
│  │ otpAuthService  │  ◄── Formats, validates, makes HTTP     │
│  │                 │  ──► Returns typed responses            │
│  └──────┬──────────┘                                          │
│         │                                                     │
└─────────┼─────────────────────────────────────────────────────┘
          │
          │ HTTP POST (JSON)
          │
          ▼
┌──────────────────────────────────────────────────────────────┐
│                        BACKEND                                 │
│                                                                │
│  ┌──────────────────┐                                         │
│  │  auth_routes.py  │  ◄── Receives HTTP request              │
│  │  (FastAPI)       │  ──► Validates, calls service           │
│  └───────┬──────────┘                                         │
│          │                                                    │
│          │ Calls                                              │
│          ▼                                                    │
│  ┌──────────────────┐                                         │
│  │ otp_service.py   │  ◄── Business logic                     │
│  │                  │  ──► Generates, stores, sends, verifies │
│  └───────┬──────────┘                                         │
│          │                                                    │
│          │ HTTP POST                                          │
│          ▼                                                    │
└──────────┼────────────────────────────────────────────────────┘
           │
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                            │
│                                                                │
│  ┌──────────────────┐        ┌──────────────────┐            │
│  │ Semaphore API    │        │ Firebase Auth    │            │
│  │                  │        │                  │            │
│  │ Send SMS         │        │ Create User      │            │
│  │ Delivery status  │        │ Sign Out         │            │
│  └──────────────────┘        └────────┬─────────┘            │
│                                       │                      │
│                                       │ Writes               │
│                                       ▼                      │
│                              ┌──────────────────┐            │
│                              │ Firestore DB     │            │
│                              │                  │            │
│                              │ User Profile     │            │
│                              │ phoneVerified    │            │
│                              └──────────────────┘            │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
                    ┌─────────────────┐
                    │   User Action   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Validate │  │  Send    │  │ Verify   │
        │ Phone    │  │  OTP     │  │ OTP      │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             │              │              │
      ┌──────┴──────┐      │       ┌──────┴──────┐
      │             │      │       │             │
   Valid        Invalid  Success Error       Valid
      │             │      │       │             │
      │      ┌──────┘      │  ┌────┴─────┐  ┌──┴───┐
      │      │             │  │          │  │      │
      ▼      ▼             ▼  ▼          ▼  ▼      ▼
   Proceed  Show           Send Error   Show  Create
            Error          SMS          Error Account
```

## State Management

```
Frontend State (React):
┌─────────────────────────────────┐
│ signupMethod: 'email'|'mobile'  │
│ otpSent: boolean                │
│ otpCode: string                 │
│ otpLoading: boolean             │
│ countdown: number (seconds)     │
│ verifiedPhoneNumber: string     │
│ credentials: {                  │
│   email, password,              │
│   firstName, lastName,          │
│   farmAddress, contactNumber    │
│ }                               │
└─────────────────────────────────┘

Backend State (In-Memory):
┌─────────────────────────────────┐
│ otpStorage: {                   │
│   [phoneNumber]: {              │
│     hashed_otp: string,         │
│     expiry: ISO timestamp,      │
│     status: 'unused'|'used',    │
│     attempts: number,           │
│     max_attempts: 5,            │
│     created_at: ISO timestamp,  │
│     resent_at: ISO timestamp    │
│   }                             │
│ }                               │
└─────────────────────────────────┘
```

---

**Last Updated**: April 15, 2025  
**Version**: 1.0.0
