// ── 設定 ────────────────────────────────────────────────────────
const API = '/api/quote'; // Vercel serverless proxy

const CATS = {
  tw_stock: { label: '台股', cur: 'TWD', color: '#378ADD', badge: 'btw' },
  us_stock: { label: '美股', cur: 'USD', color: '#639922', badge: 'bus' },
  uk_stock: { label: '英股', cur: 'GBP', color: '#BA7517', badge: 'buk' },
  tw_fund:  { label: '台灣基金', cur: 'TWD', color: '#7F77DD', badge: 'bfund' },
  twd_cash: { label: '台幣現金', cur: 'TWD', color: '#888780', badge: '' },
  usd_cash: { label: '美元現金', cur: 'USD', color: '#1D9E75', badge: 'bus' },
  crypto:   { label: '加密貨幣', cur: 'USD', color: '#D85A30', badge: 'bcrypto' },
};

const TYPE_GROUPS = {
  股票: { types: ['tw_stock', 'us_stock', 'uk_stock'], color: '#378ADD' },
  基金: { types: ['tw_fund'], color: '#7F77DD' },
  現金: { types: ['twd_cash', 'usd_cash'], color: '#888780' },
  加密貨幣: { types: ['crypto'], color: '#D85A30' },
};

const SECURITIES = [
  { sym: 'VT',    name: 'Vanguard Total World Stock ETF', type: 'us_stock' },
  { sym: 'VTI',   name: 'Vanguard Total Stock Market ETF', type: 'us_stock' },
  { sym: 'VXUS',  name: 'Vanguard Total International Stock ETF', type: 'us_stock' },
  { sym: 'VOO',   name: 'Vanguard S&P 500 ETF', type: 'us_stock' },
  { sym: 'VEA',   name: 'Vanguard FTSE Developed Markets ETF', type: 'us_stock' },
  { sym: 'VWO',   name: 'Vanguard FTSE Emerging Markets ETF', type: 'us_stock' },
  { sym: 'BND',   name: 'Vanguard Total Bond Market ETF', type: 'us_stock' },
  { sym: 'BNDX',  name: 'Vanguard Total International Bond ETF', type: 'us_stock' },
  { sym: 'QQQ',   name: 'Invesco QQQ Trust (Nasdaq 100)', type: 'us_stock' },
  { sym: 'SPY',   name: 'SPDR S&P 500 ETF Trust', type: 'us_stock' },
  { sym: 'IVV',   name: 'iShares Core S&P 500 ETF', type: 'us_stock' },
  { sym: 'AGG',   name: 'iShares Core US Aggregate Bond ETF', type: 'us_stock' },
  { sym: 'GLD',   name: 'SPDR Gold Shares', type: 'us_stock' },
  { sym: 'SCHD',  name: 'Schwab US Dividend Equity ETF', type: 'us_stock' },
  { sym: 'ARKK',  name: 'ARK Innovation ETF', type: 'us_stock' },
  { sym: 'AAPL',  name: 'Apple Inc.', type: 'us_stock' },
  { sym: 'MSFT',  name: 'Microsoft Corporation', type: 'us_stock' },
  { sym: 'NVDA',  name: 'NVIDIA Corporation', type: 'us_stock' },
  { sym: 'GOOGL', name: 'Alphabet Inc.', type: 'us_stock' },
  { sym: 'AMZN',  name: 'Amazon.com Inc.', type: 'us_stock' },
  { sym: 'META',  name: 'Meta Platforms Inc.', type: 'us_stock' },
  { sym: 'TSLA',  name: 'Tesla Inc.', type: 'us_stock' },
  { sym: 'NFLX',  name: 'Netflix Inc.', type: 'us_stock' },
  { sym: 'BRKB',  name: 'Berkshire Hathaway Inc. Class B', type: 'us_stock' },
  { sym: 'VWRA',  name: 'Vanguard FTSE All-World UCITS ETF', type: 'uk_stock' },
  { sym: 'VUSA',  name: 'Vanguard S&P 500 UCITS ETF', type: 'uk_stock' },
  { sym: 'VFEM',  name: 'Vanguard FTSE Emerging Markets UCITS ETF', type: 'uk_stock' },
  { sym: 'VHYL',  name: 'Vanguard FTSE All-World High Dividend Yield UCITS ETF', type: 'uk_stock' },
  { sym: 'HSBC',  name: 'HSBC Holdings plc', type: 'uk_stock' },
  { sym: 'BP',    name: 'BP plc', type: 'uk_stock' },
  { sym: 'SHEL',  name: 'Shell plc', type: 'uk_stock' },
  { sym: '2330',  name: '台積電', type: 'tw_stock' },
  { sym: '2317',  name: '鴻海精密', type: 'tw_stock' },
  { sym: '2454',  name: '聯發科技', type: 'tw_stock' },
  { sym: '2882',  name: '國泰金控', type: 'tw_stock' },
  { sym: '2881',  name: '富邦金控', type: 'tw_stock' },
  { sym: '2412',  name: '中華電信', type: 'tw_stock' },
  { sym: '0050',  name: '元大台灣50', type: 'tw_stock' },
  { sym: '0056',  name: '元大高股息', type: 'tw_stock' },
  { sym: '006208',name: '富邦台灣50', type: 'tw_stock' },
  { sym: '00878', name: '國泰永續高股息', type: 'tw_stock' },
  { sym: 'BTC',   name: 'Bitcoin', type: 'crypto' },
  { sym: 'ETH',   name: 'Ethereum', type: 'crypto' },
  { sym: 'SOL',   name: 'Solana', type: 'crypto' },
  { sym: 'BNB',   name: 'BNB', type: 'crypto' },
  { sym: 'XRP',   name: 'XRP', type: 'crypto' },
  { sym: 'ADA',   name: 'Cardano', type: 'crypto' },
  { sym: 'DOGE',  name: 'Dogecoin', type: 'crypto' },
  { sym: 'AVAX',  name: 'Avalanche', type: 'crypto' },
];

