from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from enum import Enum

# Enums
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
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

class SMEStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

# Main Models
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
    status: SMEStatus = SMEStatus.ACTIVE
    ultramsg_instance_id: Optional[str] = None
    ultramsg_token: Optional[str] = None
    openai_api_key: Optional[str] = None
    use_emergent_key: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_payment: Optional[datetime] = None
    next_payment_due: Optional[datetime] = None

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
    category: Optional[str] = None
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
    components: Optional[Dict[str, float]] = {}
    dt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreditPolicy(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    band: str  # A, B, C, D
    max_amount: float
    max_tenor_days: int
    interest_rate: float
    approval_probability: int
    min_score_required: int
    additional_requirements: Optional[List[str]] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Subscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sme_id: str
    plan: PlanType
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE
    monthly_fee: float
    next_renewal: datetime
    payment_method: Optional[str] = None
    arrears_flag: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sme_id: str
    subscription_id: str
    amount: float
    payment_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    payment_method: str
    reference: Optional[str] = None
    status: str = "completed"
    period_month: str  # YYYY-MM format
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WebhookLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    provider: str
    payload: Dict[str, Any]
    status: str = "pending"
    attempts: int = 0
    ai_response: Optional[str] = None
    error: Optional[str] = None
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
    plan: PlanType = PlanType.FREE

class SMEUpdate(BaseModel):
    nombre_negocio: Optional[str] = None
    status: Optional[SMEStatus] = None
    plan: Optional[PlanType] = None
    ultramsg_instance_id: Optional[str] = None
    ultramsg_token: Optional[str] = None
    openai_api_key: Optional[str] = None
    use_emergent_key: Optional[bool] = None

class ProductCreate(BaseModel):
    name: str
    unit_cost: Optional[float] = 0
    sale_price: float
    service: bool = False
    category: Optional[str] = None

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
    plan: PlanType = PlanType.FREE

class CreditPolicyCreate(BaseModel):
    band: str
    max_amount: float
    max_tenor_days: int
    interest_rate: float
    approval_probability: int
    min_score_required: int
    additional_requirements: Optional[List[str]] = []

class SendMessageRequest(BaseModel):
    to: str
    message: str
    sme_id: Optional[str] = None

# Token model
class Token(BaseModel):
    access_token: str
    token_type: str