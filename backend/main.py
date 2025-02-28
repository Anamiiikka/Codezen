# D:/codezen/backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mftool import Mftool
import pandas as pd
import numpy as np
from typing import Dict, List, Any
import logging
from starlette.responses import JSONResponse
from pymongo import MongoClient
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
mf = Mftool()

# MongoDB connection using environment variable
MONGODB_URL = os.getenv("MONGODB_URL")
client = MongoClient(MONGODB_URL)
db = client["codezen"]  # Database name
users_collection = db["users"]  # Collection name

# Enable CORS with dynamic FRONTEND_URL from environment variable
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")  # Default to local dev if not set
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],  # Use environment variable for allowed origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware to ensure CORS headers on all responses
@app.middleware("http")
async def add_cors_headers(request, call_next):
    try:
        response = await call_next(request)
    except Exception as e:
        logger.error(f"Unhandled exception in request {request.url}: {str(e)}")
        response = JSONResponse(
            status_code=500,
            content={"detail": str(e)}
        )
    response.headers["Access-Control-Allow-Origin"] = FRONTEND_URL  # Dynamic origin
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# Helper function to convert scheme codes
scheme_names = {v: k for k, v in mf.get_scheme_codes().items()}

# Helper function to flatten and stringify response data
def stringify_dict(data: Dict[str, Any]) -> Dict[str, str]:
    result = {}
    for key, value in data.items():
        if isinstance(value, dict):
            result[key] = str(value)
        else:
            result[key] = str(value)
    return result

@app.get("/api/schemes")
async def get_schemes(search: str = "") -> Dict[str, str]:
    try:
        all_schemes = mf.get_scheme_codes()
        if search:
            filtered_schemes = {
                code: name for code, name in all_schemes.items()
                if search.lower() in name.lower()
            }
            if filtered_schemes:
                return filtered_schemes
            logger.info(f"No schemes found matching search: {search}")
            return {}
        logger.info("Returning all schemes (no search term provided)")
        return all_schemes
    except Exception as e:
        logger.error(f"Error fetching schemes with search {search}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/scheme-details/{scheme_code}")
async def get_scheme_details(scheme_code: str) -> Dict[str, str]:
    try:
        details = mf.get_scheme_details(scheme_code)
        if details:
            return stringify_dict(details)
        logger.info(f"No details found for scheme_code: {scheme_code}")
        return {}
    except Exception as e:
        logger.error(f"Error fetching scheme details for {scheme_code}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/historical-nav/{scheme_code}")
async def get_historical_nav(scheme_code: str) -> List[Dict[str, str]]:
    try:
        nav_data = mf.get_scheme_historical_nav(scheme_code, as_Dataframe=True)
        if nav_data is not None and not nav_data.empty:
            nav_data = nav_data.astype(str)
            return nav_data.to_dict(orient="records")
        logger.info(f"No historical NAV data found for scheme_code: {scheme_code}")
        return []
    except Exception as e:
        logger.error(f"Error fetching historical NAV for {scheme_code}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/compare-navs")
async def compare_navs(scheme_codes: str) -> List[Dict[str, Any]]:
    try:
        codes = scheme_codes.split(",")
        if not codes:
            logger.info("No scheme codes provided for comparison")
            return []

        comparison_data = {}
        for code in codes:
            try:
                data = mf.get_scheme_historical_nav(code.strip(), as_Dataframe=True)
                if data is not None and not data.empty:
                    data = data.reset_index().rename(columns={"index": "date"})
                    data["date"] = pd.to_datetime(data["date"], dayfirst=True).dt.strftime("%Y-%m-%d")
                    data["nav"] = pd.to_numeric(data["nav"], errors="coerce").replace(0, None).interpolate()
                    comparison_data[code] = data[["date", "nav"]].to_dict(orient="records")
                else:
                    logger.info(f"No historical NAV data found for scheme_code: {code}")
            except Exception as e:
                logger.warning(f"Failed to fetch NAV data for {code}: {str(e)}")

        if comparison_data:
            merged_df = None
            for code, records in comparison_data.items():
                df = pd.DataFrame(records).set_index("date")
                df = df.rename(columns={"nav": scheme_names.get(code, code)})
                if merged_df is None:
                    merged_df = df
                else:
                    merged_df = merged_df.join(df, how="outer")
            merged_df = merged_df.reset_index()
            logger.info(f"Successfully compared NAVs for scheme_codes: {scheme_codes}")
            return merged_df.to_dict(orient="records")
        logger.info(f"No valid data to compare for scheme_codes: {scheme_codes}")
        return []
    except Exception as e:
        logger.error(f"Error comparing NAVs for {scheme_codes}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/average-aum")
