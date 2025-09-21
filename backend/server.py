from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
import bcrypt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
SECRET_KEY = os.environ.get("SECRET_KEY", "wabi-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="WABI Platform API")
api_router = APIRouter(prefix="/api")

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    FINANZAS = "finanzas"
    SOPORTE = "soporte"
    PARTNER = "partner"

class PlanType(str, Enum):
    FREE = "free"
    PRO = "pro"

class TransactionType(str, Enum):
    SALE = "sale"
    EXPENSE = "expense"
    RECEIVABLE = "receivable"
    PAYMENT = "payment"

class PaymentMethod(str, Enum):
    CASH = "cash"
    TRANSFER = "transfer"
    WALLET = "wallet"
    CARD = "card"
    CREDIT_SALE = "credit_sale"

# Models
class Tenant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    country: str
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SME(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    nombre_negocio: str
    owner_phone: str
    departamento: str
    municipio: str
    numero_celular_negocio: str
    plan: PlanType = PlanType.FREE
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sme_id: Optional[str] = None
    role: UserRole
    phone: str
    name: str
    email: Optional[str] = None
    hashed_password: str
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sme_id: str
    name: str
    unit_cost: Optional[float] = 0
    sale_price: float
    service: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sme_id: str
    type: TransactionType
    items_json: Optional[List[Dict[str, Any]]] = []
    amount: float
    payment_method: Optional[PaymentMethod] = None
    source: str = "admin"
    raw_message_id: Optional[str] = None
    customer_phone: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Customer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sme_id: str
    name: str
    phone: str
    external_id: Optional[str] = None
    risk_flags: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Receivable(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sme_id: str
    customer_id: str
    doc_number: Optional[str] = None
    principal_amount: float
    balance: float
    due_date: datetime
    status: str = "open"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScoreSnapshot(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sme_id: str
    score: int
    band: str  # A, B, C, D
    reasons_json: Optional[List[str]] = []
    dt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WebhookLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    provider: str
    payload: Dict[str, Any]
    status: str = "pending"
    attempts: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# DTO Models for requests
class UserCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    password: str
    role: UserRole
    sme_id: Optional[str] = None

class UserLogin(BaseModel):
    phone: str
    password: str

class SMECreate(BaseModel):
    nombre_negocio: str
    owner_phone: str
    departamento: str
    municipio: str
    numero_celular_negocio: str

class ProductCreate(BaseModel):
    name: str
    unit_cost: Optional[float] = 0
    sale_price: float
    service: bool = False

class TransactionCreate(BaseModel):
    type: TransactionType
    items_json: Optional[List[Dict[str, Any]]] = []
    amount: float
    payment_method: Optional[PaymentMethod] = None
    customer_phone: Optional[str] = None

class SubscribeRequest(BaseModel):
    nombre: str
    username: str
    celular: str
    nombre_negocio: str
    departamento: str
    municipio: str
    numero_celular_negocio: str

# Token model
class Token(BaseModel):
    access_token: str
    token_type: str

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    return User(**user)

# Auth endpoints
@api_router.post("/auth/register", response_model=dict)
async def register_user(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"phone": user_data.phone})
    if existing_user:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Create user
    hashed_password = hash_password(user_data.password)
    user = User(
        name=user_data.name,
        phone=user_data.phone,
        email=user_data.email,
        role=user_data.role,
        sme_id=user_data.sme_id,
        hashed_password=hashed_password
    )
    
    await db.users.insert_one(user.dict())
    return {"message": "User created successfully", "user_id": user.id}

@api_router.post("/auth/login", response_model=Token)
async def login_user(user_data: UserLogin):
    user = await db.users.find_one({"phone": user_data.phone})
    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["id"], "role": user["role"]}, 
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# SME endpoints
@api_router.post("/smes", response_model=SME)
async def create_sme(sme_data: SMECreate, current_user: User = Depends(get_current_user)):
    # For now, create default tenant if none exists
    tenant = await db.tenants.find_one({"name": "default"})
    if not tenant:
        default_tenant = Tenant(name="default", country="Guatemala")
        await db.tenants.insert_one(default_tenant.dict())
        tenant_id = default_tenant.id
    else:
        tenant_id = tenant["id"]
    
    sme = SME(
        tenant_id=tenant_id,
        nombre_negocio=sme_data.nombre_negocio,
        owner_phone=sme_data.owner_phone,
        departamento=sme_data.departamento,
        municipio=sme_data.municipio,
        numero_celular_negocio=sme_data.numero_celular_negocio
    )
    
    await db.smes.insert_one(sme.dict())
    return sme

@api_router.get("/smes", response_model=List[SME])
async def get_smes(current_user: User = Depends(get_current_user)):
    smes = await db.smes.find().to_list(1000)
    return [SME(**sme) for sme in smes]

@api_router.get("/smes/{sme_id}", response_model=SME)
async def get_sme(sme_id: str, current_user: User = Depends(get_current_user)):
    sme = await db.smes.find_one({"id": sme_id})
    if not sme:
        raise HTTPException(status_code=404, detail="SME not found")
    return SME(**sme)

# Product endpoints
@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, sme_id: str, current_user: User = Depends(get_current_user)):
    product = Product(
        sme_id=sme_id,
        name=product_data.name,
        unit_cost=product_data.unit_cost,
        sale_price=product_data.sale_price,
        service=product_data.service
    )
    
    await db.products.insert_one(product.dict())
    return product

@api_router.get("/products", response_model=List[Product])
async def get_products(sme_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    filter_query = {}
    if sme_id:
        filter_query["sme_id"] = sme_id
    
    products = await db.products.find(filter_query).to_list(1000)
    return [Product(**product) for product in products]

# Transaction endpoints
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction_data: TransactionCreate, sme_id: str, current_user: User = Depends(get_current_user)):
    transaction = Transaction(
        sme_id=sme_id,
        type=transaction_data.type,
        items_json=transaction_data.items_json,
        amount=transaction_data.amount,
        payment_method=transaction_data.payment_method,
        customer_phone=transaction_data.customer_phone
    )
    
    await db.transactions.insert_one(transaction.dict())
    return transaction

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(sme_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    filter_query = {}
    if sme_id:
        filter_query["sme_id"] = sme_id
    
    transactions = await db.transactions.find(filter_query).sort("created_at", -1).to_list(1000)
    return [Transaction(**transaction) for transaction in transactions]

# Dashboard endpoint
@api_router.get("/dashboard")
async def get_dashboard_data(current_user: User = Depends(get_current_user)):
    # Get basic stats
    total_smes = await db.smes.count_documents({})
    total_products = await db.products.count_documents({})
    total_transactions = await db.transactions.count_documents({})
    
    # Get recent transactions - limit and convert ObjectId to dict
    recent_transactions_cursor = db.transactions.find().sort("created_at", -1).limit(10)
    recent_transactions = []
    
    async for transaction in recent_transactions_cursor:
        # Convert ObjectId to string and remove _id
        if "_id" in transaction:
            del transaction["_id"]
        recent_transactions.append(transaction)
    
    return {
        "total_smes": total_smes,
        "total_products": total_products,
        "total_transactions": total_transactions,
        "recent_transactions": recent_transactions
    }

# Public subscription endpoint
@api_router.post("/subscribe")
async def subscribe_business(subscription_data: SubscribeRequest):
    # Create default tenant if not exists
    tenant = await db.tenants.find_one({"name": "default"})
    if not tenant:
        default_tenant = Tenant(name="default", country="Guatemala")
        await db.tenants.insert_one(default_tenant.dict())
        tenant_id = default_tenant.id
    else:
        tenant_id = tenant["id"]
    
    # Create SME
    sme = SME(
        tenant_id=tenant_id,
        nombre_negocio=subscription_data.nombre_negocio,
        owner_phone=subscription_data.celular,
        departamento=subscription_data.departamento,
        municipio=subscription_data.municipio,
        numero_celular_negocio=subscription_data.numero_celular_negocio
    )
    
    await db.smes.insert_one(sme.dict())
    
    # Create default admin user
    hashed_password = hash_password("123456")  # Default password
    user = User(
        name=subscription_data.nombre,
        phone=subscription_data.celular,
        role=UserRole.ADMIN,
        sme_id=sme.id,
        hashed_password=hashed_password
    )
    
    await db.users.insert_one(user.dict())
    
    return {
        "message": "Business registered successfully",
        "sme_id": sme.id,
        "login_phone": subscription_data.celular,
        "default_password": "123456"
    }

# Webhook endpoints for WhatsApp integration
@api_router.post("/webhooks/ultramsg")
async def ultramsg_webhook(request: Request):
    payload = await request.json()
    
    # Log webhook
    webhook_log = WebhookLog(
        provider="ultramsg",
        payload=payload,
        status="received"
    )
    await db.webhook_logs.insert_one(webhook_log.dict())
    
    # Process message asynchronously
    asyncio.create_task(process_ultramsg_message(payload))
    
    return {"status": "received"}

async def process_ultramsg_message(payload: Dict[str, Any]):
    """Process WhatsApp message from Ultramsg"""
    try:
        from ai_processor import process_whatsapp_message, process_whatsapp_voice
        from transaction_processor import TransactionProcessor
        
        message_type = payload.get("type", "chat")
        from_phone = payload.get("from", "")
        message_text = payload.get("message", "")
        media_url = payload.get("mediaUrl", "")
        
        # Find SME by WhatsApp number (simplified - in production would be more sophisticated)
        sme = await db.smes.find_one({"numero_celular_negocio": {"$regex": from_phone[-8:]}})
        if not sme:
            # Try to find any SME for demo purposes
            sme = await db.smes.find_one()
        
        if not sme:
            logging.warning(f"No SME found for phone {from_phone}")
            return
            
        sme_id = sme["id"]
        
        # Process message with AI
        if message_type == "chat" and message_text:
            ai_result = await process_whatsapp_message(message_text, sme_id, from_phone)
        elif message_type == "audio" and media_url:
            ai_result = await process_whatsapp_voice(media_url, sme_id, from_phone)
        else:
            logging.info(f"Unsupported message type: {message_type}")
            return
        
        # Execute function calls
        transaction_processor = TransactionProcessor(db)
        responses = []
        
        for func_call in ai_result.get("function_calls", []):
            result = await transaction_processor.execute_function_call(
                func_call["function"],
                func_call["arguments"], 
                sme_id,
                from_phone
            )
            if result["success"]:
                responses.append(result["message"])
        
        # Prepare response message
        if responses:
            response_text = ai_result["ai_response"] + "\n\n" + "\n".join(responses)
        else:
            response_text = ai_result["ai_response"]
        
        # TODO: Send response back via Ultramsg API
        # For now, just log it
        logging.info(f"Response to {from_phone}: {response_text}")
        
        # Update webhook log
        await db.webhook_logs.update_one(
            {"id": payload.get("messageId", "")},
            {"$set": {"status": "processed", "ai_response": response_text}}
        )
        
    except Exception as e:
        logging.error(f"Error processing Ultramsg message: {e}")
        await db.webhook_logs.update_one(
            {"id": payload.get("messageId", "")},
            {"$set": {"status": "error", "error": str(e)}}
        )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()