# Macro Signal Tracker

A Python tool that pulls, cleans, and visualises macro signals. Generates PNG charts for:
- US Yield Curve (10Y - 2Y spread, inversion zones)
- Credit Spreads (High Yield + Investment Grade OAS)
- US Industrial Production (index + YoY change)
- Baltic Dry Index (weekly, manual update)
- AMFI Net Equity Inflows (monthly, manual update)

---

## Setup (5 minutes)

**1. Install dependencies**
```bash
pip install fredapi pandas matplotlib
```

**2. Get a free FRED API key**
Go to: https://fred.stlouisfed.org/docs/api/api_key.html
Takes 30 seconds. Free. No credit card.

**3. Set your API key**
```bash
export FRED_API_KEY="your_key_here"
```
(Add this to your `~/.zshrc` to make it permanent.)

**4. Run**
```bash
python plot_signals.py
```

Charts output to `output/` folder.

---

## Manual Data Updates

**Baltic Dry Index (weekly)**
1. Go to https://www.handybulk.com/baltic-dry-index/ (published every Friday)
2. Add a new row to `data/bdi_manual.csv`:
   ```
   2026-03-20,2045
   ```

**AMFI Equity Inflows (monthly)**
1. Go to https://www.amfiindia.com → Research → Industry Data
2. Find "Net Inflows - Equity" for the month
3. Add a new row to `data/amfi_inflows.csv`:
   ```
   2026-03-01,28500
   ```

---

## File Structure

```
macro-signal-tracker/
  config.py          — API key, series IDs, file paths
  fred_pull.py       — FRED API data fetcher
  bdi_loader.py      — BDI and AMFI CSV loader
  plot_signals.py    — Chart generator (run this)
  requirements.txt   — pip dependencies
  data/
    bdi_manual.csv   — manual weekly BDI data
    amfi_inflows.csv — manual monthly AMFI data
  output/            — generated charts (auto-created)
    yield_curve.png
    credit_spreads.png
    industrial_production.png
    bdi.png
    amfi_inflows.png
```

---

## What each signal tells you

| Signal | What to watch for |
|---|---|
| Yield curve (10Y-2Y) | Inversion = recession signal. Deep inversion sustained for 6+ months has preceded every US recession since 1970. |
| HY/IG spreads | Widening = credit stress. When HY spreads blow out faster than IG, it's a flight-to-quality signal. |
| Industrial production | YoY negative = manufacturing recession. Cross-check with PMI data. |
| Baltic Dry Index | BDI falling while equities rising = the physical economy disagrees. Pay attention to that divergence. |
| AMFI inflows | Sustained retail inflows into equity = structural support for Indian market. Spike + reversal = possible retail capitulation. |