async def get_average_aum(period: str = "July - September 2024") -> List[Dict[str, str]]:
    try:
        aum_data = mf.get_average_aum(period, False)
        if aum_data:
            aum_df = pd.DataFrame(aum_data)
            aum_df["Total AUM"] = aum_df[["AAUM Overseas", "AAUM Domestic"]].astype(float).sum(axis=1)
            return aum_df[["Fund Name", "Total AUM"]].astype(str).to_dict(orient="records")
        logger.info(f"No AUM data found for period: {period}")
        return []
    except Exception as e:
        logger.error(f"Error fetching AUM for period {period}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/performance-heatmap/{scheme_code}")
async def get_performance_heatmap(scheme_code: str) -> List[Dict[str, float]]:
    try:
        nav_data = mf.get_scheme_historical_nav(scheme_code, as_Dataframe=True)
        if nav_data is not None and not nav_data.empty:
            nav_data = nav_data.reset_index().rename(columns={"index": "date"})
            nav_data["month"] = pd.to_datetime(nav_data["date"]).dt.month
            nav_data["nav"] = nav_data["nav"].astype(float)
            heatmap_data = nav_data.groupby("month")["dayChange"].mean().reset_index()
            heatmap_data["month"] = heatmap_data["month"].astype(str)
            return heatmap_data.to_dict(orient="records")
        logger.info(f"No historical NAV data found for heatmap, scheme_code: {scheme_code}")
        return []
    except Exception as e:
        logger.error(f"Error fetching performance heatmap for {scheme_code}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/risk-volatility/{scheme_code}")
async def get_risk_volatility(scheme_code: str) -> Dict[str, Any]:
    try:
        nav_data = mf.get_scheme_historical_nav(scheme_code, as_Dataframe=True)
        if nav_data is not None and not nav_data.empty:
            nav_data = nav_data.reset_index().rename(columns={"index": "date"})
            nav_data["date"] = pd.to_datetime(nav_data["date"], dayfirst=True)
            nav_data["nav"] = pd.to_numeric(nav_data["nav"], errors="coerce")
            nav_data = nav_data.dropna(subset=["nav"])
            nav_data["returns"] = nav_data["nav"] / nav_data["nav"].shift(1) - 1
            nav_data = nav_data.dropna(subset=["returns"])

            annualized_volatility = nav_data["returns"].std() * np.sqrt(252)
            annualized_return = (nav_data["returns"].mean() + 1) ** 252 - 1
            risk_free_rate = 0.06
            sharpe_ratio = (annualized_return - risk_free_rate) / annualized_volatility

            return {
                "annualized_volatility": annualized_volatility,
                "annualized_return": annualized_return,
                "sharpe_ratio": sharpe_ratio,
                "returns": nav_data[["date", "returns", "nav"]].to_dict(orient="records")
            }
        logger.info(f"No historical NAV data found for risk analysis, scheme_code: {scheme_code}")
        return {}
    except Exception as e:
        logger.error(f"Error fetching risk volatility for {scheme_code}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint to save or update user data
@app.post("/api/save-user")
async def save_user(user: Dict[str, Any]):
    try:
        user_id = user.get("sub")  # Auth0 user ID (e.g., "auth0|123456")
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID (sub) is required")

        # Upsert user data (updates if exists, inserts if not)
        result = users_collection.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                "email": user.get("email"),
                "given_name": user.get("given_name"),
                "family_name": user.get("family_name"),
                "name": user.get("name"),
                "picture": user.get("picture"),
                "last_login": user.get("updated_at"),
            }},
            upsert=True
        )
        logger.info(f"User {user_id} saved/updated successfully")
        return {"message": "User saved successfully", "modified_count": result.modified_count}
    except Exception as e:
        logger.error(f"Error saving user: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint to get user data
@app.get("/api/get-user/{user_id}")
async def get_user(user_id: str):
    try:
        user_data = users_collection.find_one({"user_id": user_id})
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        # Remove MongoDB's internal '_id' field
        user_data.pop("_id", None)
        return user_data
    except Exception as e:
        logger.error(f"Error fetching user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)