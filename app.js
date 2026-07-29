// UEX Corp SC Widget — fetches live Star Citizen economy data from the UEX Corp API (v2.0)
// and rotates between three panels: commodity price ticker, best trade route, ship price.
//
// UEX API responses vary slightly by endpoint/version. Every "get*" field lookup below tries
// several likely field names so small schema differences don't just show a blank panel. If a
// panel ever shows "no data", open this page directly in a browser tab (not inside OBS) and
// check the console — each fetch logs its raw response for troubleshooting.

const CONFIG = window.UEX_WIDGET_CONFIG;
const BASE_URL = "https://api.uexcorp.space/2.0";
const PANELS = ["commodityTicker", "tradeRoute", "shipPrice"];

let panelIndex = 0;
let cache = { commodityTicker: null, tradeRoute: null, shipPrice: null };

function pick(row, ...keys) {
  for (const key of keys) {
    if (row && row[key] !== undefined && row[key] !== null) return row[key];
  }
  return undefined;
}

async function uexFetch(path, params = {}) {
  const url = new URL(BASE_URL + path);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) url.searchParams.set(key, value);
  }

  const headers = {};
  if (CONFIG.apiKey) headers["Authorization"] = `Bearer ${CONFIG.apiKey}`;

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);

  const json = await res.json();
  console.log(`[uex-widget] ${path}`, json);

  const rows = Array.isArray(json) ? json : json.data;
  if (!Array.isArray(rows)) throw new Error(`${path} → unexpected response shape`);
  return rows;
}

async function fetchCommodityTicker() {
  const rows = await uexFetch("/commodities_prices");
  const limit = CONFIG.commodityTicker?.limit ?? 5;

  const seen = new Set();
  const top = [];
  for (const row of rows.sort((a, b) => (pick(b, "price_sell", "sell_price", "price") ?? 0) - (pick(a, "price_sell", "sell_price", "price") ?? 0))) {
    const name = pick(row, "commodity_name", "name");
    if (!name || seen.has(name)) continue;
    seen.add(name);
    top.push({
      name,
      terminal: pick(row, "terminal_name", "terminal"),
      priceSell: pick(row, "price_sell", "sell_price", "price"),
    });
    if (top.length >= limit) break;
  }
  return top;
}

async function fetchBestTradeRoute() {
  const params = {};
  if (CONFIG.tradeRoute?.originTerminalId) params.id_terminal_origin = CONFIG.tradeRoute.originTerminalId;
  if (CONFIG.tradeRoute?.commodityId) params.id_commodity = CONFIG.tradeRoute.commodityId;

  const rows = await uexFetch("/commodities_routes", params);
  if (!rows.length) return null;

  const best = rows.reduce((a, b) => ((pick(b, "profit", "profit_total") ?? 0) > (pick(a, "profit", "profit_total") ?? 0) ? b : a));
  return {
    commodity: pick(best, "commodity_name", "commodity"),
    origin: pick(best, "origin_terminal_name", "terminal_name_origin", "origin"),
    destination: pick(best, "destination_terminal_name", "terminal_name_destination", "destination"),
    profit: pick(best, "profit", "profit_total"),
    scu: pick(best, "scu", "cargo_scu"),
  };
}

async function fetchShipPrice() {
  const shipName = CONFIG.ship?.name;
  if (!shipName) return null;

  const rows = await uexFetch("/vehicles_purchases_prices", { vehicle_name: shipName });
  const matches = rows.filter((row) => (pick(row, "vehicle_name", "ship_name", "name") ?? "").toLowerCase() === shipName.toLowerCase());
  const list = matches.length ? matches : rows;
  if (!list.length) return null;

  const cheapest = list.reduce((a, b) => ((pick(b, "price_buy", "buy_price", "price") ?? Infinity) < (pick(a, "price_buy", "buy_price", "price") ?? Infinity) ? b : a));
  return {
    name: pick(cheapest, "vehicle_name", "ship_name", "name") ?? shipName,
    terminal: pick(cheapest, "terminal_name", "terminal"),
    priceBuy: pick(cheapest, "price_buy", "buy_price", "price"),
  };
}

function formatAUEC(value) {
  if (value === undefined || value === null) return "—";
  return Number(value).toLocaleString("en-US") + " aUEC";
}

function render(panel, data, error) {
  const title = document.getElementById("panel-title");
  const body = document.getElementById("panel-body");

  if (error) {
    title.textContent = "UEX DATA";
    body.innerHTML = `<div class="error">Data unavailable — ${error.message}</div>`;
    return;
  }

  if (panel === "commodityTicker") {
    title.textContent = "TOP COMMODITY PRICES";
    if (!data || !data.length) {
      body.innerHTML = `<div class="error">No commodity data</div>`;
      return;
    }
    body.innerHTML = `<ol class="ticker">${data
      .map((c) => `<li><span class="name">${c.name}</span><span class="terminal">${c.terminal ?? ""}</span><span class="price">${formatAUEC(c.priceSell)}</span></li>`)
      .join("")}</ol>`;
  } else if (panel === "tradeRoute") {
    title.textContent = "BEST TRADE ROUTE";
    if (!data) {
      body.innerHTML = `<div class="error">No route data</div>`;
      return;
    }
    body.innerHTML = `
      <div class="route">
        <div class="route-commodity">${data.commodity ?? "Unknown commodity"}</div>
        <div class="route-path"><span>${data.origin ?? "?"}</span><span class="arrow">→</span><span>${data.destination ?? "?"}</span></div>
        <div class="route-profit">${formatAUEC(data.profit)}${data.scu ? ` / ${data.scu} SCU` : ""}</div>
      </div>`;
  } else if (panel === "shipPrice") {
    title.textContent = "SHIP PRICE";
    if (!data) {
      body.innerHTML = `<div class="error">No price found for "${CONFIG.ship?.name ?? "ship"}"</div>`;
      return;
    }
    body.innerHTML = `
      <div class="ship">
        <div class="ship-name">${data.name}</div>
        <div class="ship-terminal">${data.terminal ?? ""}</div>
        <div class="ship-price">${formatAUEC(data.priceBuy)}</div>
      </div>`;
  }
}

async function refreshAll() {
  const fetchers = { commodityTicker: fetchCommodityTicker, tradeRoute: fetchBestTradeRoute, shipPrice: fetchShipPrice };
  for (const panel of PANELS) {
    try {
      cache[panel] = { data: await fetchers[panel](), error: null };
    } catch (err) {
      console.error(`[uex-widget] ${panel} failed`, err);
      cache[panel] = { data: null, error: err };
    }
  }
  document.getElementById("updated-at").textContent = `Updated ${new Date().toLocaleTimeString()}`;
  renderCurrentPanel();
}

function renderCurrentPanel() {
  const panel = PANELS[panelIndex];
  const entry = cache[panel];
  if (!entry) {
    render(panel, null, null);
    return;
  }
  render(panel, entry.data, entry.error);
}

function rotatePanel() {
  panelIndex = (panelIndex + 1) % PANELS.length;
  renderCurrentPanel();
}

refreshAll();
setInterval(refreshAll, (CONFIG.refreshMinutes ?? 5) * 60 * 1000);
setInterval(rotatePanel, (CONFIG.rotationSeconds ?? 12) * 1000);
