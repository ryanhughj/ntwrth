from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Optional
import os
from datetime import datetime, timezone
import yfinance as yf
import uuid
from contextlib import asynccontextmanager

# Database models
class Asset(BaseModel):
    id: str
    name: str
    type: str  # "stock", "etf", "super", "savings"
    symbol: Optional[str] = None  # For stocks/ETFs
    quantity: Optional[float] = None  # For stocks/ETFs
    value: float  # Current value
    manual_value: Optional[float] = None  # Manual override value

class SavingsGoal(BaseModel):
    id: str
    name: str
    target_amount: float
    current_amount: float = 0.0
    deadline: Optional[str] = None

class NetWorthSnapshot(BaseModel):
    id: str
    date: str
    total_stocks: float
    total_etfs: float
    total_super: float
    total_savings: float
    net_worth: float

class Portfolio(BaseModel):
    user_id: str = "default"  # For MVP, single user
    assets: List[Asset] = []
    savings_goals: List[SavingsGoal] = []
    net_worth_history: List[NetWorthSnapshot] = []

# Database setup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.mongodb_client = AsyncIOMotorClient(os.environ.get("MONGO_URL"))
    app.mongodb = app.mongodb_client[os.environ.get("DB_NAME", "networth_db")]
    yield
    # Shutdown
    app.mongodb_client.close()

