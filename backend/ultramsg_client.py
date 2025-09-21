import asyncio
import aiohttp
import logging
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import os

load_dotenv()

logger = logging.getLogger(__name__)

class UltramsgClient:
    def __init__(self, instance_id: str = None, token: str = None):
        self.instance_id = instance_id or os.getenv("ULTRAMSG_INSTANCE_ID")
        self.token = token or os.getenv("ULTRAMSG_TOKEN")
        self.base_url = "https://api.ultramsg.com"
        
        if not self.instance_id or not self.token:
            logger.warning("Ultramsg credentials not configured")
    
    async def send_message(self, to: str, body: str, priority: int = 1) -> Dict[str, Any]:
        """
        Send a text message via Ultramsg
        """
        if not self.instance_id or not self.token:
            return {
                "success": False,
                "error": "Ultramsg not configured",
                "message": "Configure Ultramsg instance and token first"
            }
        
        try:
            url = f"{self.base_url}/{self.instance_id}/messages/chat"
            
            payload = {
                "token": self.token,
                "to": to,
                "body": body,
                "priority": priority
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, data=payload) as response:
                    response_data = await response.json()
                    
                    if response.status == 200:
                        logger.info(f"Message sent successfully to {to}")
                        return {
                            "success": True,
                            "message_id": response_data.get("id"),
                            "response": response_data
                        }
                    else:
                        logger.error(f"Failed to send message: {response.status} - {response_data}")
                        return {
                            "success": False,
                            "error": f"HTTP {response.status}",
                            "response": response_data
                        }
                        
        except Exception as e:
            logger.error(f"Error sending message via Ultramsg: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def send_image(self, to: str, image_url: str, caption: str = "") -> Dict[str, Any]:
        """
        Send an image message via Ultramsg
        """
        if not self.instance_id or not self.token:
            return {
                "success": False,
                "error": "Ultramsg not configured"
            }
        
        try:
            url = f"{self.base_url}/{self.instance_id}/messages/image"
            
            payload = {
                "token": self.token,
                "to": to,
                "image": image_url,
                "caption": caption
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, data=payload) as response:
                    response_data = await response.json()
                    
                    if response.status == 200:
                        logger.info(f"Image sent successfully to {to}")
                        return {
                            "success": True,
                            "message_id": response_data.get("id"),
                            "response": response_data
                        }
                    else:
                        logger.error(f"Failed to send image: {response.status} - {response_data}")
                        return {
                            "success": False,
                            "error": f"HTTP {response.status}",
                            "response": response_data
                        }
                        
        except Exception as e:
            logger.error(f"Error sending image via Ultramsg: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_instance_status(self) -> Dict[str, Any]:
        """
        Get Ultramsg instance status
        """
        if not self.instance_id or not self.token:
            return {
                "success": False,
                "error": "Ultramsg not configured"
            }
        
        try:
            url = f"{self.base_url}/{self.instance_id}/instance/status"
            
            params = {
                "token": self.token
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    response_data = await response.json()
                    
                    if response.status == 200:
                        return {
                            "success": True,
                            "status": response_data
                        }
                    else:
                        return {
                            "success": False,
                            "error": f"HTTP {response.status}",
                            "response": response_data
                        }
                        
        except Exception as e:
            logger.error(f"Error getting instance status: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def test_connection(self) -> Dict[str, Any]:
        """
        Test Ultramsg connection
        """
        status_result = await self.get_instance_status()
        return {
            "ultramsg_configured": bool(self.instance_id and self.token),
            "instance_id": self.instance_id,
            "connection_test": status_result
        }

# Global instance
ultramsg_client = UltramsgClient()

async def send_whatsapp_message(to: str, message: str) -> Dict[str, Any]:
    """
    Convenience function to send WhatsApp message
    """
    return await ultramsg_client.send_message(to, message)

async def send_whatsapp_image(to: str, image_url: str, caption: str = "") -> Dict[str, Any]:
    """
    Convenience function to send WhatsApp image
    """
    return await ultramsg_client.send_image(to, image_url, caption)

async def test_ultramsg_connection() -> Dict[str, Any]:
    """
    Convenience function to test Ultramsg connection
    """
    return await ultramsg_client.test_connection()