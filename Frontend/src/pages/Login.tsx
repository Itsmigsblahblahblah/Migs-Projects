import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { Sprout, Users, ArrowLeft, AlertCircle, LogIn, UserPlus, Eye, EyeOff, Mail, Lock, User, Building2, CheckCircle } from "lucide-react";
import { auth, db } from "../firebaseConfig";
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

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
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

  // Handle input change for contact number
  const handleContactNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digit characters
    setCredentials({ ...credentials, contactNumber: value });
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
    setLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      // Force account selection every time
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if admin
      if (user.email === ADMIN_EMAIL) {
        localStorage.setItem('userRole', 'admin');
        localStorage.setItem('userId', user.uid);
        localStorage.setItem('username', 'Admin');
        navigate('/admin');
        return;
      }

      // Check if farmer exists in Firestore
      const farmerDoc = await getDoc(doc(db, "farmers", user.uid));

      if (farmerDoc.exists()) {
        // Existing farmer - login
        const farmerData = farmerDoc.data();
        
        // Clean the contact number by removing the +63 prefix if present
        const rawContactNumber = farmerData.contactNumber || "";
        const cleanContactNumber = rawContactNumber.startsWith("+63 ") 
            ? rawContactNumber.substring(4).replace(/\s/g, '') 
            : rawContactNumber.replace("+63", "").replace(/\s/g, '');
        
        localStorage.setItem('userRole', 'farmer');
        localStorage.setItem('userId', user.uid);
        localStorage.setItem('username', farmerData.fullName);
        navigate('/farmer');
      } else {
        // New farmer - create profile only if email is verified (which it should be for Google)
        if (!user.emailVerified) {
          setError("Please verify your Google account before signing in.");
          await signOut(auth);
          clearMarketDemandCache(); // Clear market demand cache on logout
          return;
        }

        const displayName = user.displayName || user.email?.split('@')[0] || 'Farmer';

        await setDoc(doc(db, "farmers", user.uid), {
          email: user.email,
          fullName: displayName,
          farmAddress: `${displayName}'s Farm`,
          contactNumber: "", // Will be added later by user in profile settings
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
      console.error("Google sign-in error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError("Sign-in cancelled. Please try again.");
      } else if (err.code === 'auth/popup-blocked') {
        setError("Popup blocked. Please enable popups for this site.");
      } else {
        setError(err.message || "Google sign-in failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      if (!credentials.email || !credentials.password || !credentials.firstName || !credentials.lastName || !credentials.farmAddress || !credentials.contactNumber) {
        setError("Please fill in all fields");
        setLoading(false);
        return;
      }

      // Validate contact number format (Philippines format: 9 followed by 9 digits)
      const cleanContactNumber = credentials.contactNumber.replace(/\s/g, '');
      const mobileRegex = /^9\d{9}$/;
      if (!mobileRegex.test(cleanContactNumber)) {
        setError("Please enter a valid Philippine mobile number starting with 9 followed by 9 digits (e.g., 9123456789)");
        setLoading(false);
        return;
      }

      if (credentials.password.length < 6) {
        setError("Password must be at least 6 characters");
        setLoading(false);
        return;
      }

      // Create user in Firebase Auth
      const userCredential: UserCredential = await createUserWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      // Combine first name and last name for full name
      const fullName = `${credentials.firstName} ${credentials.lastName}`;

      // Store user data in Firestore immediately with emailVerified: false
      await setDoc(doc(db, "farmers", userCredential.user.uid), {
        email: credentials.email,
        fullName: fullName,
        contactNumber: `+63${cleanContactNumber}`, // Add +63 prefix
        farmAddress: credentials.farmAddress,
        role: "farmer",
        createdAt: new Date().toISOString(),
        uid: userCredential.user.uid,
        emailVerified: false
      });

      // Send email verification
      await sendEmailVerification(userCredential.user);

      // Sign out user to prevent auto-login
      await signOut(auth);
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
        setError("Please enter email and password");
        setLoading(false);
        return;
      }

      // Sign in user
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      // Check if admin
      if (credentials.email === ADMIN_EMAIL) {
        localStorage.setItem('userRole', 'admin');
        localStorage.setItem('userId', userCredential.user.uid);
        localStorage.setItem('username', 'Admin');
        navigate('/admin');
        return;
      }

      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        setError(
          "Please verify your email before logging in. Check your inbox for the verification link. " +
          "Didn't receive the email? Click 'Resend Verification Email' below."
        );
        await signOut(auth);
        clearMarketDemandCache(); // Clear market demand cache on logout
        setLoading(false);
        return;
      }

      // Get farmer data from Firestore
      const farmerDoc = await getDoc(doc(db, "farmers", userCredential.user.uid));

      // If farmer document doesn't exist (shouldn't happen with our fix), create it now
      if (!farmerDoc.exists()) {
        // This shouldn't happen with our fix, but just in case
        await setDoc(doc(db, "farmers", userCredential.user.uid), {
          email: userCredential.user.email,
          fullName: userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Farmer',
          farmAddress: `${userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Farmer'}'s Farm`,
          contactNumber: "", // Will be added later by user in profile settings
          role: "farmer",
          createdAt: new Date().toISOString(),
          uid: userCredential.user.uid,
          emailVerified: true
        });
        
        const farmerData = {
          email: userCredential.user.email,
          fullName: userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Farmer',
          farmAddress: `${userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Farmer'}'s Farm`,
          contactNumber: "", // Will be added later by user in profile settings
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
      } else {
        // Update the emailVerified status to true since user is now verified
        const farmerData = farmerDoc.data();
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
      }

    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Invalid email or password. Please check your credentials and try again.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Invalid email address. Please enter a valid email.");
      } else {
        setError("Login failed. Please try again.");
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
                    Email
                  </Label>
                  <div className="relative">
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
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
                    <span className="bg-card px-2 text-muted-foreground">Or sign up with email</span>
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

                {/* Contact Number Field */}
                <div className="space-y-2 group mt-10">
                  <Label htmlFor="contactNumber" className="flex items-center gap-2">
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    Contact Number
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
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter your 10-digit Philippine mobile number (e.g., 9123456789)
                  </p>
                  {credentials.contactNumber && (
                    <p className="text-xs text-muted-foreground">
                      Will be stored as: <span className="font-medium">+63{credentials.contactNumber.replace(/\s/g, '').replace('+63', '')}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-2 group mt-10">
                  <Label htmlFor="signup-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={credentials.email}
                      onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                      className="peer"
                    />
                  </div>
                </div>

                <div className="space-y-2 group mt-10">
                  <Label htmlFor="signup-password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password
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
                  onClick={handleSignUp}
                  disabled={loading}
                  className="w-full bg-gradient-primary hover:opacity-90 transition-opacity mt-10 relative group"
                  size="lg"
                >
                  <span className="relative z-10">
                    {loading ? "Creating account..." : "Create Account"}
                  </span>
                  <span className="absolute inset-0 rounded-md bg-gradient-primary opacity-0 group-hover:opacity-100 blur-md transition-opacity"></span>
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Join as a farmer and start managing your farm
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