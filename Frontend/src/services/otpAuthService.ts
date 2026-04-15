/**
 * OTP Authentication Service
 * Handles communication with backend OTP endpoints
 */

// Auto-detect: use localhost for local development, or production URL when deployed
const API_BASE_URL = typeof window !== 'undefined' && 
                     (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                     ? 'http://localhost:8000'
                     : (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000');

export interface SendOTPResponse {
  success: boolean;
  message: string;
  phone_number: string;
  expires_in_minutes?: number;
  cooldown_seconds?: number;
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  phone_number: string;
}

export interface PhoneValidationResponse {
  valid: boolean;
  message: string;
  formatted_number?: string;
}

/**
 * Validate Philippine phone number format
 */
export async function validatePhoneNumber(phoneNumber: string): Promise<PhoneValidationResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/validate-phone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone_number: phoneNumber }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        valid: false,
        message: error.detail || 'Validation failed',
      };
    }

    return await response.json();
  } catch (error) {
    console.error('Error validating phone number:', error);
    return {
      valid: false,
      message: 'Network error. Please check your connection.',
    };
  }
}

/**
 * Send OTP to phone number
 */
export async function sendOTP(phoneNumber: string): Promise<SendOTPResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
  
  try {
    console.log('[OTP Service] API_BASE_URL:', API_BASE_URL);
    console.log('[OTP Service] Sending OTP to endpoint:', `${API_BASE_URL}/auth/send-otp`);
    console.log('[OTP Service] Request body:', { phone_number: phoneNumber });
    
    const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone_number: phoneNumber }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log('[OTP Service] Response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('[OTP Service] Error response:', error);
      return {
        success: false,
        message: error.detail || 'Failed to send OTP',
        phone_number: phoneNumber,
      };
    }

    const data = await response.json();
    console.log('[OTP Service] Success response:', data);
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('[OTP Service] Error:', error);
    
    if (error.name === 'AbortError') {
      return {
        success: false,
        message: 'Request timed out. Please check if backend is running at http://localhost:8000',
        phone_number: phoneNumber,
      };
    }
    
    return {
      success: false,
      message: 'Network error. Please check your connection.',
      phone_number: phoneNumber,
    };
  }
}

/**
 * Verify OTP code
 */
export async function verifyOTP(phoneNumber: string, otp: string): Promise<VerifyOTPResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone_number: phoneNumber, otp }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        message: error.detail || 'Invalid OTP',
        phone_number: phoneNumber,
      };
    }

    return await response.json();
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      success: false,
      message: 'Network error. Please check your connection.',
      phone_number: phoneNumber,
    };
  }
}

/**
 * Resend OTP to phone number
 */
export async function resendOTP(phoneNumber: string): Promise<SendOTPResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone_number: phoneNumber }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        message: error.detail || 'Failed to resend OTP',
        phone_number: phoneNumber,
      };
    }

    return await response.json();
  } catch (error) {
    console.error('Error resending OTP:', error);
    return {
      success: false,
      message: 'Network error. Please check your connection.',
      phone_number: phoneNumber,
    };
  }
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Remove +63 prefix if present
  if (cleaned.startsWith('63')) {
    cleaned = cleaned.substring(2);
  }
  
  // Limit to 10 digits
  cleaned = cleaned.slice(0, 10);
  
  // Format as: 9XX XXX XXXX
  if (cleaned.length <= 3) {
    return cleaned;
  } else if (cleaned.length <= 6) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  } else {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
}

/**
 * Validate Philippine phone number format (client-side)
 */
export function isValidPhilippinePhone(phoneNumber: string): boolean {
  // Remove non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Handle +63 prefix
  if (cleaned.startsWith('63')) {
    cleaned = cleaned.substring(2);
  }
  
  // Remove leading 0
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Must start with 9 and be 10 digits
  return cleaned.startsWith('9') && cleaned.length === 10 && /^\d+$/.test(cleaned);
}
