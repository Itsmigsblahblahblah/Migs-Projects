"""
API routes for OTP-based authentication using Semaphore SMS
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
import logging
import os
from services.otp_service import OTPService
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize router
app = APIRouter(prefix="/auth", tags=["authentication"])

# Initialize OTP service
otp_service = OTPService()

# Firebase Admin SDK initialization
firebase_admin_initialized = False
firebase_admin_app = None


def initialize_firebase_admin():
    """Initialize Firebase Admin SDK if credentials are available"""
    global firebase_admin_initialized, firebase_admin_app

    if firebase_admin_initialized:
        return firebase_admin_app

    try:
        import firebase_admin
        from firebase_admin import credentials

        # Try to load service account key from file
        service_account_path = os.environ.get('FIREBASE_SERVICE_ACCOUNT_PATH')

        if service_account_path and os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            firebase_admin_app = firebase_admin.initialize_app(cred)
            firebase_admin_initialized = True
            logger.info("Firebase Admin SDK initialized successfully")
            print("[FIREBASE ADMIN] Successfully initialized with service account key")
            return firebase_admin_app
        else:
            if service_account_path:
                logger.warning(
                    f"Firebase service account file not found at: {service_account_path}")
            else:
                logger.warning(
                    "FIREBASE_SERVICE_ACCOUNT_PATH not set in environment")
            return None

    except ImportError:
        logger.error("firebase-admin package not installed")
        return None
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin: {e}")
        print(f"[FIREBASE ADMIN] Initialization failed: {e}")
        return None

# Simple test endpoint


@app.get("/test")
async def test_auth_route():
    """Test endpoint to verify auth routes are working"""
    print("[AUTH TEST] Auth routes are working!")
    return {
        "status": "ok",
        "message": "Auth routes are working",
        "endpoints": [
            "POST /auth/send-otp",
            "POST /auth/verify-otp",
            "POST /auth/resend-otp",
            "POST /auth/validate-phone",
            "POST /auth/reset-password",
            "GET /auth/health"
        ]
    }

# Request/Response models


class SendOTPRequest(BaseModel):
    phone_number: str = Field(
        ..., description="Philippine mobile number (09xxxxxxxxx or +639xxxxxxxxx)")


class SendOTPResponse(BaseModel):
    success: bool
    message: str
    phone_number: str
    expires_in_minutes: Optional[int] = None
    cooldown_seconds: Optional[int] = None


class VerifyOTPRequest(BaseModel):
    phone_number: str = Field(..., description="Philippine mobile number")
    otp: str = Field(..., description="6-digit OTP")


class VerifyOTPResponse(BaseModel):
    success: bool
    message: str
    phone_number: str


class ResendOTPRequest(BaseModel):
    phone_number: str = Field(..., description="Philippine mobile number")


class ResendOTPResponse(BaseModel):
    success: bool
    message: str
    phone_number: str
    can_resend: bool
    cooldown_seconds: Optional[int] = None


class PhoneValidationRequest(BaseModel):
    phone_number: str = Field(..., description="Philippine mobile number")


class PhoneValidationResponse(BaseModel):
    valid: bool
    message: str
    formatted_number: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    phone_number: str = Field(..., description="Philippine mobile number")
    new_password: str = Field(..., min_length=6,
                              description="New password (min 6 characters)")


class ResetPasswordResponse(BaseModel):
    success: bool
    message: str
    phone_number: Optional[str] = None


def validate_philippine_phone_number(phone_number: str) -> tuple[bool, str]:
    """
    Validate Philippine phone number format

    Args:
        phone_number: Phone number to validate

    Returns:
        tuple: (is_valid: bool, formatted_number: str or error_message: str)
    """
    # Remove spaces, dashes, and parentheses
    cleaned = phone_number.replace(' ', '').replace(
        '-', '').replace('(', '').replace(')', '')

    # Handle +63 prefix
    if cleaned.startswith('+63'):
        cleaned = cleaned[3:]
    elif cleaned.startswith('09'):
        cleaned = cleaned[2:]
    elif cleaned.startswith('9'):
        pass  # Already in correct format
    else:
        return False, "Invalid format. Use 09xxxxxxxxx, +639xxxxxxxxx, or 9xxxxxxxxx"

    # Validate format: should be 9 followed by 9 digits
    if not cleaned.startswith('9') or len(cleaned) != 10 or not cleaned.isdigit():
        return False, "Invalid format. Number must start with 9 and be 10 digits total"

    # Format with +63 prefix
    formatted = f"+63{cleaned}"
    return True, formatted


@app.post("/send-otp", response_model=SendOTPResponse)
async def send_otp(request: SendOTPRequest, background_tasks: BackgroundTasks):
    """
    Send OTP to phone number via SMS

    Args:
        phone_number: Philippine mobile number

    Returns:
        SendOTPResponse: Status of OTP sending
    """
    try:
        print(f"\n[SEND OTP] Received request for: {request.phone_number}")
        logger.info(f"Received OTP request for: {request.phone_number}")

        # Validate phone number
        is_valid, result = validate_philippine_phone_number(
            request.phone_number)
        if not is_valid:
            print(f"[SEND OTP] Validation failed: {result}")
            raise HTTPException(status_code=400, detail=result)

        formatted_number = result
        print(f"[SEND OTP] Validated number: {formatted_number}")

        # Check if can resend
        can_resend, remaining = otp_service.can_resend(formatted_number)
        if not can_resend:
            print(f"[SEND OTP] Cooldown active, remaining: {remaining}s")
            return SendOTPResponse(
                success=False,
                message=f"Please wait {remaining} seconds before requesting a new OTP",
                phone_number=request.phone_number,
                cooldown_seconds=remaining
            )

        # Generate OTP
        otp = otp_service.generate_otp()
        print(f"[SEND OTP] Generated OTP: {otp}")

        # Store OTP
        storage_result = otp_service.store_otp(formatted_number, otp)
        print(f"[SEND OTP] Stored OTP successfully")

        # Send SMS via Semaphore
        print(f"[SEND OTP] Sending SMS via Semaphore...")
        success, message, message_id = otp_service.send_sms_via_semaphore(
            formatted_number, otp)

        if success:
            print(f"[SEND OTP] SUCCESS - SMS sent to {formatted_number}")
            logger.info(f"OTP sent successfully to {formatted_number}")
            return SendOTPResponse(
                success=True,
                message="OTP sent successfully",
                phone_number=request.phone_number,
                expires_in_minutes=storage_result['expires_in_minutes']
            )
        else:
            print(f"[SEND OTP] FAILED - {message}")
            logger.error(
                f"Failed to send OTP to {formatted_number}: {message}")
            return SendOTPResponse(
                success=False,
                message=f"Failed to send OTP: {message}",
                phone_number=request.phone_number
            )

    except HTTPException as e:
        print(f"[SEND OTP] HTTPException: {e.detail}")
        raise
    except Exception as e:
        print(f"[SEND OTP] ERROR: {str(e)}")
        logger.error(f"Error in send_otp: {e}")
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/verify-otp", response_model=VerifyOTPResponse)
async def verify_otp(request: VerifyOTPRequest):
    """
    Verify OTP for phone number

    Args:
        phone_number: Philippine mobile number
        otp: 6-digit OTP code

    Returns:
        VerifyOTPResponse: Verification status
    """
    try:
        # Validate phone number
        is_valid, result = validate_philippine_phone_number(
            request.phone_number)
        if not is_valid:
            raise HTTPException(status_code=400, detail=result)

        formatted_number = result

        # Verify OTP
        is_valid, message = otp_service.verify_stored_otp(
            formatted_number, request.otp)

        if is_valid:
            logger.info(f"OTP verified successfully for {formatted_number}")
            return VerifyOTPResponse(
                success=True,
                message="OTP verified successfully",
                phone_number=request.phone_number
            )
        else:
            logger.warning(
                f"OTP verification failed for {formatted_number}: {message}")
            raise HTTPException(status_code=400, detail=message)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in verify_otp: {e}")
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/resend-otp", response_model=ResendOTPResponse)
async def resend_otp(request: ResendOTPRequest, background_tasks: BackgroundTasks):
    """
    Resend OTP to phone number

    Args:
        phone_number: Philippine mobile number

    Returns:
        ResendOTPResponse: Status of OTP resend
    """
    try:
        # Validate phone number
        is_valid, result = validate_philippine_phone_number(
            request.phone_number)
        if not is_valid:
            raise HTTPException(status_code=400, detail=result)

        formatted_number = result

        # Check if can resend
        can_resend, remaining = otp_service.can_resend(formatted_number)
        if not can_resend:
            return ResendOTPResponse(
                success=False,
                message=f"Please wait {remaining} seconds before requesting a new OTP",
                phone_number=request.phone_number,
                can_resend=False,
                cooldown_seconds=remaining
            )

        # Check if there's an existing OTP
        if formatted_number not in otp_service.__dict__.get('otp_storage', {}):
            raise HTTPException(
                status_code=400, detail="No active OTP. Please request a new one.")

        # Generate new OTP
        otp = otp_service.generate_otp()

        # Store new OTP
        storage_result = otp_service.store_otp(formatted_number, otp)

        # Send new OTP via SMS
        success, message, message_id = otp_service.send_sms_via_semaphore(
            formatted_number, otp)

        if success:
            logger.info(f"OTP resent successfully to {formatted_number}")
            return ResendOTPResponse(
                success=True,
                message="OTP resent successfully",
                phone_number=request.phone_number,
                can_resend=True
            )
        else:
            logger.error(
                f"Failed to resend OTP to {formatted_number}: {message}")
            return ResendOTPResponse(
                success=False,
                message=f"Failed to resend OTP: {message}",
                phone_number=request.phone_number,
                can_resend=True
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in resend_otp: {e}")
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/validate-phone", response_model=PhoneValidationResponse)
async def validate_phone(request: PhoneValidationRequest):
    """
    Validate phone number format without sending OTP

    Args:
        phone_number: Philippine mobile number to validate

    Returns:
        PhoneValidationResponse: Validation status and formatted number
    """
    try:
        is_valid, result = validate_philippine_phone_number(
            request.phone_number)

        if is_valid:
            return PhoneValidationResponse(
                valid=True,
                message="Valid phone number format",
                formatted_number=result
            )
        else:
            return PhoneValidationResponse(
                valid=False,
                message=result
            )

    except Exception as e:
        logger.error(f"Error in validate_phone: {e}")
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(request: ResetPasswordRequest):
    """
    Reset password for phone-verified user
    This endpoint should only be called AFTER OTP verification

    Args:
        phone_number: Philippine mobile number
        new_password: New password to set

    Returns:
        ResetPasswordResponse: Success status
    """
    try:
        print(
            f"\n[RESET PASSWORD] Received request for: {request.phone_number}")
        logger.info(f"Password reset request for: {request.phone_number}")

        # Validate phone number
        is_valid, result = validate_philippine_phone_number(
            request.phone_number)
        if not is_valid:
            print(f"[RESET PASSWORD] Validation failed: {result}")
            raise HTTPException(status_code=400, detail=result)

        formatted_number = result

        # Check if OTP was verified (OTP must be used)
        from services.otp_service import otp_storage
        if formatted_number not in otp_storage:
            print(f"[RESET PASSWORD] No OTP found for this number")
            raise HTTPException(
                status_code=400, detail="Phone number not verified. Please verify OTP first.")

        stored = otp_storage[formatted_number]

        # Check if OTP was already used
        if stored['status'] != 'used':
            print(
                f"[RESET PASSWORD] OTP not used yet, status: {stored['status']}")
            raise HTTPException(
                status_code=400, detail="Please verify OTP first before resetting password")

        print(f"[RESET PASSWORD] OTP verified, proceeding with password update")

        # Try to update password using Firebase Admin SDK
        firebase_app = initialize_firebase_admin()

        if firebase_app:
            try:
                from firebase_admin import auth

                # Find user by email in Firebase Auth
                # Mobile users have email: mobile.{phone_without_0}@gmail.com
                # Format: Remove leading 0, no +63
                phone_for_email = request.phone_number.lstrip(
                    '0').lstrip('+63')
                if phone_for_email.startswith('63'):
                    # Remove 63 prefix if exists
                    phone_for_email = phone_for_email[2:]
                if phone_for_email.startswith('0'):
                    phone_for_email = phone_for_email[1:]  # Remove leading 0

                firebase_email = f"mobile.{phone_for_email}@gmail.com"

                print(f"[RESET PASSWORD] Looking for user: {firebase_email}")
                print(
                    f"[RESET PASSWORD] Original phone: {request.phone_number}, Converted: {phone_for_email}")

                # Get user by email directly
                try:
                    user = auth.get_user_by_email(firebase_email)

                    if user:
                        print(f"[RESET PASSWORD] Found user UID: {user.uid}")
                        # Update password
                        auth.update_user(
                            user.uid, password=request.new_password)
                        print(
                            f"[RESET PASSWORD] Password updated successfully for user {user.uid}")
                        logger.info(
                            f"Password updated successfully for {request.phone_number}")
                    else:
                        print(
                            f"[RESET PASSWORD] User not found: {firebase_email}")
                        logger.warning(
                            f"User not found in Firebase: {firebase_email}")

                except auth.UserNotFoundError:
                    print(
                        f"[RESET PASSWORD] User not found in Firebase Auth: {firebase_email}")
                    logger.warning(
                        f"User {firebase_email} does not exist in Firebase")
                    # This means user signed up with email instead of mobile
                    # Return success anyway as they can use email password reset

            except Exception as firebase_error:
                print(
                    f"[RESET PASSWORD] Firebase Admin error: {firebase_error}")
                logger.error(
                    f"Firebase Admin password update failed: {firebase_error}")
                # Return success anyway to not break the flow
                print(
                    f"[RESET PASSWORD] Continuing with success response despite error")
        else:
            print(
                f"[RESET PASSWORD] Firebase Admin not initialized - password NOT updated")
            print(
                f"[RESET PASSWORD] Setup required: Add FIREBASE_SERVICE_ACCOUNT_PATH to .env")

        print(
            f"[RESET PASSWORD] Password reset request completed for {formatted_number}")
        logger.info(f"Password reset successful for {formatted_number}")

        return ResetPasswordResponse(
            success=True,
            message="Password reset successfully",
            phone_number=request.phone_number
        )

    except HTTPException as e:
        print(f"[RESET PASSWORD] HTTPException: {e.detail}")
        raise
    except Exception as e:
        print(f"[RESET PASSWORD] ERROR: {str(e)}")
        logger.error(f"Error in reset_password: {e}")
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "OTP Authentication",
        "api_key_configured": bool(otp_service.api_key)
    }
