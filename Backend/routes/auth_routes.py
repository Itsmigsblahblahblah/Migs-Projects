"""
API routes for OTP-based authentication using Semaphore SMS
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
import logging
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

        # TODO: Store the new password in your user database
        # For now, we just mark the reset as successful
        # You should integrate this with your user management system

        print(
            f"[RESET PASSWORD] Password reset successful for {formatted_number}")
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
