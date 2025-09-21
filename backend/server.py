from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
import bcrypt
import asyncio

# Import models and clients
from models import *
from ultramsg_client import ultramsg_client, send_whatsapp_message

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
        numero_celular_negocio=sme_data.numero_celular_negocio,
        plan=sme_data.plan
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

@api_router.put("/smes/{sme_id}")
async def update_sme(sme_id: str, sme_data: SMEUpdate, current_user: User = Depends(get_current_user)):
    """Update SME information"""
    try:
        update_data = {k: v for k, v in sme_data.dict().items() if v is not None}
        
        if update_data:
            result = await db.smes.update_one(
                {"id": sme_id},
                {"$set": update_data}
            )
            
            if result.modified_count == 0:
                raise HTTPException(status_code=404, detail="SME not found")
        
        return {"success": True, "message": "SME updated successfully"}
        
    except Exception as e:
        logger.error(f"Error updating SME: {e}")
        raise HTTPException(status_code=500, detail="Error updating SME")

# Product endpoints
@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, sme_id: str, current_user: User = Depends(get_current_user)):
    product = Product(
        sme_id=sme_id,
        name=product_data.name,
        unit_cost=product_data.unit_cost,
        sale_price=product_data.sale_price,
        service=product_data.service,
        category=product_data.category
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

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, product_data: ProductCreate, sme_id: str, current_user: User = Depends(get_current_user)):
    """Update a product"""
    try:
        updated_data = {
            "name": product_data.name,
            "unit_cost": product_data.unit_cost,
            "sale_price": product_data.sale_price,
            "service": product_data.service,
            "category": product_data.category
        }
        
        result = await db.products.update_one(
            {"id": product_id, "sme_id": sme_id},
            {"$set": updated_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return {"success": True, "message": "Product updated successfully"}
        
    except Exception as e:
        logger.error(f"Error updating product: {e}")
        raise HTTPException(status_code=500, detail="Error updating product")

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: User = Depends(get_current_user)):
    """Delete a product"""
    try:
        result = await db.products.delete_one({"id": product_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return {"success": True, "message": "Product deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting product: {e}")
        raise HTTPException(status_code=500, detail="Error deleting product")

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
        numero_celular_negocio=subscription_data.numero_celular_negocio,
        plan=subscription_data.plan
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

# Test endpoint to simulate WhatsApp messages
@api_router.post("/test/whatsapp-message")
async def test_whatsapp_message(request: dict, current_user: User = Depends(get_current_user)):
    """Test endpoint to simulate WhatsApp message processing"""
    message = request.get("message", "")
    phone = request.get("phone", "50212345678")
    
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    # Create simulated Ultramsg payload
    payload = {
        "instanceId": "test_instance",
        "from": phone,
        "to": "wabi_instance", 
        "message": message,
        "type": "chat",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "messageId": f"test_{__import__('uuid').uuid4()}"
    }
    
    # Process the message
    await process_ultramsg_message(payload)
    
    return {"status": "processed", "message": "Mensaje procesado exitosamente"}

# Reports endpoints
@api_router.get("/reports/top-sold")
async def get_top_sold_report(sme_id: str, range: str = "today", current_user: User = Depends(get_current_user)):
    """Get top selling products report"""
    from transaction_processor import TransactionProcessor
    
    processor = TransactionProcessor(db)
    
    # Calculate date range
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    
    if range == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif range == "7d":
        start_date = now - timedelta(days=7)
    elif range == "30d":
        start_date = now - timedelta(days=30)
    else:
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    result = await processor._get_top_sold_products(sme_id, start_date)
    return result

@api_router.get("/reports/top-profitable") 
async def get_top_profitable_report(sme_id: str, range: str = "today", current_user: User = Depends(get_current_user)):
    """Get most profitable products report"""
    from transaction_processor import TransactionProcessor
    
    processor = TransactionProcessor(db)
    
    # Calculate date range  
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    
    if range == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif range == "7d":
        start_date = now - timedelta(days=7) 
    elif range == "30d":
        start_date = now - timedelta(days=30)
    else:
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    result = await processor._get_top_profitable_products(sme_id, start_date)
    return result

@api_router.get("/reports/daily-summary")
async def get_daily_summary_report(sme_id: str, date: str = None, current_user: User = Depends(get_current_user)):
    """Get daily business summary"""
    from transaction_processor import TransactionProcessor
    
    processor = TransactionProcessor(db)
    
    # Parse date or use today
    if date:
        try:
            from datetime import datetime as dt
            report_date = dt.fromisoformat(date).replace(tzinfo=timezone.utc)
        except:
            report_date = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        report_date = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    result = await processor._get_daily_summary(sme_id, report_date)
    return result

# Webhook logs endpoint
@api_router.get("/webhooks/logs")
async def get_webhook_logs(limit: int = 50, current_user: User = Depends(get_current_user)):
    """Get webhook processing logs"""
    logs = await db.webhook_logs.find().sort("created_at", -1).limit(limit).to_list(limit)
    
    # Clean logs for response
    clean_logs = []
    for log in logs:
        if "_id" in log:
            del log["_id"]
        clean_logs.append(log)
    
    return clean_logs

# Credit Scoring endpoints
@api_router.post("/scoring/calculate/{sme_id}")
async def calculate_credit_score(sme_id: str, current_user: User = Depends(get_current_user)):
    """Calculate credit score for an SME"""
    from credit_scorer import calculate_sme_score
    
    result = await calculate_sme_score(db, sme_id)
    return result

@api_router.get("/scoring/{sme_id}")
async def get_credit_score(sme_id: str, current_user: User = Depends(get_current_user)):
    """Get latest credit score for an SME"""
    try:
        # Get latest score
        latest_score = await db.score_snapshots.find_one(
            {"sme_id": sme_id},
            sort=[("dt", -1)]
        )
        
        if not latest_score:
            # Calculate score if none exists
            from credit_scorer import calculate_sme_score
            result = await calculate_sme_score(db, sme_id)
            return result
        
        # Clean up response
        if "_id" in latest_score:
            del latest_score["_id"]
            
        return {
            "success": True,
            **latest_score
        }
        
    except Exception as e:
        logger.error(f"Error getting credit score: {e}")
        return {"success": False, "error": str(e)}

@api_router.get("/scoring/{sme_id}/history")
async def get_score_history(sme_id: str, days: int = 30, current_user: User = Depends(get_current_user)):
    """Get credit score history for an SME"""
    from credit_scorer import get_sme_score_history
    
    history = await get_sme_score_history(db, sme_id, days)
    return {
        "success": True,
        "sme_id": sme_id,
        "history": history,
        "days": days
    }

@api_router.get("/scoring/{sme_id}/recommendations")
async def get_score_recommendations(sme_id: str, current_user: User = Depends(get_current_user)):
    """Get credit recommendations for an SME"""
    from credit_scorer import get_credit_recommendations
    
    recommendations = await get_credit_recommendations(db, sme_id)
    return recommendations

# Speech-to-Text test endpoint
@api_router.post("/speech/test")
async def test_speech_processing(current_user: User = Depends(get_current_user)):
    """Test speech-to-text functionality"""
    from speech_processor import test_speech_processor
    
    result = await test_speech_processor()
    return result

# Administrative endpoints
@api_router.get("/admin/clients")
async def get_all_clients(current_user: User = Depends(get_current_user)):
    """Get all SME clients for admin management"""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        clients = await db.smes.find().to_list(1000)
        
        # Clean clients for response
        clean_clients = []
        for client in clients:
            if "_id" in client:
                del client["_id"]
            clean_clients.append(client)
        
        return {"success": True, "clients": clean_clients}
        
    except Exception as e:
        logger.error(f"Error fetching clients: {e}")
        raise HTTPException(status_code=500, detail="Error fetching clients")

@api_router.put("/admin/clients/{client_id}/status")
async def update_client_status(client_id: str, status_data: dict, current_user: User = Depends(get_current_user)):
    """Update SME client status"""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        result = await db.smes.update_one(
            {"id": client_id},
            {"$set": {"status": status_data["status"]}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Client not found")
        
        return {"success": True, "message": "Client status updated"}
        
    except Exception as e:
        logger.error(f"Error updating client status: {e}")
        raise HTTPException(status_code=500, detail="Error updating client status")

@api_router.put("/admin/clients/{client_id}")
async def update_client(client_id: str, client_data: dict, current_user: User = Depends(get_current_user)):
    """Update complete client information"""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # Filter out None values
        update_data = {k: v for k, v in client_data.items() if v is not None}
        
        if update_data:
            result = await db.smes.update_one(
                {"id": client_id},
                {"$set": update_data}
            )
            
            if result.modified_count == 0:
                raise HTTPException(status_code=404, detail="Client not found")
        
        return {"success": True, "message": "Client updated successfully"}
        
    except Exception as e:
        logger.error(f"Error updating client: {e}")
        raise HTTPException(status_code=500, detail="Error updating client")

@api_router.get("/admin/configuration")
async def get_admin_configuration(current_user: User = Depends(get_current_user)):
    """Get system configuration"""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # Get Ultramsg config (masked for security)
        ultramsg_config = {
            "instance_id": os.getenv("ULTRAMSG_INSTANCE_ID", ""),
            "token": "••••••••" if os.getenv("ULTRAMSG_TOKEN") else "",
            "status": "disconnected"
        }
        
        # Get AI config
        ai_config = {
            "use_emergent_key": bool(os.getenv("EMERGENT_LLM_KEY")),
            "openai_api_key": "••••••••" if os.getenv("OPENAI_API_KEY") else "",
            "model": "gpt-4o-mini"
        }
        
        return {
            "success": True,
            "ultramsg": ultramsg_config,
            "ai": ai_config
        }
        
    except Exception as e:
        logger.error(f"Error getting configuration: {e}")
        raise HTTPException(status_code=500, detail="Error getting configuration")

@api_router.put("/admin/configuration/ultramsg")
async def update_ultramsg_config(config_data: dict, current_user: User = Depends(get_current_user)):
    """Update Ultramsg configuration"""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # Update environment variables (in production, this would be in a config file)
        os.environ["ULTRAMSG_INSTANCE_ID"] = config_data.get("instance_id", "")
        os.environ["ULTRAMSG_TOKEN"] = config_data.get("token", "")
        
        # Update global client
        ultramsg_client.instance_id = config_data.get("instance_id", "")
        ultramsg_client.token = config_data.get("token", "")
        
        return {"success": True, "message": "Ultramsg configuration updated"}
        
    except Exception as e:
        logger.error(f"Error updating Ultramsg config: {e}")
        raise HTTPException(status_code=500, detail="Error updating configuration")

@api_router.put("/admin/configuration/ai")
async def update_ai_config(config_data: dict, current_user: User = Depends(get_current_user)):
    """Update AI configuration"""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        if not config_data.get("use_emergent_key", True):
            os.environ["OPENAI_API_KEY"] = config_data.get("openai_api_key", "")
        
        return {"success": True, "message": "AI configuration updated"}
        
    except Exception as e:
        logger.error(f"Error updating AI config: {e}")
        raise HTTPException(status_code=500, detail="Error updating configuration")

@api_router.post("/admin/test/ultramsg")
async def test_ultramsg(test_data: dict, current_user: User = Depends(get_current_user)):
    """Test Ultramsg connection"""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # Temporarily create client with test credentials
        from ultramsg_client import UltramsgClient
        test_client = UltramsgClient(
            instance_id=test_data.get("instance_id"),
            token=test_data.get("token")
        )
        
        result = await test_client.test_connection()
        return result
        
    except Exception as e:
        logger.error(f"Error testing Ultramsg: {e}")
        return {"success": False, "error": str(e)}

@api_router.post("/admin/test/ai")
async def test_ai(current_user: User = Depends(get_current_user)):
    """Test AI connection"""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        from speech_processor import test_speech_processor
        result = await test_speech_processor()
        return result
        
    except Exception as e:
        logger.error(f"Error testing AI: {e}")
        return {"success": False, "error": str(e)}

# Credit Policy endpoints
@api_router.get("/admin/credit-policies")
async def get_credit_policies(current_user: User = Depends(get_current_user)):
    """Get all credit policies"""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANZAS]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        policies = await db.credit_policies.find().to_list(1000)
        
        # Clean policies for response
        clean_policies = []
        for policy in policies:
            if "_id" in policy:
                del policy["_id"]
            clean_policies.append(policy)
        
        return {"success": True, "policies": clean_policies}
        
    except Exception as e:
        logger.error(f"Error fetching credit policies: {e}")
        raise HTTPException(status_code=500, detail="Error fetching policies")

@api_router.post("/admin/credit-policies")
async def create_credit_policy(policy_data: CreditPolicyCreate, current_user: User = Depends(get_current_user)):
    """Create new credit policy"""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANZAS]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # Get tenant (for now use default)
        tenant = await db.tenants.find_one({"name": "default"})
        if not tenant:
            # Create default tenant if not exists
            default_tenant = Tenant(name="default", country="Guatemala")
            await db.tenants.insert_one(default_tenant.dict())
            tenant_id = default_tenant.id
        else:
            tenant_id = tenant["id"]
        
        policy = CreditPolicy(
            tenant_id=tenant_id,
            band=policy_data.band,
            max_amount=policy_data.max_amount,
            max_tenor_days=policy_data.max_tenor_days,
            interest_rate=policy_data.interest_rate,
            approval_probability=policy_data.approval_probability,
            min_score_required=policy_data.min_score_required,
            additional_requirements=policy_data.additional_requirements
        )
        
        await db.credit_policies.insert_one(policy.dict())
        
        return {"success": True, "message": "Credit policy created", "policy_id": policy.id}
        
    except Exception as e:
        logger.error(f"Error creating credit policy: {e}")
        raise HTTPException(status_code=500, detail="Error creating policy")

@api_router.delete("/admin/credit-policies/{policy_id}")
async def delete_credit_policy(policy_id: str, current_user: User = Depends(get_current_user)):
    """Delete credit policy"""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANZAS]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        result = await db.credit_policies.delete_one({"id": policy_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Policy not found")
        
        return {"success": True, "message": "Policy deleted"}
        
    except Exception as e:
        logger.error(f"Error deleting policy: {e}")
        raise HTTPException(status_code=500, detail="Error deleting policy")

# WhatsApp Message Sending endpoint
@api_router.post("/whatsapp/send")
async def send_message_whatsapp(message_data: SendMessageRequest, current_user: User = Depends(get_current_user)):
    """Send message via WhatsApp"""
    try:
        result = await send_whatsapp_message(message_data.to, message_data.message)
        return result
        
    except Exception as e:
        logger.error(f"Error sending WhatsApp message: {e}")
        return {"success": False, "error": str(e)}

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
        
        # Send response back via WhatsApp if configured
        if response_text and sme.get("ultramsg_instance_id") and sme.get("ultramsg_token"):
            # Use SME-specific Ultramsg config
            from ultramsg_client import UltramsgClient
            sme_ultramsg = UltramsgClient(
                instance_id=sme["ultramsg_instance_id"],
                token=sme["ultramsg_token"]
            )
            
            await sme_ultramsg.send_message(from_phone, response_text)
            logging.info(f"Response sent to {from_phone}: {response_text[:100]}...")
        else:
            # Fall back to global config or just log
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