"""
Baltic Dry Index loader.
BDI has no free API — update bdi_manual.csv weekly by copying from:
  https://www.handybulk.com/baltic-dry-index/
  or https://tradingeconomics.com/commodity/baltic

CSV format:
  date,bdi
  2026-01-06,1850
  2026-01-13,1920
  ...
"""

import pandas as pd
from pathlib import Path
from config import BDI_CSV_PATH


def load_bdi(path: str = BDI_CSV_PATH) -> pd.Series:
    """Load BDI from manual CSV. Returns pd.Series indexed by date."""
    p = Path(path)
    if not p.exists():
        print(f"BDI file not found at: {path}")
        print("Create it using the template in data/bdi_manual.csv")
        return pd.Series(dtype=float, name="bdi")

    df = pd.read_csv(p, parse_dates=["date"])
    df = df.dropna().sort_values("date").set_index("date")
    series = df["bdi"].squeeze()
    series.name = "Baltic Dry Index"
    print(f"Loaded BDI: {len(series)} weeks, latest {series.index[-1].date()} = {series.iloc[-1]:.0f}")
    return series


def load_amfi(path: str = None) -> pd.Series | None:
    """Load AMFI monthly inflow data if available."""
    from config import AMFI_CSV_PATH
    p = Path(path or AMFI_CSV_PATH)
    if not p.exists():
        return None
    df = pd.read_csv(p, parse_dates=["date"])
    df = df.dropna().sort_values("date").set_index("date")
    series = df["net_inflows_cr"].squeeze()
    series.name = "AMFI Net Equity Inflows (₹ Cr)"
    return series


if __name__ == "__main__":
    bdi = load_bdi()
    if not bdi.empty:
        print(f"\nLast 5 BDI readings:")
        print(bdi.tail(5).to_string())
