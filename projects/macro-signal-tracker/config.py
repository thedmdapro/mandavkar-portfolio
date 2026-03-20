"""
Configuration for Macro Signal Tracker.
Set your FRED API key as an environment variable before running:
    export FRED_API_KEY="your_key_here"
Get a free key at: https://fred.stlouisfed.org/docs/api/api_key.html
"""

import os

FRED_API_KEY = os.environ.get("FRED_API_KEY", "")

# FRED series IDs
FRED_SERIES = {
    "yield_curve":        "T10Y2Y",      # 10-Year minus 2-Year Treasury Yield
    "hy_spread":          "BAMLH0A0HYM2", # ICE BofA US High Yield OAS
    "ig_spread":          "BAMLC0A0CM",   # ICE BofA US Corporate OAS
    "industrial_prod":    "INDPRO",        # US Industrial Production Index
    "us_gdp_growth":      "A191RL1Q225SBEA", # Real GDP growth (quarterly)
}

# Local data files
BDI_CSV_PATH = "data/bdi_manual.csv"    # Manual weekly BDI update
AMFI_CSV_PATH = "data/amfi_inflows.csv" # Manual monthly AMFI pull

# Chart output folder
OUTPUT_DIR = "output"
