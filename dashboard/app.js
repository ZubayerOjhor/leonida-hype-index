/* GTA VI: Did it print money? - renders dashboard/data/hype.json as a plain-language story */
(async function () {
  const css = getComputedStyle(document.documentElement);
  const v = (n) => css.getPropertyValue(n).trim();
  const C = {
    hype: v("--hype"), stock: v("--stock"), delay: v("--delay"), neutral: v("--neutral"),
    text: v("--text"), text2: v("--text-2"), muted: v("--muted"), line: v("--line"), lineSoft: v("--line-soft"),
    surface: v("--surface"), surface2: v("--surface-2"), teal: v("--neon-teal"), gold: v("--gold"),
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
  const plainPct = (x, d = 1) => Math.abs(x * 100).toFixed(d) + "%";
  const num = (x) => x.toLocaleString("en-US");
  const bn = (x, d = 1) => "$" + x.toFixed(d) + "B";
  const fmtDate = (s, opt = { day: "numeric", month: "short", year: "numeric" }) =>
    new Date(s + "T00:00:00Z").toLocaleDateString("en-GB", { ...opt, timeZone: "UTC" });
  const stars = (n) => "★".repeat(n) + '<span class="off">' + "★".repeat(5 - n) + "</span>";
  const sign = (x) => (x > 0 ? "pos" : x < 0 ? "neg" : "");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const strength = (r) => { const a = Math.abs(r); return a < 0.1 ? "no link" : a < 0.3 ? "a weak link" : a < 0.5 ? "a moderate link" : "a strong link"; };

  const FONT = "Manrope, system-ui, sans-serif";
  const baseText = { color: C.text2, fontFamily: FONT, fontSize: 12 };
  const axisCommon = {
    axisLine: { lineStyle: { color: C.line } },
    axisTick: { show: false },
    axisLabel: { color: C.muted, fontSize: 11, hideOverlap: true },
    splitLine: { lineStyle: { color: C.lineSoft, type: "solid" } },
  };
  const tooltipBase = {
    backgroundColor: C.surface2, borderColor: C.line, borderWidth: 1, padding: [8, 10], confine: true,
    textStyle: { color: C.text, fontSize: 12, fontFamily: FONT },
    extraCssText: "border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.5);max-width:280px;white-space:normal;backdrop-filter:blur(8px);",
  };
  const charts = [];
  const mk = (id) => { const c = echarts.init(document.getElementById(id), null, { renderer: "canvas" }); charts.push(c); return c; };
  window.addEventListener("resize", () => charts.forEach((c) => c.resize()));
  const ev = D.events;
  const evByDate = new Map(ev.map((e) => [e.date, e]));
  const byKey = Object.fromEntries(ev.map((e) => [e.key, e]));
  const H = D.headline, X = D.external, F = D.forecast, K = D.correlations;
  const gta5Day1 = X.money_compare.find((m) => m.kind === "past").value;
  const investorBar = X.money_compare.find((m) => m.kind === "bar").value;
  const S = F.scenarios, last = (k) => S[k][S[k].length - 1];

  /* ---------- hero ---------- */
  const launch = new Date(D.launch_date + "T00:00:00Z");
  const today = new Date();
  const day = Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - launch) / 864e5) + 1;
  document.getElementById("mission-sub").textContent = day >= 1 ? `GTA VI is out · Day ${day} in Leonida` : `${1 - day} days to launch`;
  if (day < 1) document.querySelector(".mission-title").textContent = "Mission in progress";
  const xGta5 = X.sales_estimate_usd / 1e9 / gta5Day1;
  document.getElementById("hero-chips").innerHTML = [
    [bn(X.sales_estimate_usd / 1e9, 2), "on day one (estimate)"],
    [`${Math.round(xGta5)}×`, "GTA V's first day"],
    [`${(X.copies_estimate / 1e6).toFixed(1)}M`, "copies on day one"],
  ].map(([b, s]) => `<div class="hchip"><b>${b}</b><span>${s}</span></div>`).join("");
  document.getElementById("verdict-text").innerHTML =
    `Yes. About <b>${bn(X.sales_estimate_usd / 1e9, 2)}</b> on day one, ${Math.round(xGta5)} times GTA V and more than investors asked for.
     By 2035 it could make <b>${bn(last("low").cum_revenue_b, 0)}–${bn(last("high").cum_revenue_b, 0)}</b> from copies alone.
     The twist: Take-Two's shares barely moved. Investors had already bet on it.`;

  /* ---------- jump menu ---------- */
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
  const ICON = {
    money: '<path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    chart: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    siren: '<path d="M7 18v-6a5 5 0 0 1 10 0v6"/><path d="M4 18h16v3H4zM12 2v2M4.2 5.2l1.4 1.4M19.8 5.2l-1.4 1.4"/>',
  };
  const starText = ["calm", "calm", "normal", "lively", "jumpy", "wild"][H.stars_now];
  const tiles = [
    ["money", "gold", "Day-one sales", bn(X.sales_estimate_usd / 1e9, 2), `Estimate · <a href="${X.sales_source}" target="_blank" rel="noopener">${esc(X.sales_source_name)}</a>`],
    ["box", "pink", "Copies on day one", `${(X.copies_estimate / 1e6).toFixed(1)}M`, `GTA V sold 11.2M on its first day`],
    ["star", "violet", "Review score", `${X.metacritic}<small>/100</small>`, "Average of critics' reviews"],
    ["chart", "blue", "Take-Two share price", "$" + H.ttwo_close.toFixed(2), `<span class="${sign(H.ttwo_ytd)}">${pct(H.ttwo_ytd)}</span> since 1 Jan 2026`],
    ["siren", "teal", "Wanted level", `<span class="stars" aria-label="${H.stars_now} of 5 stars">${stars(H.stars_now)}</span>`,
      `<span class="term" tabindex="0" data-tip="How much Take-Two's share price is jumping around day to day (last 20 days), compared with the past three years. 5 stars = among the wildest 5% of days.">Share price is ${starText}</span> right now`],
  ];
  document.getElementById("tiles").innerHTML = tiles.map(([ic, col, label, value, sub]) =>
    `<div class="tile lift"><div class="tile-top"><span class="tile-ic ${col}" aria-hidden="true"><svg viewBox="0 0 24 24">${ICON[ic]}</svg></span>
      <div class="label">${label}</div></div><div class="value">${value}</div><div class="sub">${sub}</div></div>`).join("");

  /* ---------- the answer ---------- */
  const trailers = ev.filter((e) => e.type === "trailer");
  const tAtt = trailers.filter((e) => e.att_x).map((e) => e.att_x);
  const iT1 = D.series.date.indexOf(byKey.t1.date), iEnd = D.series.date.length - 1;
  const tt = D.series.close[iEnd] / D.series.close[iT1] - 1, mkt = D.series.spy[iEnd] / D.series.spy[iT1] - 1;
  document.getElementById("findings").innerHTML = [
    { accent: C.gold, big: bn(X.sales_estimate_usd / 1e9, 2), small: "day one",
      head: "Record money: yes",
      p: `${Math.round(xGta5)} times GTA V's first day and above the ~${bn(investorBar)} investors wanted. It earned back its reported $1B+ budget on day one.`,
      href: "#money" },
    { accent: C.hype, big: `${bn(last("low").cum_revenue_b, 0)}–${Math.round(last("high").cum_revenue_b)}B`, small: "by 2035",
      head: "And it keeps going",
      p: `If GTA VI sells like GTA V did after launch, copies alone bring in about ${bn(last("base").cum_revenue_b, 0)} by 2035 (middle path).`,
      href: "#forecast" },
    { accent: C.stock, big: pct(D.by_type.trailer.avg_ar), small: "on trailer days",
      head: "Investors didn't buy the hype",
      p: `Trailers brought ${Math.round(Math.min(...tAtt))}–${Math.round(Math.max(...tAtt))}× more readers, but the shares barely beat the market. Delays cost about 8% each.`,
      href: "#days" },
    { accent: C.teal, big: `${Math.round(tt * 100)}% vs ${Math.round(mkt * 100)}%`, small: "",
      head: "The shares lagged the market",
      p: `From Trailer 1 to launch, Take-Two rose ${Math.round(tt * 100)}%. The whole stock market rose ${Math.round(mkt * 100)}%. The success was already in the price.`,
      href: "#timeline" },
  ].map((f) => `<div class="finding lift" style="--accent:${f.accent}"><div class="big">${f.big}${f.small ? `<small>${f.small}</small>` : ""}</div>
      <div class="headline">${f.head}</div><p>${f.p}</p><a class="more" href="${f.href}">See the evidence →</a></div>`).join("");
  document.getElementById("takeaway").innerHTML =
    `<b>The lesson:</b> fans bought the game; investors had already bought the hype. Everyone <i>expected</i> GTA VI to make a fortune, so when it did,
     the share price had nothing new to react to. What moved the shares was news that <i>changed</i> the money: delays (down about 8%) and sales updates (up 8–15%).`;

  /* ---------- day one money ---------- */
  const mc = X.money_compare;
  const mcColor = (k) => (k === "gta6" ? C.hype : k === "bar" ? C.gold : C.neutral);
  const money = mk("c-money");
  money.setOption({
    animationDuration: 600, textStyle: baseText,
    grid: { left: 8, right: 56, top: 8, bottom: 24, containLabel: true },
    tooltip: { ...tooltipBase, trigger: "item", formatter: (p) => `<b>${esc(mc[p.dataIndex].label)}</b><br>$${mc[p.dataIndex].value.toFixed(2)} billion` + (mc[p.dataIndex].kind === "bar" ? "<br>Bank of America's bar for launch sales" : mc[p.dataIndex].kind === "other" ? "<br>Spider-Man: Brand New Day, whole cinema run" : "") },
    xAxis: { type: "value", ...axisCommon, axisLabel: { ...axisCommon.axisLabel, formatter: (x) => "$" + x + "B" } },
    yAxis: { type: "category", inverse: true, data: mc.map((m) => m.label), ...axisCommon, axisLine: { show: false },
      axisLabel: { color: C.text2, fontSize: 12 } },
    series: [{ type: "bar", barWidth: 16,
      data: mc.map((m) => ({ value: m.value, itemStyle: { color: mcColor(m.kind), borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: "right", color: C.text, fontSize: 12, fontWeight: 700, formatter: (p) => "$" + p.value.toFixed(2) + "B" } }],
  });
  document.getElementById("money-note").innerHTML =
    `Pink = GTA VI. The estimate grew in a day: ${bn(1.84, 2)} on launch day, ${bn(X.sales_estimate_usd / 1e9, 2)} the next morning, once day-one sales were counted.
     Niko Partners expects more than ${bn(X.niko_2026_b, 0)} by the end of 2026. Making the game reportedly cost over $1 billion.
     Sources: <a href="${X.sales_source}" target="_blank" rel="noopener">TBS / BBC</a>, <a href="${mc[1].source}" target="_blank" rel="noopener">BofA bar</a>, <a href="${mc[0].source}" target="_blank" rel="noopener">GTA V</a>.`;

  /* ---------- 2026-2035 scenarios ---------- */
  const SC = [
    ["low", "Low path", `${F.factors.low}× GTA V's after-launch sales`, "Record pre-orders pulled buyers forward, and it's on consoles only for now. Sales fade faster."],
    ["base", "Middle path", "Same as GTA V after launch", "It keeps selling the way GTA V did: a big first year, then a steady stream for a decade."],
    ["high", "High path", `${F.factors.high}× GTA V's after-launch sales`, "A bigger player base, a PC version and an online mode keep it selling harder than GTA V."],
  ];
  document.getElementById("scen").innerHTML = SC.map(([k, name, rule, why]) => `
    <div class="scen-card lift ${k === "base" ? "mid" : ""}">
      <span class="tag">${name}</span>
      <div class="total">${bn(last(k).cum_revenue_b, 1)}<small>by 2035</small></div>
      <div class="copies">${Math.round(last(k).cum_copies_m)} million copies · ${rule}</div>
      <p>${why}</p>
    </div>`).join("");
  const fc = mk("c-forecast");
  const yrs = F.years.map(String);
  fc.setOption({
    animationDuration: 600, textStyle: baseText,
    grid: { left: 48, right: 16, top: 24, bottom: 28 },
    tooltip: { ...tooltipBase, trigger: "axis", axisPointer: { type: "shadow" },
      formatter: (ps) => { const i = ps[0].dataIndex;
        return `<b>${yrs[i]}</b><br>Middle path: <b>${bn(S.base[i].revenue_b, 2)}</b><br>Range: ${bn(S.low[i].revenue_b, 2)} – ${bn(S.high[i].revenue_b, 2)}<br>${S.base[i].copies_m}M copies (middle)`; } },
    xAxis: { type: "category", data: yrs, ...axisCommon, axisLine: { lineStyle: { color: C.line } } },
    yAxis: { type: "value", ...axisCommon, axisLabel: { ...axisCommon.axisLabel, formatter: (x) => "$" + x + "B" } },
    series: [
      { type: "bar", name: "Middle path", barWidth: "46%", data: S.base.map((r) => r.revenue_b),
        itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "#ff7ab8" }, { offset: 1, color: C.hype }]), borderRadius: [5, 5, 0, 0] },
        label: { show: true, position: "insideBottom", distance: 10, color: "#1b0f00", fontSize: 12, fontWeight: 800, formatter: (p) => (p.dataIndex === 0 ? bn(p.value, 1) : "") } },
      { type: "custom", name: "Low to high", z: 5,
        renderItem: (params, api) => {
          const x = api.value(0), lo = api.coord([x, api.value(1)]), hi = api.coord([x, api.value(2)]);
          const w = api.size([1, 0])[0] * 0.18;
          const st = { stroke: C.gold, lineWidth: 2 };
          return { type: "group", children: [
            { type: "line", shape: { x1: lo[0], y1: lo[1], x2: hi[0], y2: hi[1] }, style: st },
            { type: "line", shape: { x1: lo[0] - w, y1: lo[1], x2: lo[0] + w, y2: lo[1] }, style: st },
            { type: "line", shape: { x1: hi[0] - w, y1: hi[1], x2: hi[0] + w, y2: hi[1] }, style: st },
          ] };
        },
        data: F.years.map((y, i) => [i, S.low[i].revenue_b, S.high[i].revenue_b]), tooltip: { show: false } },
    ],
  });
  document.querySelector("#fc-table tbody").innerHTML = F.years.map((y, i) => `
    <tr><td>${y}${y === 2026 ? " <span class='d'>(incl. day one)</span>" : ""}</td>
      <td class="n">${bn(S.low[i].revenue_b, 2)}</td><td class="n mid"><b>${bn(S.base[i].revenue_b, 2)}</b></td><td class="n">${bn(S.high[i].revenue_b, 2)}</td>
      <td class="n">${S.base[i].copies_m}M</td><td class="n">$${F.price_by_year[i]}</td></tr>`).join("") +
    `<tr><td><b>Total</b></td><td class="n"><b>${bn(last("low").cum_revenue_b, 1)}</b></td><td class="n mid"><b>${bn(last("base").cum_revenue_b, 1)}</b></td>
      <td class="n"><b>${bn(last("high").cum_revenue_b, 1)}</b></td><td class="n"><b>${Math.round(last("base").cum_copies_m)}M</b></td><td class="n"></td></tr>`;

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
      formatter: (ps) => { const p = ps[0]; const e = evByDate.get(p.value[0]);
        return `<b>${fmtDate(p.value[0])}</b><br>${num(p.value[1])} people read the page` + (e ? `<br><span style="color:${TYPE[e.type].color}">●</span> ${esc(e.title)}` : ""); } },
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
      formatter: (ps) => { const p = ps.find((x) => x.seriesIndex === 0) || ps[0]; const r = p.data; const e = evByDate.get(r[0]);
        return `<b>${fmtDate(r[0])}</b><br>Share price $${r[1].toFixed(2)}<br>${(r[2] / 1e6).toFixed(1)} million shares traded` +
          (e ? `<br><span style="color:${TYPE[e.type].color}">●</span> ${esc(e.title)}: <b>${pct(e.ar)}</b> vs the market` : ""); } },
    xAxis: { type: "time", min: XMIN, max: XMAX, ...axisCommon, splitLine: { show: false } },
    yAxis: { type: "value", scale: true, ...axisCommon, axisLabel: { ...axisCommon.axisLabel, formatter: (x) => "$" + x } },
    dataZoom: zoom,
    series: [
      { type: "line", name: "Take-Two", data: pxSeries, showSymbol: false, lineStyle: { width: 2, color: C.stock }, itemStyle: { color: C.stock } },
      { type: "scatter", name: "GTA moments", data: evPts, symbolSize: 11, z: 5, tooltip: { show: false } },
    ],
  });
  echarts.connect([attn, price]);
  document.getElementById("price-note").textContent =
    `From the first trailer to launch day, Take-Two's shares went from $${D.series.close[iT1].toFixed(0)} to $${D.series.close[iEnd].toFixed(0)} (${pct(tt, 0)}). ` +
    (tt < mkt ? `The whole market rose ${Math.round(mkt * 100)}% in the same time. Record-breaking hype, and Take-Two still did worse than simply owning the market.`
              : `The whole market went ${pct(mkt, 0)} in the same time.`);
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
    yAxis: { type: "category", inverse: true, data: ev.map((e) => SHORT[e.key]), ...axisCommon, axisLine: { show: false }, axisLabel: { color: C.text2, fontSize: 12 } },
    series: [{
      type: "bar", barWidth: 14,
      data: ev.map((e) => ({ value: e.ar, itemStyle: { color: TYPE[e.type].color, borderRadius: e.ar >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4] }, label: { position: e.ar >= 0 ? "right" : "left" } })),
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
  const BT = D.by_type;
  document.getElementById("qa").innerHTML = [
    ["When more people talk about GTA, does the share price go up?", "No", "no",
      "On days with extra interest, the price was just as likely to fall as to rise."],
    ["Do more people buy and sell the shares on those days?", "Yes", "yes",
      `On big GTA days, ${Math.round(Math.min(BT.trailer.avg_vol_x, BT.launch.avg_vol_x))}–${Math.round(BT.delay.avg_vol_x)} times more shares changed hands than on a normal day.`],
    ["So what does hype tell an investor?", "How busy", "so",
      "Hype tells you a lot of trading is coming. It can't tell you which way the price will go."],
  ].map(([q, a, cls, p]) => `<div class="qa-card lift"><div class="q">${q}</div><div class="a ${cls}">${a}</div><p>${p}</p></div>`).join("");
  const vol60 = D.series.volume.slice(-260).slice().sort((a, b) => a - b);
  document.getElementById("busy-normal").textContent = (vol60[Math.floor(vol60.length / 2)] / 1e6).toFixed(1);
  const busyRows = [
    ["A normal day", 1, C.neutral],
    ["Trailer days", BT.trailer.avg_vol_x, C.hype],
    ["Reviews and launch", BT.launch.avg_vol_x, C.hype],
    ["Money news days", BT.business.avg_vol_x, C.stock],
    ["Delay days", BT.delay.avg_vol_x, C.delay],
  ];
  const busy = mk("c-busy");
  busy.setOption({
    animationDuration: 600, textStyle: baseText,
    grid: { left: 8, right: 48, top: 8, bottom: 24, containLabel: true },
    tooltip: { ...tooltipBase, trigger: "item", formatter: (p) => `<b>${busyRows[p.dataIndex][0]}</b><br>${p.value.toFixed(1)}× the shares of a normal day` },
    xAxis: { type: "value", ...axisCommon, axisLabel: { ...axisCommon.axisLabel, formatter: (x) => x + "×" } },
    yAxis: { type: "category", inverse: true, data: busyRows.map((r) => r[0]), ...axisCommon, axisLine: { show: false }, axisLabel: { color: C.text2, fontSize: 12 } },
    series: [{ type: "bar", barWidth: 16,
      data: busyRows.map((r) => ({ value: +r[1].toFixed(2), itemStyle: { color: r[2], borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: "right", color: C.text, fontSize: 12, fontWeight: 700, formatter: (p) => p.value.toFixed(1) + "×" } }],
  });

  /* ---------- Bangladesh ---------- */
  const T = D.trends;
  if (T && T.weekly) {
    const BD = C.delay, WORLD = "#a99cc0";
    const wk = (d) => T.weekly.find((w) => w.date <= d && d < new Date(+new Date(w.date) + 7 * 864e5).toISOString().slice(0, 10));
    const launchWk = T.weekly.reduce((a, b) => (b.world > a.world ? b : a));
    const moments = [["Trailer 1", wk("2023-12-05")], ["Trailer 2", wk("2025-05-06")], ["Pre-orders", wk("2026-06-25")], ["Launch week", launchWk]];
    const bdc = mk("c-bd");
    bdc.setOption({
      animationDuration: 600, textStyle: baseText,
      legend: { top: 0, right: 0, textStyle: { color: C.text2 }, itemWidth: 12, itemHeight: 12, data: ["Bangladesh", "World"] },
      grid: { left: 8, right: 12, top: 36, bottom: 24, containLabel: true },
      tooltip: { ...tooltipBase, trigger: "axis", axisPointer: { type: "shadow" },
        formatter: (ps) => `<b>${ps[0].name}</b><br>` + ps.map((p) => `<span style="color:${p.color}">●</span> ${p.seriesName}: ${p.value} (launch week = 100)`).join("<br>") },
      xAxis: { type: "category", data: moments.map((m) => m[0]), ...axisCommon, axisLabel: { color: C.text2, fontSize: 12 } },
      yAxis: { type: "value", max: 100, ...axisCommon },
      series: [
        { name: "Bangladesh", type: "bar", barGap: "12%", barWidth: "30%", data: moments.map((m) => m[1].bd),
          itemStyle: { color: BD, borderRadius: [4, 4, 0, 0] }, label: { show: true, position: "top", color: C.text, fontSize: 11, fontWeight: 700 } },
        { name: "World", type: "bar", barWidth: "30%", data: moments.map((m) => m[1].world),
          itemStyle: { color: WORLD, borderRadius: [4, 4, 0, 0] }, label: { show: true, position: "top", color: C.text2, fontSize: 11 } },
      ],
    });
    const t1 = moments[0][1], t2 = moments[1][1], po = moments[2][1];
    document.getElementById("bd-note").innerHTML =
      `Read it like this: Trailer 1 got ${t1.bd} in Bangladesh but only ${t1.world} worldwide, compared with each one's launch week.
       Bangladesh got excited by trailers far more than the world did, but the world searched more when it was time to order.`;

    const top = (T.countries_top || []).slice(0, 5);
    const sa = (T.south_asia || []).filter((c) => !top.find((t) => t.country === c.country));
    const rows = [...top, ...sa];
    const sac = mk("c-sa");
    sac.setOption({
      animationDuration: 600, textStyle: baseText,
      grid: { left: 8, right: 40, top: 8, bottom: 24, containLabel: true },
      tooltip: { ...tooltipBase, trigger: "item", formatter: (p) => `<b>#${rows[p.dataIndex].rank} ${esc(rows[p.dataIndex].country)}</b><br>${p.value} searches for every 100 in ${esc(rows[0].country)}` },
      xAxis: { type: "value", max: 100, ...axisCommon },
      yAxis: { type: "category", inverse: true, data: rows.map((r) => `#${r.rank} ${r.country}`), ...axisCommon, axisLine: { show: false },
        axisLabel: { color: C.text2, fontSize: 12, formatter: (s) => (s.includes("Bangladesh") ? "{b|" + s + "}" : s), rich: { b: { color: BD, fontWeight: 700, fontSize: 12 } } } },
      series: [{ type: "bar", barWidth: 14,
        data: rows.map((r) => ({ value: r.interest, itemStyle: { color: r.country === "Bangladesh" ? BD : C.neutral, borderRadius: [0, 4, 4, 0] } })),
        label: { show: true, position: "right", color: C.text2, fontSize: 11 } }],
    });
    document.getElementById("sa-note").textContent =
      `For every 100 searches in ${rows[0].country}, Bangladesh made about ${T.bd_interest}. That's #${T.bd_rank} of ${T.countries_n} countries, behind Pakistan, Sri Lanka and India.`;
    document.getElementById("bd-findings").innerHTML = [
      { big: `#${T.bd_rank}`, head: `of ${T.countries_n} countries`,
        p: "Bangladesh searched GTA 6 far less than Europe or the US. GTA VI launched on consoles only, and most gamers here play on PC or mobile: a likely reason, though this data can't prove it." },
      { big: `${(t1.bd / Math.max(1, t1.world)).toFixed(1)}×`, head: "Trailer 1 hit harder here",
        p: `Compared with launch week, Trailer 1 was ${(t1.bd / Math.max(1, t1.world)).toFixed(1)} times bigger in Bangladesh than worldwide, and Trailer 2 ${(t2.bd / Math.max(1, t2.world)).toFixed(1)} times.` },
      { big: "Same week", head: "Dhaka got excited when the world did",
        p: `The ups and downs in Bangladesh matched the world week by week (${strength(T.corr_changes.pearson)}). But pre-order week was smaller here (${po.bd} vs ${po.world}).` },
    ].map((f) => `<div class="finding lift" style="--accent:${BD}"><div class="big">${f.big}</div><div class="headline">${f.head}</div><p>${f.p}</p></div>`).join("");
  }

  /* ---------- nerd stats ---------- */
  const nrows = [
    ["Attention level vs price level", K.levels_views_vs_price],
    ["Daily attention change vs daily return", K.changes_views_vs_return],
    ["Attention surprise vs volume surprise", K.surprise_vs_abn_volume],
    ["…same, event days (±2) removed", K.surprise_vs_abn_volume_ex_events],
    ["Attention surprise vs size of move (|return|)", K.surprise_vs_abs_return],
  ];
  const lagBest = K.lags.reduce((a, b) => (b.r > a.r ? b : a));
  document.getElementById("nerd-stats").innerHTML = `<table><thead><tr><th>Pair</th><th>Pearson r</th><th>Spearman ρ</th><th>n days</th></tr></thead><tbody>` +
    nrows.map(([n, c]) => `<tr><td>${n}</td><td class="n">${c.pearson.toFixed(3)}</td><td class="n">${c.spearman.toFixed(3)}</td><td class="n">${c.n}</td></tr>`).join("") +
    `</tbody></table><p>Lead/lag: strongest correlation at lag ${lagBest.lag} (r = ${lagBest.r.toFixed(2)}); +1 day ${K.lags.find((l) => l.lag === 1).r.toFixed(2)}, −1 day ${K.lags.find((l) => l.lag === -1).r.toFixed(2)}.</p>`;

  document.getElementById("foot").innerHTML =
    `Data to ${fmtDate(D.as_of)} · updated ${esc(D.generated)} UTC · Fan project, not linked to Rockstar Games or Take-Two Interactive. GTA and Grand Theft Auto are their trademarks. Not investment advice.`;
})();
