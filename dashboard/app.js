/* Leonida Hype Index - renders dashboard/data/hype.json */
(async function () {
  const css = getComputedStyle(document.documentElement);
  const v = (n) => css.getPropertyValue(n).trim();
  const C = {
    hype: v("--hype"), stock: v("--stock"), delay: v("--delay"), neutral: v("--neutral"),
    text: v("--text"), text2: v("--text-2"), muted: v("--muted"), line: v("--line"), lineSoft: v("--line-soft"),
    surface: v("--surface"), surface2: v("--surface-2"),
  };
  const TYPE = {
    trailer:  { label: "Hype moment", color: C.hype },
    launch:   { label: "Hype moment", color: C.hype },
    delay:    { label: "Delay", color: C.delay },
    business: { label: "Business news", color: C.stock },
    outside:  { label: "Not GTA (control)", color: C.neutral },
  };
  const SHORT = { t1: "Trailer 1", e1: "Fall '25 kept", d1: "Delay #1", t2: "Trailer 2", d2: "Delay #2",
    g1: "Project Genie", p1: "Pre-orders", t3: "Extended Look", e2: "Pre-orders beat", r1: "Reviews 99", l1: "Launch" };

  let D;
  try {
    D = await (await fetch("data/hype.json", { cache: "no-cache" })).json();
  } catch (e) {
    document.querySelector("main").innerHTML = '<p class="note" style="margin-top:80px">Could not load data/hype.json. Serve this folder over HTTP (for example <code>python -m http.server</code>).</p>';
    return;
  }

  /* ---------- helpers ---------- */
  const pct = (x, d = 1) => (x == null ? "–" : (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x * 100).toFixed(d) + "%");
  const num = (x) => x.toLocaleString("en-US");
  const fmtDate = (s, opt = { day: "numeric", month: "short", year: "numeric" }) =>
    new Date(s + "T00:00:00Z").toLocaleDateString("en-GB", { ...opt, timeZone: "UTC" });
  const stars = (n) => "★".repeat(n) + '<span class="off">' + "★".repeat(5 - n) + "</span>";
  const sign = (x) => (x > 0 ? "pos" : x < 0 ? "neg" : "");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const baseText = { color: C.text2, fontFamily: "Inter, system-ui, sans-serif", fontSize: 12 };
  const axisCommon = {
    axisLine: { lineStyle: { color: C.line } },
    axisTick: { show: false },
    axisLabel: { color: C.muted, fontSize: 11, hideOverlap: true },
    splitLine: { lineStyle: { color: C.lineSoft, type: "solid" } },
  };
  const tooltipBase = {
    backgroundColor: C.surface2, borderColor: C.line, borderWidth: 1, padding: [8, 10],
    textStyle: { color: C.text, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif" },
    extraCssText: "border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.4);",
  };
  const charts = [];
  const mk = (id) => { const c = echarts.init(document.getElementById(id), null, { renderer: "canvas" }); charts.push(c); return c; };
  window.addEventListener("resize", () => charts.forEach((c) => c.resize()));

  /* ---------- hero ---------- */
  const launch = new Date(D.launch_date + "T00:00:00Z");
  const today = new Date();
  const day = Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - launch) / 864e5) + 1;
  document.getElementById("mission-sub").textContent =
    day >= 1 ? `GTA VI is out · Day ${day} in Leonida` : `${1 - day} days to launch`;
  if (day < 1) document.querySelector(".mission-title").textContent = "Mission in progress";

  /* ---------- tiles ---------- */
  const H = D.headline, X = D.external;
  const tiles = [
    { label: "Launch sales (estimate)", value: "$" + (X.sales_estimate_usd / 1e9).toFixed(2) + "B",
      sub: `~${(X.copies_estimate / 1e6).toFixed(1)}M copies · <a href="${X.sales_source}" target="_blank" rel="noopener">Sensor Tower via GameSpot</a>` },
    { label: "Metacritic", value: X.metacritic, sub: "Review embargo lifted 18 Nov" },
    { label: "Peak attention day", value: num(H.peak_views), sub: `Wikipedia views · ${fmtDate(H.peak_views_date, { day: "numeric", month: "short" })}` },
    { label: "Take-Two (TTWO)", value: "$" + H.ttwo_close.toFixed(2), sub: `<span class="${sign(H.ttwo_ytd)}">${pct(H.ttwo_ytd)}</span> in 2026 · close ${fmtDate(D.as_of, { day: "numeric", month: "short" })}` },
    { label: "Wanted level", value: `<span class="stars" aria-label="${H.stars_now} of 5 stars">${stars(H.stars_now)}</span>`,
      sub: `TTWO volatility ${(H.vol20_now * 100).toFixed(0)}% (20-day, yearly rate)` },
  ];
  document.getElementById("tiles").innerHTML = tiles.map((t) =>
    `<div class="tile"><div class="label">${t.label}</div><div class="value">${t.value}</div><div class="sub">${t.sub}</div></div>`).join("");

  /* ---------- findings ---------- */
  const ev = D.events;
  const trailers = ev.filter((e) => e.type === "trailer");
  const tAtt = trailers.filter((e) => e.att_x).map((e) => e.att_x);
  const delays = ev.filter((e) => e.type === "delay");
  const genie = ev.find((e) => e.key === "g1");
  const K = D.correlations;
  document.getElementById("findings").innerHTML = [
    { accent: C.hype, big: pct(D.by_type.trailer.avg_ar), what: "Average stock move on a trailer day",
      p: `Across ${trailers.length} big reveals, attention ran ${Math.min(...tAtt).toFixed(0)}–${Math.max(...tAtt).toFixed(0)}× normal, yet TTWO barely beat the market. Fans watched; investors had already priced it in.` },
    { accent: C.delay, big: pct(D.by_type.delay.avg_ar), what: "Average stock move on a delay day",
      p: `Both delays wiped about 8% off Take-Two in a day, against the market, on ${D.by_type.delay.avg_vol_x.toFixed(1)}× normal volume. Delays push cash further away, and the stock reacts to cash.` },
    { accent: C.stock, big: "r = " + K.surprise_vs_abn_volume.pearson.toFixed(2), what: "Hype vs trading volume, day by day",
      p: `On days with unusual attention, trading is unusually heavy. But hype says nothing about direction: daily attention vs daily return is r = ${K.changes_views_vs_return.pearson.toFixed(2)}.` },
  ].map((f) => `<div class="finding" style="--accent:${f.accent}"><div class="big">${f.big}</div><div class="what">${f.what}</div><p>${f.p}</p></div>`).join("");

  /* ---------- timeline: attention + price ---------- */
  const XMIN = "2023-12-01", XMAX = D.attention.date[D.attention.date.length - 1] > D.as_of ? D.attention.date[D.attention.date.length - 1] : D.as_of;
  const attnSeries = D.attention.date.map((d, i) => [d, D.attention.views[i]]);
  const attnMap = new Map(attnSeries);
  const pxIdx = D.series.date.findIndex((d) => d >= XMIN);
  const pxSeries = D.series.date.slice(pxIdx).map((d, i) => [d, D.series.close[pxIdx + i], D.series.volume[pxIdx + i], D.series.stars[pxIdx + i]]);
  const evByDate = new Map(ev.map((e) => [e.date, e]));

  const pins = ev.filter((e) => e.type !== "outside").map((e) => {
    // attention is calendar-day; use the reaction day, or the last available day
    let d = e.date;
    if (!attnMap.has(d)) d = D.attention.date[D.attention.date.length - 1];
    return { name: SHORT[e.key], coord: [d, attnMap.get(d)], itemStyle: { color: TYPE[e.type].color }, ev: e };
  }).filter((p) => p.coord[1]);

  const zoom = [{ type: "inside", filterMode: "none", zoomOnMouseWheel: "shift", moveOnMouseWheel: false }];

  const attn = mk("c-attn");
  attn.setOption({
    animationDuration: 600,
    textStyle: baseText,
    grid: { left: 56, right: 18, top: 34, bottom: 28 },
    tooltip: { ...tooltipBase, trigger: "axis", axisPointer: { type: "line", lineStyle: { color: C.muted } },
      formatter: (ps) => {
        const p = ps[0]; const e = evByDate.get(p.value[0]);
        return `<b>${fmtDate(p.value[0])}</b><br>${num(p.value[1])} views` + (e ? `<br><span style="color:${TYPE[e.type].color}">●</span> ${esc(e.title)}` : "");
      } },
    xAxis: { type: "time", min: XMIN, max: XMAX, ...axisCommon, splitLine: { show: false } },
    yAxis: { type: "log", min: 1000, ...axisCommon, axisLabel: { ...axisCommon.axisLabel, formatter: (x) => (x >= 1e6 ? x / 1e6 + "M" : x >= 1e3 ? x / 1e3 + "k" : x) } },
    dataZoom: zoom,
    series: [{
      type: "line", name: "Wikipedia views", data: attnSeries, showSymbol: false, sampling: "lttb",
      lineStyle: { width: 1.5, color: C.hype }, itemStyle: { color: C.hype },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "rgba(213,81,129,.28)" }, { offset: 1, color: "rgba(213,81,129,0)" }]) },
      markPoint: {
        symbol: "pin", symbolSize: 30,
        label: { show: true, formatter: "", },
        data: pins.map((p) => ({ name: p.name, coord: p.coord, itemStyle: { color: p.itemStyle.color, borderColor: C.surface, borderWidth: 2 } })),
        tooltip: { ...tooltipBase, trigger: "item", formatter: (p) => { const e = pins.find((x) => x.name === p.name).ev; return `<b>${esc(e.title)}</b><br>${fmtDate(e.date)}<br>TTWO vs market: ${pct(e.ar)}`; } },
      },
    }],
  });

  const price = mk("c-price");
  const evPts = ev.map((e) => {
    const row = pxSeries.find((r) => r[0] === e.date);
    return row ? { value: [e.date, row[1]], itemStyle: { color: TYPE[e.type].color, borderColor: C.surface, borderWidth: 2 }, ev: e } : null;
  }).filter(Boolean);
  price.setOption({
    animationDuration: 600,
    textStyle: baseText,
    grid: { left: 56, right: 18, top: 16, bottom: 28 },
    tooltip: { ...tooltipBase, trigger: "axis", axisPointer: { type: "line", lineStyle: { color: C.muted } },
      formatter: (ps) => {
        const p = ps.find((x) => x.seriesIndex === 0) || ps[0]; const r = p.data; const e = evByDate.get(r[0]);
        return `<b>${fmtDate(r[0])}</b><br>Close $${r[1].toFixed(2)} · ${(r[2] / 1e6).toFixed(1)}M shares<br>Wanted <span style="color:#ffd36b">${"★".repeat(r[3])}</span><span style="color:#3a2d52">${"★".repeat(5 - r[3])}</span>` +
          (e ? `<br><span style="color:${TYPE[e.type].color}">●</span> ${esc(e.title)}: ${pct(e.ar)} vs market` : "");
      } },
    xAxis: { type: "time", min: XMIN, max: XMAX, ...axisCommon, splitLine: { show: false } },
    yAxis: { type: "value", scale: true, ...axisCommon, axisLabel: { ...axisCommon.axisLabel, formatter: (x) => "$" + x } },
    dataZoom: zoom,
    series: [
      { type: "line", name: "TTWO close", data: pxSeries, showSymbol: false, lineStyle: { width: 2, color: C.stock }, itemStyle: { color: C.stock } },
      { type: "scatter", name: "Events", data: evPts, symbolSize: 11, z: 5, tooltip: { show: false } },
    ],
  });
  echarts.connect([attn, price]);

  const ranges = { all: [XMIN, XMAX], 2025: ["2025-01-01", "2025-12-31"], 2026: ["2026-01-01", XMAX], launch: ["2026-10-20", XMAX] };
  document.getElementById("ranges").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    document.querySelectorAll("#ranges button").forEach((x) => x.classList.toggle("on", x === b));
    const [s, t] = ranges[b.dataset.r];
    const t0 = +new Date(XMIN), t1 = +new Date(XMAX);
    const start = ((+new Date(s) - t0) / (t1 - t0)) * 100, end = Math.min(100, ((+new Date(t) - t0) / (t1 - t0)) * 100);
    [attn, price].forEach((c) => c.dispatchAction({ type: "dataZoom", start: Math.max(0, start), end }));
  });

  /* ---------- event study ---------- */
  const seen = new Set();
  document.getElementById("type-legend").innerHTML = Object.values(TYPE).filter((t) => !seen.has(t.label) && seen.add(t.label))
    .map((t) => `<span><i style="background:${t.color}"></i>${t.label}</span>`).join("");

  const evc = mk("c-events");
  const evRows = ev.slice();
  evc.setOption({
    animationDuration: 600,
    textStyle: baseText,
    grid: { left: 118, right: 54, top: 8, bottom: 28 },
    tooltip: { ...tooltipBase, trigger: "item", formatter: (p) => { const e = evRows[p.dataIndex];
      return `<b>${esc(e.title)}</b><br>${fmtDate(e.date)}<br>TTWO ${pct(e.ret)} · market ${pct(e.mkt)}<br>Abnormal ${pct(e.ar)} · volume ${e.vol_x}×`; } },
    xAxis: { type: "value", ...axisCommon, axisLabel: { ...axisCommon.axisLabel, formatter: (x) => (x > 0 ? "+" : "") + Math.round(x * 100) + "%" } },
    yAxis: { type: "category", inverse: true, data: evRows.map((e) => SHORT[e.key]), ...axisCommon, axisLine: { show: false },
      axisLabel: { color: C.text2, fontSize: 12 } },
    series: [{
      type: "bar", barWidth: 14,
      data: evRows.map((e) => ({ value: e.ar, itemStyle: { color: TYPE[e.type].color, borderRadius: e.ar >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4] },
        label: { position: e.ar >= 0 ? "right" : "left" } })),
      label: { show: true, color: C.text2, fontSize: 11,
        formatter: (p) => (Math.abs(p.value) >= 0.05 ? pct(p.value) : "") },
      markLine: { silent: true, symbol: "none", lineStyle: { color: C.muted, width: 1, type: "solid" }, label: { show: false }, data: [{ xAxis: 0 }] },
    }],
  });

  document.querySelector("#events-table tbody").innerHTML = ev.map((e) => `
    <tr>
      <td class="date">${fmtDate(e.date)}</td>
      <td><div class="t"><span class="chip" style="background:${TYPE[e.type].color}">${TYPE[e.type].label}</span>${esc(e.title)}</div>
          <div class="d">${esc(e.note)} <a href="${e.source}" target="_blank" rel="noopener">Source</a></div></td>
      <td class="n ${sign(e.ret)}">${pct(e.ret)}</td>
      <td class="n ${sign(e.ar)}"><b>${pct(e.ar)}</b></td>
      <td class="n">${e.vol_x.toFixed(1)}×</td>
      <td class="n">${e.att_x ? e.att_x.toFixed(1) + "×" : "–"}</td>
    </tr>`).join("");

  /* ---------- correlation lab ---------- */
  const trap = [
    { label: "Attention level vs price level", r: K.levels_views_vs_price, verdict: "Unreliable", color: C.muted,
      sub: `Spearman says ${K.levels_views_vs_price.spearman.toFixed(2)}, Pearson says ${K.levels_views_vs_price.pearson.toFixed(2)}. Two drifting series give whatever answer the trend gives.` },
    { label: "Daily attention change vs daily return", r: K.changes_views_vs_return, verdict: "No link", color: C.muted,
      sub: "More eyeballs today does not mean the stock goes up (or down) today." },
    { label: "Attention surprise vs volume surprise", r: K.surprise_vs_abn_volume, verdict: "The real link", color: C.hype, win: true,
      sub: `Still r = ${K.surprise_vs_abn_volume_ex_events.pearson.toFixed(2)} with every event day (±2 days) removed, so it's not just a few big days.` },
  ];
  document.getElementById("trap").innerHTML = trap.map((t) => `
    <div class="tile ${t.win ? "win" : ""}">
      <div class="label">${t.label}</div>
      <div class="value">r = ${t.r.pearson.toFixed(2)}</div>
      <div class="sub">${t.sub} n = ${num(t.r.n)} trading days.</div>
      <div class="verdict" style="color:${t.color}">${t.verdict}</div>
    </div>`).join("");

  const evSet = new Map(ev.map((e) => [e.date, e]));
  const normal = [], hot = [];
  D.scatter.forEach(([a, b, d]) => {
    const pt = [Math.exp(a), Math.exp(b), d];
    const e = evSet.get(d);
    if (e && e.type !== "outside") hot.push({ value: pt, name: SHORT[e.key], ev: e }); else normal.push(pt);
  });
  const sc = mk("c-scatter");
  sc.setOption({
    animationDuration: 600,
    textStyle: baseText,
    legend: { top: 0, right: 0, textStyle: { color: C.text2 }, itemWidth: 10, itemHeight: 10, data: ["Normal days", "GTA moments"] },
    grid: { left: 50, right: 20, top: 34, bottom: 46 },
    tooltip: { ...tooltipBase, trigger: "item", formatter: (p) => {
      const v = p.value; const e = p.data.ev;
      return `<b>${fmtDate(v[2])}</b>${e ? " · " + esc(e.title) : ""}<br>Attention ${v[0].toFixed(1)}× usual<br>Volume ${v[1].toFixed(1)}× usual`; } },
    xAxis: { type: "log", name: "Attention vs usual (×)", nameLocation: "middle", nameGap: 28, nameTextStyle: { color: C.muted }, ...axisCommon,
      min: 0.2, max: 40, axisLabel: { ...axisCommon.axisLabel, formatter: (x) => x + "×" } },
    yAxis: { type: "log", name: "Volume vs usual (×)", nameTextStyle: { color: C.muted, align: "left" }, ...axisCommon,
      min: 0.3, max: 10, axisLabel: { ...axisCommon.axisLabel, formatter: (x) => x + "×" } },
    series: [
      { name: "Normal days", type: "scatter", data: normal, symbolSize: 6, itemStyle: { color: C.neutral, opacity: 0.6 } },
      { name: "GTA moments", type: "scatter", data: hot, symbolSize: 11, z: 3,
        itemStyle: { color: C.hype, borderColor: C.surface, borderWidth: 2 },
        label: { show: true, formatter: (p) => p.name, position: "right", color: C.text, fontSize: 11 },
        labelLayout: { hideOverlap: true } },
    ],
  });

  const lags = K.lags;
  const best = lags.reduce((a, b) => (b.r > a.r ? b : a));
  const lag = mk("c-lag");
  lag.setOption({
    animationDuration: 600,
    textStyle: baseText,
    grid: { left: 44, right: 16, top: 16, bottom: 50 },
    tooltip: { ...tooltipBase, trigger: "item", formatter: (p) => { const k = lags[p.dataIndex].lag;
      const what = k === 0 ? "Attention and volume, same day" : k > 0 ? `Attention today vs volume ${k} day${k > 1 ? "s" : ""} later` : `Volume today vs attention ${-k} day${k < -1 ? "s" : ""} later`;
      return `${what}<br><b>r = ${p.value.toFixed(2)}</b>`; } },
    xAxis: { type: "category", data: lags.map((l) => (l.lag > 0 ? "+" : "") + l.lag), ...axisCommon,
      name: "← trading moves first        attention moves first →", nameLocation: "middle", nameGap: 32, nameTextStyle: { color: C.muted } },
    yAxis: { type: "value", min: 0, ...axisCommon, axisLabel: { ...axisCommon.axisLabel, formatter: (x) => x.toFixed(2) } },
    series: [{ type: "bar", barWidth: "56%",
      data: lags.map((l) => ({ value: l.r, itemStyle: { color: l.lag === best.lag ? C.hype : C.neutral, borderRadius: [4, 4, 0, 0] } })) }],
  });
  const lp = lags.find((l) => l.lag === 1).r, lm = lags.find((l) => l.lag === -1).r;
  document.getElementById("lag-note").textContent =
    `The peak is at ${best.lag === 0 ? "zero: attention and trading spike on the same day" : "lag " + best.lag}. ` +
    (lp > lm ? `Slightly stronger on the attention-first side (+1 day r = ${lp.toFixed(2)} vs −1 day r = ${lm.toFixed(2)}), but too small a gap to trade on.`
             : `Slightly stronger on the trading-first side (−1 day r = ${lm.toFixed(2)} vs +1 day r = ${lp.toFixed(2)}).`);

  /* ---------- Bangladesh ---------- */
  const T = D.trends;
  if (T && T.weekly) {
    const bd = mk("c-bd");
    const BD = C.delay, WORLD = "#a99cc0";
    bd.setOption({
      animationDuration: 600,
      textStyle: baseText,
      legend: { top: 0, right: 0, textStyle: { color: C.text2 }, itemWidth: 14, itemHeight: 3, data: ["Bangladesh", "World"] },
      grid: { left: 40, right: 16, top: 34, bottom: 28 },
      tooltip: { ...tooltipBase, trigger: "axis", axisPointer: { type: "line", lineStyle: { color: C.muted } },
        formatter: (ps) => `<b>Week of ${fmtDate(ps[0].value[0])}</b><br>` + ps.map((p) => `<span style="color:${p.color}">●</span> ${p.seriesName}: ${p.value[1]}`).join("<br>") },
      xAxis: { type: "time", ...axisCommon, splitLine: { show: false } },
      yAxis: { type: "value", min: 0, max: 100, ...axisCommon },
      series: [
        { name: "World", type: "line", showSymbol: false, data: T.weekly.map((w) => [w.date, w.world]), lineStyle: { width: 2, color: WORLD }, itemStyle: { color: WORLD } },
        { name: "Bangladesh", type: "line", showSymbol: false, data: T.weekly.map((w) => [w.date, w.bd]), lineStyle: { width: 2, color: BD }, itemStyle: { color: BD }, z: 3 },
      ],
    });

    const top = (T.countries_top || []).slice(0, 8);
    const sa = (T.south_asia || []).filter((c) => !top.find((t) => t.country === c.country));
    const rows = [...top, ...sa];
    const sac = mk("c-sa");
    sac.setOption({
      animationDuration: 600,
      textStyle: baseText,
      grid: { left: 128, right: 40, top: 8, bottom: 24 },
      tooltip: { ...tooltipBase, trigger: "item", formatter: (p) => `<b>#${rows[p.dataIndex].rank} ${esc(rows[p.dataIndex].country)}</b><br>Interest ${p.value}` },
      xAxis: { type: "value", max: 100, ...axisCommon },
      yAxis: { type: "category", inverse: true, data: rows.map((r) => `#${r.rank} ${r.country}`), ...axisCommon, axisLine: { show: false },
        axisLabel: { color: C.text2, fontSize: 12, formatter: (s) => (s.includes("Bangladesh") ? "{b|" + s + "}" : s), rich: { b: { color: BD, fontWeight: 700, fontSize: 12 } } } },
      series: [{ type: "bar", barWidth: 12,
        data: rows.map((r) => ({ value: r.interest, itemStyle: { color: r.country === "Bangladesh" ? BD : C.neutral, borderRadius: [0, 4, 4, 0] } })),
        label: { show: true, position: "right", color: C.text2, fontSize: 11, formatter: (p) => (rows[p.dataIndex].country === "Bangladesh" || p.dataIndex === 0 ? p.value : "") } }],
    });

    const echo = (T.bd_lag_weeks || []).find((l) => l.lag === 1);
    document.getElementById("bd-findings").innerHTML = [
      { accent: BD, big: `#${T.bd_rank} of ${T.countries_n}`, what: "Bangladesh in the world ranking",
        p: `Search interest of ${T.bd_interest} vs 100 for the UK, behind Pakistan, Sri Lanka and India. GTA VI is console-only at launch and most local gamers play on PC or mobile: a likely reason, though this data can't prove it.` },
      { accent: BD, big: "r = " + T.corr_changes.pearson.toFixed(2), what: "Dhaka hypes in sync with the world",
        p: `Week-to-week changes in Bangladesh track the world almost exactly, in the same week. A small echo follows a week later (r = ${echo ? echo.r.toFixed(2) : "–"}).` },
      (() => {
        const wk = (d) => T.weekly.find((w) => w.date <= d && d < new Date(+new Date(w.date) + 7 * 864e5).toISOString().slice(0, 10));
        const t1 = wk("2023-12-05"), t2 = wk("2025-05-06"), po = wk("2026-06-25");
        const x1 = (t1.bd / Math.max(1, t1.world)).toFixed(1), x2 = (t2.bd / Math.max(1, t2.world)).toFixed(1);
        return { accent: BD, big: `${x1}× / ${x2}×`, what: "Trailers hit harder in Bangladesh",
          p: `Against each country's own launch-week peak, Trailer 1 scored ${t1.bd} in Bangladesh vs ${t1.world} worldwide, and Trailer 2 ${t2.bd} vs ${t2.world}. ` +
             `Pre-order week went the other way (${po.bd} vs ${po.world}). Bangladesh watched the trailers; the world bought the game.` };
      })(),
    ].map((f) => `<div class="finding" style="--accent:${f.accent}"><div class="big">${f.big}</div><div class="what">${f.what}</div><p>${f.p}</p></div>`).join("");
  }

  document.getElementById("foot").innerHTML =
    `Market data to ${fmtDate(D.as_of)} · built ${esc(D.generated)} · Fan project, not affiliated with Rockstar Games or Take-Two Interactive. GTA and Grand Theft Auto are their trademarks. Not investment advice.`;
})();