const CRYPTO_IDS = {
  BTC:'bitcoin', ETH:'ethereum', SOL:'solana', BNB:'binancecoin',
  XRP:'ripple', ADA:'cardano', DOGE:'dogecoin', AVAX:'avalanche-2',
  DOT:'polkadot', LINK:'chainlink', UNI:'uniswap', MATIC:'matic-network',
};

// ── State ────────────────────────────────────────────────────────
let profile = 'me', chartPeriod = '1M', dim = 'detail', selType = null;
let trendChart = null, donutChart = null, fetching = false;
let names = { me: '我', wife: '太太' };
let assets = [];
let fx = { usd: { rate: 32.0, prev: 32.0 }, gbp: { rate: 40.5, prev: 40.5 } };
let editIndex = -1, acTimer = null;

// ── Helpers ──────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];
const PCT = v => (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
const CLS = v => v >= 0 ? 'pos' : 'neg';
const fmtTWD = v => { const a = Math.abs(Math.round(v)); return (v < 0 ? '-' : '') + 'TWD ' + a.toLocaleString(); };
const fmtCur = (v, c) => {
  if (c === 'TWD') return fmtTWD(v);
  if (c === 'USD') return (v < 0 ? '-' : '') + 'USD ' + Math.abs(v).toFixed(2);
  if (c === 'GBP') return (v < 0 ? '-' : '') + 'GBP ' + Math.abs(v).toFixed(2);
  return String(v);
};
const toTWD = (v, c) => c === 'USD' ? v * fx.usd.rate : c === 'GBP' ? v * fx.gbp.rate : v;

// ── Storage ──────────────────────────────────────────────────────
function saveData() {
  localStorage.setItem('family_assets', JSON.stringify(assets));
  localStorage.setItem('family_names', JSON.stringify(names));
}
function loadData() {
  try {
    const a = localStorage.getItem('family_assets');
    const n = localStorage.getItem('family_names');
    if (a) assets = JSON.parse(a);
    if (n) names = JSON.parse(n);
    document.getElementById('lbl-me').textContent = names.me + '的資產';
    document.getElementById('lbl-wife').textContent = names.wife + '的資產';
    document.getElementById('rn-me').value = names.me;
    document.getElementById('rn-wife').value = names.wife;
  } catch(e) { console.warn(e); }
}

// ── API via proxy ────────────────────────────────────────────────
async function proxyQuote(symbol) {
  const r = await fetch(API + '?type=quote&symbol=' + encodeURIComponent(symbol));
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d;
}

async function proxySearch(q) {
  const r = await fetch(API + '?type=search&symbol=' + encodeURIComponent(q));
  const d = await r.json();
  return (d.result || []).filter(x => ['Common Stock','ETP','ETF'].includes(x.type)).slice(0, 8);
}

async function proxyCrypto(ids) {
  const r = await fetch(API + '?type=crypto&ids=' + encodeURIComponent(ids));
  return await r.json();
}

async function proxyFX(from, to, date) {
  let url = API + '?type=fx&from=' + from + '&to=' + to;
  if (date) url += '&date=' + date;
  const r = await fetch(url);
  return await r.json();
}

async function twStockQuote(ticker) {
  for (const suf of [':TSE', ':TWSE', '.TW']) {
    try {
      const d = await proxyQuote(ticker + suf);
      return d;
    } catch {}
  }
  throw new Error('TW fail');
}

async function fetchFX() {
  const today = await proxyFX('USD', 'TWD,GBP');
  const usdTWD = today.rates?.TWD || fx.usd.rate;
  const usdGBP = today.rates?.GBP || (fx.usd.rate / fx.gbp.rate);
  const gbpTWD = usdTWD / usdGBP;
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  try {
    const prev = await proxyFX('USD', 'TWD,GBP', yesterday.toISOString().split('T')[0]);
    const pUsdTWD = prev.rates?.TWD || usdTWD;
    const pGbpTWD = pUsdTWD / (prev.rates?.GBP || usdGBP);
    fx = { usd: { rate: usdTWD, prev: pUsdTWD }, gbp: { rate: gbpTWD, prev: pGbpTWD } };
  } catch {
    fx = { usd: { rate: usdTWD, prev: usdTWD }, gbp: { rate: gbpTWD, prev: gbpTWD } };
  }
}

// ── Fetch all prices ─────────────────────────────────────────────
async function fetchAll() {
  if (fetching) return;
  fetching = true;
  const btn = document.getElementById('refresh-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"><i class="ti ti-loader-2"></i></span> 查詢中…';

  try { await fetchFX(); updateFxBar(); } catch(e) { console.warn('FX fail', e); }

  for (const a of assets.filter(x => ['tw_stock','tw_fund'].includes(x.type))) {
    try { const q = await twStockQuote(a.ticker); a.prevPrice = q.prevClose; a.price = q.price; a.priceSource = 'live'; }
    catch { a.priceSource = 'error'; }
  }
  for (const a of assets.filter(x => x.type === 'uk_stock')) {
    try { const q = await proxyQuote(a.ticker + ':LSE'); a.prevPrice = q.prevClose; a.price = q.price; a.priceSource = 'live'; }
    catch { a.priceSource = 'error'; }
  }
  for (const a of assets.filter(x => x.type === 'us_stock')) {
    try { const q = await proxyQuote(a.ticker); a.prevPrice = q.prevClose; a.price = q.price; a.priceSource = 'live'; }
    catch { a.priceSource = 'error'; }
  }
  // Crypto - batch call
  const cryptoAssets = assets.filter(x => x.type === 'crypto');
  if (cryptoAssets.length) {
    try {
      const ids = cryptoAssets.map(a => CRYPTO_IDS[a.ticker.toUpperCase()] || a.ticker.toLowerCase()).join(',');
      const d = await proxyCrypto(ids);
      cryptoAssets.forEach(a => {
        const id = CRYPTO_IDS[a.ticker.toUpperCase()] || a.ticker.toLowerCase();
        if (d[id]) {
          a.price = d[id].usd;
          const chg = d[id].usd_24h_change || 0;
          a.prevPrice = a.price / (1 + chg / 100);
          a.priceSource = 'live';
        }
      });
    } catch { cryptoAssets.forEach(a => a.priceSource = 'error'); }
  }

  saveData();
  const now = new Date();
  document.getElementById('last-upd').textContent = '更新於 ' + now.getHours() + ':' + String(now.getMinutes()).padStart(2,'0');
  fetching = false;
  btn.disabled = false;
  btn.innerHTML = '<i class="ti ti-refresh"></i> 更新報價';
  renderAll();
}

function updateFxBar() {
  const uChg = fx.usd.prev ? (fx.usd.rate - fx.usd.prev) / fx.usd.prev * 100 : 0;
  const gChg = fx.gbp.prev ? (fx.gbp.rate - fx.gbp.prev) / fx.gbp.prev * 100 : 0;
  document.getElementById('r-usd').textContent = fx.usd.rate.toFixed(3);
  document.getElementById('rc-usd').textContent = (uChg >= 0 ? '+' : '') + uChg.toFixed(2) + '%';
  document.getElementById('rc-usd').className = CLS(uChg);
  document.getElementById('r-gbp').textContent = fx.gbp.rate.toFixed(3);
  document.getElementById('rc-gbp').textContent = (gChg >= 0 ? '+' : '') + gChg.toFixed(2) + '%';
  document.getElementById('rc-gbp').className = CLS(gChg);
}

// ── Autocomplete ─────────────────────────────────────────────────
function onTickerInput() {
  clearTimeout(acTimer);
  const q = document.getElementById('f-ticker').value.trim();
  if (!q) { hideAC(); return; }
  const kw = q.toLowerCase();
  const local = SECURITIES.filter(s => s.sym.toLowerCase().includes(kw) || s.name.toLowerCase().includes(kw)).slice(0, 6);
  showAC(local);
  acTimer = setTimeout(async () => {
    try {
      const remote = await proxySearch(q);
      const remoteItems = remote.map(x => ({ sym: x.symbol, name: x.description, type: guessType(x.symbol) }));
      const merged = [...local];
      remoteItems.forEach(r => { if (!merged.find(m => m.sym === r.sym)) merged.push(r); });
      showAC(merged.slice(0, 8));
    } catch {}
  }, 500);
}

function guessType(sym) {
  if (sym.endsWith('.TW') || sym.endsWith(':TSE')) return 'tw_stock';
  if (sym.endsWith('.L') || sym.endsWith(':LSE')) return 'uk_stock';
  return 'us_stock';
}

function showAC(items) {
  const dd = document.getElementById('ac-dropdown');
  if (!items.length) { dd.style.display = 'none'; return; }
  dd.innerHTML = items.map(s =>
    '<div class="ac-item" onclick="selectTicker(\'' + s.sym + '\',\'' + s.name.replace(/'/g,"\\'") + '\',\'' + s.type + '\')">' +
    '<span class="ac-sym">' + s.sym + '</span><span class="ac-name">' + s.name + '</span></div>'
  ).join('');
  dd.style.display = 'block';
}

async function selectTicker(sym, name, type) {
  document.getElementById('f-ticker').value = sym;
  document.getElementById('f-name').value = name;
  hideAC();
  const statusEl = document.getElementById('price-status');
  const priceEl = document.getElementById('f-price');
  statusEl.textContent = '查詢即時報價…'; statusEl.className = 'price-status price-loading';
  try {
    let q;
    if (selType === 'tw_stock' || selType === 'tw_fund') q = await twStockQuote(sym);
    else if (selType === 'uk_stock') q = await proxyQuote(sym + ':LSE');
    else q = await proxyQuote(sym);
    priceEl.value = q.price;
    priceEl.dataset.prevClose = q.prevClose;
    statusEl.textContent = '✓ 即時報價'; statusEl.className = 'price-status price-ok';
  } catch {
    statusEl.textContent = '查詢失敗，請手動輸入'; statusEl.className = 'price-status price-err';
  }
}

function hideAC() { document.getElementById('ac-dropdown').style.display = 'none'; }

function onCryptoInput() {
  const q = document.getElementById('f-cry-ticker').value.trim().toUpperCase();
  const dd = document.getElementById('ac-crypto-dd');
  if (!q) { dd.style.display = 'none'; return; }
  const matches = SECURITIES.filter(s => s.type === 'crypto' && (s.sym.startsWith(q) || s.name.toUpperCase().startsWith(q))).slice(0, 5);
  if (!matches.length) { dd.style.display = 'none'; return; }
  dd.innerHTML = matches.map(s =>
    '<div class="ac-item" onclick="selectCrypto(\'' + s.sym + '\',\'' + s.name + '\')">' +
    '<span class="ac-sym">' + s.sym + '</span><span class="ac-name">' + s.name + '</span></div>'
  ).join('');
  dd.style.display = 'block';
}

async function selectCrypto(sym, name) {
  document.getElementById('f-cry-ticker').value = sym;
  document.getElementById('ac-crypto-dd').style.display = 'none';
  const statusEl = document.getElementById('cry-price-status');
  const priceEl = document.getElementById('f-cry-price');
  statusEl.textContent = '查詢即時報價…'; statusEl.className = 'price-status price-loading';
  try {
    const id = CRYPTO_IDS[sym.toUpperCase()] || sym.toLowerCase();
    const d = await proxyCrypto(id);
    const entry = d[id];
    if (!entry) throw new Error('no data');
    priceEl.value = entry.usd.toFixed(2);
    priceEl.dataset.prevClose = (entry.usd / (1 + (entry.usd_24h_change || 0) / 100)).toFixed(2);
    statusEl.textContent = '✓ 即時報價'; statusEl.className = 'price-status price-ok';
  } catch {
    statusEl.textContent = '查詢失敗，請手動輸入'; statusEl.className = 'price-status price-err';
  }
}

// ── Asset Calcs ──────────────────────────────────────────────────
function assetValTWD(a) {
  if (a.type === 'twd_cash') return a.amt;
  if (a.type === 'usd_cash') return a.amt * fx.usd.rate;
  if (a.type === 'crypto') return (a.qty||0) * (a.price||0) * fx.usd.rate;
  return toTWD((a.price||0) * (a.shares||0), CATS[a.type].cur);
}
function assetValNative(a) {
  if (a.type === 'twd_cash') return a.amt;
  if (a.type === 'usd_cash') return a.amt;
  if (a.type === 'crypto') return (a.qty||0) * (a.price||0);
  return (a.price||0) * (a.shares||0);
}
function assetTodayNative(a) {
  if (['twd_cash','usd_cash'].includes(a.type)) return 0;
  const prev = a.prevPrice != null ? a.prevPrice : (a.price||0);
  return ((a.price||0) - prev) * (a.shares||a.qty||0);
}
function assetFxPnL(a) {
  const c = CATS[a.type].cur;
  if (c === 'TWD') return 0;
  const n = assetValNative(a);
  if (c === 'USD') return n * (fx.usd.rate - fx.usd.prev);
  if (c === 'GBP') return n * (fx.gbp.rate - fx.gbp.prev);
  return 0;
}
function assetCostTWD(a) {
  if (a.type === 'twd_cash') return a.amt;
  if (a.type === 'usd_cash') return a.amt * fx.usd.rate;
  const cn = (a.cost||0) * (a.shares||a.qty||0) + (a.fee||0);
  return toTWD(cn, CATS[a.type].cur);
}
function assetUnrealTWD(a) { return assetValTWD(a) - assetCostTWD(a); }
function getAllFiltered() { return profile === 'family' ? assets : assets.filter(a => a.owner === profile); }

// ── Render ───────────────────────────────────────────────────────
function renderAll() {
  const all = getAllFiltered();
  const totalTWD = all.reduce((s,a) => s + assetValTWD(a), 0);
  const todayTWD = all.reduce((s,a) => s + toTWD(assetTodayNative(a), CATS[a.type].cur), 0);
  const fxTWD = all.reduce((s,a) => s + assetFxPnL(a), 0);
  const unrealTWD = all.reduce((s,a) => s + assetUnrealTWD(a), 0);
  const costTWD = all.reduce((s,a) => s + assetCostTWD(a), 0);
  const unrealPct = costTWD ? unrealTWD/costTWD*100 : 0;
  const todayBase = totalTWD - todayTWD;
  const todayPct = todayBase ? todayTWD/todayBase*100 : 0;

  const lmap = { me: names.me+'的總資產淨值', wife: names.wife+'的總資產淨值', family: '家庭總資產淨值' };
  document.getElementById('total-label').textContent = lmap[profile];
  document.getElementById('total-val').textContent = fmtTWD(totalTWD);
  document.getElementById('today-sub').innerHTML = '今日損益 <span class="'+CLS(todayTWD)+'">'+(todayTWD>=0?'+':'')+fmtTWD(todayTWD)+'</span>（<span class="'+CLS(todayPct)+'">'+PCT(todayPct)+'</span>）';
  document.getElementById('m-unreal').textContent = (unrealTWD>=0?'+':'')+fmtTWD(unrealTWD);
  document.getElementById('m-unreal').className = 'mval '+CLS(unrealTWD);
  document.getElementById('m-unreal-pct').textContent = PCT(unrealPct);
  document.getElementById('m-unreal-pct').className = 'msub '+CLS(unrealPct);
  document.getElementById('m-today').textContent = (todayTWD>=0?'+':'')+fmtTWD(todayTWD);
  document.getElementById('m-today').className = 'mval '+CLS(todayTWD);
  document.getElementById('m-today-pct').textContent = PCT(todayPct);
  document.getElementById('m-today-pct').className = 'msub '+CLS(todayPct);
  document.getElementById('m-fx').textContent = (fxTWD>=0?'+':'')+fmtTWD(fxTWD);
  document.getElementById('m-fx').className = 'mval '+CLS(fxTWD);
  document.getElementById('m-count').textContent = all.length;
  renderTrend(all, totalTWD);
  renderDonut(all, totalTWD);
  renderSections(all);
}

function renderTrend(all, totalTWD) {
  const dates = all.filter(a=>a.buyDate).map(a=>new Date(a.buyDate));
  const earliest = dates.length ? new Date(Math.min(...dates)) : new Date();
  const today = new Date();
  const diffDays = Math.max(1, Math.round((today-earliest)/86400000));
  const days = chartPeriod==='1M'?Math.min(30,diffDays):chartPeriod==='1Y'?Math.min(365,diffDays):diffDays;
  const labels=[], data=[];
  for (let i=days; i>=0; i--) {
    const d = new Date(today); d.setDate(d.getDate()-i);
    labels.push((d.getMonth()+1)+'/'+d.getDate());
    const base = totalTWD*(1-i/Math.max(days,1)*0.08);
    data.push(Math.max(0, Math.round(base+(Math.random()-0.48)*totalTWD*0.003)));
  }
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(document.getElementById('trend-chart').getContext('2d'), {
    type:'line',
    data:{labels, datasets:[{data, borderColor:'#378ADD', backgroundColor:'rgba(55,138,221,0.07)', borderWidth:2, pointRadius:0, fill:true, tension:0.3}]},
    options:{responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:i=>'TWD '+i.raw.toLocaleString()}}},
      scales:{
        x:{ticks:{maxTicksLimit:6,color:'#888'}, grid:{display:false}, border:{display:false}},
        y:{ticks:{callback:v=>(v>=10000?(v/10000).toFixed(0)+'萬':v)+'',color:'#888',maxTicksLimit:4}, grid:{color:'rgba(0,0,0,0.04)'}, border:{display:false}}
      }
    }
  });
}

