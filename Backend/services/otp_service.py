"""
OTP (One-Time Password) Service for SMS-based authentication
Handles OTP generation, validation, and Semaphore API integration
"""

import os
import random
import string
import bcrypt
import requests
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# In-memory OTP storage (use Redis or database in production)
otp_storage = {}


class OTPService:
    """Service for managing OTP generation, validation, and SMS sending"""

    # Configuration
    OTP_LENGTH = 6
    OTP_EXPIRY_MINUTES = 5
    MAX_ATTEMPTS = 5
    RESEND_COOLDOWN_SECONDS = 60
    # Use regular SMS endpoint to avoid duplicate OTP messages from Semaphore
    SEMAPHORE_API_URL = "https://api.semaphore.co/api/v4/messages"

    def __init__(self):
        """Initialize the OTP service"""
        self.api_key = os.getenv('SEMAPHORE_API_KEY')
        if not self.api_key:
            logger.warning(
                "SEMAPHORE_API_KEY not found in environment variables")

    def generate_otp(self) -> str:
        """
        Generate a random 6-digit OTP

        Returns:
            str: 6-digit OTP string
        """
        return ''.join(random.choices(string.digits, k=self.OTP_LENGTH))

    def hash_otp(self, otp: str) -> str:
        """
        Hash OTP for secure storage

        Args:
            otp: Plain text OTP

        Returns:
            str: Hashed OTP
        """
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(otp.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    def verify_otp_hash(self, otp: str, hashed_otp: str) -> bool:
        """
        Verify OTP against hash

        Args:
            otp: Plain text OTP to verify
            hashed_otp: Hashed OTP from storage

        Returns:
            bool: True if OTP matches
        """
        try:
            return bcrypt.checkpw(
                otp.encode('utf-8'),
                hashed_otp.encode('utf-8')
            )
        except Exception as e:
            logger.error(f"Error verifying OTP hash: {e}")
            return False

    def store_otp(self, phone_number: str, otp: str) -> Dict:
        """
        Store OTP with metadata

        Args:
            phone_number: User's phone number
            otp: Plain text OTP

        Returns:
            dict: Storage result with status and expiry
        """
        hashed = self.hash_otp(otp)
        expiry = datetime.now() + timedelta(minutes=self.OTP_EXPIRY_MINUTES)

        otp_storage[phone_number] = {
            'hashed_otp': hashed,
            'expiry': expiry.isoformat(),
            'status': 'unused',  # unused, used, expired
            'attempts': 0,
            'max_attempts': self.MAX_ATTEMPTS,
            'created_at': datetime.now().isoformat(),
            'resent_at': None
        }

        logger.info(f"OTP stored for {phone_number}, expires at {expiry}")
        return {
            'status': 'success',
            'expiry': expiry.isoformat(),
            'expires_in_minutes': self.OTP_EXPIRY_MINUTES
        }

    def verify_stored_otp(self, phone_number: str, otp: str) -> Tuple[bool, str]:
        """
        Verify OTP against stored value

        Args:
            phone_number: User's phone number
            otp: OTP to verify

        Returns:
            tuple: (is_valid: bool, message: str)
        """
        # Check if OTP exists for phone number
        if phone_number not in otp_storage:
            return False, "No OTP found for this phone number"

        stored = otp_storage[phone_number]

        # Check if already used
        if stored['status'] == 'used':
            return False, "OTP has already been used"

        # Check if expired
        expiry_time = datetime.fromisoformat(stored['expiry'])
        if datetime.now() > expiry_time:
            stored['status'] = 'expired'
            return False, "OTP has expired"

        # Check attempt limit
        if stored['attempts'] >= stored['max_attempts']:
            stored['status'] = 'expired'
            return False, "Maximum attempts exceeded. Please request a new OTP"

        # Verify OTP
        is_valid = self.verify_otp_hash(otp, stored['hashed_otp'])

        if is_valid:
            stored['status'] = 'used'
            return True, "OTP verified successfully"
        else:
            stored['attempts'] += 1
            remaining = stored['max_attempts'] - stored['attempts']
            return False, f"Invalid OTP. {remaining} attempts remaining"

    def can_resend(self, phone_number: str) -> Tuple[bool, int]:
        """
        Check if OTP can be resent

        Args:
            phone_number: User's phone number

        Returns:
            tuple: (can_resend: bool, remaining_seconds: int)
        """
        if phone_number not in otp_storage:
            return True, 0

        stored = otp_storage[phone_number]

        # If no previous resend, can resend immediately
        if not stored.get('resent_at'):
            return True, 0

        last_resend = datetime.fromisoformat(stored['resent_at'])
        elapsed = (datetime.now() - last_resend).total_seconds()
        remaining = max(0, int(self.RESEND_COOLDOWN_SECONDS - elapsed))

        return remaining == 0, remaining

    def mark_otp_used(self, phone_number: str) -> bool:
        """
        Mark OTP as used (after successful account creation)

        Args:
            phone_number: User's phone number

        Returns:
            bool: True if successfully marked
        """
        if phone_number not in otp_storage:
            return False

        otp_storage[phone_number]['status'] = 'used'
        logger.info(f"OTP marked as used for {phone_number}")
        return True

    def cleanup_expired_otps(self):
        """Clean up expired OTPs from storage"""
        current_time = datetime.now()
        expired_keys = []

        for phone_number, stored in otp_storage.items():
            expiry_time = datetime.fromisoformat(stored['expiry'])
            if current_time > expiry_time and stored['status'] == 'unused':
                stored['status'] = 'expired'
                expired_keys.append(phone_number)

        # Optionally remove old entries
        for key in expired_keys:
            if otp_storage[key]['status'] in ['used', 'expired']:
                del otp_storage[key]

        if expired_keys:
            logger.info(f"Cleaned up {len(expired_keys)} expired OTPs")

    def send_sms_via_semaphore(self, phone_number: str, otp: str) -> Tuple[bool, str, Optional[str]]:
        """
        Send OTP via Semaphore SMS API

        Args:
            phone_number: Recipient's phone number (with +63 prefix)
            otp: OTP to send

        Returns:
            tuple: (success: bool, message: str, message_id: Optional[str])
        """
        try:
            # Format phone number
            if not phone_number.startswith('+63'):
                phone_number = f"+63{phone_number}"

            # Prepare request - use regular SMS endpoint (not OTP endpoint)
            # This prevents Semaphore from adding its own OTP message
            payload = {
                'apikey': self.api_key,
                'number': phone_number,
                'message': f"Your Harvestify verification code is: {otp}. Valid for {self.OTP_EXPIRY_MINUTES} minutes. Do not share this code.",
                'sender_name': 'Harvestify'
            }

            print(f"[SEMAPHORE] Sending to: {phone_number}")
            print(f"[SEMAPHORE] Message: {payload['message']}")

            # Send request
            print(f"[SEMAPHORE] API URL: {self.SEMAPHORE_API_URL}")
            print(f"[SEMAPHORE] Full payload: {payload}")

            response = requests.post(
                self.SEMAPHORE_API_URL,
                json=payload,
                timeout=30
            )

            print(f"[SEMAPHORE] Status code: {response.status_code}")
            print(f"[SEMAPHORE] Response: {response.text}")

            # Check response
            if response.status_code == 200:
                try:
                    response_data = response.json()
                    print(f"[SEMAPHORE] Response JSON: {response_data}")
                    print(f"[SEMAPHORE] Response type: {type(response_data)}")

                    # Semaphore can return either dict or list
                    message_id = None
                    status = 'unknown'

                    if isinstance(response_data, list):
                        # Response is a list
                        if response_data and len(response_data) > 0:
                            first_item = response_data[0]
                            if isinstance(first_item, dict):
                                message_id = first_item.get('id', 'unknown')
                                status = first_item.get('status', 'unknown')
                            else:
                                print(
                                    f"[SEMAPHORE] List item is not a dict: {first_item}")
                        else:
                            print(f"[SEMAPHORE] Empty list response")
                    elif isinstance(response_data, dict):
                        # Response is a dict
                        message_id = response_data.get('id', 'unknown')
                        status = response_data.get('status', 'unknown')
                    else:
                        print(
                            f"[SEMAPHORE] Unexpected response type: {type(response_data)}")

                    print(
                        f"[SEMAPHORE] SUCCESS - Message ID: {message_id}, Status: {status}")
                    logger.info(
                        f"SMS sent to {phone_number}, status: {status}, message_id: {message_id}")
                    return True, "SMS sent successfully", message_id

                except Exception as e:
                    # If can't parse JSON but status is 200, assume success
                    print(f"[SEMAPHORE] JSON parse error but status 200: {e}")
                    print(f"[SEMAPHORE] Raw response: {response.text}")
                    return True, "SMS sent successfully", None
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get(
                        'message', f'HTTP {response.status_code}')
                except:
                    error_msg = f"HTTP {response.status_code}"

                print(f"[SEMAPHORE] FAILED - {error_msg}")
                logger.error(
                    f"Failed to send SMS: {error_msg}, status: {response.status_code}")
                return False, error_msg, None

        except requests.exceptions.Timeout:
            logger.error("Semaphore API request timed out")
            return False, "SMS sending timed out. Please try again.", None

        except requests.exceptions.RequestException as e:
            logger.error(f"Semaphore API request failed: {e}")
            return False, f"SMS sending failed: {str(e)}", None

        except Exception as e:
            logger.error(f"Unexpected error sending SMS: {e}")
            return False, f"Unexpected error: {str(e)}", None