app = FastAPI(lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get database
async def get_database():
    return app.mongodb

# Helper function to get stock price
def get_stock_price(symbol: str) -> float:
    try:
        ticker = yf.Ticker(symbol)
        data = ticker.history(period="1d")
        if not data.empty:
            return float(data['Close'].iloc[-1])
        else:
            # Fallback to info if history is empty
            info = ticker.info
            return info.get('currentPrice', info.get('regularMarketPrice', 0.0))
    except Exception as e:
        print(f"Error getting price for {symbol}: {e}")
        return 0.0

# Get or create portfolio
async def get_portfolio(db) -> Portfolio:
    portfolio_data = await db.portfolios.find_one({"user_id": "default"})
    if portfolio_data:
        # Convert MongoDB document to Portfolio model
        portfolio_data.pop("_id", None)
        return Portfolio(**portfolio_data)
    else:
        # Create new portfolio
        new_portfolio = Portfolio()
        await db.portfolios.insert_one(new_portfolio.dict())
        return new_portfolio

# API Routes

@app.get("/api/portfolio")
async def get_portfolio_data(db=Depends(get_database)):
    """Get current portfolio with live stock prices"""
    portfolio = await get_portfolio(db)
    
    # Update stock prices
    for asset in portfolio.assets:
        if asset.symbol and asset.type in ["stock", "etf"]:
            if asset.manual_value is None:  # Only update if not manually overridden
                current_price = get_stock_price(asset.symbol)
                if current_price > 0 and asset.quantity:
                    asset.value = current_price * asset.quantity
    
    # Calculate totals
    total_stocks = sum(a.value for a in portfolio.assets if a.type == "stock")
    total_etfs = sum(a.value for a in portfolio.assets if a.type == "etf")
    total_super = sum(a.value for a in portfolio.assets if a.type == "super")
    total_savings = sum(a.value for a in portfolio.assets if a.type == "savings")
    net_worth = total_stocks + total_etfs + total_super + total_savings
    
    return {
        "portfolio": portfolio,
        "totals": {
            "stocks": total_stocks,
            "etfs": total_etfs,
            "super": total_super,
            "savings": total_savings,
            "net_worth": net_worth
        }
    }

@app.post("/api/assets")
async def add_asset(asset_data: dict, db=Depends(get_database)):
    """Add a new asset to portfolio"""
    portfolio = await get_portfolio(db)
    
    # Generate unique ID
    asset_id = str(uuid.uuid4())
    
    # Get current price for stocks/ETFs
    value = asset_data.get("value", 0.0)
    if asset_data.get("symbol") and asset_data.get("quantity"):
        if asset_data["type"] in ["stock", "etf"]:
            current_price = get_stock_price(asset_data["symbol"])
            if current_price > 0:
                value = current_price * asset_data["quantity"]
    
    new_asset = Asset(
        id=asset_id,
        name=asset_data["name"],
        type=asset_data["type"],
        symbol=asset_data.get("symbol"),
        quantity=asset_data.get("quantity"),
        value=value,
        manual_value=asset_data.get("manual_value")
    )
    
    portfolio.assets.append(new_asset)
    
    # Update database
    await db.portfolios.update_one(
        {"user_id": "default"},
        {"$set": {"assets": [asset.dict() for asset in portfolio.assets]}},
        upsert=True
    )
    
    return {"message": "Asset added successfully", "asset": new_asset}

@app.delete("/api/assets/{asset_id}")
async def delete_asset(asset_id: str, db=Depends(get_database)):
    """Delete an asset from portfolio"""
    portfolio = await get_portfolio(db)
    
    # Remove asset
    portfolio.assets = [a for a in portfolio.assets if a.id != asset_id]
    
    # Update database
    await db.portfolios.update_one(
        {"user_id": "default"},
        {"$set": {"assets": [asset.dict() for asset in portfolio.assets]}},
        upsert=True
    )
    
    return {"message": "Asset deleted successfully"}

@app.put("/api/assets/{asset_id}")
async def update_asset(asset_id: str, asset_data: dict, db=Depends(get_database)):
    """Update an existing asset"""
    portfolio = await get_portfolio(db)
    
    # Find and update asset
    for asset in portfolio.assets:
        if asset.id == asset_id:
            asset.name = asset_data.get("name", asset.name)
            asset.type = asset_data.get("type", asset.type)
            asset.symbol = asset_data.get("symbol", asset.symbol)
            asset.quantity = asset_data.get("quantity", asset.quantity)
            asset.manual_value = asset_data.get("manual_value", asset.manual_value)
            
            # Recalculate value if needed
            if asset.manual_value is not None:
                asset.value = asset.manual_value
            elif asset.symbol and asset.quantity and asset.type in ["stock", "etf"]:
                current_price = get_stock_price(asset.symbol)
                if current_price > 0:
                    asset.value = current_price * asset.quantity
            else:
                asset.value = asset_data.get("value", asset.value)
            break
    
    # Update database
    await db.portfolios.update_one(
        {"user_id": "default"},
        {"$set": {"assets": [asset.dict() for asset in portfolio.assets]}},
        upsert=True
    )
    
    return {"message": "Asset updated successfully"}

@app.post("/api/savings-goals")
async def add_savings_goal(goal_data: dict, db=Depends(get_database)):
    """Add a new savings goal"""
    portfolio = await get_portfolio(db)
    
    goal_id = str(uuid.uuid4())
    new_goal = SavingsGoal(
        id=goal_id,
        name=goal_data["name"],
        target_amount=goal_data["target_amount"],
        current_amount=goal_data.get("current_amount", 0.0),
        deadline=goal_data.get("deadline")
    )
    
    portfolio.savings_goals.append(new_goal)
    
    # Update database
    await db.portfolios.update_one(
        {"user_id": "default"},
        {"$set": {"savings_goals": [goal.dict() for goal in portfolio.savings_goals]}},
        upsert=True
    )
    
    return {"message": "Savings goal added successfully", "goal": new_goal}

@app.put("/api/savings-goals/{goal_id}")
async def update_savings_goal(goal_id: str, goal_data: dict, db=Depends(get_database)):
    """Update a savings goal"""
    portfolio = await get_portfolio(db)
    
    for goal in portfolio.savings_goals:
        if goal.id == goal_id:
            goal.name = goal_data.get("name", goal.name)
            goal.target_amount = goal_data.get("target_amount", goal.target_amount)
            goal.current_amount = goal_data.get("current_amount", goal.current_amount)
            goal.deadline = goal_data.get("deadline", goal.deadline)
            break
    
    # Update database
    await db.portfolios.update_one(
        {"user_id": "default"},
        {"$set": {"savings_goals": [goal.dict() for goal in portfolio.savings_goals]}},
        upsert=True
    )
    
    return {"message": "Savings goal updated successfully"}

@app.delete("/api/savings-goals/{goal_id}")
async def delete_savings_goal(goal_id: str, db=Depends(get_database)):
    """Delete a savings goal"""
    portfolio = await get_portfolio(db)
    
    portfolio.savings_goals = [g for g in portfolio.savings_goals if g.id != goal_id]
    
    # Update database
    await db.portfolios.update_one(
        {"user_id": "default"},
        {"$set": {"savings_goals": [goal.dict() for goal in portfolio.savings_goals]}},
        upsert=True
    )
    
    return {"message": "Savings goal deleted successfully"}

@app.post("/api/net-worth-snapshot")
async def create_net_worth_snapshot(db=Depends(get_database)):
    """Create a snapshot of current net worth"""
    portfolio = await get_portfolio(db)
    
    # Update stock prices first
    for asset in portfolio.assets:
        if asset.symbol and asset.type in ["stock", "etf"] and asset.manual_value is None:
            current_price = get_stock_price(asset.symbol)
            if current_price > 0 and asset.quantity:
                asset.value = current_price * asset.quantity
    
    # Calculate totals
    total_stocks = sum(a.value for a in portfolio.assets if a.type == "stock")
    total_etfs = sum(a.value for a in portfolio.assets if a.type == "etf")
    total_super = sum(a.value for a in portfolio.assets if a.type == "super")
    total_savings = sum(a.value for a in portfolio.assets if a.type == "savings")
    net_worth = total_stocks + total_etfs + total_super + total_savings
    
    # Create snapshot
    snapshot_id = str(uuid.uuid4())
    snapshot = NetWorthSnapshot(
        id=snapshot_id,
        date=datetime.now(timezone.utc).isoformat(),
        total_stocks=total_stocks,
        total_etfs=total_etfs,
        total_super=total_super,
        total_savings=total_savings,
        net_worth=net_worth
    )
    
    portfolio.net_worth_history.append(snapshot)
    
    # Keep only last 100 snapshots
    if len(portfolio.net_worth_history) > 100:
        portfolio.net_worth_history = portfolio.net_worth_history[-100:]
    
    # Update database
    await db.portfolios.update_one(
        {"user_id": "default"},
        {"$set": {
            "assets": [asset.dict() for asset in portfolio.assets],
            "net_worth_history": [snap.dict() for snap in portfolio.net_worth_history]
        }},
        upsert=True
    )
    
    return {"message": "Net worth snapshot created", "snapshot": snapshot}

@app.get("/api/stock-price/{symbol}")
async def get_stock_price_endpoint(symbol: str):
    """Get current stock price for a symbol"""
    price = get_stock_price(symbol.upper())
    if price > 0:
        return {"symbol": symbol.upper(), "price": price}
    else:
        raise HTTPException(status_code=404, detail=f"Could not fetch price for {symbol}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)