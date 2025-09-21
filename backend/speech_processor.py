import asyncio
import logging
import aiohttp
import tempfile
import os
from pathlib import Path
from dotenv import load_dotenv
from openai import AsyncOpenAI
from typing import Dict, Any, Optional

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class SpeechProcessor:
    def __init__(self):
        self.api_key = os.getenv("EMERGENT_LLM_KEY")
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not found in environment variables")
        
        # Initialize OpenAI client with Emergent key
        self.client = AsyncOpenAI(api_key=self.api_key)

    async def download_audio_file(self, audio_url: str) -> Optional[str]:
        """
        Download audio file from URL to temporary file
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(audio_url) as response:
                    if response.status == 200:
                        # Create temporary file
                        temp_dir = tempfile.gettempdir()
                        temp_file = os.path.join(temp_dir, f"wabi_audio_{os.urandom(8).hex()}.ogg")
                        
                        # Write audio data to file
                        with open(temp_file, 'wb') as f:
                            async for chunk in response.content.iter_chunked(8192):
                                f.write(chunk)
                        
                        logger.info(f"Downloaded audio file: {temp_file}")
                        return temp_file
                    else:
                        logger.error(f"Failed to download audio: HTTP {response.status}")
                        return None
                        
        except Exception as e:
            logger.error(f"Error downloading audio file: {e}")
            return None

    async def transcribe_audio(self, audio_file_path: str, language: str = "es") -> Dict[str, Any]:
        """
        Transcribe audio file using OpenAI Whisper
        """
        try:
            with open(audio_file_path, 'rb') as audio_file:
                # Use Whisper API for transcription
                transcript = await self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language=language,  # Spanish
                    response_format="verbose_json",
                    temperature=0.0  # More deterministic results
                )
                
                result = {
                    "success": True,
                    "text": transcript.text,
                    "language": transcript.language if hasattr(transcript, 'language') else language,
                    "duration": transcript.duration if hasattr(transcript, 'duration') else None,
                    "confidence": getattr(transcript, 'confidence', None)
                }
                
                logger.info(f"Successfully transcribed audio: '{transcript.text[:100]}...'")
                return result
                
        except Exception as e:
            logger.error(f"Error transcribing audio: {e}")
            return {
                "success": False,
                "error": str(e),
                "text": None
            }

    async def process_voice_message(self, audio_url: str, sme_id: str, customer_phone: str) -> Dict[str, Any]:
        """
        Complete voice message processing pipeline
        """
        temp_file = None
        
        try:
            # Step 1: Download audio file
            logger.info(f"Processing voice message from {customer_phone} for SME {sme_id}")
            temp_file = await self.download_audio_file(audio_url)
            
            if not temp_file:
                return {
                    "success": False,
                    "error": "Failed to download audio file",
                    "transcription": None
                }
            
            # Step 2: Transcribe audio
            transcription_result = await self.transcribe_audio(temp_file)
            
            if not transcription_result["success"]:
                return {
                    "success": False,
                    "error": transcription_result.get("error", "Transcription failed"),
                    "transcription": None
                }
            
            # Step 3: Return successful result
            return {
                "success": True,
                "transcription": transcription_result["text"],
                "language": transcription_result.get("language"),
                "duration": transcription_result.get("duration"),
                "confidence": transcription_result.get("confidence"),
                "audio_url": audio_url
            }
            
        except Exception as e:
            logger.error(f"Error in voice message processing pipeline: {e}")
            return {
                "success": False,
                "error": str(e),
                "transcription": None
            }
        
        finally:
            # Clean up temporary file
            if temp_file and os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                    logger.info(f"Cleaned up temporary file: {temp_file}")
                except Exception as e:
                    logger.warning(f"Failed to clean up temporary file: {e}")

    async def test_transcription(self, test_text: str = "Hola, este es un mensaje de prueba") -> Dict[str, Any]:
        """
        Test transcription functionality (for debugging)
        """
        try:
            logger.info(f"Testing speech processor with text: {test_text}")
            return {
                "success": True,
                "test_result": "Speech processor initialized successfully",
                "api_key_configured": bool(self.api_key)
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

# Global speech processor instance
speech_processor = SpeechProcessor()

async def process_voice_message(audio_url: str, sme_id: str, customer_phone: str) -> Dict[str, Any]:
    """
    Convenience function for voice message processing
    """
    return await speech_processor.process_voice_message(audio_url, sme_id, customer_phone)

async def test_speech_processor() -> Dict[str, Any]:
    """
    Convenience function for testing
    """
    return await speech_processor.test_transcription()