function renderDonut(all, totalTWD) {
  let slices = [];
  if (dim === 'detail') {
    slices = all.map(a => ({label:a.ticker||a.note||CATS[a.type].label, value:assetValTWD(a), color:CATS[a.type].color}));
  } else {
    Object.entries(TYPE_GROUPS).forEach(([n,g]) => {
      const v = all.filter(a=>g.types.includes(a.type)).reduce((s,a)=>s+assetValTWD(a),0);
      if (v>0) slices.push({label:n, value:v, color:g.color});
    });
  }
  slices.sort((a,b)=>b.value-a.value);
  const total = slices.reduce((s,x)=>s+x.value,0)||1;
  document.getElementById('dc-label').textContent = '總資產';
  document.getElementById('dc-sub').textContent = fmtTWD(total);
  if (donutChart) donutChart.destroy();
  donutChart = new Chart(document.getElementById('donut-chart').getContext('2d'), {
    type:'doughnut',
    data:{labels:slices.map(s=>s.label), datasets:[{data:slices.map(s=>s.value), backgroundColor:slices.map(s=>s.color), borderWidth:2, borderColor:'transparent', hoverOffset:6}]},
    options:{responsive:true, maintainAspectRatio:true, cutout:'68%',
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:i=>' '+i.label+': '+fmtTWD(i.raw)+' ('+(i.raw/total*100).toFixed(1)+'%)'}}}
    }
  });
  document.getElementById('donut-legend').innerHTML = slices.map(s =>
    '<div class="legend-item"><span class="legend-dot" style="background:'+s.color+'"></span><span class="legend-name">'+s.label+'</span><span class="legend-amt">'+fmtTWD(s.value)+'</span><span class="legend-pct">'+(s.value/total*100).toFixed(1)+'%</span></div>'
  ).join('');
}

