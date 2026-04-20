import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { Sprout, Users, ArrowLeft, AlertCircle, LogIn, UserPlus, Eye, EyeOff, Mail, Lock, User, Building2, CheckCircle, Smartphone } from "lucide-react";
import { auth, db, getAuthWhenReady, getDbWhenReady } from "../firebaseConfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  UserCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { clearMarketDemandCache } from "@/services/marketDemandMultiCacheService";
import { sendOTP, verifyOTP, formatPhoneNumber, isValidPhilippinePhone } from "@/services/otpAuthService";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verifiedPhoneNumber, setVerifiedPhoneNumber] = useState("");
  const [signupMethod, setSignupMethod] = useState<'email' | 'mobile'>('email');
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    farmAddress: "",
    contactNumber: ""
  });

  // Barangay options
  const barangayOptions = [
    "Brgy. Amonoy",
    "Brgy. Balayong",
    "Brgy. Oobi",
    "Brgy. Banga",
    "Brgy. Bukal",
    "Brgy. Gagalot",
    "Brgy. Malinao",
    "Brgy. Burgos",
    "Brgy. San Francisco",
    "Brgy. Munting Kawayan",
    "Brgy. Piit",
    "Brgy. Taytay",
    "Brgy. Olla",
    "Brgy. Coralao",
    "Brgy. San Roque",
    "Brgy. Suba",
    "Brgy. Pangil"
  ];

  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState(barangayOptions);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = barangayOptions.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(barangayOptions);
    }
  }, [searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (value: string) => {
    setCredentials({ ...credentials, farmAddress: value });
    setShowDropdown(false);
    setSearchTerm("");
  };

  // Handle input change for email - auto-detect signup method
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCredentials({ ...credentials, email: value });
    
    // Auto-detect: if email is provided, use email signup
    if (value && value.includes('@')) {
      setSignupMethod('email');
    }
  };

  // Handle input change for contact number - auto-detect signup method
  const handleContactNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digit characters
    setCredentials({ ...credentials, contactNumber: value });
    
    console.log('Contact number changed:', value);
    
    // Auto-detect: if phone number is provided (10 digits), use mobile signup
    if (value && value.length >= 10 && /^9\d{9}$/.test(value.slice(0, 10))) {
      console.log('Mobile signup detected!');
      setSignupMethod('mobile');
    } else if (!value || value.length === 0) {
      // If empty, default to email
      console.log('Empty, defaulting to email');
      setSignupMethod('email');
    }
  };

  // Format contact number for display
  const formatContactNumberDisplay = (contactNumber: string) => {
    if (!contactNumber) return '';
    
    // If it already has the +63 prefix, remove it first
    let cleaned = contactNumber.replace(/\D/g, '');
    if (contactNumber.startsWith('+63')) {
      // Remove the first 2 digits (63) if it starts with +63
      if (cleaned.startsWith('63') && cleaned.length > 2) {
        cleaned = cleaned.substring(2);
      }
    }
    
    const limited = cleaned.slice(0, 10);
    
    if (limited.length <= 3) {
      return limited;
    }
    
    if (limited.length <= 6) {
      return `${limited.slice(0, 3)} ${limited.slice(3)}`;
    }
    
    return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6)}`;
  };

  // Handle OTP sending
  const handleSendOTP = async () => {
    console.log('=== HANDLE SEND OTP CALLED ===');
    setError("");
    setSuccessMessage("");
    
    // Validate phone number
    if (!credentials.contactNumber) {
      console.error('No contact number provided');
      setError("Please enter your mobile number");
      return;
    }

    // Clean and validate phone number
    const cleanedNumber = credentials.contactNumber.replace(/\D/g, '');
    console.log('Cleaned number:', cleanedNumber);
    
    if (!isValidPhilippinePhone(cleanedNumber)) {
      console.error('Invalid Philippine phone number:', cleanedNumber);
      setError("Please enter a valid Philippine mobile number (e.g., 09xxxxxxxxx or 9xxxxxxxxx)");
      return;
    }

    setOtpLoading(true);
    try {
      console.log('Sending OTP to:', cleanedNumber);
      const response = await sendOTP(cleanedNumber);
      
      console.log('OTP Response:', response);
      
      if (response.success) {
        console.log('OTP sent successfully! Setting otpSent to true');
        setOtpSent(true);
        setSuccessMessage(`OTP sent to +63${cleanedNumber}. Valid for 5 minutes.`);
        setCountdown(300); // 5 minutes countdown
        
        // Start countdown timer
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(response.message || "Failed to send OTP");
        console.error('OTP send failed:', response.message);
      }
    } catch (err: any) {
      setError("Failed to send OTP. Please check your connection and try again.");
      console.error('OTP send error:', err);
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle OTP verification and account creation
  const handleVerifyOTPAndSignup = async () => {
    setLoading(true);
    setError("");

    if (!otpCode) {
      setError("Please enter the OTP");
      setLoading(false);
      return;
    }

    if (otpCode.length !== 6) {
      setError("OTP must be 6 digits");
      setLoading(false);
      return;
    }

    try {
      // Verify OTP
      const cleanedNumber = credentials.contactNumber.replace(/\D/g, '');
      console.log('Verifying OTP for:', cleanedNumber, 'Code:', otpCode);
      const response = await verifyOTP(cleanedNumber, otpCode);

      console.log('Verify Response:', response);

      if (response.success) {
        // OTP verified, proceed with account creation
        setVerifiedPhoneNumber(cleanedNumber);
        await createAccountWithMobile(cleanedNumber);
      } else {
        setError(response.message || "Invalid OTP");
      }
    } catch (err: any) {
      setError("OTP verification failed. Please try again.");
      console.error('OTP verify error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create account after mobile verification - NO EMAIL REQUIRED
  const createAccountWithMobile = async (phoneNumber: string) => {
    setLoading(true);
    setError("");

    try {
      // Validate other fields
      if (!credentials.firstName || !credentials.lastName || !credentials.farmAddress || !credentials.password) {
        setError("Please fill in all required fields");
        setLoading(false);
        return;
      }

      if (credentials.password.length < 6) {
        setError("Password must be at least 6 characters");
        setLoading(false);
        return;
      }

      // Use phone number as email substitute with guaranteed valid format
      // Use gmail.com format which Firebase always accepts
      const firebaseEmail = `mobile.${phoneNumber}@gmail.com`;
      
      console.log('=== CREATING MOBILE ACCOUNT ===');
      console.log('Phone number:', phoneNumber);
      console.log('Firebase email (internal):', firebaseEmail);
      
      const userCredential: UserCredential = await createUserWithEmailAndPassword(
        auth,
        firebaseEmail,
        credentials.password
      );
      
      console.log('Account created! UID:', userCredential.user.uid);

      const fullName = `${credentials.firstName} ${credentials.lastName}`;

      // Store user data in Firestore - EMAIL IS EMPTY, only mobile number
      await setDoc(doc(db, "farmers", userCredential.user.uid), {
        email: "", // EMPTY - user has no email
        fullName: fullName,
        contactNumber: `+63${phoneNumber}`,
        farmAddress: credentials.farmAddress,
        role: "farmer",
        createdAt: new Date().toISOString(),
        uid: userCredential.user.uid,
        emailVerified: true, // Mark as verified since it's internal
        phoneVerified: true,
        registrationMethod: "mobile"
      });

      // Sign out user to prevent auto-login
      await signOut(auth);
      clearMarketDemandCache();

      setSuccessMessage(
        "Account created successfully! You can now login with your password."
      );

      // Clear form
      setCredentials({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        farmAddress: "",
        contactNumber: ""
      });
      setOtpCode("");
      setOtpSent(false);

    } catch (err: any) {
      console.error('Account creation error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError("This mobile number is already registered. Please login instead.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password is too weak. Use at least 6 characters.");
      } else {
        setError("Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');

    if (userRole && userId) {
      // User is already authenticated, redirect to appropriate dashboard
      navigate(userRole === 'admin' ? '/admin' : '/farmer');
    }
  }, [navigate]);

  // Admin account credentials
  const ADMIN_EMAIL = "admin@majayjay.farm";

  const handleGoogleSignIn = async () => {
    console.log('[Google Auth] Button clicked!');
    setLoading(true);
    setError("");

    try {
      console.log('[Google Auth] Starting Google sign-in...');
      console.log('[Google Auth] auth available:', !!auth);
      console.log('[Google Auth] db available:', !!db);
      
      // If auth is null, try to initialize Firebase first
      let authInstance = auth;
      let dbInstance = db;
      
      if (!authInstance) {
        console.log('[Google Auth] Auth is null, trying to initialize Firebase...');
        // Try to force initialization
        const { initializeFirebase, getAuthInstance, getDbWhenReady } = await import("../firebaseConfig");
        await initializeFirebase();
        authInstance = await getAuthInstance();
        dbInstance = await getDbWhenReady();
        console.log('[Google Auth] Firebase initialized:', !!authInstance, !!dbInstance);
      }
      
      console.log('[Google Auth] Opening Google popup now...');
      
      // Open Google sign-in popup
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      console.log('[Google Auth] Calling signInWithPopup...');
      const result = await signInWithPopup(authInstance, provider);
      console.log('[Google Auth] Popup result:', result);
      const user = result.user;

      console.log('[Google Auth] User signed in:', user.uid, user.email);

      // Check or create farmer profile
      const farmerDoc = await getDoc(doc(dbInstance, "farmers", user.uid));

      if (farmerDoc.exists()) {
        // Existing farmer - direct login
        const farmerData = farmerDoc.data();
        console.log('[Google Auth] Existing farmer found:', farmerData.fullName);
        localStorage.setItem('userRole', 'farmer');
        localStorage.setItem('userId', user.uid);
        localStorage.setItem('username', farmerData.fullName);
        navigate('/farmer');
      } else if (user.email === ADMIN_EMAIL) {
        // Admin login
        console.log('[Google Auth] Admin login');
        localStorage.setItem('userRole', 'admin');
        localStorage.setItem('userId', user.uid);
        localStorage.setItem('username', 'Admin');
        navigate('/admin');
      } else if (!user.emailVerified) {
        // New user but email not verified
        console.log('[Google Auth] Email not verified');
        setError("Please verify your Google account before signing in.");
        await signOut(authInstance);
        clearMarketDemandCache();
      } else {
        // New farmer - create profile
        console.log('[Google Auth] Creating new farmer profile');
        const displayName = user.displayName || user.email?.split('@')[0] || 'Farmer';
        await setDoc(doc(dbInstance, "farmers", user.uid), {
          email: user.email,
          fullName: displayName,
          farmAddress: `${displayName}'s Farm`,
          contactNumber: "",
          role: "farmer",
          createdAt: new Date().toISOString(),
          uid: user.uid,
          photoURL: user.photoURL || null,
          emailVerified: true
        });

        localStorage.setItem('userRole', 'farmer');
        localStorage.setItem('userId', user.uid);
        localStorage.setItem('username', displayName);
        navigate('/farmer');
      }
    } catch (err: any) {
      console.error("[Google Auth] Error:", err);
      console.error("[Google Auth] Error code:", err.code);
      console.error("[Google Auth] Error message:", err.message);
      console.error("[Google Auth] Error stack:", err.stack);
      
      if (err.code === 'auth/popup-closed-by-user') {
        setError("Sign-in cancelled. Please try again.");
      } else if (err.code === 'auth/popup-blocked') {
        setError("Popup blocked. Please enable popups for this site and try again.");
      } else if (err.code === 'auth/unauthorized-domain') {
        setError("This domain is not authorized for Google sign-in. Please contact support.");
      } else if (err.code === 'auth/network-request-failed') {
        setError("Network error. Please check your connection.");
      } else if (err.code === 'auth/invalid-api-key') {
        setError("Invalid API key. Please contact support.");
      } else {
        setError(`Google sign-in failed: ${err.message || 'Please try again.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    // Only for email signup
    if (signupMethod === 'mobile') {
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      // Validate required fields
      if (!credentials.email || !credentials.password || !credentials.firstName || !credentials.lastName || !credentials.farmAddress) {
        setError("Please fill in all fields");
        setLoading(false);
        return;
      }

      if (credentials.password.length < 6) {
        setError("Password must be at least 6 characters");
        setLoading(false);
        return;
      }

      // Wait for Firebase to be ready
      const { getAuthWhenReady, getDbWhenReady } = await import("@/firebaseConfig");
      const authInstance = await getAuthWhenReady();
      const dbInstance = await getDbWhenReady();
      const { createUserWithEmailAndPassword, sendEmailVerification, signOut } = await import("firebase/auth");
      const { doc, setDoc } = await import("firebase/firestore");

      // Create user in Firebase Auth
      const userCredential: UserCredential = await createUserWithEmailAndPassword(
        authInstance,
        credentials.email,
        credentials.password
      );

      // Combine first name and last name for full name
      const fullName = `${credentials.firstName} ${credentials.lastName}`;

      // Store user data in Firestore immediately with emailVerified: false
      await setDoc(doc(dbInstance, "farmers", userCredential.user.uid), {
        email: credentials.email,
        fullName: fullName,
        contactNumber: credentials.contactNumber ? `+63${credentials.contactNumber.replace(/\s/g, '')}` : "",
        farmAddress: credentials.farmAddress,
        role: "farmer",
        createdAt: new Date().toISOString(),
        uid: userCredential.user.uid,
        emailVerified: false,
        phoneVerified: credentials.contactNumber ? true : false,
        registrationMethod: "email"
      });

      // Send email verification
      await sendEmailVerification(userCredential.user);

      // Sign out user to prevent auto-login
      await signOut(authInstance);
      clearMarketDemandCache(); // Clear market demand cache on logout

      // Show success message
      setSuccessMessage(
        "Account created successfully! Please check your email (" +
        credentials.email +
        ") to verify your account before logging in. Check your spam folder if you don't see the email."
      );

      // Clear form
      setCredentials({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        farmAddress: "",
        contactNumber: ""
      });

    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError("Email already registered. Please login instead.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password is too weak. Use at least 6 characters.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Invalid email address. Please enter a valid email.");
      } else {
        setError("Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      if (!credentials.email || !credentials.password) {
        setError("Please enter email/mobile number and password");
        setLoading(false);
        return;
      }

      console.log('=== LOGIN ATTEMPT ===');
      console.log('Input email/mobile:', credentials.email);
      console.log('Password length:', credentials.password.length);

      // Check if input is mobile number or email
      const isMobileNumber = /^9\d{9}$/.test(credentials.email.replace(/\D/g, '')) || 
                             /^09\d{9}$/.test(credentials.email.replace(/\D/g, '')) || 
                             /^\+639\d{9}$/.test(credentials.email.replace(/\D/g, ''));

      console.log('Is mobile number?', isMobileNumber);

      let loginEmail = credentials.email;
      
      // If mobile number, try multiple email formats
      if (isMobileNumber) {
        // Clean the number (remove non-digits)
        let cleaned = credentials.email.replace(/\D/g, '');
        // Remove leading 0 or +63
        if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
        if (cleaned.startsWith('63')) cleaned = cleaned.substring(2);
        
        // Validate it's a proper Philippine number
        if (!/^9\d{9}$/.test(cleaned)) {
          setError("Invalid mobile number format. Please enter a valid 10-digit Philippine mobile number (e.g., 9123456789)");
          setLoading(false);
          return;
        }
        
        // Try new format first (gmail.com), fallback to old format
        loginEmail = `mobile.${cleaned}@gmail.com`;
        console.log('=== MOBILE LOGIN DETECTED ===');
        console.log('Input:', credentials.email);
        console.log('Cleaned number:', cleaned);
        console.log('Trying Firebase email (new format):', loginEmail);
        
        // Try login with new format
        try {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            loginEmail,
            credentials.password
          );
          console.log('Login successful with NEW format! UID:', userCredential.user.uid);
          // Continue with login flow below
        } catch (firstError) {
          console.log('Failed with new format, trying old format...');
          // Try old format (harvestify.mobile)
          const oldEmail = `mobile_${cleaned}@harvestify.mobile`;
          console.log('Trying Firebase email (old format):', oldEmail);
          
          const userCredential = await signInWithEmailAndPassword(
            auth,
            oldEmail,
            credentials.password
          );
          console.log('Login successful with OLD format! UID:', userCredential.user.uid);
          loginEmail = oldEmail; // Update for later use
        }
      } else {
        console.log('Email login detected, using:', credentials.email);
      }

      // Sign in user
      console.log('Attempting Firebase Auth login with:', loginEmail);
      
      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginEmail,
        credentials.password
      );
      
      console.log('Login successful! UID:', userCredential.user.uid);
      console.log('User email:', userCredential.user.email);

      // Check if admin
      if (credentials.email === ADMIN_EMAIL) {
        localStorage.setItem('userRole', 'admin');
        localStorage.setItem('userId', userCredential.user.uid);
        localStorage.setItem('username', 'Admin');
        navigate('/admin');
        return;
      }

      // Check if user registered via mobile (skip email verification)
      const farmerDoc = await getDoc(doc(db, "farmers", userCredential.user.uid));
      
      if (farmerDoc.exists()) {
        const farmerData = farmerDoc.data();
        const isMobileUser = farmerData.registrationMethod === 'mobile' || farmerData.phoneVerified;

        // Skip email verification for mobile users
        if (!isMobileUser && !userCredential.user.emailVerified) {
          setError(
            "Please verify your email before logging in. Check your inbox for the verification link. " +
            "Didn't receive the email? Click 'Resend Verification Email' below."
          );
          await signOut(auth);
          clearMarketDemandCache();
          setLoading(false);
          return;
        }

        // For mobile users logging in with their own email, check if email matches
        if (isMobileUser && isMobileNumber) {
          // User logged in with mobile number - convert to check if it matches
          // Since they provided their own email, just proceed
          console.log('Mobile user logging in with mobile number format');
        }

        // Update the emailVerified status to true since user is now verified
        await updateDoc(doc(db, "farmers", userCredential.user.uid), {
          emailVerified: true
        });
        
        // Clean the contact number by removing the +63 prefix if present
        const rawContactNumber = farmerData.contactNumber || "";
        const cleanContactNumber = rawContactNumber.startsWith("+63 ") 
            ? rawContactNumber.substring(4).replace(/\s/g, '') 
            : rawContactNumber.replace("+63", "").replace(/\s/g, '');
        
        // Store user info using the original data from signup
        localStorage.setItem('userRole', 'farmer');
        localStorage.setItem('userId', userCredential.user.uid);
        localStorage.setItem('username', farmerData.fullName);
        navigate('/farmer');
      } else {
        // Farmer document doesn't exist - create it
        await setDoc(doc(db, "farmers", userCredential.user.uid), {
          email: userCredential.user.email,
          fullName: userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Farmer',
          farmAddress: `${userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Farmer'}'s Farm`,
          contactNumber: "",
          role: "farmer",
          createdAt: new Date().toISOString(),
          uid: userCredential.user.uid,
          emailVerified: true
        });
        
        const farmerData = {
          email: userCredential.user.email,
          fullName: userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Farmer',
          farmAddress: `${userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Farmer'}'s Farm`,
          contactNumber: "",
          role: "farmer",
          createdAt: new Date().toISOString(),
          uid: userCredential.user.uid,
          emailVerified: true
        };
        
        // Store user info
        localStorage.setItem('userRole', 'farmer');
        localStorage.setItem('userId', userCredential.user.uid);
        localStorage.setItem('username', farmerData.fullName);
        navigate('/farmer');
      }

    } catch (err: any) {
      console.error('=== LOGIN ERROR ===');
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      console.error('Login input attempted:', credentials.email);
      
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Invalid email/mobile number or password. Please check your credentials and try again.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Invalid email address. Please enter a valid email.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many failed login attempts. Please try again later.");
      } else {
        setError(`Login failed: ${err.message || 'Please try again.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!credentials.email || !credentials.password) {
      setError("Please enter your email and password first");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      // Sign in to get the user
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      // Check if already verified
      if (userCredential.user.emailVerified) {
        setSuccessMessage("Your email is already verified! You can now log in.");
        await signOut(auth);
        setLoading(false);
        return;
      }

      // Resend verification email
      await sendEmailVerification(userCredential.user);
      await signOut(auth);

      setSuccessMessage(
        "Verification email sent! Please check your inbox at " +
        credentials.email +
        ". Don't forget to check your spam folder."
      );
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        setError("Too many requests. Please wait a few minutes before trying again.");
      } else {
        setError("Failed to resend verification email. Please check your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-earth flex items-center justify-center p-4">

      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Hero Section */}
        <div className="text-center lg:text-left space-y-6">
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <div className="p-3 rounded-full bg-gradient-primary">
              <Sprout className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">Harvestify</h1>
              <p className="text-sm text-muted-foreground">Smart Farming Solution</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              Smart Farming for{" "}
              <span className="text-transparent bg-clip-text bg-gradient-primary">
                Better Harvests
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto lg:mx-0">
              Get expert crop recommendations, report farming issues, and connect with agricultural specialists to optimize your farm productivity.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground justify-center sm:justify-start">
              <Sprout className="h-4 w-4 text-success" />
              <span className="text-center sm:text-left">Crop Recommendations</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground justify-center sm:justify-start">
              <Users className="h-4 w-4 text-success" />
              <span className="text-center sm:text-left">Expert Guidance</span>
            </div>
          </div>
        </div>

        {/* Login/Signup Form */}
        <Card className="w-full max-w-md mx-auto shadow-card border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground">Welcome</CardTitle>
            <CardDescription>
              Login or create a new account to continue
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="login" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Login
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Sign Up
                </TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login" className="space-y-4">
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 bg-success/10 border border-success/20 rounded-md flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                    <p className="text-sm text-success">{successMessage}</p>
                  </div>
                )}

                {/* Google Sign In Button */}
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  variant="outline"
                  className="w-full hover:bg-[#EAB949] hover:text-[#333333] hover:border-[#EAB949] relative group shadow-md"
                  size="lg"
                >
                  <span className="mr-2 relative z-10 bg-white rounded-full p-0.5 inline-block">
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </span>
                  <span className="relative z-10">Continue with Google</span>
                  <span className="absolute inset-0 rounded-md bg-[#EAB949] opacity-0 group-hover:opacity-100 blur-md transition-opacity"></span>
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                  </div>
                </div>

                <div className="space-y-2 group">
                  <Label htmlFor="login-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email / Mobile No.
                  </Label>
                  <div className="relative">
                    <Input
                      id="login-email"
                      type="text"
                      placeholder="your@email.com or 9xxxxxxxxx"
                      value={credentials.email}
                      onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                      className="peer"
                    />
                  </div>
                </div>

                <div className="space-y-2 group mt-10">
                  <Label htmlFor="login-password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      className="peer pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full bg-gradient-primary hover:opacity-90 transition-opacity mt-10 relative group"
                  size="lg"
                >
                  <span className="relative z-10">
                    {loading ? "Logging in..." : "Login"}
                  </span>
                  <span className="absolute inset-0 rounded-md bg-gradient-primary opacity-0 group-hover:opacity-100 blur-md transition-opacity"></span>
                </Button>

                <div className="text-center mt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                {error && error.includes("verify your email") && (
                  <Button
                    onClick={handleResendVerification}
                    disabled={loading}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    {loading ? "Sending..." : "Resend Verification Email"}
                  </Button>
                )}

                <p className="text-xs text-center text-muted-foreground">
                  Access your dashboard and manage your farm
                </p>
              </TabsContent>

              {/* Sign Up Tab */}
              <TabsContent value="signup" className="space-y-4">
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 bg-success/10 border border-success/20 rounded-md flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                    <p className="text-sm text-success">{successMessage}</p>
                  </div>
                )}

                {/* Google Sign Up Button */}
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  variant="outline"
                  className="w-full hover:bg-[#EAB949] hover:text-[#333333] hover:border-[#EAB949] relative group shadow-md"
                  size="lg"
                >
                  <span className="mr-2 relative z-10 bg-white rounded-full p-0.5 inline-block">
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </span>
                  <span className="relative z-10">Sign up with Google</span>
                  <span className="absolute inset-0 rounded-md bg-[#EAB949] opacity-0 group-hover:opacity-100 blur-md transition-opacity"></span>
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or sign up with</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 group">
                    <Label htmlFor="firstName" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      First Name
                    </Label>
                    <div className="relative">
                      <Input
                        id="firstName"
                        placeholder="Juan"
                        value={credentials.firstName}
                        onChange={(e) => setCredentials({ ...credentials, firstName: e.target.value })}
                        className="peer"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 group">
                    <Label htmlFor="lastName" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Last Name
                    </Label>
                    <div className="relative">
                      <Input
                        id="lastName"
                        placeholder="Dela Cruz"
                        value={credentials.lastName}
                        onChange={(e) => setCredentials({ ...credentials, lastName: e.target.value })}
                        className="peer"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 group mt-10" ref={dropdownRef}>
                  <Label htmlFor="farmAddress" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Farm Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="farmAddress"
                      placeholder="Select or type your farm address"
                      value={credentials.farmAddress}
                      onChange={(e) => {
                        setCredentials({ ...credentials, farmAddress: e.target.value });
                        setSearchTerm(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      className="peer pr-10"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {showDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-[120px] overflow-auto">
                        {filteredOptions.length > 0 ? (
                          filteredOptions.map((option) => (
                            <div
                              key={option}
                              className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                              onClick={() => handleSelect(option)}
                            >
                              {option}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            No matching addresses found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-2 group mt-4">
                  <Label htmlFor="signup-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                    <span className="text-xs text-muted-foreground">(Optional if using mobile)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={credentials.email}
                      onChange={handleEmailChange}
                      className="peer"
                    />
                  </div>
                </div>

                {/* Contact Number Field */}
                <div className="space-y-2 group mt-4">
                  <Label htmlFor="contactNumber" className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Mobile Number
                    <span className="text-xs text-muted-foreground">(Optional if using email)</span>
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pr-4 pointer-events-none bg-gray-100 dark:bg-gray-800 rounded-l-md border-r border-gray-300 dark:border-gray-600">
                      <span className="text-gray-500 dark:text-gray-400 font-medium text-sm">+63</span>
                    </div>
                    <Input
                      id="contactNumber"
                      type="tel"
                      placeholder="9xx xxx xxxx"
                      value={formatContactNumberDisplay(credentials.contactNumber)}
                      onChange={handleContactNumberChange}
                      className="peer pl-20"
                      maxLength={12}
                      disabled={otpSent}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter your 10-digit Philippine mobile number (e.g., 9123456789)
                  </p>
                </div>

                {/* OTP Verification - Shows when OTP is sent */}
                {otpSent && (
                  <div className="space-y-4 group mt-4">
                    <Label htmlFor="otpCode" className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Verification Code
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="otpCode"
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="text-center text-2xl tracking-widest"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Valid for 5 minutes</span>
                      {countdown > 0 && (
                        <span className="font-mono">
                          {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    {countdown === 0 && (
                      <Button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={otpLoading}
                        variant="link"
                        size="sm"
                        className="w-full"
                      >
                        {otpLoading ? "Sending..." : "Resend OTP"}
                      </Button>
                    )}
                  </div>
                )}

                <div className="space-y-2 group mt-10">
                  <Label htmlFor="signup-password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password
                    {signupMethod === 'email' && <span className="text-destructive">*</span>}
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      className="peer pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    console.log('=== SIGNUP BUTTON CLICKED ===');
                    console.log('signupMethod:', signupMethod);
                    console.log('otpSent:', otpSent);
                    console.log('credentials:', credentials);
                    console.log('otpLoading:', otpLoading);
                    
                    if (signupMethod === 'mobile' && otpSent) {
                      console.log('Calling handleVerifyOTPAndSignup');
                      handleVerifyOTPAndSignup();
                    } else if (signupMethod === 'mobile' && !otpSent) {
                      console.log('Calling handleSendOTP');
                      handleSendOTP();
                    } else {
                      console.log('Calling handleSignUp (email)');
                      handleSignUp();
                    }
                  }}
                  disabled={loading || otpLoading}
                  className="w-full bg-gradient-primary hover:opacity-90 transition-opacity mt-10 relative group"
                  size="lg"
                >
                  <span className="relative z-10">
                    {loading ? "Creating account..." : 
                     otpLoading ? "Sending OTP..." :
                     signupMethod === 'mobile' ? (otpSent ? "Verify & Create Account" : "Send OTP") : 
                     "Create Account"}
                  </span>
                  <span className="absolute inset-0 rounded-md bg-gradient-primary opacity-0 group-hover:opacity-100 blur-md transition-opacity"></span>
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  {signupMethod === 'mobile' 
                    ? "Enter your mobile number to receive OTP verification code" 
                    : "Join as a farmer and start managing your farm"}
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;