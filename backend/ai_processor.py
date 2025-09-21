import asyncio
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from dotenv import load_dotenv
import os
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# Function definitions for WABI business transactions
WABI_FUNCTIONS = [
    {
        "name": "record_sale",
        "description": "Registrar una venta realizada en el negocio",
        "parameters": {
            "type": "object",
            "properties": {
                "product_name": {"type": "string", "description": "Nombre del producto vendido"},
                "quantity": {"type": "number", "description": "Cantidad vendida"},
                "unit_price": {"type": "number", "description": "Precio unitario de venta"},
                "total_amount": {"type": "number", "description": "Monto total de la venta"},
                "payment_method": {
                    "type": "string", 
                    "enum": ["cash", "transfer", "wallet", "card", "credit_sale"],
                    "description": "Método de pago utilizado"
                },
                "customer_phone": {"type": "string", "description": "Teléfono del cliente (opcional)"},
                "credit_terms_days": {"type": "number", "description": "Días de crédito si es venta a crédito"}
            },
            "required": ["product_name", "total_amount"]
        }
    },
    {
        "name": "record_expense",
        "description": "Registrar un gasto o compra del negocio", 
        "parameters": {
            "type": "object",
            "properties": {
                "category": {"type": "string", "description": "Categoría del gasto"},
                "description": {"type": "string", "description": "Descripción detallada del gasto"},
                "amount": {"type": "number", "description": "Monto del gasto"},
                "payment_method": {
                    "type": "string",
                    "enum": ["cash", "transfer", "wallet", "card"],
                    "description": "Método de pago del gasto"
                }
            },
            "required": ["amount", "description"]
        }
    },
    {
        "name": "add_product_or_service",
        "description": "Agregar un nuevo producto o servicio al catálogo",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Nombre del producto o servicio"},
                "unit_cost": {"type": "number", "description": "Costo unitario del producto"},
                "sale_price": {"type": "number", "description": "Precio de venta del producto"},
                "service": {"type": "boolean", "description": "Si es un servicio (true) o producto físico (false)"}
            },
            "required": ["name", "sale_price"]
        }
    },
    {
        "name": "register_receivable_payment",
        "description": "Registrar un abono o pago a cuenta corriente de un cliente",
        "parameters": {
            "type": "object",
            "properties": {
                "customer_phone": {"type": "string", "description": "Teléfono del cliente que paga"},
                "amount": {"type": "number", "description": "Monto del abono"},
                "method": {
                    "type": "string",
                    "enum": ["cash", "transfer", "wallet", "card"],
                    "description": "Método de pago del abono"
                },
                "reference": {"type": "string", "description": "Referencia del pago (opcional)"}
            },
            "required": ["customer_phone", "amount"]
        }
    },
    {
        "name": "query_report",
        "description": "Generar un reporte rápido del negocio",
        "parameters": {
            "type": "object",
            "properties": {
                "type": {
                    "type": "string",
                    "enum": ["top_sold", "top_profitable", "daily_summary"],
                    "description": "Tipo de reporte solicitado"
                },
                "range": {
                    "type": "string",
                    "enum": ["today", "7d", "30d"],
                    "description": "Rango de tiempo para el reporte"
                },
                "date": {"type": "string", "format": "date", "description": "Fecha específica para reporte diario"}
            },
            "required": ["type"]
        }
    }
]

class WABIAIProcessor:
    def __init__(self):
        self.api_key = os.getenv("EMERGENT_LLM_KEY")
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not found in environment variables")
        
        self.system_message = """Eres WABI, un asistente inteligente especializado en ayudar a pequeños y medianos negocios en Guatemala a gestionar sus operaciones diarias a través de WhatsApp.

Tu trabajo es analizar los mensajes que recibas e identificar si contienen información sobre:
1. Ventas realizadas
2. Gastos o compras
3. Nuevos productos/servicios a agregar al catálogo
4. Pagos de clientes (abonos a cuenta corriente)
5. Solicitudes de reportes

IMPORTANTE:
- Siempre responde en español guatemalteco
- Usa el contexto de pequeños negocios guatemaltecos
- Si no entiendes el mensaje, pide aclaración
- Si el mensaje no es sobre el negocio, responde cordialmente pero indica que solo puedes ayudar con temas del negocio
- Los precios siempre están en Quetzales (Q)
- Sé amigable y profesional

Cuando identifiques una transacción, usa las funciones apropiadas para registrarla automáticamente."""

    async def process_message(self, message: str, sme_id: str, customer_phone: str) -> Dict[str, Any]:
        """
        Process a WhatsApp message using AI and function calling
        """
        try:
            # Create unique session ID for this conversation
            session_id = f"wabi_{sme_id}_{customer_phone}"
            
            # Initialize LLM chat with function calling
            chat = LlmChat(
                api_key=self.api_key,
                session_id=session_id,
                system_message=self.system_message
            ).with_model("openai", "gpt-4o-mini")
            
            # Add function tools to the chat
            for function in WABI_FUNCTIONS:
                chat.add_function_tool(
                    name=function["name"],
                    description=function["description"],
                    parameters=function["parameters"]
                )
            
            # Create user message
            user_message = UserMessage(text=message)
            
            # Send message and get response
            response = await chat.send_message(user_message)
            
            # Parse the response
            result = {
                "success": True,
                "ai_response": response.text if hasattr(response, 'text') else str(response),
                "function_calls": [],
                "raw_response": response
            }
            
            # Check if there were function calls
            if hasattr(response, 'function_calls') and response.function_calls:
                for func_call in response.function_calls:
                    result["function_calls"].append({
                        "function": func_call.name,
                        "arguments": func_call.arguments,
                        "id": func_call.id if hasattr(func_call, 'id') else None
                    })
            
            logger.info(f"AI processed message successfully: {len(result['function_calls'])} function calls")
            return result
            
        except Exception as e:
            logger.error(f"Error processing message with AI: {e}")
            return {
                "success": False,
                "error": str(e),
                "ai_response": "Lo siento, tuve un problema procesando tu mensaje. ¿Puedes intentar de nuevo?",
                "function_calls": []
            }

    async def process_voice_message(self, audio_url: str, sme_id: str, customer_phone: str) -> Dict[str, Any]:
        """
        Process a voice message by first transcribing it, then processing the text
        """
        try:
            # TODO: Implement speech-to-text functionality
            # For now, return a placeholder response
            logger.info(f"Voice message received from {customer_phone} for SME {sme_id}")
            
            return {
                "success": False,
                "ai_response": "Recibí tu mensaje de voz. Por el momento, solo puedo procesar mensajes de texto. ¿Puedes escribir tu mensaje?",
                "function_calls": [],
                "note": "Voice processing not yet implemented"
            }
            
        except Exception as e:
            logger.error(f"Error processing voice message: {e}")
            return {
                "success": False,
                "error": str(e),
                "ai_response": "No pude procesar tu mensaje de voz. ¿Puedes escribir tu mensaje?",
                "function_calls": []
            }

# Global processor instance
ai_processor = WABIAIProcessor()

async def process_whatsapp_message(message: str, sme_id: str, customer_phone: str) -> Dict[str, Any]:
    """
    Convenience function to process WhatsApp messages
    """
    return await ai_processor.process_message(message, sme_id, customer_phone)

async def process_whatsapp_voice(audio_url: str, sme_id: str, customer_phone: str) -> Dict[str, Any]:
    """
    Convenience function to process WhatsApp voice messages
    """
    return await ai_processor.process_voice_message(audio_url, sme_id, customer_phone)