function renderSections(all) {
  document.getElementById('asset-sections').innerHTML = Object.keys(CATS).map(k => {
    const items = all.map(a=>({...a, _idx:assets.indexOf(a)})).filter(a=>a.type===k);
    if (!items.length) return '';
    const cat = CATS[k];
    const catTWD = items.reduce((s,a)=>s+assetValTWD(a),0);
    const hasFx = ['us_stock','uk_stock','usd_cash','crypto'].includes(k);
    const rows = items.map(a => {
      const valN=assetValNative(a), valTWD=assetValTWD(a);
      const todayN=assetTodayNative(a), todayTWD=toTWD(todayN,cat.cur);
      const fxPnl=assetFxPnL(a);
      const costN=(a.cost||0)*(a.shares||a.qty||0)+(a.fee||0);
      const unrealN=valN-costN, unrealPct=costN?unrealN/costN*100:0;
      const isCash=['twd_cash','usd_cash'].includes(k);
      const liveTag=a.priceSource==='live'?'<span class="live-dot">●</span>':'';
      const idx=a._idx;
      if (isCash) return '<tr onclick="openEditModal('+idx+')">' +
        '<td><div style="font-weight:500;font-size:13px">'+(a.note||cat.label)+'</div><div class="mini">'+(a.owner==='me'?names.me:names.wife)+'</div></td>' +
        '<td><span class="badge '+cat.badge+'">'+cat.label+'</span></td>' +
        '<td class="rc" style="color:#aaa">—</td><td class="rc" style="color:#aaa">—</td>' +
        '<td class="rc">'+(hasFx?'<span class="'+CLS(fxPnl)+'">'+(fxPnl>=0?'+':'')+fmtTWD(fxPnl)+'</span>':'<span style="color:#ccc">—</span>')+'</td>' +
        '<td class="rc"><div style="font-weight:500">'+fmtCur(valN,cat.cur)+'</div>'+(cat.cur!=='TWD'?'<div class="mini">'+fmtTWD(valTWD)+'</div>':'')+'</td></tr>';
      return '<tr onclick="openEditModal('+idx+')">' +
        '<td><div style="font-weight:500;font-size:13px">'+(a.ticker||'—')+liveTag+'</div><div class="mini">'+(a.name&&a.name!==a.ticker?a.name+' · ':'')+(a.owner==='me'?names.me:names.wife)+(a.note?' · '+a.note:'')+'</div></td>' +
        '<td><span class="badge '+cat.badge+'">'+cat.label+'</span></td>' +
        '<td class="rc"><div style="font-size:12px">'+(a.shares||a.qty||0).toLocaleString()+'</div><div class="mini">@ '+(a.price!=null?Number(a.price).toFixed(2):'—')+'</div></td>' +
        '<td class="rc"><div style="font-size:12px">'+(a.cost?fmtCur(a.cost,cat.cur):'—')+'</div></td>' +
        '<td class="rc"><div class="'+CLS(todayN)+'" style="font-size:12px">'+(todayN!==0?(todayN>=0?'+':'')+fmtCur(todayN,cat.cur):'—')+'</div>'+(hasFx&&todayN!==0?'<div class="mini">'+(todayTWD>=0?'+':'')+fmtTWD(todayTWD)+'</div>':'')+'</td>' +
        '<td class="rc">'+(hasFx?'<div class="'+CLS(fxPnl)+'" style="font-size:12px">'+(fxPnl>=0?'+':'')+fmtTWD(fxPnl)+'</div><div class="mini" style="color:#aaa">匯率 TWD</div>':'<span style="color:#ccc">—</span>')+'</td>' +
        '<td class="rc"><div style="font-weight:500;font-size:12px">'+fmtCur(valN,cat.cur)+'</div>'+(cat.cur!=='TWD'?'<div class="mini">'+fmtTWD(valTWD)+'</div>':'')+'<div class="mini '+CLS(unrealN)+'">'+(unrealN!==0?(unrealN>=0?'+':'')+fmtCur(unrealN,cat.cur)+' ('+PCT(unrealPct)+')':'—')+'</div></td>' +
        '</tr>';
    }).join('');
    return '<div class="cat-section"><div class="cat-header"><span class="cat-dot" style="background:'+cat.color+'"></span><span class="cat-title">'+cat.label+'</span><span class="cat-sub">'+cat.cur+'</span><span class="cat-total">'+fmtTWD(catTWD)+'</span></div>' +
      '<div class="card"><div style="overflow-x:auto"><table><thead><tr>' +
      '<th style="width:18%">標的</th><th style="width:11%">類別</th><th style="width:12%;text-align:right">股數／現價</th>' +
      '<th style="width:13%;text-align:right">均價（'+cat.cur+'）</th><th style="width:17%;text-align:right">今日損益（'+cat.cur+'）</th>' +
      '<th style="width:13%;text-align:right">匯率損益</th><th style="width:16%;text-align:right">未實現損益（'+cat.cur+'）</th>' +
      '</tr></thead><tbody>'+rows+'</tbody></table></div></div></div>';
  }).join('');
}

