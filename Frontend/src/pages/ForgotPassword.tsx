import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Phone, CheckCircle, AlertCircle, Key } from "lucide-react";
import { auth } from "../firebaseConfig";
import { sendPasswordResetEmail } from "firebase/auth";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [method, setMethod] = useState<'email' | 'phone'>('phone'); // Default to phone
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // OTP verification states
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  
  // New password states
  const [showNewPasswordForm, setShowNewPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      console.log('[ForgotPassword] Form submitted, method:', method);
      
      if (method === 'email') {
        console.log('[ForgotPassword] Using email method');
        // Email-based password reset (existing functionality)
        await sendPasswordResetEmail(auth, email);
        setSuccessMessage(
          `Password reset email sent to ${email}. Please check your inbox and spam folder. The email may take a few minutes to arrive.`
        );
      } else {
        console.log('[ForgotPassword] Using phone method, calling sendPhoneOTP...');
        // Phone-based password reset (new functionality)
        await sendPhoneOTP();
      }
    } catch (err: any) {
      console.error("[ForgotPassword] Password reset error:", err);
      if (err.code === 'auth/user-not-found') {
        setError("No account found with this email address. Please check that you're using the email address associated with your account.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Invalid email address. Please enter a valid email.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many requests. Please wait a few minutes before trying again.");
      } else {
        setError(err.message || "Failed to send password reset. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const sendPhoneOTP = async () => {
    try {
      console.log('[ForgotPassword] Sending OTP to:', phoneNumber);
      
      // Validate phone number format
      const cleaned = phoneNumber.replace(/\s|-|\(|\)/g, '');
      console.log('[ForgotPassword] Cleaned number:', cleaned);
      
      let formattedPhone = cleaned;
      
      if (cleaned.startsWith('+63')) {
        formattedPhone = cleaned;
      } else if (cleaned.startsWith('09')) {
        formattedPhone = '+63' + cleaned.substring(1);
      } else if (cleaned.startsWith('9')) {
        formattedPhone = '+63' + cleaned;
      } else {
        throw new Error("Invalid phone number format. Use 09xxxxxxxxx or +639xxxxxxxxx");
      }

      console.log('[ForgotPassword] Formatted phone:', formattedPhone);
      console.log('[ForgotPassword] Length:', formattedPhone.length);

      if (formattedPhone.length !== 13) {
        throw new Error("Invalid phone number. Must be 10 digits after country code");
      }

      console.log('[ForgotPassword] Backend URL:', BACKEND_URL);
      console.log('[ForgotPassword] Testing backend connection...');
      
      // First test if backend is alive
      try {
        const testResponse = await fetch(`${BACKEND_URL}/auth/test`, {
          method: 'GET',
          signal: AbortSignal.timeout(10000) // 10s timeout
        });
        
        if (!testResponse.ok) {
          throw new Error("Backend server is not responding");
        }
        
        console.log('[ForgotPassword] Backend is alive!');
      } catch (testError: any) {
        console.error('[ForgotPassword] Backend test failed:', testError);
        throw new Error("Backend server is starting up. Please wait 30-60 seconds and try again. (Render free tier servers sleep after inactivity)");
      }
      
      console.log('[ForgotPassword] Sending request to /auth/send-otp...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(`${BACKEND_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: formattedPhone }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('[ForgotPassword] Response status:', response.status);
      const data = await response.json();
      console.log('[ForgotPassword] Response data:', data);

      if (!response.ok) {
        console.error('[ForgotPassword] API error:', data);
        throw new Error(data.detail || data.message || "Failed to send OTP");
      }

      if (!data.success) {
        console.error('[ForgotPassword] Unsuccessful response:', data);
        throw new Error(data.message || "Failed to send OTP");
      }

      console.log('[ForgotPassword] OTP sent successfully');
      setSuccessMessage(`OTP sent to ${phoneNumber}. Valid for 5 minutes.`);
      setShowOTPVerification(true);
    } catch (error: any) {
      console.error('[ForgotPassword] Error in sendPhoneOTP:', error);
      
      // Provide specific error messages
      if (error.name === 'AbortError') {
        console.error('[ForgotPassword] Request timed out after 15 seconds');
        throw new Error("Request timed out. Backend server may be starting up. Please try again in a minute.");
      }
      
      throw error;
    }
  };

  const handleOTPVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError("");

    try {
      const cleaned = phoneNumber.replace(/\s|-|\(|\)/g, '');
      let formattedPhone = cleaned.startsWith('09') ? '+63' + cleaned.substring(1) : 
                           cleaned.startsWith('9') ? '+63' + cleaned : cleaned;

      const response = await fetch(`${BACKEND_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: formattedPhone,
          otp: otpCode
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Invalid OTP");
      }

      // OTP verified successfully, show new password form
      setSuccessMessage("OTP verified successfully!");
      setShowOTPVerification(false);
      setShowNewPasswordForm(true);
    } catch (err: any) {
      setOtpError(err.message || "Failed to verify OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      setPasswordLoading(false);
      return;
    }

    try {
      const cleaned = phoneNumber.replace(/\s|-|\(|\)/g, '');
      let formattedPhone = cleaned.startsWith('09') ? '+63' + cleaned.substring(1) : 
                           cleaned.startsWith('9') ? '+63' + cleaned : cleaned;

      const response = await fetch(`${BACKEND_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: formattedPhone,
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to reset password");
      }

      setSuccessMessage("Password reset successfully! You can now login with your new password.");
      setShowNewPasswordForm(false);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to reset password");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-earth flex items-center justify-center p-4">
      <div className="absolute top-6 left-6">
        <Button 
          variant="outline" 
          onClick={() => navigate('/login')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Button>
      </div>
      
      <div className="w-full max-w-md">
        <Card className="w-full mx-auto shadow-card border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground">Reset Password</CardTitle>
            <CardDescription>
              {!showOTPVerification && !showNewPasswordForm && (
                <>Choose how you want to reset your password</>
              )}
              {showOTPVerification && (
                <>Enter the verification code sent to your phone</>
              )}
              {showNewPasswordForm && (
                <>Create a new password for your account</>
              )}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2 mb-4">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-success/10 border border-success/20 rounded-md flex items-start gap-2 mb-4">
                <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                <p className="text-sm text-success">{successMessage}</p>
              </div>
            )}

            {/* Method Selection - Only show initially */}
            {!showOTPVerification && !showNewPasswordForm && (
              <>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <Button
                    type="button"
                    variant={method === 'phone' ? 'default' : 'outline'}
                    onClick={() => setMethod('phone')}
                    className="flex items-center gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    Phone
                  </Button>
                  <Button
                    type="button"
                    variant={method === 'email' ? 'default' : 'outline'}
                    onClick={() => setMethod('email')}
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                </div>

                {method === 'email' ? (
                  // Email-based reset form
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div className="space-y-2 group">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Address
                      </Label>
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="peer"
                          required
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                      size="lg"
                    >
                      {loading ? "Sending..." : "Send Reset Link"}
                    </Button>
                  </form>
                ) : (
                  // Phone-based reset form
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div className="space-y-2 group">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </Label>
                      <div className="relative">
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="09xxxxxxxxx or +639xxxxxxxxx"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="peer"
                          required
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                      size="lg"
                    >
                      {loading ? "Sending..." : "Send OTP"}
                    </Button>
                  </form>
                )}

                <p className="text-xs text-center text-muted-foreground mt-4">
                  {method === 'email' 
                    ? "We'll send you an email with a link to reset your password" 
                    : "We'll send an OTP to your phone for verification"}
                </p>
              </>
            )}

            {/* OTP Verification Form */}
            {showOTPVerification && (
              <form onSubmit={handleOTPVerification} className="space-y-4">
                <div className="space-y-2 group">
                  <Label htmlFor="otp" className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Verification Code
                  </Label>
                  <div className="relative">
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="peer text-center text-2xl tracking-widest"
                      maxLength={6}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Code sent to {phoneNumber}
                  </p>
                </div>

                {otpError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <p className="text-sm text-destructive">{otpError}</p>
                  </div>
                )}

                <Button 
                  type="submit"
                  disabled={otpLoading || otpCode.length !== 6}
                  className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                  size="lg"
                >
                  {otpLoading ? "Verifying..." : "Verify Code"}
                </Button>

                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowOTPVerification(false);
                    setSuccessMessage("");
                  }}
                  className="w-full"
                >
                  Change Phone Number
                </Button>
              </form>
            )}

            {/* New Password Form */}
            {showNewPasswordForm && (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2 group">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="peer"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="peer"
                      required
                    />
                  </div>
                </div>

                {passwordError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <p className="text-sm text-destructive">{passwordError}</p>
                  </div>
                )}

                <Button 
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                  size="lg"
                >
                  {passwordLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;