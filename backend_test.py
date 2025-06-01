
import requests
import sys
import time
from datetime import datetime

class NetWorthAPITester:
    def __init__(self, base_url="https://7f873d82-cd6c-41ff-b7c1-513a2fa6030b.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_assets = []
        self.created_goals = []

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.text}")
                except:
                    pass
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_get_portfolio(self):
        """Test getting the portfolio"""
        print("\n📊 Testing GET /api/portfolio")
        success, response = self.run_test(
            "Get Portfolio",
            "GET",
            "api/portfolio",
            200
        )
        if success:
            print(f"Portfolio data: {response}")
            return True
        return False

    def test_add_stock(self, name, symbol, quantity):
        """Test adding a stock asset"""
        print(f"\n📈 Testing POST /api/assets (stock: {symbol})")
        success, response = self.run_test(
            f"Add Stock {symbol}",
            "POST",
            "api/assets",
            200,
            data={
                "name": name,
                "type": "stock",
                "symbol": symbol,
                "quantity": quantity
            }
        )
        if success and 'asset' in response:
            self.created_assets.append(response['asset']['id'])
            print(f"Added stock: {response['asset']}")
            return response['asset']['id']
        return None

    def test_add_etf(self, name, symbol, quantity):
        """Test adding an ETF asset"""
        print(f"\n📊 Testing POST /api/assets (ETF: {symbol})")
        success, response = self.run_test(
            f"Add ETF {symbol}",
            "POST",
            "api/assets",
            200,
            data={
                "name": name,
                "type": "etf",
                "symbol": symbol,
                "quantity": quantity
            }
        )
        if success and 'asset' in response:
            self.created_assets.append(response['asset']['id'])
            print(f"Added ETF: {response['asset']}")
            return response['asset']['id']
        return None

    def test_add_savings(self, name, value):
        """Test adding a savings asset"""
        print(f"\n💰 Testing POST /api/assets (savings)")
        success, response = self.run_test(
            "Add Savings",
            "POST",
            "api/assets",
            200,
            data={
                "name": name,
                "type": "savings",
                "value": value
            }
        )
        if success and 'asset' in response:
            self.created_assets.append(response['asset']['id'])
            print(f"Added savings: {response['asset']}")
            return response['asset']['id']
        return None

    def test_add_super(self, name, value):
        """Test adding a superannuation asset"""
        print(f"\n🏦 Testing POST /api/assets (super)")
        success, response = self.run_test(
            "Add Super",
            "POST",
            "api/assets",
            200,
            data={
                "name": name,
                "type": "super",
                "value": value
            }
        )
        if success and 'asset' in response:
            self.created_assets.append(response['asset']['id'])
            print(f"Added super: {response['asset']}")
            return response['asset']['id']
        return None

    def test_delete_asset(self, asset_id):
        """Test deleting an asset"""
        print(f"\n🗑️ Testing DELETE /api/assets/{asset_id}")
        success, _ = self.run_test(
            f"Delete Asset {asset_id}",
            "DELETE",
            f"api/assets/{asset_id}",
            200
        )
        if success:
            if asset_id in self.created_assets:
                self.created_assets.remove(asset_id)
            return True
        return False

    def test_get_stock_price(self, symbol):
        """Test getting a stock price"""
        print(f"\n💲 Testing GET /api/stock-price/{symbol}")
        success, response = self.run_test(
            f"Get Stock Price {symbol}",
            "GET",
            f"api/stock-price/{symbol}",
            200
        )
        if success:
            print(f"Stock price for {symbol}: ${response['price']}")
            return response['price']
        return None

    def test_add_savings_goal(self, name, target, current=0):
        """Test adding a savings goal"""
        print(f"\n🎯 Testing POST /api/savings-goals")
        success, response = self.run_test(
            f"Add Savings Goal {name}",
            "POST",
            "api/savings-goals",
            200,
            data={
                "name": name,
                "target_amount": target,
                "current_amount": current
            }
        )
        if success and 'goal' in response:
            self.created_goals.append(response['goal']['id'])
            print(f"Added goal: {response['goal']}")
            return response['goal']['id']
        return None

    def test_update_savings_goal(self, goal_id, current_amount):
        """Test updating a savings goal"""
        print(f"\n📝 Testing PUT /api/savings-goals/{goal_id}")
        success, response = self.run_test(
            f"Update Savings Goal {goal_id}",
            "PUT",
            f"api/savings-goals/{goal_id}",
            200,
            data={
                "current_amount": current_amount
            }
        )
        return success

    def test_delete_savings_goal(self, goal_id):
        """Test deleting a savings goal"""
        print(f"\n🗑️ Testing DELETE /api/savings-goals/{goal_id}")
        success, _ = self.run_test(
            f"Delete Savings Goal {goal_id}",
            "DELETE",
            f"api/savings-goals/{goal_id}",
            200
        )
        if success:
            if goal_id in self.created_goals:
                self.created_goals.remove(goal_id)
            return True
        return False

    def test_create_net_worth_snapshot(self):
        """Test creating a net worth snapshot"""
        print(f"\n📸 Testing POST /api/net-worth-snapshot")
        success, response = self.run_test(
            "Create Net Worth Snapshot",
            "POST",
            "api/net-worth-snapshot",
            200
        )
        if success:
            print(f"Created snapshot: {response['snapshot']}")
            return True
        return False

    def cleanup(self):
        """Clean up created resources"""
        print("\n🧹 Cleaning up test resources...")
        
        for asset_id in self.created_assets[:]:
            self.test_delete_asset(asset_id)
            
        for goal_id in self.created_goals[:]:
            self.test_delete_savings_goal(goal_id)

def main():
    # Setup
    tester = NetWorthAPITester()
    
    # Run tests
    print("\n==== TESTING NET WORTH TRACKER API ====\n")
    
    # Test 1: Get initial portfolio (should be empty or have existing data)
    tester.test_get_portfolio()
    
    # Test 2: Test stock price API
    stock_symbols = ["AAPL", "TSLA", "MSFT", "AMZN"]
    for symbol in stock_symbols:
        tester.test_get_stock_price(symbol)
    
    # Test 3: Add assets of different types
    stock_id = tester.test_add_stock("Apple Inc.", "AAPL", 10)
    etf_id = tester.test_add_etf("Vanguard S&P 500 ETF", "VOO", 5)
    savings_id = tester.test_add_savings("Emergency Fund", 10000)
    super_id = tester.test_add_super("Retirement Fund", 50000)
    
    # Test 4: Get updated portfolio
    tester.test_get_portfolio()
    
    # Test 5: Create a net worth snapshot
    tester.test_create_net_worth_snapshot()
    
    # Test 6: Add savings goals
    vacation_goal = tester.test_add_savings_goal("Vacation", 5000, 1000)
    house_goal = tester.test_add_savings_goal("House Down Payment", 50000, 10000)
    
    # Test 7: Update a savings goal
    if vacation_goal:
        tester.test_update_savings_goal(vacation_goal, 2000)
    
    # Test 8: Get portfolio again to see all changes
    tester.test_get_portfolio()
    
    # Test 9: Delete one asset to test deletion
    if stock_id:
        tester.test_delete_asset(stock_id)
    
    # Test 10: Delete one goal to test deletion
    if vacation_goal:
        tester.test_delete_savings_goal(vacation_goal)
    
    # Final portfolio state
    tester.test_get_portfolio()
    
    # Clean up
    tester.cleanup()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
