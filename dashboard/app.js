/* Leonida Hype Index - renders dashboard/data/hype.json as a plain-language story */
(async function () {
  const css = getComputedStyle(document.documentElement);
  const v = (n) => css.getPropertyValue(n).trim();
  const C = {
    hype: v("--hype"), stock: v("--stock"), delay: v("--delay"), neutral: v("--neutral"),
    text: v("--text"), text2: v("--text-2"), muted: v("--muted"), line: v("--line"), lineSoft: v("--line-soft"),
    surface: v("--surface"), surface2: v("--surface-2"), teal: v("--neon-teal"),
  };
  const TYPE = {
    trailer:  { label: "Hype moment", color: C.hype },
    launch:   { label: "Hype moment", color: C.hype },
    delay:    { label: "Delay", color: C.delay },
    business: { label: "Money news", color: C.stock },
    outside:  { label: "Not GTA (for comparison)", color: C.neutral },
  };
  const SHORT = { t1: "Trailer 1", e1: "Date kept", d1: "Delay #1", t2: "Trailer 2", d2: "Delay #2",
    g1: "Google AI scare", p1: "Pre-orders open", t3: "Trailer 3", e2: "Pre-orders beat", r1: "Reviews 99/100", l1: "Launch day" };

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
  const strength = (r) => { const a = Math.abs(r); return a < 0.1 ? "No link" : a < 0.3 ? "Weak link" : a < 0.5 ? "Moderate link" : "Strong link"; };

  const baseText = { color: C.text2, fontFamily: "Manrope, system-ui, sans-serif", fontSize: 12 };
  const axisCommon = {
    axisLine: { lineStyle: { color: C.line } },
    axisTick: { show: false },
    axisLabel: { color: C.muted, fontSize: 11, hideOverlap: true },
    splitLine: { lineStyle: { color: C.lineSoft, type: "solid" } },
  };
  const tooltipBase = {
    backgroundColor: C.surface2, borderColor: C.line, borderWidth: 1, padding: [8, 10], confine: true,
    textStyle: { color: C.text, fontSize: 12, fontFamily: "Manrope, system-ui, sans-serif" },
    extraCssText: "border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.5);max-width:280px;white-space:normal;backdrop-filter:blur(8px);",
  };
  const charts = [];
  const mk = (id) => { const c = echarts.init(document.getElementById(id), null, { renderer: "canvas" }); charts.push(c); return c; };
  window.addEventListener("resize", () => charts.forEach((c) => c.resize()));
  const ev = D.events;
  const evByDate = new Map(ev.map((e) => [e.date, e]));
  const byKey = Object.fromEntries(ev.map((e) => [e.key, e]));

  /* ---------- hero ---------- */
  const launch = new Date(D.launch_date + "T00:00:00Z");
  const today = new Date();
  const day = Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - launch) / 864e5) + 1;
  document.getElementById("mission-sub").textContent =
    day >= 1 ? `GTA VI is out · Day ${day} in Leonida` : `${1 - day} days to launch`;
  if (day < 1) document.querySelector(".mission-title").textContent = "Mission in progress";

  /* ---------- jump menu: highlight the section on screen ---------- */
  const links = [...document.querySelectorAll("#jump a:not(.brand)")];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + en.target.id));
      const on = links.find((a) => a.classList.contains("on"));
      if (on) on.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  links.forEach((a) => { const s = document.querySelector(a.getAttribute("href")); if (s) io.observe(s); });

  /* ---------- tiles ---------- */
  const H = D.headline, X = D.external;
  const starText = ["calm", "calm", "normal", "lively", "jumpy", "wild"][H.stars_now];
  const tiles = [
    { label: "Estimated sales by launch", value: "$" + (X.sales_estimate_usd / 1e9).toFixed(2) + "B",
      sub: `About ${(X.copies_estimate / 1e6).toFixed(0)} million copies (<a href="${X.sales_source}" target="_blank" rel="noopener">estimate</a>)` },
    { label: "Review score", value: X.metacritic + "<small>/100</small>", sub: "Average of critics' reviews" },
    { label: "Busiest day of interest", value: num(H.peak_views), sub: `People read the GTA VI Wikipedia page · ${fmtDate(H.peak_views_date, { day: "numeric", month: "short" })}` },
    { label: "Take-Two share price", value: "$" + H.ttwo_close.toFixed(2), sub: `<span class="${sign(H.ttwo_ytd)}">${pct(H.ttwo_ytd)}</span> since 1 Jan 2026` },
    { label: "Wanted level", value: `<span class="stars" aria-label="${H.stars_now} of 5 stars">${stars(H.stars_now)}</span>`,
      sub: `<span class="term" tabindex="0" data-tip="How much Take-Two's share price is jumping around day to day (last 20 days), compared with the past three years. 5 stars = among the wildest 5% of days.">Share price is ${starText}</span> right now` },
  ];
  const ICON = {
    money: '<path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    eye: '<path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/>',
    chart: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    siren: '<path d="M7 18v-6a5 5 0 0 1 10 0v6"/><path d="M4 18h16v3H4zM12 2v2M4.2 5.2l1.4 1.4M19.8 5.2l-1.4 1.4"/>',
  };
  const tileMeta = [["money", "gold"], ["star", "violet"], ["eye", "pink"], ["chart", "blue"], ["siren", "teal"]];
  document.getElementById("tiles").innerHTML = tiles.map((t, i) =>
    `<div class="tile lift"><div class="tile-top"><span class="tile-ic ${tileMeta[i][1]}" aria-hidden="true"><svg viewBox="0 0 24 24">${ICON[tileMeta[i][0]]}</svg></span>
      <div class="label">${t.label}</div></div><div class="value">${t.value}</div><div class="sub">${t.sub}</div></div>`).join("");

  /* ---------- the answer ---------- */
  const trailers = ev.filter((e) => e.type === "trailer");
  const tAtt = trailers.filter((e) => e.att_x).map((e) => e.att_x);
  const K = D.correlations;
  const r1 = byKey.r1, l1 = byKey.l1, e1 = byKey.e1;
  document.getElementById("findings").innerHTML = [
    { accent: C.hype, big: `${Math.round(Math.min(...tAtt))}–${Math.round(Math.max(...tAtt))}×`, small: "more readers",
      head: "Trailers: fans went wild, investors shrugged",
      p: `On trailer days, ${Math.round(Math.min(...tAtt))} to ${Math.round(Math.max(...tAtt))} times more people than usual read about GTA VI. Take-Two's shares did only ${pct(D.by_type.trailer.avg_ar).replace("+", "")} better than the market, on average.`,
      href: "#days" },
    { accent: C.delay, big: pct(D.by_type.delay.avg_ar, 0), small: "per delay",
      head: "Delays hurt, fast",
      p: "Each of the two delays knocked about 8% off Take-Two's shares in a single day, beyond what the market did. The second one wiped roughly $3 billion off the company's value.",
      href: "#days" },
    { accent: C.stock, big: pct(l1.ar), small: "on launch day",
      head: "Reviews mattered more than release day",
      p: `A 99/100 review score lifted the shares ${pct(r1.ar).replace("+", "")} the day before. On launch day, with the most interest ever, they slipped ${pct(l1.ar).replace("−", "")} as investors took their profits.`,
      href: "#timeline" },
    { accent: C.teal, big: "Busy ✓ Up ✗", small: "",
      head: "Hype makes the market busy, not happy",
      p: "When interest in GTA jumps, far more shares change hands than usual. But hype can't tell you whether the price will go up or down.",
      href: "#busy" },
  ].map((f) => `<div class="finding lift" style="--accent:${f.accent}"><div class="big">${f.big}${f.small ? `<small>${f.small}</small>` : ""}</div>
      <div class="headline">${f.head}</div><p>${f.p}</p><a class="more" href="${f.href}">See the evidence →</a></div>`).join("");
  const iT1 = D.series.date.indexOf(byKey.t1.date), iEnd = D.series.date.length - 1;
  const tt = D.series.close[iEnd] / D.series.close[iT1] - 1, mkt = D.series.spy[iEnd] / D.series.spy[iT1] - 1;
  document.getElementById("takeaway").innerHTML =
    `<b>The lesson:</b> investors don't buy excitement. They buy money: <i>when</i> it arrives (delays push it back) and <i>how much</i> there will be (pre-orders, reviews).
     The biggest one-day jump of all, ${pct(e1.ar)}, came from a dull results day where Take-Two simply said the game was still on schedule.
     Zoom out and it's even clearer: from Trailer 1 to launch day, Take-Two's shares rose ${Math.round(tt * 100)}%, while the whole market rose ${Math.round(mkt * 100)}%.`;

  /* ---------- legends ---------- */
  const seen = new Set();
  const legendHTML = Object.values(TYPE).filter((t) => !seen.has(t.label) && seen.add(t.label))
    .map((t) => `<span><i style="background:${t.color}"></i>${t.label}</span>`).join("");
  document.getElementById("type-legend-1").innerHTML = legendHTML;
  document.getElementById("type-legend-2").innerHTML = legendHTML;

  /* ---------- timeline: hype + price ---------- */
  const lastAttn = D.attention.date[D.attention.date.length - 1];
  const XMIN = "2023-12-01", XMAX = lastAttn > D.as_of ? lastAttn : D.as_of;
  const attnSeries = D.attention.date.map((d, i) => [d, D.attention.views[i]]);
  const attnMap = new Map(attnSeries);
  const pxIdx = D.series.date.findIndex((d) => d >= XMIN);
  const pxSeries = D.series.date.slice(pxIdx).map((d, i) => [d, D.series.close[pxIdx + i], D.series.volume[pxIdx + i], D.series.stars[pxIdx + i]]);

  const pins = ev.filter((e) => e.type !== "outside").map((e) => {
    const d = attnMap.has(e.date) ? e.date : lastAttn;
    return { name: SHORT[e.key], coord: [d, attnMap.get(d)], color: TYPE[e.type].color, ev: e };
  }).filter((p) => p.coord[1]);
  const zoom = [{ type: "inside", filterMode: "none", zoomOnMouseWheel: "shift", moveOnMouseWheel: false }];
  const fmtK = (x) => (x >= 1e6 ? x / 1e6 + "M" : x >= 1e3 ? x / 1e3 + "k" : x);

  const attn = mk("c-attn");
  attn.setOption({
    animationDuration: 600, textStyle: baseText,
    grid: { left: 52, right: 18, top: 34, bottom: 28 },
    tooltip: { ...tooltipBase, trigger: "axis", axisPointer: { type: "line", lineStyle: { color: C.muted } },
      formatter: (ps) => {
        const p = ps[0]; const e = evByDate.get(p.value[0]);
        return `<b>${fmtDate(p.value[0])}</b><br>${num(p.value[1])} people read the page` + (e ? `<br><span style="color:${TYPE[e.type].color}">●</span> ${esc(e.title)}` : "");
      } },
    xAxis: { type: "time", min: XMIN, max: XMAX, ...axisCommon, splitLine: { show: false } },
    yAxis: { type: "log", min: 1000, ...axisCommon, axisLabel: { ...axisCommon.axisLabel, formatter: fmtK } },
    dataZoom: zoom,
    series: [{
      type: "line", name: "Readers", data: attnSeries, showSymbol: false, sampling: "lttb",
      lineStyle: { width: 1.5, color: C.hype }, itemStyle: { color: C.hype },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "rgba(213,81,129,.28)" }, { offset: 1, color: "rgba(213,81,129,0)" }]) },
      markPoint: {
        symbol: "pin", symbolSize: 30, label: { show: false },
        data: pins.map((p) => ({ name: p.name, coord: p.coord, itemStyle: { color: p.color, borderColor: C.surface, borderWidth: 2 } })),
        tooltip: { ...tooltipBase, trigger: "item", formatter: (p) => { const e = pins.find((x) => x.name === p.name).ev;
          return `<b>${esc(e.title)}</b><br>${fmtDate(e.date)}<br>${esc(e.note)}<br>Shares vs the market: <b>${pct(e.ar)}</b>`; } },
      },
    }],
  });

  const price = mk("c-price");
  const evPts = ev.map((e) => {
    const row = pxSeries.find((r) => r[0] === e.date);
    return row ? { value: [e.date, row[1]], itemStyle: { color: TYPE[e.type].color, borderColor: C.surface, borderWidth: 2 }, ev: e } : null;
  }).filter(Boolean);
  price.setOption({
    animationDuration: 600, textStyle: baseText,
    grid: { left: 52, right: 18, top: 16, bottom: 28 },
    tooltip: { ...tooltipBase, trigger: "axis", axisPointer: { type: "line", lineStyle: { color: C.muted } },
      formatter: (ps) => {
        const p = ps.find((x) => x.seriesIndex === 0) || ps[0]; const r = p.data; const e = evByDate.get(r[0]);
        return `<b>${fmtDate(r[0])}</b><br>Share price $${r[1].toFixed(2)}<br>${(r[2] / 1e6).toFixed(1)} million shares traded` +
          (e ? `<br><span style="color:${TYPE[e.type].color}">●</span> ${esc(e.title)}: <b>${pct(e.ar)}</b> vs the market` : "");
      } },
    xAxis: { type: "time", min: XMIN, max: XMAX, ...axisCommon, splitLine: { show: false } },
    yAxis: { type: "value", scale: true, ...axisCommon, axisLabel: { ...axisCommon.axisLabel, formatter: (x) => "$" + x } },
    dataZoom: zoom,
    series: [
      { type: "line", name: "Take-Two", data: pxSeries, showSymbol: false, lineStyle: { width: 2, color: C.stock }, itemStyle: { color: C.stock } },
      { type: "scatter", name: "GTA moments", data: evPts, symbolSize: 11, z: 5, tooltip: { show: false } },
    ],
  });
  echarts.connect([attn, price]);

  // plain summary under the price chart
  const i0 = D.series.date.indexOf(byKey.t1.date), iN = D.series.date.length - 1;
  const ttwoChg = D.series.close[iN] / D.series.close[i0] - 1, spyChg = D.series.spy[iN] / D.series.spy[i0] - 1;
  document.getElementById("price-note").textContent =
    `From the first trailer to launch day, Take-Two's shares went from $${D.series.close[i0].toFixed(0)} to $${D.series.close[iN].toFixed(0)} (${pct(ttwoChg, 0)}). ` +
    (ttwoChg < spyChg
      ? `The whole market rose ${Math.round(spyChg * 100)}% in the same time. Three years of record-breaking hype, and Take-Two still did worse than simply owning the market.`
      : `The whole market went ${pct(spyChg, 0)} in the same time, so Take-Two did ${pct(ttwoChg - spyChg, 0)} better.`);

  const ranges = { all: [XMIN, XMAX], 2025: ["2025-01-01", "2025-12-31"], 2026: ["2026-01-01", XMAX], launch: ["2026-10-20", XMAX] };
  document.getElementById("ranges").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    document.querySelectorAll("#ranges button").forEach((x) => x.classList.toggle("on", x === b));
    const [s, t] = ranges[b.dataset.r];
    const t0 = +new Date(XMIN), t1 = +new Date(XMAX);
    const start = ((+new Date(s) - t0) / (t1 - t0)) * 100, end = Math.min(100, ((+new Date(t) - t0) / (t1 - t0)) * 100);
    [attn, price].forEach((c) => c.dispatchAction({ type: "dataZoom", start: Math.max(0, start), end }));
  });

  /* ---------- every GTA day ---------- */
  const evc = mk("c-events");
  evc.setOption({
    animationDuration: 600, textStyle: baseText,
    grid: { left: 118, right: 56, top: 8, bottom: 28 },
    tooltip: { ...tooltipBase, trigger: "item", formatter: (p) => { const e = ev[p.dataIndex];
      return `<b>${esc(e.title)}</b> · ${fmtDate(e.date)}<br>Take-Two: ${pct(e.ret)}<br>Whole market: ${pct(e.mkt)}<br>Take-Two vs the market: <b>${pct(e.ar)}</b><br>Trading: ${e.vol_x.toFixed(1)}× a normal day`; } },
    xAxis: { type: "value", ...axisCommon, axisLabel: { ...axisCommon.axisLabel, formatter: (x) => (x > 0 ? "+" : "") + Math.round(x * 100) + "%" } },
    yAxis: { type: "category", inverse: true, data: ev.map((e) => SHORT[e.key]), ...axisCommon, axisLine: { show: false },
      axisLabel: { color: C.text2, fontSize: 12 } },
    series: [{
      type: "bar", barWidth: 14,
      data: ev.map((e) => ({ value: e.ar, itemStyle: { color: TYPE[e.type].color, borderRadius: e.ar >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4] },
        label: { position: e.ar >= 0 ? "right" : "left" } })),
      label: { show: true, color: C.text2, fontSize: 11, formatter: (p) => (Math.abs(p.value) >= 0.05 ? pct(p.value) : "") },
      markLine: { silent: true, symbol: "none", lineStyle: { color: C.muted, width: 1, type: "solid" }, label: { show: false }, data: [{ xAxis: 0 }] },
    }],
  });

  document.querySelector("#events-table tbody").innerHTML = ev.map((e) => `
    <tr>
      <td class="date">${fmtDate(e.date)}</td>
      <td><div class="t"><span class="chip" style="background:${TYPE[e.type].color};color:${e.type === "outside" ? "#fff" : "#0d0718"}">${TYPE[e.type].label}</span>${esc(e.title)}</div>
          <div class="d">${esc(e.note)} <a href="${e.source}" target="_blank" rel="noopener">Source</a></div></td>
      <td class="n ${sign(e.ret)}">${pct(e.ret)}</td>
      <td class="n ${sign(e.ar)}"><b>${pct(e.ar)}</b></td>
      <td class="n">${e.vol_x.toFixed(1)}×</td>
      <td class="n">${e.att_x ? e.att_x.toFixed(1) + "×" : "–"}</td>
    </tr>`).join("");

  /* ---------- busy, not up ---------- */
  const meters = [
    { q: "More interest → shares go up?", r: K.changes_views_vs_return, color: C.neutral, verdict: strength(K.changes_views_vs_return.pearson),
      p: "On days when more people read about GTA, the shares were just as likely to fall as to rise.",
      rtxt: `r = ${K.changes_views_vs_return.pearson.toFixed(2)} over ${num(K.changes_views_vs_return.n)} days` },
    { q: "More interest → more trading?", r: K.surprise_vs_abn_volume, color: C.hype, win: true, verdict: strength(K.surprise_vs_abn_volume.pearson),
      p: `Busy hype days are busy trading days. The link is still there with every big GTA day taken out (r = ${K.surprise_vs_abn_volume_ex_events.pearson.toFixed(2)}).`,
      rtxt: `r = ${K.surprise_vs_abn_volume.pearson.toFixed(2)} over ${num(K.surprise_vs_abn_volume.n)} days` },
    { q: "Just compare the two lines?", r: K.levels_views_vs_price, color: C.delay, verdict: "Misleading",
      p: `Both rose over three years, so they can look related. Two standard ways of measuring give ${K.levels_views_vs_price.pearson.toFixed(2)} and ${K.levels_views_vs_price.spearman.toFixed(2)}: when the answer depends on the method, don't trust it.`,
      rtxt: `r = ${K.levels_views_vs_price.pearson.toFixed(2)} or ${K.levels_views_vs_price.spearman.toFixed(2)}, depending on the method` },
  ];
  document.getElementById("meters").innerHTML = meters.map((m) => {
    const w = Math.min(1, Math.abs(m.verdict === "Misleading" ? m.r.spearman : m.r.pearson) / 0.6) * 100;
    return `<div class="meter lift ${m.win ? "win" : ""}">
      <div class="q">${m.q}</div>
      <div class="verdict2" style="color:${m.win ? C.hype : C.text}">${m.verdict}</div>
      <div class="bar" role="img" aria-label="${m.verdict}"><i style="width:${Math.max(w, 2)}%;background:${m.color}"></i></div>
      <div class="scale"><span>None</span><span>Weak</span><span>Moderate</span><span>Strong</span></div>
      <p>${m.p}</p><div class="r">${m.rtxt}</div></div>`;
  }).join("");

  const normal = [], hot = [];
  D.scatter.forEach(([a, b, d]) => {
    const pt = [Math.exp(a), Math.exp(b), d];
    const e = evByDate.get(d);
    if (e && e.type !== "outside") hot.push({ value: pt, name: SHORT[e.key], ev: e }); else normal.push(pt);
  });
  const sc = mk("c-scatter");
  sc.setOption({
    animationDuration: 600, textStyle: baseText,
    legend: { top: 0, right: 0, textStyle: { color: C.text2 }, itemWidth: 10, itemHeight: 10, data: ["Ordinary days", "Big GTA days"] },
    grid: { left: 50, right: 72, top: 34, bottom: 46 },
    tooltip: { ...tooltipBase, trigger: "item", formatter: (p) => {
      const v = p.value; const e = p.data.ev;
      return `<b>${fmtDate(v[2])}</b>${e ? " · " + esc(e.title) : ""}<br>Interest: ${v[0].toFixed(1)}× a normal day<br>Trading: ${v[1].toFixed(1)}× a normal day`; } },
    xAxis: { type: "log", name: "Interest vs a normal day", nameLocation: "middle", nameGap: 28, nameTextStyle: { color: C.muted }, ...axisCommon,
      min: 0.2, max: 40, axisLabel: { ...axisCommon.axisLabel, formatter: (x) => x + "×" } },
    yAxis: { type: "log", name: "Trading vs a normal day", nameTextStyle: { color: C.muted, align: "left" }, ...axisCommon,
      min: 0.3, max: 10, axisLabel: { ...axisCommon.axisLabel, formatter: (x) => x + "×" } },
    series: [
      { name: "Ordinary days", type: "scatter", data: normal, symbolSize: 6, itemStyle: { color: C.neutral, opacity: 0.6 } },
      { name: "Big GTA days", type: "scatter", data: hot, symbolSize: 11, z: 3,
        itemStyle: { color: C.hype, borderColor: C.surface, borderWidth: 2 },
        label: { show: true, formatter: (p) => p.name, position: "right", color: C.text, fontSize: 11 },
        labelLayout: { hideOverlap: true } },
    ],
  });

  const lags = K.lags;
  const best = lags.reduce((a, b) => (b.r > a.r ? b : a));
  const lag = mk("c-lag");
  lag.setOption({
    animationDuration: 600, textStyle: baseText,
    grid: { left: 44, right: 16, top: 40, bottom: 62 },
    tooltip: { ...tooltipBase, trigger: "item", formatter: (p) => { const k = lags[p.dataIndex].lag;
      const what = k === 0 ? "Hype and trading on the same day" : k > 0 ? `Hype today vs trading ${k} day${k > 1 ? "s" : ""} later` : `Trading today vs hype ${-k} day${k < -1 ? "s" : ""} later`;
      return `${what}<br>Link strength: <b>${p.value.toFixed(2)}</b> (${strength(p.value).toLowerCase()})`; } },
    xAxis: { type: "category", data: lags.map((l) => (l.lag > 0 ? "+" : "") + l.lag), ...axisCommon,
      axisLabel: { ...axisCommon.axisLabel, interval: 0, hideOverlap: false, formatter: (s) => (s === "0" ? "0\nsame day" : s) },
      name: "← trading moves first     days     hype moves first →", nameLocation: "middle", nameGap: 44, nameTextStyle: { color: C.muted } },
    yAxis: { type: "value", min: 0, name: "link strength (r)", nameTextStyle: { color: C.muted, align: "left" }, ...axisCommon,
      axisLabel: { ...axisCommon.axisLabel, formatter: (x) => x.toFixed(2) } },
    series: [{ type: "bar", barWidth: "56%",
      data: lags.map((l) => ({ value: l.r, itemStyle: { color: l.lag === best.lag ? C.hype : C.neutral, borderRadius: [4, 4, 0, 0] } })) }],
  });
  const lp = lags.find((l) => l.lag === 1).r, lm = lags.find((l) => l.lag === -1).r;
  document.getElementById("lag-note").textContent = best.lag === 0
    ? `The tallest bar is "same day": hype and trading spike together. ${lp > lm ? "Hype is very slightly ahead of trading (by a day)" : "Trading is very slightly ahead of hype (by a day)"}, but the difference is too small to matter.`
    : `The strongest link is at ${best.lag} days.`;

  /* ---------- Bangladesh ---------- */
  const T = D.trends;
  if (T && T.weekly) {
    const BD = C.delay, WORLD = "#a99cc0";
    const bd = mk("c-bd");
    bd.setOption({
      animationDuration: 600, textStyle: baseText,
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
      animationDuration: 600, textStyle: baseText,
      grid: { left: 128, right: 40, top: 8, bottom: 24 },
      tooltip: { ...tooltipBase, trigger: "item", formatter: (p) => `<b>#${rows[p.dataIndex].rank} ${esc(rows[p.dataIndex].country)}</b><br>${p.value} searches for every 100 in the top country` },
      xAxis: { type: "value", max: 100, ...axisCommon },
      yAxis: { type: "category", inverse: true, data: rows.map((r) => `#${r.rank} ${r.country}`), ...axisCommon, axisLine: { show: false },
        axisLabel: { color: C.text2, fontSize: 12, formatter: (s) => (s.includes("Bangladesh") ? "{b|" + s + "}" : s), rich: { b: { color: BD, fontWeight: 700, fontSize: 12 } } } },
      series: [{ type: "bar", barWidth: 12,
        data: rows.map((r) => ({ value: r.interest, itemStyle: { color: r.country === "Bangladesh" ? BD : C.neutral, borderRadius: [0, 4, 4, 0] } })),
        label: { show: true, position: "right", color: C.text2, fontSize: 11, formatter: (p) => (rows[p.dataIndex].country === "Bangladesh" || p.dataIndex === 0 ? p.value : "") } }],
    });

    const wk = (d) => T.weekly.find((w) => w.date <= d && d < new Date(+new Date(w.date) + 7 * 864e5).toISOString().slice(0, 10));
    const t1 = wk("2023-12-05"), t2 = wk("2025-05-06"), po = wk("2026-06-25");
    const x1 = t1.bd / Math.max(1, t1.world), x2 = t2.bd / Math.max(1, t2.world);
    const echo = (T.bd_lag_weeks || []).find((l) => l.lag === 1);
    const topName = (T.countries_top || [{}])[0].country || "the top country";
    const aheadList = (T.south_asia || []).filter((c) => c.country !== "Bangladesh" && c.rank < T.bd_rank).map((c) => c.country);
    const ahead = aheadList.length ? aheadList.join(", ").replace(/, ([^,]*)$/, " and $1") : "most of the world";
    document.getElementById("bd-findings").innerHTML = [
      { big: `#${T.bd_rank} of ${T.countries_n}`, head: "Bangladesh in the world ranking",
        p: `For every 100 searches in the top country (${topName}), Bangladesh had about ${T.bd_interest}. That puts it behind ${ahead}. GTA VI launched on consoles only, and most gamers here play on PC or mobile: a likely reason, though this data can't prove it.` },
      { big: "Same week", head: "Dhaka got excited when the world did",
        p: `Week by week, the ups and downs in Bangladesh closely matched the rest of the world (a ${strength(T.corr_changes.pearson).toLowerCase()}, r = ${T.corr_changes.pearson.toFixed(2)}). A small echo followed a week later.` },
      { big: `${x1.toFixed(1)}× / ${x2.toFixed(1)}×`, head: "Trailers hit harder in Bangladesh",
        p: `Compared with launch week, Trailer 1 got ${t1.bd} here vs ${t1.world} worldwide, and Trailer 2 got ${t2.bd} vs ${t2.world}. Pre-order week went the other way (${po.bd} vs ${po.world}). Bangladesh watched the trailers; the world bought the game.` },
    ].map((f) => `<div class="finding lift" style="--accent:${BD}"><div class="big">${f.big}</div><div class="headline">${f.head}</div><p>${f.p}</p></div>`).join("");
    void echo;
  }

  /* ---------- nerd stats ---------- */
  const rows = [
    ["Attention level vs price level", K.levels_views_vs_price],
    ["Daily attention change vs daily return", K.changes_views_vs_return],
    ["Attention surprise vs volume surprise", K.surprise_vs_abn_volume],
    ["…same, event days (±2) removed", K.surprise_vs_abn_volume_ex_events],
    ["Attention surprise vs size of move (|return|)", K.surprise_vs_abs_return],
  ];
  document.getElementById("nerd-stats").innerHTML = `<table><thead><tr><th>Pair</th><th>Pearson r</th><th>Spearman ρ</th><th>n days</th></tr></thead><tbody>` +
    rows.map(([n, c]) => `<tr><td>${n}</td><td class="n">${c.pearson.toFixed(3)}</td><td class="n">${c.spearman.toFixed(3)}</td><td class="n">${c.n}</td></tr>`).join("") +
    `</tbody></table>`;

  document.getElementById("foot").innerHTML =
    `Data to ${fmtDate(D.as_of)} · updated ${esc(D.generated)} UTC · Fan project, not linked to Rockstar Games or Take-Two Interactive. GTA and Grand Theft Auto are their trademarks. Not investment advice.`;
})();
