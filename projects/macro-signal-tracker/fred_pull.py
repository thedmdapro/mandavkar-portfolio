"""
FRED data fetcher.
Pulls yield curve, credit spreads, and industrial production data.
Requires: pip install fredapi pandas
"""

import pandas as pd
from datetime import datetime, timedelta
from config import FRED_API_KEY, FRED_SERIES

try:
    from fredapi import Fred
except ImportError:
    print("fredapi not installed. Run: pip install fredapi")
    raise


def get_fred_client():
    if not FRED_API_KEY:
        raise ValueError(
            "FRED_API_KEY not set. Export it as an environment variable:\n"
            "  export FRED_API_KEY='your_key_here'\n"
            "Get a free key at: https://fred.stlouisfed.org/docs/api/api_key.html"
        )
    return Fred(api_key=FRED_API_KEY)


def fetch_series(fred: "Fred", series_id: str, start_date: str = None, periods: int = 260) -> pd.Series:
    """Fetch a single FRED series. Default: last 5 years of weekly data."""
    if start_date is None:
        start_date = (datetime.today() - timedelta(days=periods * 7)).strftime("%Y-%m-%d")
    data = fred.get_series(series_id, observation_start=start_date)
    data.name = series_id
    return data


def fetch_all(start_date: str = None) -> dict:
    """
    Fetch all configured FRED series.
    Returns dict: {label: pd.Series}
    """
    fred = get_fred_client()
    results = {}
    for label, series_id in FRED_SERIES.items():
        print(f"Fetching {label} ({series_id})...")
        try:
            results[label] = fetch_series(fred, series_id, start_date)
            print(f"  OK — {len(results[label])} observations, latest: {results[label].index[-1].date()}")
        except Exception as e:
            print(f"  FAILED: {e}")
    return results


if __name__ == "__main__":
    data = fetch_all()
    print("\nFetch complete.")
    for label, series in data.items():
        if series is not None:
            print(f"  {label}: {series.iloc[-1]:.4f} (as of {series.index[-1].date()})")