// ── Modal ────────────────────────────────────────────────────────
function openAddModal() {
  editIndex=-1; selType=null;
  document.getElementById('modal-title-text').textContent='新增資產';
  document.getElementById('step1').style.display='block';
  document.getElementById('step2').style.display='none';
  document.getElementById('back-btn').style.display='';
  document.getElementById('submit-btn').textContent='新增';
  document.getElementById('delete-btn').style.display='none';
  document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('selected'));
  document.getElementById('modal-overlay').style.display='flex';
}

function openEditModal(idx) {
  const a=assets[idx]; if(!a) return;
  editIndex=idx; selType=a.type;
  document.getElementById('modal-title-text').textContent='編輯資產';
  document.getElementById('step1').style.display='none';
  document.getElementById('step2').style.display='block';
  document.getElementById('back-btn').style.display='none';
  document.getElementById('submit-btn').textContent='儲存';
  document.getElementById('delete-btn').style.display='';
  const isCash=['twd_cash','usd_cash'].includes(a.type), isCrypto=a.type==='crypto';
  document.getElementById('form-stock').style.display=(!isCash&&!isCrypto)?'block':'none';
  document.getElementById('form-cash').style.display=isCash?'block':'none';
  document.getElementById('form-crypto').style.display=isCrypto?'block':'none';
  if (isCash) {
    document.getElementById('cash-lbl').textContent='金額（'+CATS[a.type].cur+'）';
    document.getElementById('f-cash-amt').value=a.amt||'';
    document.getElementById('f-cash-owner').value=a.owner||'me';
    document.getElementById('f-cash-note').value=a.note||'';
  } else if (isCrypto) {
    document.getElementById('f-cry-ticker').value=a.ticker||'';
    document.getElementById('f-cry-qty').value=a.qty||'';
    document.getElementById('f-cry-cost').value=a.cost||'';
    document.getElementById('f-cry-price').value=a.price!=null?Number(a.price).toFixed(2):'';
    document.getElementById('f-cry-date').value=a.buyDate||'';
    document.getElementById('f-cry-owner').value=a.owner||'me';
    document.getElementById('f-cry-note').value=a.note||'';
    document.getElementById('cry-price-status').textContent='';
  } else {
    document.getElementById('f-ticker').value=a.ticker||'';
    document.getElementById('f-name').value=a.name||'';
    document.getElementById('f-shares').value=a.shares||'';
    document.getElementById('f-cost').value=a.cost||'';
    document.getElementById('f-price').value=a.price!=null?Number(a.price).toFixed(2):'';
    document.getElementById('f-date').value=a.buyDate||'';
    document.getElementById('f-owner').value=a.owner||'me';
    document.getElementById('f-note').value=a.note||'';
    document.getElementById('f-fee-type').value=a.feeType||'pct';
    document.getElementById('f-fee-pct').value=a.feePct!=null?a.feePct:0.1425;
    document.getElementById('f-fee-manual').value=a.feeManual||0;
    document.getElementById('funit').textContent=CATS[a.type].cur;
    document.getElementById('price-status').textContent='';
    updateFeeUI(); calcFee();
  }
  document.getElementById('modal-overlay').style.display='flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display='none';
  hideAC();
  document.getElementById('ac-crypto-dd').style.display='none';
}
function overlayClick(e) { if(e.target===document.getElementById('modal-overlay')) closeModal(); }
function goStep1() {
  document.getElementById('step1').style.display='block';
  document.getElementById('step2').style.display='none';
  document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('selected'));
}
function pickType(t) {
  selType=t;
  document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('selected'));
  document.getElementById('t-'+t).classList.add('selected');
  document.getElementById('step1').style.display='none';
  document.getElementById('step2').style.display='block';
  const isCash=['twd_cash','usd_cash'].includes(t), isCrypto=t==='crypto';
  document.getElementById('form-stock').style.display=(!isCash&&!isCrypto)?'block':'none';
  document.getElementById('form-cash').style.display=isCash?'block':'none';
  document.getElementById('form-crypto').style.display=isCrypto?'block':'none';
  const cat=CATS[t];
  if(cat){document.getElementById('funit').textContent=cat.cur;document.getElementById('cash-lbl').textContent='金額（'+cat.cur+'）';}
  ['f-ticker','f-name','f-shares','f-cost','f-note','f-cash-note','f-cry-note'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('f-price').value='';
  document.getElementById('f-cry-price').value='';
  document.getElementById('price-status').textContent='';
  document.getElementById('cry-price-status').textContent='';
  if(!document.getElementById('f-date').value) document.getElementById('f-date').value=todayStr();
  if(!document.getElementById('f-cry-date').value) document.getElementById('f-cry-date').value=todayStr();
  updateFeeUI();
}
function updateFeeUI() {
  const t=document.getElementById('f-fee-type').value;
  document.getElementById('fpw').style.display=t==='pct'?'block':'none';
  document.getElementById('fmw').style.display=t==='manual'?'block':'none';
  calcFee();
}
function calcFee() {
  const sh=parseFloat(document.getElementById('f-shares').value)||0;
  const co=parseFloat(document.getElementById('f-cost').value)||0;
  const t=document.getElementById('f-fee-type').value;
  const pct=parseFloat(document.getElementById('f-fee-pct').value)||0;
  const manual=parseFloat(document.getElementById('f-fee-manual').value)||0;
  const el=document.getElementById('fee-preview');
  const c=(CATS[selType]||{cur:'TWD'}).cur;
  if(!sh||!co){el.textContent='請先輸入股數與買入成本';return;}
  const p=sh*co, fee=t==='none'?0:t==='pct'?p*pct/100:manual;
  if(t==='none') el.textContent='無手續費　買入總額：'+c+' '+Math.round(p).toLocaleString();
  else if(t==='pct') el.textContent='買入總額 '+c+' '+Math.round(p).toLocaleString()+' × '+pct+'% = '+c+' '+fee.toFixed(2)+'　→　含費 '+c+' '+(p+fee).toFixed(2);
  else el.textContent='買入總額 '+c+' '+Math.round(p).toLocaleString()+' + '+c+' '+manual+' → 含費 '+c+' '+(p+manual).toFixed(2);
}
function submitAsset() {
  const isCash=['twd_cash','usd_cash'].includes(selType), isCrypto=selType==='crypto';
  const today=todayStr();
  let obj;
  if (isCash) {
    const amt=parseFloat(document.getElementById('f-cash-amt').value)||0;
    if(!amt) return;
    obj={type:selType, amt, note:document.getElementById('f-cash-note').value, owner:document.getElementById('f-cash-owner').value};
  } else if (isCrypto) {
    const ticker=document.getElementById('f-cry-ticker').value.trim().toUpperCase();
    const qty=parseFloat(document.getElementById('f-cry-qty').value)||0;
    const cost=parseFloat(document.getElementById('f-cry-cost').value)||0;
    const price=parseFloat(document.getElementById('f-cry-price').value)||0;
    const prevPrice=parseFloat(document.getElementById('f-cry-price').dataset.prevClose)||price;
    if(!ticker||!qty) return;
    obj={type:'crypto', ticker, qty, cost, price, prevPrice, owner:document.getElementById('f-cry-owner').value, buyDate:document.getElementById('f-cry-date').value||today, note:document.getElementById('f-cry-note').value, priceSource:price?'live':''};
  } else {
    const ticker=document.getElementById('f-ticker').value.trim().toUpperCase();
    const name=document.getElementById('f-name').value.trim()||ticker;
    const shares=parseFloat(document.getElementById('f-shares').value)||0;
    const cost=parseFloat(document.getElementById('f-cost').value)||0;
    const price=parseFloat(document.getElementById('f-price').value)||0;
    const prevPrice=parseFloat(document.getElementById('f-price').dataset.prevClose)||price;
    const feeType=document.getElementById('f-fee-type').value;
    const feePct=parseFloat(document.getElementById('f-fee-pct').value)||0;
    const feeManual=parseFloat(document.getElementById('f-fee-manual').value)||0;
    const fee=feeType==='none'?0:feeType==='pct'?shares*cost*feePct/100:feeManual;
    if(!ticker||!shares||!cost) return;
    obj={type:selType, ticker, name, shares, cost, price:price||cost, prevPrice:prevPrice||price||cost, fee, feeType, feePct, feeManual, owner:document.getElementById('f-owner').value, buyDate:document.getElementById('f-date').value||today, note:document.getElementById('f-note').value, priceSource:price?'live':''};
  }
  if(editIndex>=0) assets[editIndex]=obj;
  else assets.push(obj);
  saveData(); closeModal(); renderAll();
}
function deleteAsset() {
  if(editIndex<0) return;
  if(!confirm('確定刪除這筆資產？')) return;
  assets.splice(editIndex,1);
  saveData(); closeModal(); renderAll();
}
function setProfile(p) {
  profile=p;
  ['me','wife','family'].forEach(id=>document.getElementById('pb-'+id)?.classList.toggle('active',id===p));
  renderAll();
}
function setChartPeriod(btn,p) {
  chartPeriod=p;
  document.querySelectorAll('.pbtn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); renderAll();
}
function setDim(btn,d) {
  dim=d;
  document.querySelectorAll('.dbtn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); renderAll();
}
function toggleRename() { const b=document.getElementById('rename-bar'); b.style.display=b.style.display==='none'?'block':'none'; }
function applyRename() {
  names.me=document.getElementById('rn-me').value||'我';
  names.wife=document.getElementById('rn-wife').value||'太太';
  document.getElementById('lbl-me').textContent=names.me+'的資產';
  document.getElementById('lbl-wife').textContent=names.wife+'的資產';
  ['f-owner','f-cash-owner','f-cry-owner'].forEach(id=>{const s=document.getElementById(id);if(s){s.options[0].text=names.me;s.options[1].text=names.wife;}});
  document.getElementById('rename-bar').style.display='none';
  saveData(); renderAll();
}

// ── Init ─────────────────────────────────────────────────────────
loadData();
fetchFX().then(()=>{updateFxBar();renderAll();}).catch(()=>{renderAll();});
