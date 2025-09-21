import asyncio
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import uuid
import statistics

load_dotenv()

logger = logging.getLogger(__name__)

class CreditScorer:
    def __init__(self, db):
        self.db = db
        
    async def calculate_score(self, sme_id: str) -> Dict[str, Any]:
        """
        Calculate comprehensive credit score (0-100) for an SME
        """
        try:
            logger.info(f"Calculating credit score for SME: {sme_id}")
            
            # Get SME data
            sme = await self.db.smes.find_one({"id": sme_id})
            if not sme:
                raise ValueError(f"SME not found: {sme_id}")
            
            # Calculate individual score components
            components = {}
            
            # 1. Sales Consistency (25%)
            components["sales_consistency"] = await self._calculate_sales_consistency(sme_id)
            
            # 2. Financial Health (25%)
            components["financial_health"] = await self._calculate_financial_health(sme_id)
            
            # 3. Payment History (20%)
            components["payment_history"] = await self._calculate_payment_history(sme_id)
            
            # 4. Business Growth (15%)
            components["business_growth"] = await self._calculate_business_growth(sme_id)
            
            # 5. Account Age (10%)
            components["account_age"] = await self._calculate_account_age(sme)
            
            # 6. Transaction Volume (5%)
            components["transaction_volume"] = await self._calculate_transaction_volume(sme_id)
            
            # Calculate weighted final score
            weights = {
                "sales_consistency": 0.25,
                "financial_health": 0.25,
                "payment_history": 0.20,
                "business_growth": 0.15,
                "account_age": 0.10,
                "transaction_volume": 0.05
            }
            
            final_score = 0
            for component, score in components.items():
                weighted_score = score * weights[component]
                final_score += weighted_score
                logger.debug(f"{component}: {score} * {weights[component]} = {weighted_score}")
            
            # Ensure score is between 0 and 100
            final_score = max(0, min(100, round(final_score)))
            
            # Determine credit band
            band = self._get_credit_band(final_score)
            
            # Generate reasons
            reasons = self._generate_score_reasons(components, final_score)
            
            # Save score snapshot
            score_snapshot = {
                "id": str(uuid.uuid4()),
                "sme_id": sme_id,
                "score": final_score,
                "band": band,
                "components": components,
                "reasons_json": reasons,
                "dt": datetime.now(timezone.utc)
            }
            
            await self.db.score_snapshots.insert_one(score_snapshot)
            
            result = {
                "success": True,
                "sme_id": sme_id,
                "score": final_score,
                "band": band,
                "components": components,
                "reasons": reasons,
                "calculated_at": score_snapshot["dt"],
                "next_update": datetime.now(timezone.utc) + timedelta(days=1)
            }
            
            logger.info(f"Credit score calculated: SME {sme_id} = {final_score} (Band {band})")
            return result
            
        except Exception as e:
            logger.error(f"Error calculating credit score: {e}")
            return {
                "success": False,
                "error": str(e),
                "score": 0,
                "band": "D"
            }

    async def _calculate_sales_consistency(self, sme_id: str) -> float:
        """
        Calculate sales consistency score (0-100)
        Based on regularity and predictability of sales
        """
        try:
            # Get last 30 days of sales
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            
            sales = await self.db.transactions.find({
                "sme_id": sme_id,
                "type": {"$in": ["sale", "credit_sale"]},
                "created_at": {"$gte": thirty_days_ago}
            }).to_list(1000)
            
            if len(sales) < 3:
                return 30  # Minimum score for new businesses
            
            # Group sales by day
            daily_sales = {}
            for sale in sales:
                day = sale["created_at"].date()
                if day not in daily_sales:
                    daily_sales[day] = 0
                daily_sales[day] += sale["amount"]
            
            if len(daily_sales) < 3:
                return 40
            
            # Calculate consistency metrics
            daily_amounts = list(daily_sales.values())
            
            # Standard deviation (lower is better for consistency)
            std_dev = statistics.stdev(daily_amounts) if len(daily_amounts) > 1 else 0
            mean_sales = statistics.mean(daily_amounts)
            
            # Coefficient of variation (CV)
            cv = (std_dev / mean_sales) if mean_sales > 0 else 1
            
            # Convert to score (lower CV = higher score)
            consistency_score = max(20, 100 - (cv * 50))
            
            # Bonus for recent activity
            recent_sales = len([s for s in sales if s["created_at"] >= datetime.now(timezone.utc) - timedelta(days=7)])
            if recent_sales >= 5:
                consistency_score *= 1.1
            
            return min(100, consistency_score)
            
        except Exception as e:
            logger.error(f"Error calculating sales consistency: {e}")
            return 30

    async def _calculate_financial_health(self, sme_id: str) -> float:
        """
        Calculate financial health score based on profit margins and cash flow
        """
        try:
            # Get last 30 days of transactions
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            
            transactions = await self.db.transactions.find({
                "sme_id": sme_id,
                "created_at": {"$gte": thirty_days_ago}
            }).to_list(1000)
            
            if not transactions:
                return 25
            
            # Calculate revenue and expenses
            total_revenue = sum(t["amount"] for t in transactions if t["type"] in ["sale", "credit_sale"])
            total_expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
            
            if total_revenue == 0:
                return 25
            
            # Calculate profit margin
            profit = total_revenue - total_expenses
            profit_margin = (profit / total_revenue) * 100
            
            # Score based on profit margin
            if profit_margin >= 40:
                margin_score = 100
            elif profit_margin >= 25:
                margin_score = 80
            elif profit_margin >= 10:
                margin_score = 60
            elif profit_margin >= 0:
                margin_score = 40
            else:
                margin_score = 20  # Losses
            
            # Consider cash flow trend
            recent_week = datetime.now(timezone.utc) - timedelta(days=7)
            recent_revenue = sum(t["amount"] for t in transactions 
                               if t["type"] in ["sale", "credit_sale"] and t["created_at"] >= recent_week)
            
            older_week = thirty_days_ago + timedelta(days=7)
            older_revenue = sum(t["amount"] for t in transactions 
                              if t["type"] in ["sale", "credit_sale"] and 
                              older_week <= t["created_at"] < recent_week)
            
            # Growth trend bonus
            if older_revenue > 0 and recent_revenue > older_revenue:
                margin_score *= 1.1
            
            return min(100, margin_score)
            
        except Exception as e:
            logger.error(f"Error calculating financial health: {e}")
            return 25

    async def _calculate_payment_history(self, sme_id: str) -> float:
        """
        Calculate payment history score based on receivables management
        """
        try:
            # Get receivables data
            receivables = await self.db.receivables.find({"sme_id": sme_id}).to_list(1000)
            
            if not receivables:
                return 70  # Neutral score if no credit sales
            
            total_receivables = len(receivables)
            closed_receivables = len([r for r in receivables if r["status"] == "closed"])
            overdue_receivables = len([r for r in receivables if r["status"] == "overdue"])
            
            # Calculate payment rate
            if total_receivables == 0:
                return 70
            
            payment_rate = (closed_receivables / total_receivables) * 100
            overdue_rate = (overdue_receivables / total_receivables) * 100
            
            # Base score from payment rate
            base_score = payment_rate
            
            # Penalty for overdue accounts
            penalty = overdue_rate * 2  # 2 points penalty per % overdue
            
            final_score = max(10, base_score - penalty)
            
            return min(100, final_score)
            
        except Exception as e:
            logger.error(f"Error calculating payment history: {e}")
            return 70

    async def _calculate_business_growth(self, sme_id: str) -> float:
        """
        Calculate business growth score based on revenue trends
        """
        try:
            now = datetime.now(timezone.utc)
            
            # Compare last 30 days vs previous 30 days
            current_period_start = now - timedelta(days=30)
            previous_period_start = now - timedelta(days=60)
            previous_period_end = current_period_start
            
            # Current period sales
            current_sales = await self.db.transactions.find({
                "sme_id": sme_id,
                "type": {"$in": ["sale", "credit_sale"]},
                "created_at": {"$gte": current_period_start}
            }).to_list(1000)
            
            # Previous period sales
            previous_sales = await self.db.transactions.find({
                "sme_id": sme_id,
                "type": {"$in": ["sale", "credit_sale"]},
                "created_at": {"$gte": previous_period_start, "$lt": previous_period_end}
            }).to_list(1000)
            
            current_revenue = sum(s["amount"] for s in current_sales)
            previous_revenue = sum(s["amount"] for s in previous_sales)
            
            if previous_revenue == 0:
                return 60  # Neutral for new businesses
            
            # Calculate growth rate
            growth_rate = ((current_revenue - previous_revenue) / previous_revenue) * 100
            
            # Score based on growth
            if growth_rate >= 50:
                return 100
            elif growth_rate >= 25:
                return 90
            elif growth_rate >= 10:
                return 80
            elif growth_rate >= 0:
                return 70
            elif growth_rate >= -10:
                return 50
            elif growth_rate >= -25:
                return 30
            else:
                return 10
                
        except Exception as e:
            logger.error(f"Error calculating business growth: {e}")
            return 60

    async def _calculate_account_age(self, sme: Dict[str, Any]) -> float:
        """
        Calculate account age score (longer = better, up to a point)
        """
        try:
            created_at = sme["created_at"]
            age_days = (datetime.now(timezone.utc) - created_at).days
            
            if age_days < 30:
                return 40  # New account
            elif age_days < 90:
                return 60  # 1-3 months
            elif age_days < 180:
                return 75  # 3-6 months
            elif age_days < 365:
                return 85  # 6-12 months
            else:
                return 95  # 1+ year
                
        except Exception as e:
            logger.error(f"Error calculating account age: {e}")
            return 40

    async def _calculate_transaction_volume(self, sme_id: str) -> float:
        """
        Calculate transaction volume score
        """
        try:
            # Count transactions in last 30 days
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            
            transaction_count = await self.db.transactions.count_documents({
                "sme_id": sme_id,
                "created_at": {"$gte": thirty_days_ago}
            })
            
            # Score based on volume
            if transaction_count >= 100:
                return 100
            elif transaction_count >= 50:
                return 85
            elif transaction_count >= 25:
                return 70
            elif transaction_count >= 10:
                return 55
            elif transaction_count >= 5:
                return 40
            else:
                return 25
                
        except Exception as e:
            logger.error(f"Error calculating transaction volume: {e}")
            return 25

    def _get_credit_band(self, score: int) -> str:
        """
        Convert numeric score to credit band (A/B/C/D)
        """
        if score >= 80:
            return "A"
        elif score >= 65:
            return "B"
        elif score >= 50:
            return "C"
        else:
            return "D"

    def _generate_score_reasons(self, components: Dict[str, float], final_score: int) -> List[str]:
        """
        Generate human-readable reasons for the score
        """
        reasons = []
        
        # Positive factors
        if components.get("sales_consistency", 0) >= 80:
            reasons.append("Ventas consistentes y regulares")
        
        if components.get("financial_health", 0) >= 80:
            reasons.append("Excelente salud financiera y márgenes")
        
        if components.get("payment_history", 0) >= 80:
            reasons.append("Historial de pagos excelente")
        
        if components.get("business_growth", 0) >= 80:
            reasons.append("Crecimiento sólido del negocio")
        
        # Areas for improvement
        if components.get("sales_consistency", 0) < 50:
            reasons.append("Mejorar consistencia en ventas")
        
        if components.get("financial_health", 0) < 50:
            reasons.append("Optimizar márgenes de ganancia")
        
        if components.get("payment_history", 0) < 50:
            reasons.append("Mejorar gestión de cobranzas")
        
        if not reasons:
            if final_score >= 70:
                reasons.append("Perfil crediticio sólido")
            else:
                reasons.append("Continuar fortaleciendo el negocio")
        
        return reasons[:5]  # Limit to 5 reasons

    async def get_score_history(self, sme_id: str, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get historical scores for an SME
        """
        try:
            start_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            scores = await self.db.score_snapshots.find({
                "sme_id": sme_id,
                "dt": {"$gte": start_date}
            }).sort("dt", 1).to_list(1000)
            
            # Clean up for response
            clean_scores = []
            for score in scores:
                if "_id" in score:
                    del score["_id"]
                clean_scores.append(score)
            
            return clean_scores
            
        except Exception as e:
            logger.error(f"Error getting score history: {e}")
            return []

    async def get_credit_recommendations(self, sme_id: str) -> Dict[str, Any]:
        """
        Get credit recommendations based on current score
        """
        try:
            # Get latest score
            latest_score = await self.db.score_snapshots.find_one(
                {"sme_id": sme_id},
                sort=[("dt", -1)]
            )
            
            if not latest_score:
                return {"error": "No score available"}
            
            score = latest_score["score"]
            band = latest_score["band"]
            
            # Define credit parameters by band
            credit_params = {
                "A": {
                    "max_amount": 50000,
                    "max_tenor_days": 90,
                    "interest_rate": 2.5,
                    "approval_probability": 95
                },
                "B": {
                    "max_amount": 25000,
                    "max_tenor_days": 60,
                    "interest_rate": 3.5,
                    "approval_probability": 80
                },
                "C": {
                    "max_amount": 10000,
                    "max_tenor_days": 30,
                    "interest_rate": 5.0,
                    "approval_probability": 60
                },
                "D": {
                    "max_amount": 2500,
                    "max_tenor_days": 15,
                    "interest_rate": 8.0,
                    "approval_probability": 25
                }
            }
            
            params = credit_params.get(band, credit_params["D"])
            
            return {
                "success": True,
                "sme_id": sme_id,
                "current_score": score,
                "current_band": band,
                "recommendations": {
                    "max_credit_amount": params["max_amount"],
                    "max_tenor_days": params["max_tenor_days"],
                    "suggested_interest_rate": params["interest_rate"],
                    "approval_probability": params["approval_probability"]
                },
                "generated_at": datetime.now(timezone.utc)
            }
            
        except Exception as e:
            logger.error(f"Error getting credit recommendations: {e}")
            return {"success": False, "error": str(e)}

# Helper functions for easy use
async def calculate_sme_score(db, sme_id: str) -> Dict[str, Any]:
    """
    Convenience function to calculate SME credit score
    """
    scorer = CreditScorer(db)
    return await scorer.calculate_score(sme_id)

async def get_sme_score_history(db, sme_id: str, days: int = 30) -> List[Dict[str, Any]]:
    """
    Convenience function to get SME score history
    """
    scorer = CreditScorer(db)
    return await scorer.get_score_history(sme_id, days)

async def get_credit_recommendations(db, sme_id: str) -> Dict[str, Any]:
    """
    Convenience function to get credit recommendations
    """
    scorer = CreditScorer(db)
    return await scorer.get_credit_recommendations(sme_id)