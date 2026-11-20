"""GTA VI sales scenarios, 2026-2035: "if GTA VI follows GTA V's path".

Method (kept deliberately simple and visible):
  1. Day one is real data: Sensor Tower's estimate of ~24.5M copies / ~$2.36B on launch day (incl. pre-orders),
     reported by the BBC and The Business Standard on 20 Nov 2026.
  2. After day one, GTA VI sells the same *extra* copies GTA V sold after its own day one, at the same age,
     multiplied by a scenario factor:  low 0.6x, base 1.0x, high 1.4x.
       - low:  record pre-orders pulled demand forward, and the game is console-only for now
       - base: the same long tail as GTA V
       - high: a bigger player base, a later PC release and an online mode keep it selling
  3. Each copy earns less as the game ages (discounts, cheaper editions). Average price per copy is an assumption
     shown on the page: launch mix ~$96 (from $2.36B / 24.5M), then falling to ~$30.
  4. Copies only. GTA Online-style earnings (which became GTA V's bigger business) are not included because
     Take-Two does not publish them.

GTA V milestones are Take-Two's reported "sold-in" totals (copies shipped to stores and digital storefronts),
rounded and approximate where the exact report date is uncertain.
"""
from __future__ import annotations

import datetime as dt

GTA5_LAUNCH = dt.date(2013, 9, 17)
GTA6_LAUNCH = dt.date(2026, 11, 19)

# (date, cumulative copies in millions) - Take-Two reported milestones, rounded
GTA5_MILESTONES = [
    (dt.date(2013, 9, 18), 11.21),   # day one (Guinness World Records)
    (dt.date(2013, 10, 29), 29.0),
    (dt.date(2014, 2, 4), 32.5),
    (dt.date(2014, 5, 15), 34.0),
    (dt.date(2015, 2, 3), 45.0),
    (dt.date(2015, 11, 2), 54.0),
    (dt.date(2016, 2, 8), 60.0),
    (dt.date(2017, 2, 7), 75.0),
    (dt.date(2017, 11, 7), 85.0),
    (dt.date(2018, 2, 7), 90.0),
    (dt.date(2018, 11, 6), 100.0),
    (dt.date(2019, 5, 16), 110.0),
    (dt.date(2019, 11, 6), 115.0),
    (dt.date(2020, 2, 5), 120.0),
    (dt.date(2020, 5, 18), 130.0),
    (dt.date(2020, 11, 5), 135.0),
    (dt.date(2021, 2, 9), 140.0),
    (dt.date(2021, 5, 18), 145.0),
    (dt.date(2021, 8, 3), 150.0),
    (dt.date(2021, 11, 8), 155.0),
    (dt.date(2022, 5, 16), 160.0),
    (dt.date(2022, 11, 7), 170.0),
    (dt.date(2023, 5, 17), 180.0),
    (dt.date(2023, 11, 8), 190.0),
    (dt.date(2024, 8, 8), 200.0),
    (dt.date(2024, 11, 6), 205.0),
    (dt.date(2025, 2, 6), 210.0),
    (dt.date(2025, 5, 15), 215.0),
    (dt.date(2026, 2, 5), 225.0),
    (dt.date(2026, 8, 6), 230.0),
]

DAY_ONE_COPIES_M = 24.5
DAY_ONE_REVENUE_B = 2.36
SCENARIOS = {"low": 0.6, "base": 1.0, "high": 1.4}

# average money per copy in each calendar year (US$) - assumption, shown on the page
PRICE_BY_YEAR = {2026: 80, 2027: 65, 2028: 52, 2029: 44, 2030: 38, 2031: 34, 2032: 32, 2033: 30, 2034: 30, 2035: 30}


def gta5_cum_at(days_since_launch: float) -> float:
    """Linear interpolation of GTA V cumulative copies (M) at an age in days."""
    pts = [((d - GTA5_LAUNCH).days, u) for d, u in GTA5_MILESTONES]
    if days_since_launch <= pts[0][0]:
        return pts[0][1]
    for (d0, u0), (d1, u1) in zip(pts, pts[1:]):
        if d0 <= days_since_launch <= d1:
            return u0 + (u1 - u0) * (days_since_launch - d0) / (d1 - d0)
    return pts[-1][1]


def build() -> dict:
    day1_age = (GTA5_MILESTONES[0][0] - GTA5_LAUNCH).days
    base_gta5 = gta5_cum_at(day1_age)
    years = list(range(2026, 2036))
    out = {"years": years, "scenarios": {}, "price_by_year": [PRICE_BY_YEAR[y] for y in years],
           "day_one": {"copies_m": DAY_ONE_COPIES_M, "revenue_b": DAY_ONE_REVENUE_B},
           "factors": SCENARIOS,
           "gta5_milestones": [[d.isoformat(), u] for d, u in GTA5_MILESTONES]}
    for name, k in SCENARIOS.items():
        prev_units = DAY_ONE_COPIES_M
        rows = []
        cum_rev = 0.0
        for y in years:
            age_end = (dt.date(y, 12, 31) - GTA6_LAUNCH).days
            units_end = DAY_ONE_COPIES_M + k * max(0.0, gta5_cum_at(age_end) - base_gta5)
            new_units = units_end - prev_units
            rev = new_units * PRICE_BY_YEAR[y] / 1000  # $B
            if y == 2026:
                rev += DAY_ONE_REVENUE_B
                new_units += DAY_ONE_COPIES_M
            cum_rev += rev
            rows.append({"year": y, "copies_m": round(new_units, 1), "revenue_b": round(rev, 2),
                         "cum_copies_m": round(units_end, 1), "cum_revenue_b": round(cum_rev, 2)})
            prev_units = units_end
        out["scenarios"][name] = rows
    return out


if __name__ == "__main__":
    f = build()
    for name, rows in f["scenarios"].items():
        print(name, [(r["year"], r["revenue_b"]) for r in rows], "total", rows[-1]["cum_revenue_b"], "copies", rows[-1]["cum_copies_m"])
