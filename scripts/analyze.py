"""Turn the raw files in data/raw/ into dashboard/data/hype.json.

Three questions:
  1. Do GTA VI moments move attention and Take-Two (TTWO) beyond the market?   -> event study
  2. Are attention and the stock correlated, once the trend trap is removed?    -> levels vs daily changes
  3. Does attention lead trading, or follow it?                                  -> lagged correlation

Method notes
  * Returns are adjusted-close returns. Expected return uses a market model (TTWO on SPY), fitted on the
    120 trading days that end 10 trading days before each event, so the event never contaminates its own baseline.
  * Abnormal volume = volume / median volume of the 60 trading days before the event.
  * Attention = daily English Wikipedia views of the "Grand Theft Auto VI" article (users only, no bots).
    Attention ratio = views on the reaction day / median of the 30 days before.
  * The Wikipedia article was a redirect before Dec 2023, so attention analysis starts 1 Dec 2023.

Run:  python scripts/analyze.py
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "dashboard" / "data" / "hype.json"

ATTN_START = pd.Timestamp("2023-12-01")

# Reaction day = first US trading day the market could react (after-close news moves to the next day).
EVENTS = [
    # date (reaction day), key, title, type, what happened, source
    ("2023-12-05", "t1", "Trailer 1", "trailer",
     "The first trailer came out a day early after it leaked online. 93 million YouTube views in 24 hours, a record.",
     "https://techcrunch.com/2023/12/05/grand-theft-auto-vi-trailer-breaks-mrbeasts-record-for-most-youtube-views-in-24-hours/"),
    ("2025-02-07", "e1", "Release date kept (fall 2025)", "business",
     "In its quarterly results, Take-Two said GTA VI was still on track for fall 2025.",
     "https://www.take2games.com/ir"),
    ("2025-05-02", "d1", "Delay #1 (to May 2026)", "delay",
     "Rockstar moved the release from fall 2025 to 26 May 2026.",
     "https://abc17news.com/money/cnn-business-consumer/2025/05/02/grand-theft-auto-vi-delayed-to-may-2026-extending-wait-for-gamings-most-anticipated-title/"),
    ("2025-05-06", "t2", "Trailer 2", "trailer",
     "The second trailer: 475 million views in 24 hours across all platforms, a new record.",
     "https://www.hollywoodreporter.com/business/digital/grand-theft-auto-6-trailer-views-record-1236210396/"),
    ("2025-11-07", "d2", "Delay #2 (to Nov 2026)", "delay",
     "Moved again, to 19 November 2026. Roughly $3 billion was wiped off Take-Two's value.",
     "https://www.schaeffersresearch.com/content/news/2025/11/07/software-stock-drops-on-delay-in-grand-theft-auto-release"),
    ("2026-01-30", "g1", "Google AI scare (not GTA)", "outside",
     "Not GTA news: a new Google AI tool scared investors in all video game companies. Shown for comparison: a big fall with no GTA hype at all.",
     "https://www.bloomberg.com/news/articles/2026-01-30/unity-video-game-stocks-fall-as-google-s-ai-tool-genie-sparks-fears"),
    ("2026-06-25", "p1", "Pre-orders open", "trailer",
     "Fans could finally order the game: $79.99 on PS5 and Xbox Series X|S.",
     "https://www.forbes.com/sites/brianmazique/2026/07/10/gta-6-trailer-3-when-it-could-drop-based-on-rockstars-trailer-history/"),
    ("2026-08-28", "t3", "Third trailer (\"An Extended Look\")", "trailer",
     "A long first look at gameplay, shown on Netflix first and then YouTube.",
     "https://kotaku.com/gta-6-extended-look-will-premier-exclusively-on-netflix-as-fans-beg-for-trailer-3-2000722148"),
    ("2026-11-10", "e2", "Pre-orders beat expectations", "business",
     "Take-Two said GTA VI pre-orders were ahead of expectations, even though other results were weaker.",
     "https://www.tradingkey.com/analysis/stocks/us-stocks/262300507-ttwo-jumps-8-percent-gta-vi-preorders-bookings-miss-229-trendline-november-11-2026-tradingkey"),
    ("2026-11-18", "r1", "Reviews: 99/100", "launch",
     "Reviews came out the day before launch: 99 out of 100, one of the best scores ever.",
     "https://www.foxbusiness.com/markets/take-two-stock-jumps-over-6-rockstars-long-awaited-gta-vi-arrives-after-13-year-wait"),
    ("2026-11-19", "l1", "Launch day", "launch",
     "GTA VI went on sale. Investors who bought on the hype took their profits.",
     "https://www.nacionale.com/en/articles/why-is-take-two-stock-down-today-gta-6-launch-day-ttwo-sell-the-news"),
]


def load() -> tuple[pd.DataFrame, pd.DataFrame]:
    t = pd.read_csv(RAW / "px_TTWO.csv", parse_dates=["date"])
    s = pd.read_csv(RAW / "px_SPY.csv", parse_dates=["date"])
    m = t.merge(s[["date", "adj_close"]].rename(columns={"adj_close": "spy"}), on="date").sort_values("date")
    m["r"] = m["adj_close"].pct_change()
    m["rm"] = m["spy"].pct_change()
    m = m.dropna(subset=["r", "rm"]).reset_index(drop=True)

    w = pd.read_csv(RAW / "wiki_en.csv", parse_dates=["date"]).sort_values("date")
    w = w[w["date"] >= ATTN_START].reset_index(drop=True)
    return m, w


def event_study(m: pd.DataFrame, w: pd.DataFrame) -> list[dict]:
    wv = w.set_index("date")["views"]
    out = []
    for date, key, title, etype, note, src in EVENTS:
        d = pd.Timestamp(date)
        idx = m.index[m["date"] == d]
        if len(idx) == 0:
            print(f"  ! {date} not a trading day in data, skipped")
            continue
        i = int(idx[0])
        est = m.iloc[max(0, i - 130): i - 10]
        beta, alpha = np.polyfit(est["rm"], est["r"], 1)
        win = m.iloc[i - 1: i + 4].copy()  # day -1 .. +3
        win["ar"] = win["r"] - (alpha + beta * win["rm"])
        ar0 = float(win.loc[i, "ar"])
        car_m1p1 = float(win.loc[i - 1: i + 1, "ar"].sum())
        car_0p3 = float(win.loc[i: i + 3, "ar"].sum()) if i + 3 < len(m) else None
        vol_base = m.iloc[max(0, i - 60): i]["volume"].median()
        att_ratio = None
        # Trailer 1 is the day the article went live (it was a redirect before), so it has no fair baseline.
        if d >= ATTN_START + pd.Timedelta(days=30):
            prior = wv[(wv.index < d) & (wv.index >= d - pd.Timedelta(days=30))]
            base = prior.median() if len(prior) else np.nan
            if base and base > 0 and d in wv.index:
                att_ratio = float(wv[d] / base)
        out.append({
            "key": key, "date": date, "title": title, "type": etype, "note": note, "source": src,
            "ret": round(float(m.loc[i, "r"]), 4),
            "mkt": round(float(m.loc[i, "rm"]), 4),
            "ar": round(ar0, 4),
            "car_m1p1": round(car_m1p1, 4),
            "car_0p3": None if car_0p3 is None else round(car_0p3, 4),
            "vol_x": round(float(m.loc[i, "volume"] / vol_base), 2),
            "views": int(wv.get(d, 0)) if d >= ATTN_START else None,
            "att_x": None if att_ratio is None else round(att_ratio, 1),
            "beta": round(float(beta), 2),
            "close": round(float(m.loc[i, "close"]), 2),
        })
    return out


def daily_panel(m: pd.DataFrame, w: pd.DataFrame) -> pd.DataFrame:
    """Join attention to trading days. Weekend/holiday views roll into the next trading day (sum)."""
    trade_days = m["date"].tolist()
    wv = w.set_index("date")["views"]
    rows = []
    prev = ATTN_START - pd.Timedelta(days=1)
    for d in trade_days:
        if d < ATTN_START:
            continue
        span = wv[(wv.index > prev) & (wv.index <= d)]
        rows.append((d, span.mean() if len(span) else np.nan))
        prev = d
    a = pd.DataFrame(rows, columns=["date", "views"])
    p = m.merge(a, on="date", how="inner")
    p["lv"] = np.log(p["views"])
    p["d_att"] = p["lv"].diff()                                   # daily change in attention (log)
    p["abn_vol"] = np.log(p["volume"]) - np.log(p["volume"]).rolling(60, min_periods=20).mean().shift(1)
    p["abs_r"] = p["r"].abs()
    p["att_vs_base"] = p["lv"] - p["lv"].rolling(30, min_periods=10).median().shift(1)   # attention surprise
    return p


def corr(a: pd.Series, b: pd.Series) -> dict:
    ok = a.notna() & b.notna()
    x, y = a[ok], b[ok]
    return {
        "pearson": round(float(x.corr(y)), 3),
        "spearman": round(float(x.corr(y, method="spearman")), 3),
        "n": int(ok.sum()),
    }


def correlations(p: pd.DataFrame, events: list[dict]) -> dict:
    ev_days = {pd.Timestamp(e["date"]) for e in events}
    near_ev = p["date"].apply(lambda d: any(abs((d - e).days) <= 2 for e in ev_days))

    res = {
        # The trap: two series that both trend into launch day look related even if they are not.
        "levels_views_vs_price": corr(p["views"], p["close"]),
        "changes_views_vs_return": corr(p["d_att"], p["r"]),
        # What actually links: attention surprises go with heavy trading and big moves (either direction).
        "surprise_vs_abn_volume": corr(p["att_vs_base"], p["abn_vol"]),
        "surprise_vs_abs_return": corr(p["att_vs_base"], p["abs_r"]),
        "surprise_vs_abn_volume_ex_events": corr(p.loc[~near_ev, "att_vs_base"], p.loc[~near_ev, "abn_vol"]),
    }
    # Lead/lag: corr(attention surprise at t, abnormal volume at t+k)
    lags = []
    for k in range(-5, 6):
        c = corr(p["att_vs_base"], p["abn_vol"].shift(-k))
        lags.append({"lag": k, "r": c["pearson"], "n": c["n"]})
    res["lags"] = lags
    return res


def trends() -> dict:
    out: dict = {}
    try:
        wd = pd.read_csv(RAW / "trends_world.csv", parse_dates=["date"])
        bd = pd.read_csv(RAW / "trends_bd.csv", parse_dates=["date"])
    except FileNotFoundError:
        return out
    j = wd.merge(bd, on="date", suffixes=("_world", "_bd"))
    out["weekly"] = [
        {"date": d.strftime("%Y-%m-%d"), "world": int(a), "bd": int(b)}
        for d, a, b in zip(j["date"], j["interest_world"], j["interest_bd"])
    ]
    out["corr_levels"] = corr(j["interest_world"], j["interest_bd"])
    out["corr_changes"] = corr(j["interest_world"].diff(), j["interest_bd"].diff())
    lag = []
    for k in range(-3, 4):
        c = corr(j["interest_world"].diff(), j["interest_bd"].diff().shift(-k))
        lag.append({"lag": k, "r": c["pearson"]})
    out["bd_lag_weeks"] = lag
    # How much of Bangladesh's interest arrived in launch week vs the world
    for col in ["interest_world", "interest_bd"]:
        tot = j[col].sum()
        out[f"share_last_4w_{col.split('_')[1]}"] = round(float(j[col].tail(4).sum() / tot), 3) if tot else None
    try:
        c = pd.read_csv(RAW / "trends_countries.csv")
        c = c[c["interest"] > 0].reset_index(drop=True)
        c["rank"] = c.index + 1
        bdrow = c[c["country"] == "Bangladesh"]
        out["countries_top"] = c.head(12).to_dict("records")
        out["countries_n"] = int(len(c))
        out["bd_rank"] = int(bdrow["rank"].iloc[0]) if len(bdrow) else None
        out["bd_interest"] = int(bdrow["interest"].iloc[0]) if len(bdrow) else None
        south_asia = ["India", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal"]
        out["south_asia"] = c[c["country"].isin(south_asia)].to_dict("records")
    except FileNotFoundError:
        pass
    return out


def wanted_level(m: pd.DataFrame) -> pd.DataFrame:
    """20-day realised volatility, mapped to 0-5 stars by its own history (quintiles of 2023-26)."""
    v = m[["date", "r"]].copy()
    v["vol20"] = v["r"].rolling(20).std() * np.sqrt(252)
    qs = v["vol20"].quantile([0.2, 0.4, 0.6, 0.8, 0.95]).values
    v["stars"] = v["vol20"].apply(lambda x: int(np.searchsorted(qs, x, side="right")) if pd.notna(x) else 0)
    return v


def main() -> int:
    m, w = load()
    events = event_study(m, w)
    p = daily_panel(m, w)
    cors = correlations(p, events)
    tr = trends()
    wl = wanted_level(m)

    last = m.iloc[-1]
    ytd_base = m[m["date"] < "2026-01-01"].iloc[-1]["adj_close"]
    peak_w = w.loc[w["views"].idxmax()]

    # Hype meter: 7-day average attention, as % of its highest 7-day average
    w7 = w.set_index("date")["views"].rolling(7).mean()
    hype_now = float(w7.iloc[-1] / w7.max() * 100)

    by_type = {}
    for t in ["trailer", "delay", "launch", "business", "outside"]:
        es = [e for e in events if e["type"] == t]
        if es:
            by_type[t] = {
                "n": len(es),
                "avg_ar": round(float(np.mean([e["ar"] for e in es])), 4),
                "avg_vol_x": round(float(np.mean([e["vol_x"] for e in es])), 2),
                "avg_att_x": round(float(np.mean([e["att_x"] for e in es if e["att_x"]])), 1)
                if any(e["att_x"] for e in es) else None,
            }

    data = {
        "generated": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M"),
        "as_of": last["date"].strftime("%Y-%m-%d"),
        "launch_date": "2026-11-19",
        "headline": {
            "ttwo_close": round(float(last["close"]), 2),
            "ttwo_ytd": round(float(last["adj_close"] / ytd_base - 1), 4),
            "peak_views": int(peak_w["views"]),
            "peak_views_date": peak_w["date"].strftime("%Y-%m-%d"),
            "views_total": int(w["views"].sum()),
            "hype_now": round(hype_now, 1),
            "stars_now": int(wl["stars"].iloc[-1]),
            "vol20_now": round(float(wl["vol20"].iloc[-1]), 3),
        },
        "external": {  # third-party figures quoted on the page, with sources
            "sales_estimate_usd": 1.84e9,
            "copies_estimate": 19.05e6,
            "sales_source": "https://www.gamespot.com/articles/gta-6-has-sold-almost-8-million-copies-so-far-and-ps5-is-dominating-the-split-of-course/",
            "trailer1_24h_views": 93e6,
            "trailer2_24h_views": 475e6,
            "metacritic": 99,
        },
        "events": events,
        "by_type": by_type,
        "correlations": cors,
        "trends": tr,
        "series": {
            "date": [d.strftime("%Y-%m-%d") for d in m["date"]],
            "close": [round(float(x), 2) for x in m["close"]],
            "spy": [round(float(x), 2) for x in m["spy"]],
            "volume": [int(x) for x in m["volume"]],
            "stars": [int(x) for x in wl["stars"]],
        },
        "attention": {
            "date": [d.strftime("%Y-%m-%d") for d in w["date"]],
            "views": [int(x) for x in w["views"]],
        },
        "scatter": [
            [round(float(a), 3), round(float(b), 3), d.strftime("%Y-%m-%d")]
            for a, b, d in zip(p["att_vs_base"], p["abn_vol"], p["date"])
            if pd.notna(a) and pd.notna(b)
        ],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024:.0f} KB)")

    # console summary
    print("\nEvent study")
    for e in events:
        print(f"  {e['date']} {e['title'][:30]:30} ret {e['ret']:+.1%} AR {e['ar']:+.1%} "
              f"CAR[-1,+1] {e['car_m1p1']:+.1%} vol x{e['vol_x']} attn x{e['att_x']}")
    print("\nBy type", json.dumps(by_type, indent=1))
    print("\nCorrelations", json.dumps({k: v for k, v in cors.items() if k != 'lags'}, indent=1))
    print("lags", [(x['lag'], x['r']) for x in cors["lags"]])
    print("\nTrends", {k: v for k, v in tr.items() if k not in ('weekly', 'countries_top')})
    print("\nHeadline", data["headline"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
