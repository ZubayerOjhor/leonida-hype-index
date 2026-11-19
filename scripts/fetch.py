"""Download the raw public data the dashboard is built from.

Sources (all free, no keys):
  * Wikipedia pageviews API - daily views of the "Grand Theft Auto VI" article (attention, daily)
  * Yahoo Finance chart API  - daily TTWO and SPY (market benchmark) prices and volume
  * Google Trends (pytrends) - weekly search interest, worldwide and Bangladesh (optional: rate limited)

Run:  python scripts/fetch.py
Writes CSV files to data/raw/.
"""
from __future__ import annotations

import datetime as dt
import sys
import time
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
RAW.mkdir(parents=True, exist_ok=True)

START = dt.date(2023, 6, 1)
END = dt.date.today() - dt.timedelta(days=1)
UA = {"User-Agent": "leonida-hype-index/1.0 (open-source portfolio project)"}


def wiki_pageviews(project: str = "en.wikipedia", article: str = "Grand_Theft_Auto_VI") -> pd.DataFrame:
    url = (
        "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/"
        f"{project}/all-access/user/{article}/daily/{START:%Y%m%d}/{END:%Y%m%d}"
    )
    r = requests.get(url, headers=UA, timeout=60)
    r.raise_for_status()
    rows = [(i["timestamp"][:8], i["views"]) for i in r.json()["items"]]
    df = pd.DataFrame(rows, columns=["date", "views"])
    df["date"] = pd.to_datetime(df["date"], format="%Y%m%d").dt.date
    return df


def yahoo_daily(symbol: str) -> pd.DataFrame:
    p1 = int(dt.datetime.combine(START, dt.time()).timestamp())
    p2 = int(dt.datetime.combine(END + dt.timedelta(days=1), dt.time()).timestamp())
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&period1={p1}&period2={p2}"
    r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=60)
    r.raise_for_status()
    res = r.json()["chart"]["result"][0]
    q = res["indicators"]["quote"][0]
    adj = res["indicators"].get("adjclose", [{}])[0].get("adjclose", q["close"])
    # Yahoo timestamps are market open in exchange time; convert to New York date
    dates = pd.to_datetime(res["timestamp"], unit="s", utc=True).tz_convert("America/New_York").date
    df = pd.DataFrame({"date": dates, "close": q["close"], "adj_close": adj, "volume": q["volume"]})
    return df.dropna(subset=["close"])


def google_trends() -> None:
    try:
        from pytrends.request import TrendReq
    except ImportError:
        print("  pytrends not installed - skipping Google Trends")
        return
    tf = f"{START:%Y-%m-%d} {END:%Y-%m-%d}"
    for geo, name in [("", "world"), ("BD", "bd")]:
        for attempt in range(3):
            try:
                py = TrendReq(hl="en-US", tz=0)
                py.build_payload(["GTA 6"], timeframe=tf, geo=geo)
                df = py.interest_over_time()
                if df.empty:
                    raise RuntimeError("empty response")
                df = df.reset_index()[["date", "GTA 6"]].rename(columns={"GTA 6": "interest"})
                df.to_csv(RAW / f"trends_{name}.csv", index=False)
                print(f"  trends_{name}: {len(df)} weeks")
                break
            except Exception as e:  # rate limits are common; keep the old file if there is one
                print(f"  trends {name} attempt {attempt + 1} failed: {e}")
                time.sleep(20 * (attempt + 1))
        time.sleep(10)
    # countries ranking (latest 12 months)
    try:
        py = TrendReq(hl="en-US", tz=0)
        py.build_payload(["GTA 6"], timeframe="today 12-m", geo="")
        reg = py.interest_by_region(resolution="COUNTRY", inc_low_vol=False).reset_index()
        reg.columns = ["country", "interest"]
        reg.sort_values("interest", ascending=False).to_csv(RAW / "trends_countries.csv", index=False)
        print(f"  trends_countries: {len(reg)} countries")
    except Exception as e:
        print(f"  trends countries failed: {e}")


def main() -> int:
    print(f"Window {START} .. {END}")
    wiki_pageviews().to_csv(RAW / "wiki_en.csv", index=False)
    print("  wiki_en ok")
    for sym in ["TTWO", "SPY"]:
        yahoo_daily(sym).to_csv(RAW / f"px_{sym}.csv", index=False)
        print(f"  px_{sym} ok")
    if "--no-trends" not in sys.argv:
        google_trends()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
