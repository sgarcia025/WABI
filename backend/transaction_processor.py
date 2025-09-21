import asyncio
import logging
from typing import Dict, Any, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class TransactionProcessor:
    def __init__(self, db):
        self.db = db

    async def execute_function_call(self, function_name: str, arguments: Dict[str, Any], sme_id: str, customer_phone: str) -> Dict[str, Any]:
        """
        Execute a function call from the AI and create appropriate database records
        """
        try:
            if function_name == "record_sale":
                return await self._record_sale(arguments, sme_id, customer_phone)
            elif function_name == "record_expense":
                return await self._record_expense(arguments, sme_id)
            elif function_name == "add_product_or_service":
                return await self._add_product(arguments, sme_id)
            elif function_name == "register_receivable_payment":
                return await self._register_payment(arguments, sme_id)
            elif function_name == "query_report":
                return await self._generate_report(arguments, sme_id)
            else:
                return {"success": False, "error": f"Unknown function: {function_name}"}
                
        except Exception as e:
            logger.error(f"Error executing function {function_name}: {e}")
            return {"success": False, "error": str(e)}

    async def _record_sale(self, args: Dict[str, Any], sme_id: str, customer_phone: str) -> Dict[str, Any]:
        """Record a sale transaction"""
        try:
            # Get product name - handle different possible keys
            product_name = args.get("product_name") or args.get("product") or "Producto"
            quantity = args.get("quantity") or args.get("qty") or 1
            unit_price = args.get("unit_price") or (args.get("total_amount", 0) / quantity)
            total_amount = args.get("total_amount") or args.get("amount") or 0
            
            # Prepare transaction data
            transaction_data = {
                "id": str(__import__('uuid').uuid4()),
                "sme_id": sme_id,
                "type": "credit_sale" if args.get("credit_terms_days") else "sale",
                "items_json": [{
                    "product_name": product_name,
                    "qty": quantity,
                    "unit_price": unit_price,
                    "total": total_amount
                }],
                "amount": total_amount,
                "payment_method": args.get("payment_method", "cash"),
                "customer_phone": customer_phone,
                "source": "wa_text",
                "created_at": datetime.now(timezone.utc)
            }
            
            # Insert transaction
            await self.db.transactions.insert_one(transaction_data)
            
            # If it's a credit sale, create receivable
            if args.get("credit_terms_days"):
                await self._create_receivable(sme_id, customer_phone, total_amount, args["credit_terms_days"])
            
            return {
                "success": True,
                "message": f"Venta registrada: {product_name} por Q{total_amount:.2f}",
                "transaction_id": transaction_data["id"]
            }
            
        except Exception as e:
            logger.error(f"Error recording sale: {e}")
            return {"success": False, "error": "No pude registrar la venta"}

    async def _record_expense(self, args: Dict[str, Any], sme_id: str) -> Dict[str, Any]:
        """Record an expense transaction"""
        try:
            transaction_data = {
                "id": str(__import__('uuid').uuid4()),
                "sme_id": sme_id,
                "type": "expense",
                "items_json": [{
                    "category": args.get("category", "Gasto general"),
                    "description": args["description"],
                    "amount": args["amount"]
                }],
                "amount": args["amount"],
                "payment_method": args.get("payment_method", "cash"),
                "source": "wa_text",
                "created_at": datetime.now(timezone.utc)
            }
            
            await self.db.transactions.insert_one(transaction_data)
            
            return {
                "success": True,
                "message": f"Gasto registrado: {args['description']} por Q{args['amount']:.2f}",
                "transaction_id": transaction_data["id"]
            }
            
        except Exception as e:
            logger.error(f"Error recording expense: {e}")
            return {"success": False, "error": "No pude registrar el gasto"}

    async def _add_product(self, args: Dict[str, Any], sme_id: str) -> Dict[str, Any]:
        """Add a new product to the catalog"""
        try:
            product_data = {
                "id": str(__import__('uuid').uuid4()),
                "sme_id": sme_id,
                "name": args["name"],
                "unit_cost": args.get("unit_cost", 0),
                "sale_price": args["sale_price"],
                "service": args.get("service", False),
                "created_at": datetime.now(timezone.utc)
            }
            
            await self.db.products.insert_one(product_data)
            
            product_type = "servicio" if args.get("service") else "producto"
            return {
                "success": True,
                "message": f"Nuevo {product_type} agregado: {args['name']} - Precio: Q{args['sale_price']:.2f}",
                "product_id": product_data["id"]
            }
            
        except Exception as e:
            logger.error(f"Error adding product: {e}")
            return {"success": False, "error": "No pude agregar el producto"}

    async def _register_payment(self, args: Dict[str, Any], sme_id: str) -> Dict[str, Any]:
        """Register a receivable payment"""
        try:
            # Find or create customer
            customer = await self._find_or_create_customer(sme_id, args["customer_phone"])
            
            # Create payment record
            payment_data = {
                "id": str(__import__('uuid').uuid4()),
                "sme_id": sme_id,
                "customer_id": customer["id"],
                "amount": args["amount"],
                "method": args.get("method", "cash"),
                "reference": args.get("reference", ""),
                "created_at": datetime.now(timezone.utc)
            }
            
            # For now, just record as a transaction
            transaction_data = {
                "id": str(__import__('uuid').uuid4()),
                "sme_id": sme_id,
                "type": "payment",
                "items_json": [{
                    "customer_phone": args["customer_phone"],
                    "payment_amount": args["amount"],
                    "method": args.get("method", "cash")
                }],
                "amount": args["amount"],
                "payment_method": args.get("method", "cash"),
                "customer_phone": args["customer_phone"],
                "source": "wa_text",
                "created_at": datetime.now(timezone.utc)
            }
            
            await self.db.transactions.insert_one(transaction_data)
            
            return {
                "success": True,
                "message": f"Pago registrado: Q{args['amount']:.2f} de {args['customer_phone']}",
                "transaction_id": transaction_data["id"]
            }
            
        except Exception as e:
            logger.error(f"Error registering payment: {e}")
            return {"success": False, "error": "No pude registrar el pago"}

    async def _generate_report(self, args: Dict[str, Any], sme_id: str) -> Dict[str, Any]:
        """Generate a quick report"""
        try:
            report_type = args["type"]
            time_range = args.get("range", "today")
            
            # Calculate date range
            from datetime import timedelta
            now = datetime.now(timezone.utc)
            
            if time_range == "today":
                start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            elif time_range == "7d":
                start_date = now - timedelta(days=7)
            elif time_range == "30d":
                start_date = now - timedelta(days=30)
            else:
                start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            
            if report_type == "top_sold":
                return await self._get_top_sold_products(sme_id, start_date)
            elif report_type == "top_profitable":
                return await self._get_top_profitable_products(sme_id, start_date)
            elif report_type == "daily_summary":
                return await self._get_daily_summary(sme_id, start_date)
            
            return {"success": False, "error": "Tipo de reporte no reconocido"}
            
        except Exception as e:
            logger.error(f"Error generating report: {e}")
            return {"success": False, "error": "No pude generar el reporte"}

    async def _get_top_sold_products(self, sme_id: str, start_date: datetime) -> Dict[str, Any]:
        """Get top selling products"""
        try:
            # Get sales transactions
            sales = await self.db.transactions.find({
                "sme_id": sme_id,
                "type": {"$in": ["sale", "credit_sale"]},
                "created_at": {"$gte": start_date}
            }).to_list(1000)
            
            # Count products sold
            product_count = {}
            for sale in sales:
                for item in sale.get("items_json", []):
                    product = item.get("product_name", "Producto sin nombre")
                    qty = item.get("qty", 1)
                    product_count[product] = product_count.get(product, 0) + qty
            
            # Sort by quantity
            top_products = sorted(product_count.items(), key=lambda x: x[1], reverse=True)[:5]
            
            if not top_products:
                message = "No hay ventas registradas en el período seleccionado."
            else:
                message = "🏆 *Productos más vendidos:*\n\n"
                for i, (product, qty) in enumerate(top_products, 1):
                    message += f"{i}. {product}: {qty} unidades\n"
            
            return {"success": True, "message": message}
            
        except Exception as e:
            logger.error(f"Error getting top sold products: {e}")
            return {"success": False, "error": "No pude obtener el reporte"}

    async def _get_top_profitable_products(self, sme_id: str, start_date: datetime) -> Dict[str, Any]:
        """Get most profitable products"""
        try:
            # Get products and sales
            products = await self.db.products.find({"sme_id": sme_id}).to_list(1000)
            sales = await self.db.transactions.find({
                "sme_id": sme_id,
                "type": {"$in": ["sale", "credit_sale"]},
                "created_at": {"$gte": start_date}
            }).to_list(1000)
            
            # Calculate profitability
            product_profit = {}
            for sale in sales:
                for item in sale.get("items_json", []):
                    product_name = item.get("product_name", "")
                    qty = item.get("qty", 1)
                    unit_price = item.get("unit_price", 0)
                    
                    # Find product to get cost
                    product = next((p for p in products if p["name"] == product_name), None)
                    unit_cost = product["unit_cost"] if product else 0
                    
                    profit = (unit_price - unit_cost) * qty
                    product_profit[product_name] = product_profit.get(product_name, 0) + profit
            
            # Sort by profit
            top_profitable = sorted(product_profit.items(), key=lambda x: x[1], reverse=True)[:5]
            
            if not top_profitable:
                message = "No hay datos de rentabilidad disponibles."
            else:
                message = "💰 *Productos más rentables:*\n\n"
                for i, (product, profit) in enumerate(top_profitable, 1):
                    message += f"{i}. {product}: Q{profit:.2f}\n"
            
            return {"success": True, "message": message}
            
        except Exception as e:
            logger.error(f"Error getting profitable products: {e}")
            return {"success": False, "error": "No pude obtener el reporte"}

    async def _get_daily_summary(self, sme_id: str, start_date: datetime) -> Dict[str, Any]:
        """Get daily business summary"""
        try:
            end_date = start_date.replace(hour=23, minute=59, second=59)
            
            # Get transactions for the day
            transactions = await self.db.transactions.find({
                "sme_id": sme_id,
                "created_at": {"$gte": start_date, "$lte": end_date}
            }).to_list(1000)
            
            # Calculate totals
            total_sales = sum(t["amount"] for t in transactions if t["type"] in ["sale", "credit_sale"])
            total_expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
            total_payments = sum(t["amount"] for t in transactions if t["type"] == "payment")
            
            net_income = total_sales - total_expenses
            
            message = f"📊 *Resumen del día:*\n\n"
            message += f"💰 Ventas: Q{total_sales:.2f}\n"
            message += f"💸 Gastos: Q{total_expenses:.2f}\n"
            message += f"💵 Pagos recibidos: Q{total_payments:.2f}\n"
            message += f"📈 Utilidad neta: Q{net_income:.2f}\n"
            
            return {"success": True, "message": message}
            
        except Exception as e:
            logger.error(f"Error getting daily summary: {e}")
            return {"success": False, "error": "No pude obtener el resumen"}

    async def _create_receivable(self, sme_id: str, customer_phone: str, amount: float, credit_days: int):
        """Create a receivable for credit sales"""
        try:
            customer = await self._find_or_create_customer(sme_id, customer_phone)
            
            from datetime import timedelta
            due_date = datetime.now(timezone.utc) + timedelta(days=credit_days)
            
            receivable_data = {
                "id": str(__import__('uuid').uuid4()),
                "sme_id": sme_id,
                "customer_id": customer["id"],
                "doc_number": f"CRE-{datetime.now().strftime('%Y%m%d')}-{customer_phone[-4:]}",
                "principal_amount": amount,
                "balance": amount,
                "due_date": due_date,
                "status": "open",
                "created_at": datetime.now(timezone.utc)
            }
            
            await self.db.receivables.insert_one(receivable_data)
            logger.info(f"Created receivable for {customer_phone}: Q{amount}")
            
        except Exception as e:
            logger.error(f"Error creating receivable: {e}")

    async def _find_or_create_customer(self, sme_id: str, phone: str) -> Dict[str, Any]:
        """Find existing customer or create new one"""
        try:
            customer = await self.db.customers.find_one({"sme_id": sme_id, "phone": phone})
            
            if not customer:
                customer_data = {
                    "id": str(__import__('uuid').uuid4()),
                    "sme_id": sme_id,
                    "name": f"Cliente {phone}",
                    "phone": phone,
                    "created_at": datetime.now(timezone.utc)
                }
                await self.db.customers.insert_one(customer_data)
                customer = customer_data
            
            return customer
            
        except Exception as e:
            logger.error(f"Error finding/creating customer: {e}")
            raise