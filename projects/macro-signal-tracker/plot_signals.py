"""
Generate charts for all macro signals.
Outputs PNG files to the output/ folder.
Run: python plot_signals.py
"""

import os
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for PNG output
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from pathlib import Path

from config import OUTPUT_DIR
from fred_pull import fetch_all
from bdi_loader import load_bdi, load_amfi

# --- Style ---
COLORS = {
    "main":    "#2F4858",   # Prussian blue — matches portfolio site
    "signal":  "#005F73",   # Teal
    "warn":    "#AE2012",   # Deep red for inversion / risk signal
    "neutral": "#94A3B8",   # Grey
    "bg":      "#F9F8F6",   # Off-white
    "grid":    "#E2E8F0",
}

plt.rcParams.update({
    "figure.facecolor":  COLORS["bg"],
    "axes.facecolor":    COLORS["bg"],
    "axes.edgecolor":    COLORS["neutral"],
    "axes.labelcolor":   COLORS["main"],
    "xtick.color":       COLORS["neutral"],
    "ytick.color":       COLORS["neutral"],
    "grid.color":        COLORS["grid"],
    "grid.linewidth":    0.6,
    "font.family":       "sans-serif",
    "font.size":         10,
})


def ensure_output():
    Path(OUTPUT_DIR).mkdir(exist_ok=True)


def save(fig, filename: str):
    path = Path(OUTPUT_DIR) / filename
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved: {path}")


def plot_yield_curve(series: pd.Series):
    """Plot 10Y-2Y yield spread with inversion zone highlighted."""
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(series.index, series.values, color=COLORS["main"], linewidth=1.5, label="10Y - 2Y (bps)")
    ax.axhline(0, color=COLORS["warn"], linewidth=1, linestyle="--", alpha=0.8, label="Inversion line")
    ax.fill_between(series.index, series.values, 0,
                    where=(series.values < 0),
                    color=COLORS["warn"], alpha=0.12, label="Inversion zone")
    ax.set_title("Yield Curve: 10-Year minus 2-Year Treasury", fontsize=13, fontweight="bold",
                 color=COLORS["main"], pad=12)
    ax.set_ylabel("Spread (%)")
    ax.grid(True, axis="y")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b '%y"))
    ax.legend(fontsize=9)
    fig.tight_layout()
    save(fig, "yield_curve.png")


def plot_credit_spreads(hy: pd.Series, ig: pd.Series):
    """Plot HY and IG spreads on dual axes."""
    fig, ax1 = plt.subplots(figsize=(10, 4))
    ax2 = ax1.twinx()

    ax1.plot(hy.index, hy.values, color=COLORS["warn"], linewidth=1.5, label="HY Spread (left)")
    ax2.plot(ig.index, ig.values, color=COLORS["signal"], linewidth=1.5, linestyle="--", label="IG Spread (right)")

    ax1.set_ylabel("HY OAS (%)", color=COLORS["warn"])
    ax2.set_ylabel("IG OAS (%)", color=COLORS["signal"])
    ax1.tick_params(axis="y", colors=COLORS["warn"])
    ax2.tick_params(axis="y", colors=COLORS["signal"])

    ax1.set_title("Credit Spreads: High Yield vs Investment Grade (OAS)", fontsize=13,
                  fontweight="bold", color=COLORS["main"], pad=12)
    ax1.grid(True, axis="y", alpha=0.4)
    ax1.xaxis.set_major_formatter(mdates.DateFormatter("%b '%y"))

    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, fontsize=9)

    fig.tight_layout()
    save(fig, "credit_spreads.png")


def plot_industrial_production(series: pd.Series):
    """Plot US industrial production index with YoY change."""
    yoy = series.pct_change(12) * 100
    yoy = yoy.dropna()

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 6), sharex=True)

    ax1.plot(series.index, series.values, color=COLORS["main"], linewidth=1.5)
    ax1.set_title("US Industrial Production Index", fontsize=13, fontweight="bold",
                  color=COLORS["main"], pad=12)
    ax1.set_ylabel("Index (2017 = 100)")
    ax1.grid(True, axis="y")

    ax2.bar(yoy.index, yoy.values, width=20,
            color=[COLORS["signal"] if v >= 0 else COLORS["warn"] for v in yoy.values],
            alpha=0.75)
    ax2.axhline(0, color=COLORS["neutral"], linewidth=0.8)
    ax2.set_ylabel("YoY Change (%)")
    ax2.grid(True, axis="y")
    ax2.xaxis.set_major_formatter(mdates.DateFormatter("%b '%y"))

    fig.tight_layout()
    save(fig, "industrial_production.png")


def plot_bdi(series: pd.Series):
    """Plot Baltic Dry Index."""
    if series.empty:
        print("  Skipping BDI chart — no data loaded")
        return

    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(series.index, series.values, color=COLORS["signal"], linewidth=2, marker="o",
            markersize=3, label="BDI")
    ax.fill_between(series.index, series.values, alpha=0.1, color=COLORS["signal"])
    ax.set_title("Baltic Dry Index — Weekly", fontsize=13, fontweight="bold",
                 color=COLORS["main"], pad=12)
    ax.set_ylabel("Index Points")
    ax.grid(True, axis="y")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b '%y"))
    ax.legend(fontsize=9)
    fig.tight_layout()
    save(fig, "bdi.png")


def plot_amfi_inflows(series: pd.Series):
    """Plot AMFI monthly equity inflows."""
    if series is None or series.empty:
        print("  Skipping AMFI chart — no data loaded")
        return

    fig, ax = plt.subplots(figsize=(10, 4))
    ax.bar(series.index, series.values, width=20,
           color=[COLORS["signal"] if v >= 0 else COLORS["warn"] for v in series.values],
           alpha=0.8)
    ax.axhline(0, color=COLORS["neutral"], linewidth=0.8)
    ax.set_title("AMFI Net Equity Inflows — Monthly (₹ Crore)", fontsize=13,
                 fontweight="bold", color=COLORS["main"], pad=12)
    ax.set_ylabel("₹ Crore")
    ax.grid(True, axis="y")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b '%y"))
    fig.tight_layout()
    save(fig, "amfi_inflows.png")


def run():
    ensure_output()
    print("=== Macro Signal Tracker ===\n")

    # --- FRED data ---
    print("Fetching FRED data...")
    fred_data = fetch_all()

    if fred_data.get("yield_curve") is not None:
        print("\nPlotting yield curve...")
        plot_yield_curve(fred_data["yield_curve"])

    if fred_data.get("hy_spread") is not None and fred_data.get("ig_spread") is not None:
        print("Plotting credit spreads...")
        plot_credit_spreads(fred_data["hy_spread"], fred_data["ig_spread"])

    if fred_data.get("industrial_prod") is not None:
        print("Plotting industrial production...")
        plot_industrial_production(fred_data["industrial_prod"])

    # --- Manual data ---
    print("\nLoading manual data...")
    bdi = load_bdi()
    plot_bdi(bdi)

    amfi = load_amfi()
    plot_amfi_inflows(amfi)

    print(f"\nDone. Charts saved to ./{OUTPUT_DIR}/")


if __name__ == "__main__":
    run()
