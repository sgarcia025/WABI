#!/usr/bin/env python3
"""
WABI Platform Backend API Testing Suite
Tests all endpoints comprehensively including authentication, SME management, 
products, transactions, credit scoring, and admin functionality.
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class WABIAPITester:
    def __init__(self, base_url="https://wabi-platform-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.test_sme_id = None
        self.test_product_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple:
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}", "PASS")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "FAIL")
                try:
                    error_detail = response.json()
                    self.log(f"   Error details: {error_detail}", "ERROR")
                except:
                    self.log(f"   Response text: {response.text[:200]}", "ERROR")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Exception: {str(e)}", "FAIL")
            return False, {}

    def test_authentication(self):
        """Test authentication endpoints"""
        self.log("=== TESTING AUTHENTICATION ===", "SECTION")
        
        # Test login with admin credentials
        login_data = {
            "phone": "50212345678",
            "password": "admin123"
        }
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.log(f"✅ Token obtained: {self.token[:20]}...", "SUCCESS")
            
            # Test get current user
            self.run_test(
                "Get Current User",
                "GET", 
                "auth/me",
                200
            )
            return True
        else:
            self.log("❌ Failed to obtain authentication token", "CRITICAL")
            return False

    def test_subscription_endpoint(self):
        """Test public subscription endpoint"""
        self.log("=== TESTING SUBSCRIPTION ENDPOINT ===", "SECTION")
        
        subscription_data = {
            "nombre": "Test User Demo",
            "username": "testuser",
            "celular": "50299887766",
            "nombre_negocio": "Tienda Demo Test",
            "departamento": "Guatemala",
            "municipio": "Guatemala",
            "numero_celular_negocio": "50299887777",
            "plan": "free"
        }
        
        success, response = self.run_test(
            "Public Subscription",
            "POST",
            "subscribe",
            200,
            data=subscription_data
        )
        
        if success and 'sme_id' in response:
            self.test_sme_id = response['sme_id']
            self.log(f"✅ Test SME created: {self.test_sme_id}", "SUCCESS")
        
        return success

    def test_sme_management(self):
        """Test SME management endpoints"""
        self.log("=== TESTING SME MANAGEMENT ===", "SECTION")
        
        # Get all SMEs
        success, response = self.run_test(
            "Get All SMEs",
            "GET",
            "smes",
            200
        )
        
        if success and response:
            self.log(f"✅ Found {len(response)} SMEs", "INFO")
            if response and not self.test_sme_id:
                self.test_sme_id = response[0]['id']
                self.log(f"✅ Using SME ID: {self.test_sme_id}", "INFO")
        
        # Get specific SME
        if self.test_sme_id:
            self.run_test(
                "Get Specific SME",
                "GET",
                f"smes/{self.test_sme_id}",
                200
            )
            
            # Update SME
            update_data = {
                "nombre_negocio": "Updated Test Business"
            }
            self.run_test(
                "Update SME",
                "PUT",
                f"smes/{self.test_sme_id}",
                200,
                data=update_data
            )

    def test_product_management(self):
        """Test product management endpoints"""
        self.log("=== TESTING PRODUCT MANAGEMENT ===", "SECTION")
        
        if not self.test_sme_id:
            self.log("❌ No SME ID available for product testing", "ERROR")
            return
        
        # Create product
        product_data = {
            "name": "Coca Cola Test",
            "unit_cost": 5.0,
            "sale_price": 8.0,
            "service": False,
            "category": "Bebidas"
        }
        
        success, response = self.run_test(
            "Create Product",
            "POST",
            f"products?sme_id={self.test_sme_id}",
            200,
            data=product_data
        )
        
        if success and 'id' in response:
            self.test_product_id = response['id']
            self.log(f"✅ Product created: {self.test_product_id}", "SUCCESS")
        
        # Get products
        self.run_test(
            "Get Products",
            "GET",
            f"products?sme_id={self.test_sme_id}",
            200
        )
        
        # Update product
        if self.test_product_id:
            update_data = {
                "name": "Coca Cola Updated",
                "unit_cost": 5.5,
                "sale_price": 9.0,
                "service": False,
                "category": "Bebidas"
            }
            
            self.run_test(
                "Update Product",
                "PUT",
                f"products/{self.test_product_id}?sme_id={self.test_sme_id}",
                200,
                data=update_data
            )

    def test_transaction_management(self):
        """Test transaction management endpoints"""
        self.log("=== TESTING TRANSACTION MANAGEMENT ===", "SECTION")
        
        if not self.test_sme_id:
            self.log("❌ No SME ID available for transaction testing", "ERROR")
            return
        
        # Create transaction
        transaction_data = {
            "type": "sale",
            "items_json": [{"product": "Coca Cola", "quantity": 2, "price": 8.0}],
            "amount": 16.0,
            "payment_method": "cash",
            "customer_phone": "50299887788"
        }
        
        self.run_test(
            "Create Transaction",
            "POST",
            f"transactions?sme_id={self.test_sme_id}",
            200,
            data=transaction_data
        )
        
        # Get transactions
        self.run_test(
            "Get Transactions",
            "GET",
            f"transactions?sme_id={self.test_sme_id}",
            200
        )

    def test_dashboard_endpoint(self):
        """Test dashboard data endpoint"""
        self.log("=== TESTING DASHBOARD ===", "SECTION")
        
        success, response = self.run_test(
            "Get Dashboard Data",
            "GET",
            "dashboard",
            200
        )
        
        if success:
            expected_keys = ['total_smes', 'total_products', 'total_transactions', 'recent_transactions']
            for key in expected_keys:
                if key in response:
                    self.log(f"✅ Dashboard has {key}: {response[key] if key != 'recent_transactions' else len(response[key])}", "INFO")
                else:
                    self.log(f"❌ Dashboard missing {key}", "ERROR")

    def test_admin_endpoints(self):
        """Test admin-specific endpoints"""
        self.log("=== TESTING ADMIN ENDPOINTS ===", "SECTION")
        
        # Get all clients
        success, response = self.run_test(
            "Get All Clients (Admin)",
            "GET",
            "admin/clients",
            200
        )
        
        if success and 'clients' in response:
            self.log(f"✅ Admin found {len(response['clients'])} clients", "INFO")
        
        # Get admin configuration
        self.run_test(
            "Get Admin Configuration",
            "GET",
            "admin/configuration",
            200
        )
        
        # Get credit policies
        self.run_test(
            "Get Credit Policies",
            "GET",
            "admin/credit-policies",
            200
        )

    def test_credit_scoring(self):
        """Test credit scoring endpoints"""
        self.log("=== TESTING CREDIT SCORING ===", "SECTION")
        
        if not self.test_sme_id:
            self.log("❌ No SME ID available for credit scoring testing", "ERROR")
            return
        
        # Calculate credit score
        self.run_test(
            "Calculate Credit Score",
            "POST",
            f"scoring/calculate/{self.test_sme_id}",
            200
        )
        
        # Get credit score
        self.run_test(
            "Get Credit Score",
            "GET",
            f"scoring/{self.test_sme_id}",
            200
        )
        
        # Get score history
        self.run_test(
            "Get Score History",
            "GET",
            f"scoring/{self.test_sme_id}/history",
            200
        )
        
        # Get recommendations
        self.run_test(
            "Get Credit Recommendations",
            "GET",
            f"scoring/{self.test_sme_id}/recommendations",
            200
        )

    def test_whatsapp_integration(self):
        """Test WhatsApp integration endpoints"""
        self.log("=== TESTING WHATSAPP INTEGRATION ===", "SECTION")
        
        # Test WhatsApp message processing
        test_message = {
            "message": "Vendi 2 coca colas a 8 quetzales cada una, pago en efectivo",
            "phone": "50212345678"
        }
        
        self.run_test(
            "Test WhatsApp Message Processing",
            "POST",
            "test/whatsapp-message",
            200,
            data=test_message
        )
        
        # Get webhook logs
        self.run_test(
            "Get Webhook Logs",
            "GET",
            "webhooks/logs?limit=10",
            200
        )

    def test_reports(self):
        """Test reporting endpoints"""
        self.log("=== TESTING REPORTS ===", "SECTION")
        
        if not self.test_sme_id:
            self.log("❌ No SME ID available for reports testing", "ERROR")
            return
        
        # Test top sold products report
        self.run_test(
            "Get Top Sold Report",
            "GET",
            f"reports/top-sold?sme_id={self.test_sme_id}&range=today",
            200
        )
        
        # Test top profitable products report
        self.run_test(
            "Get Top Profitable Report",
            "GET",
            f"reports/top-profitable?sme_id={self.test_sme_id}&range=today",
            200
        )
        
        # Test daily summary report
        self.run_test(
            "Get Daily Summary Report",
            "GET",
            f"reports/daily-summary?sme_id={self.test_sme_id}",
            200
        )

    def cleanup_test_data(self):
        """Clean up test data created during testing"""
        self.log("=== CLEANING UP TEST DATA ===", "SECTION")
        
        # Delete test product if created
        if self.test_product_id:
            self.run_test(
                "Delete Test Product",
                "DELETE",
                f"products/{self.test_product_id}",
                200
            )

    def run_all_tests(self):
        """Run all test suites"""
        self.log("🚀 Starting WABI Platform API Testing Suite", "START")
        self.log(f"Testing against: {self.base_url}", "INFO")
        
        # Test authentication first
        if not self.test_authentication():
            self.log("❌ Authentication failed - stopping tests", "CRITICAL")
            return False
        
        # Run all test suites
        test_suites = [
            self.test_subscription_endpoint,
            self.test_sme_management,
            self.test_product_management,
            self.test_transaction_management,
            self.test_dashboard_endpoint,
            self.test_admin_endpoints,
            self.test_credit_scoring,
            self.test_whatsapp_integration,
            self.test_reports
        ]
        
        for test_suite in test_suites:
            try:
                test_suite()
            except Exception as e:
                self.log(f"❌ Test suite failed: {str(e)}", "ERROR")
        
        # Cleanup
        self.cleanup_test_data()
        
        # Print final results
        self.log("=== TEST RESULTS ===", "RESULTS")
        self.log(f"Tests Run: {self.tests_run}", "RESULTS")
        self.log(f"Tests Passed: {self.tests_passed}", "RESULTS")
        self.log(f"Tests Failed: {self.tests_run - self.tests_passed}", "RESULTS")
        self.log(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%", "RESULTS")
        
        if self.tests_passed == self.tests_run:
            self.log("🎉 All tests passed!", "SUCCESS")
            return True
        else:
            self.log(f"⚠️  {self.tests_run - self.tests_passed} tests failed", "WARNING")
            return False

def main():
    """Main test execution"""
    tester = WABIAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())