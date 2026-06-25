const API = '/api/quote';
const APP_SCHEMA_VERSION = 3;

// 資產類別定義
const CATS = {
  tw_stock:    {label:'台股',    cur:'TWD', color:'#378ADD', badge:'btw'},
  us_stock:    {label:'美股',    cur:'USD', color:'#639922', badge:'bus'},
  uk_stock:    {label:'英股',    cur:'GBP', color:'#BA7517', badge:'buk'},
  uk_stock_usd:{label:'英股',    cur:'USD', color:'#BA7517', badge:'buk'},
  tw_fund:     {label:'台灣基金', cur:'TWD', color:'#7F77DD', badge:'bfund'},
  twd_cash:    {label:'台幣現金', cur:'TWD', color:'#888780', badge:''},
  usd_cash:    {label:'美元現金', cur:'USD', color:'#1D9E75', badge:'bus'},
  crypto:      {label:'加密貨幣', cur:'USD', color:'#D85A30', badge:'bcrypto'},
  real_estate: {label:'不動產',  cur:'TWD', color:'#E07B54', badge:''},
  gold:        {label:'黃金',    cur:'USD', color:'#D4AF37', badge:''},
};
const TYPE_GROUPS = {
  股票:    {types:['tw_stock','us_stock','uk_stock','uk_stock_usd'], color:'#378ADD'},
  基金:    {types:['tw_fund'],  color:'#7F77DD'},
  現金:    {types:['twd_cash','usd_cash'], color:'#888780'},
  加密貨幣:{types:['crypto'],   color:'#D85A30'},
  實物資產:{types:['real_estate','gold'], color:'#E07B54'},
};
const DEBT_TYPES = {
  mortgage:{label:'🏠 房貸'}, car:{label:'🚗 車貸'},
  personal:{label:'💳 信貸'}, student:{label:'🎓 學貸'},
  business:{label:'🏢 企業貸款'}, other:{label:'📋 其他'},
};
const CRYPTO_IDS = {
  BTC:'bitcoin',ETH:'ethereum',SOL:'solana',BNB:'binancecoin',
  XRP:'ripple',ADA:'cardano',DOGE:'dogecoin',AVAX:'avalanche-2',
};
const TW_NAMES = {
  '2330':'台積電','2317':'鴻海','2454':'聯發科','2882':'國泰金','2881':'富邦金',
  '2891':'中信金','2886':'兆豐金','2884':'玉山金','2885':'元大金','2892':'第一金',
  '2303':'聯電','2308':'台達電','2412':'中華電','2002':'中鋼','2382':'廣達',
  '2357':'華碩','2379':'瑞昱','2327':'國巨','6770':'力積電','3008':'大立光',
  '2408':'南亞科','2376':'技嘉','3711':'日月光投控','2395':'研華',
  '0050':'元大台灣50','0056':'元大高股息','006208':'富邦台灣50',
  '00878':'國泰永續高股息','00881':'國泰台灣5G+','00919':'群益台灣精選高息',
  '00929':'復華台灣科技優息','1301':'台塑','1303':'南亞','1326':'台化',
  '2603':'長榮','2609':'陽明','2615':'萬海','2618':'長榮航',
  '2880':'華南金','2883':'開發金','2887':'台新金','2888':'新光金','2890':'永豐金',
  '3034':'聯詠','3037':'欣興','3045':'台灣大','3481':'群創',
  '4904':'遠傳','4938':'和碩','5880':'合庫金','6415':'矽力-KY',
  '6446':'藥華藥','6488':'環球晶','6505':'台塑化','8046':'南電','9910':'豐泰',
};

function toYahooSymbol(ticker, type) {
  if (type === 'tw_stock') return ticker + '.TW';
  if (type === 'uk_stock' || type === 'uk_stock_usd') return ticker + '.L';
  if (type === 'gold') return 'GC=F';
  return ticker;
}

// 狀態
let profile = 'me', chartPeriod = '1M', dim = 'detail', selType = null, selUKCur = 'USD';
let trendChart = null, donutChart = null, fetching = false;
let names = {me:'我', wife:'太太'};
let assets = [], debts = [];
let fx = {usd:{rate:32.0,prev:32.0}, gbp:{rate:40.5,prev:40.5}};
let editIndex = -1, debtEditIndex = -1, rebalRows = [];
let includeDebt = true, debtMode = 'new';
let familyMembers = {me:true, wife:true};
let rebalProfile = 'family';
let detailAsset = null; // 當前查看明細的標的
let dividends = [];
let divDest = 'cash';
let transactions = [];
let historyPrices = {}; // { 'AAPL': {'2026-01-15': 210, ...}, 'crypto_BTC': {...}, ... }
let historyFX = {};     // { 'USDTWD': {'2026-01-15': 32.5, ...}, 'GBPUSD': {...} }
let historyFetching = false;

function makeId(prefix) {
  if(globalThis.crypto?.randomUUID) return prefix+'_'+crypto.randomUUID();
  return prefix+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,10);
}
function createDefaultGameState() {
  return {
    version: 1,
    onboarding: {status:'draft', startedAt:new Date().toISOString(), completedAt:null},
    baseline: null,
    achievements: [],
    historyEvents: [],
    monsterProfiles: {},
  };
}
let gameState = createDefaultGameState();

const todayStr = () => new Date().toISOString().split('T')[0];
const PCT = v => (v>=0?'+':'')+v.toFixed(2)+'%';
const CLS = v => v>=0?'pos':'neg';
const fmtTWD = v => { const a=Math.abs(Math.round(v)); return (v<0?'-':'')+' TWD '+a.toLocaleString(); };
const fmtCur = (v,c) => {
  if(c==='TWD') return fmtTWD(v);
  if(c==='USD') return (v<0?'-':'')+'USD '+Math.abs(v).toFixed(2);
  if(c==='GBP') return (v<0?'-':'')+'GBP '+Math.abs(v).toFixed(2);
  return String(v);
};
const toTWD = (v,c) => c==='USD'?v*fx.usd.rate:c==='GBP'?v*fx.gbp.rate:v;

function eventDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value||'') ? value : todayStr();
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function ensureDataSchema() {
  const now = new Date().toISOString();
  assets.forEach(a => {
    a.id = a.id || makeId('asset');
    a.effectiveDate = eventDate(a.effectiveDate || a.buyDate);
    a.buyDate = a.buyDate || a.effectiveDate;
    a.recordedAt = a.recordedAt || now;
    if(!['twd_cash','usd_cash','real_estate'].includes(a.type) && a.sharesRemaining==null) {
      a.sharesRemaining = a.shares || a.qty || 0;
    }
  });
  debts.forEach(d => {
    d.id = d.id || makeId('debt');
    d.startDate = eventDate(d.startDate || d.effectiveDate);
    d.effectiveDate = d.startDate;
    d.recordedAt = d.recordedAt || now;
  });
  dividends.forEach(d => {
    d.id = d.id || makeId('dividend');
    d.effectiveDate = eventDate(d.effectiveDate || d.date);
    d.date = d.date || d.effectiveDate;
    d.recordedAt = d.recordedAt || now;
  });
  transactions.forEach(t => {
    t.id = t.id || makeId('transaction');
    t.effectiveDate = eventDate(t.effectiveDate || t.date);
    t.date = t.date || t.effectiveDate;
    t.recordedAt = t.recordedAt || now;
  });
  gameState = {...createDefaultGameState(), ...(gameState||{})};
  gameState.onboarding = {...createDefaultGameState().onboarding, ...(gameState.onboarding||{})};
  gameState.achievements = Array.isArray(gameState.achievements) ? gameState.achievements : [];
  gameState.historyEvents = Array.isArray(gameState.historyEvents) ? gameState.historyEvents : [];
  gameState.monsterProfiles = gameState.monsterProfiles || {};
}

function collectFinancialEvents() {
  const result = [];
  assets.forEach(a => result.push({
    id:'event_asset_'+a.id, entityId:a.id, kind:'asset_created',
    effectiveDate:eventDate(a.effectiveDate||a.buyDate), recordedAt:a.recordedAt,
    owner:a.owner||'me', assetType:a.type,
    label:a.name||a.ticker||a.address||a.note||CATS[a.type]?.label||'資產',
  }));
  debts.forEach(d => result.push({
    id:'event_debt_'+d.id, entityId:d.id, kind:'debt_started',
    effectiveDate:eventDate(d.startDate||d.effectiveDate), recordedAt:d.recordedAt,
    owner:d.owner||'me', debtType:d.debtType,
    label:d.name||DEBT_TYPES[d.debtType]?.label||'負債',
  }));
  dividends.forEach(d => result.push({
    id:'event_dividend_'+d.id, entityId:d.id, kind:'dividend_received',
    effectiveDate:eventDate(d.effectiveDate||d.date), recordedAt:d.recordedAt,
    owner:d.owner||null, label:d.sourceName||'配息', amount:d.amount||0, currency:d.currency||'TWD',
  }));
  transactions.forEach(t => result.push({
    id:'event_transaction_'+t.id, entityId:t.id, kind:t.action||'transaction',
    effectiveDate:eventDate(t.effectiveDate||t.date), recordedAt:t.recordedAt,
    owner:t.owner||'me', label:t.name||t.ticker||'交易',
  }));
  return result.sort((a,b)=>a.effectiveDate.localeCompare(b.effectiveDate)||a.id.localeCompare(b.id));
}

function syncGameHistoryEvents() {
  const existing = new Map((gameState.historyEvents||[]).map(e=>[e.id,e]));
  const completedDate = gameState.onboarding.completedAt?.slice(0,10) || null;
  gameState.historyEvents = collectFinancialEvents().map(event => {
    const old = existing.get(event.id);
    if(old) return {...old, ...event, source:old.source, rewardEligible:old.rewardEligible, pendingAnimation:old.pendingAnimation};
    const source = gameState.onboarding.status!=='complete'
      ? 'initial_archive'
      : event.effectiveDate < completedDate ? 'backfill' : 'live';
    return {
      ...event,
      source,
      rewardEligible:source==='live',
      pendingAnimation:source!=='initial_archive',
      addedToHistoryAt:new Date().toISOString(),
    };
  });
}

function unlockAchievement({id, scope, title, metricValue=0, source='live'}) {
  if(!id || gameState.achievements.some(a=>a.id===id)) return false;
  gameState.achievements.push({
    id, scope, title, metricValue, source,
    unlockedAt:new Date().toISOString(),
  });
  return true;
}

function liveHistoryEvents() {
  return (gameState.historyEvents||[]).filter(e=>e.rewardEligible);
}

function getGameProgress() {
  if(gameState.onboarding.status!=='complete' || !gameState.baseline) {
    return {
      status:'draft',
      achievements:gameState.achievements||[],
      liveEvents:0,
      familyGrowth:0,
      addedAssetTypes:0,
      dividendEvents:0,
      recordDays:0,
    };
  }
  const familyNow = getScopeMetrics('family');
  const baselineFamily = gameState.baseline.family || {};
  const baselineTypes = new Set(baselineFamily.assetTypes||[]);
  const currentTypes = new Set(familyNow.assetTypes||[]);
  const liveEvents = liveHistoryEvents();
  const recordDays = new Set(liveEvents.map(e=>e.effectiveDate)).size;
  const dividendEvents = liveEvents.filter(e=>e.kind==='dividend_received').length;
  const addedAssetTypes = [...currentTypes].filter(t=>!baselineTypes.has(t)).length;
  return {
    status:'complete',
    achievements:gameState.achievements||[],
    liveEvents:liveEvents.length,
    familyGrowth:familyNow.netWorth - (baselineFamily.netWorth||0),
    addedAssetTypes,
    dividendEvents,
    recordDays,
  };
}

function evaluateGameAchievements() {
  if(gameState.onboarding.status!=='complete' || !gameState.baseline) return;
  const progress = getGameProgress();
  const checks = [
    {
      ok: progress.liveEvents >= 1,
      id:'first_live_event',
      title:'第一位新居民報到',
      value:progress.liveEvents,
    },
    {
      ok: progress.familyGrowth >= 10000,
      id:'net_growth_10k',
      title:'島嶼長出第一片新地',
      value:progress.familyGrowth,
    },
    {
      ok: progress.addedAssetTypes >= 1,
      id:'asset_type_added_after_baseline',
      title:'探索新的資產棲地',
      value:progress.addedAssetTypes,
    },
    {
      ok: progress.dividendEvents >= 1,
      id:'first_dividend_after_baseline',
      title:'第一顆果實成熟',
      value:progress.dividendEvents,
    },
    {
      ok: progress.recordDays >= 3,
      id:'record_days_3',
      title:'三天島務日誌',
      value:progress.recordDays,
    },
  ];
  checks.forEach(c => {
    if(c.ok) unlockAchievement({id:c.id, scope:'family', title:c.title, metricValue:c.value, source:'live'});
  });
}

// 儲存 / 載入
function saveData() {
  syncGameHistoryEvents();
  evaluateGameAchievements();
  localStorage.setItem('family_assets', JSON.stringify(assets));
  localStorage.setItem('family_names', JSON.stringify(names));
  localStorage.setItem('family_debts', JSON.stringify(debts));
  localStorage.setItem('include_debt', JSON.stringify(includeDebt));
  localStorage.setItem('family_members', JSON.stringify(familyMembers));
  localStorage.setItem('family_dividends', JSON.stringify(dividends));
  localStorage.setItem('family_transactions', JSON.stringify(transactions));
  localStorage.setItem('family_game_state', JSON.stringify(gameState));
  localStorage.setItem('family_schema_version', String(APP_SCHEMA_VERSION));
}
function loadData() {
  try {
    const a  = localStorage.getItem('family_assets');
    const n  = localStorage.getItem('family_names');
    const d  = localStorage.getItem('family_debts');
    const id = localStorage.getItem('include_debt');
    const fm = localStorage.getItem('family_members');
    if(a)  assets = JSON.parse(a);
    if(d)  debts  = JSON.parse(d);
    if(id !== null) includeDebt = JSON.parse(id);
    if(fm) familyMembers = JSON.parse(fm);
    const dv = localStorage.getItem('family_dividends');
    if(dv) dividends = JSON.parse(dv);
    const tx = localStorage.getItem('family_transactions');
    if(tx) transactions = JSON.parse(tx);
    const gs = localStorage.getItem('family_game_state');
    if(gs) gameState = JSON.parse(gs);
    ensureDataSchema();
    syncGameHistoryEvents();
    if(Number(localStorage.getItem('family_schema_version')||0) < APP_SCHEMA_VERSION) saveData();
    if(n)  { names = JSON.parse(n); updateNameLabels(); }
    applyTheme(localStorage.getItem('theme') || 'arctic');
    updateDebtToggleUI();
    updateFamilyToggleUI();
  } catch(e) { console.warn(e); }
}
function updateNameLabels() {
  document.getElementById('lbl-me').textContent   = names.me   + '的資產';
  document.getElementById('lbl-wife').textContent = names.wife + '的資產';
  document.getElementById('rn-me').value   = names.me;
  document.getElementById('rn-wife').value = names.wife;
  document.getElementById('set-name-me').textContent = names.me + ' / ' + names.wife;
  document.getElementById('family-check-me-label').textContent   = names.me   + '的資產';
  document.getElementById('family-check-wife-label').textContent = names.wife + '的資產';
  ['f-owner','f-cash-owner','f-cry-owner','d-owner'].forEach(id => {
    const s = document.getElementById(id);
    if(s) { s.options[0].text = names.me; s.options[1].text = names.wife; }
  });
}

// 主題
function setTheme(t) { applyTheme(t); localStorage.setItem('theme', t); }
function applyTheme(t) {
  document.body.dataset.theme = t==='arctic' ? '' : t;
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('theme-'+t)?.classList.add('active');
}

// 頁面切換
function switchPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  document.getElementById('nav-'+name).classList.add('active');
  if(name==='rebal') renderRebal();
  if(name==='debt')  renderDebt();
}

// 家庭成員
function toggleFamilyMember(member) {
  familyMembers[member] = !familyMembers[member];
  updateFamilyToggleUI();
  saveData();
  if(profile==='family') renderAll();
}
function updateFamilyToggleUI() {
  ['me','wife'].forEach(m => {
    const sw = document.getElementById('family-toggle-'+m);
    if(sw) sw.classList.toggle('on', !!familyMembers[m]);
  });
}

// API
async function proxyQuote(s) {
  const r = await fetch(API+'?type=quote&symbol='+encodeURIComponent(s));
  const d = await r.json();
  if(d.error) throw new Error(d.error);
  return d;
}
async function proxySearch(q, type) {
  const r = await fetch(API+'?type=search&symbol='+encodeURIComponent(q));
  const d = await r.json();
  const all = d.result || [];
  if(type==='tw_stock'||type==='tw_fund') return all.filter(x=>(x.symbol||'').endsWith('.TW'));
  if(type==='uk_stock'||type==='uk_stock_usd') return all.filter(x=>(x.symbol||'').endsWith('.L'));
  if(type==='us_stock') return all.filter(x=>!(x.symbol||'').includes('.'));
  return all;
}
async function proxyFundSearch(q) {
  const r = await fetch(API+'?type=fund_search&q='+encodeURIComponent(q));
  const d = await r.json();
  return d.result || [];
}
async function proxyFundNav(code) {
  const r = await fetch(API+'?type=fund_nav&symbol='+encodeURIComponent(code));
  return await r.json();
}
async function proxyCrypto(ids) {
  const r = await fetch(API+'?type=crypto&ids='+encodeURIComponent(ids));
  return await r.json();
}
async function proxyFX() {
  const r = await fetch(API+'?type=fx');
  return await r.json();
}
async function proxyHistory(symbol, range) {
  try {
    const r = await fetch(`${API}?type=history&symbol=${encodeURIComponent(symbol)}&range=${range}`);
    if(!r.ok) return {};
    const d = await r.json();
    const map = {};
    (d.data||[]).forEach(item => { if(item.close!=null) map[item.date] = item.close; });
    return map;
  } catch { return {}; }
}
async function proxyCryptoHistory(coinId, days) {
  try {
    const r = await fetch(`${API}?type=crypto_history&symbol=${encodeURIComponent(coinId)}&days=${days}`);
    if(!r.ok) return {};
    const d = await r.json();
    const map = {};
    (d.data||[]).forEach(item => { if(item.close!=null) map[item.date] = item.close; });
    return map;
  } catch { return {}; }
}
function getHistorySymbol(a) {
  if(a.type==='tw_stock') return a.ticker+'.TW';
  if(a.type==='us_stock') return a.ticker;
  if(a.type==='uk_stock'||a.type==='uk_stock_usd') return a.ticker+'.L';
  if(a.type==='gold') return 'GC=F';
  if(a.type==='crypto') return 'crypto_'+a.ticker;
  return null;
}

async function fetchFX() {
  const d = await proxyFX();
  if(d.rates?.TWD) {
    fx.usd = {rate: d.rates.TWD, prev: d.prevTWD || d.rates.TWD};
    const gbpTWD = d.rates.GBPTWD || (d.gbpUsd ? d.gbpUsd*d.rates.TWD : fx.gbp.rate);
    const prevGBP = d.prevGBPTWD || gbpTWD;
    fx.gbp = {rate: gbpTWD, prev: prevGBP};
  }
}

async function fetchAll() {
  if(fetching) return;
  fetching = true;
  const btn = document.getElementById('refresh-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"><i class="ti ti-loader-2"></i></span> 查詢中…';
  try { await fetchFX(); updateFxBar(); } catch(e) { console.warn('FX fail', e); }

  // 股票 / ETF / 黃金（依 symbol 分組，每支只打一次 API）
  const symMap = {};
  assets.filter(x=>['tw_stock','us_stock','uk_stock','uk_stock_usd','gold'].includes(x.type)).forEach(a=>{
    const sym = a.type==='gold'?'GC=F':toYahooSymbol(a.ticker,a.type);
    if(!symMap[sym]) symMap[sym]=[];
    symMap[sym].push(a);
  });
  for(const [sym,group] of Object.entries(symMap)) {
    try {
      const q = await proxyQuote(sym);
      group.forEach(a=>{
        const oldPrev = a.prevPrice;
        a.price = q.price;
        a.prevPrice = q.prevClose!==null ? q.prevClose : (oldPrev??null);
        a.prevPriceSource = q.prevClose!==null ? 'live' : (oldPrev!=null ? 'stored' : 'missing');
        if(q.name&&!TW_NAMES[a.ticker]) a.name=q.name;
        if(TW_NAMES[a.ticker]) a.name=TW_NAMES[a.ticker];
        a.priceSource='live';
      });
    } catch { group.forEach(a=>a.priceSource='error'); }
  }

  // 基金
  for(const a of assets.filter(x=>x.type==='tw_fund' && x.fundCode)) {
    try {
      const d = await proxyFundNav(a.fundCode);
      a.prevPrice = d.prevNav || a.price || 0;
      a.price = d.nav;
      a.priceSource = 'live';
    } catch { a.priceSource = 'error'; }
  }

  // 加密貨幣
  const ca = assets.filter(x=>x.type==='crypto');
  if(ca.length) {
    try {
      const ids = ca.map(a=>CRYPTO_IDS[a.ticker.toUpperCase()]||a.ticker.toLowerCase()).join(',');
      const d = await proxyCrypto(ids);
      ca.forEach(a => {
        const id = CRYPTO_IDS[a.ticker.toUpperCase()]||a.ticker.toLowerCase();
        if(d[id]) {
          a.price = d[id].usd;
          a.prevPrice = a.price/(1+(d[id].usd_24h_change||0)/100);
          a.priceSource = 'live';
        }
      });
    } catch { ca.forEach(a=>a.priceSource='error'); }
  }

  saveData();
  const now = new Date();
  document.getElementById('last-upd').textContent = '更新於 '+now.getHours()+':'+String(now.getMinutes()).padStart(2,'0');
  fetching = false;
  btn.disabled = false;
  btn.innerHTML = '<i class="ti ti-refresh"></i> 更新報價';
  renderAll();
  fetchAndRenderHistory();
}

function updateFxBar() {
  const uChg = fx.usd.prev ? (fx.usd.rate-fx.usd.prev)/fx.usd.prev*100 : 0;
  const gChg = fx.gbp.prev ? (fx.gbp.rate-fx.gbp.prev)/fx.gbp.prev*100 : 0;
  document.getElementById('r-usd').textContent = fx.usd.rate.toFixed(3);
  document.getElementById('rc-usd').textContent = (uChg>=0?'+':'')+uChg.toFixed(2)+'%';
  document.getElementById('rc-usd').className = CLS(uChg);
  document.getElementById('r-gbp').textContent = fx.gbp.rate.toFixed(3);
  document.getElementById('rc-gbp').textContent = (gChg>=0?'+':'')+gChg.toFixed(2)+'%';
  document.getElementById('rc-gbp').className = CLS(gChg);
}

// 債務
function toggleDebtInclusion() {
  includeDebt = !includeDebt;
  updateDebtToggleUI();
  saveData(); renderAll();
}
function updateDebtToggleUI() {
  const sw  = document.getElementById('debt-toggle');
  const lbl = document.getElementById('debt-toggle-label');
  const inc = document.getElementById('debt-include-display');
  if(includeDebt) {
    sw?.classList.add('on');
    if(lbl) lbl.textContent = '含債務';
    if(inc) inc.textContent = '是（點擊切換）';
  } else {
    sw?.classList.remove('on');
    if(lbl) lbl.textContent = '不含債務';
    if(inc) inc.textContent = '否（點擊切換）';
  }
}
function debtToTWD(d) { return toTWD(d.remaining||0, d.currency||'TWD'); }
function calcMonthlyPayment(principal, annualRate, totalMonths, graceMonths, method) {
  const r = annualRate/100/12, g = graceMonths||0;
  if(!totalMonths) return {total:0, principal:0, interest:0};
  if(!r) return {total:principal/totalMonths, principal:principal/totalMonths, interest:0};
  const interest = principal*r;
  if(method==='equal') {
    const pmt = principal*r*Math.pow(1+r,totalMonths)/(Math.pow(1+r,totalMonths)-1);
    if(g>0) return {total:interest, principal:0, interest};
    return {total:pmt, principal:pmt-interest, interest};
  } else {
    const pp = principal/totalMonths;
    if(g>0) return {total:interest, principal:0, interest};
    return {total:pp+interest, principal:pp, interest};
  }
}
function getDebtMonthlyTWD(d) {
  const r = calcMonthlyPayment(d.remaining||0,d.rate||0,d.remainMonths||0,d.graceRemain||0,d.method||'equal');
  return toTWD(r.total, d.currency||'TWD');
}
function totalDebtTWD() { return getFilteredDebts().reduce((s,d)=>s+debtToTWD(d),0); }
function totalMonthlyTWD() { return getFilteredDebts().reduce((s,d)=>s+getDebtMonthlyTWD(d),0); }
function getFilteredDebts() { return profile==='family'?debts:debts.filter(d=>d.owner===profile); }

// 資產計算
function assetValTWD(a) {
  const cat = CATS[a.type]||{cur:'TWD'};
  if(a.type==='twd_cash') return a.amt||0;
  if(a.type==='usd_cash') return (a.amt||0)*fx.usd.rate;
  if(a.type==='real_estate') return a.currentValue||a.purchasePrice||0;
  if(a.type==='crypto'||a.type==='gold') return (a.qty||0)*(a.price||0)*fx.usd.rate;
  return toTWD((a.price||0)*(a.shares||0), cat.cur);
}
function assetValNative(a) {
  const cat = CATS[a.type]||{cur:'TWD'};
  if(a.type==='twd_cash') return a.amt||0;
  if(a.type==='usd_cash') return a.amt||0;
  if(a.type==='real_estate') return a.currentValue||a.purchasePrice||0;
  if(a.type==='crypto'||a.type==='gold') return (a.qty||0)*(a.price||0);
  return (a.price||0)*(a.shares||0);
}
function assetTodayNative(a) {
  if(['twd_cash','usd_cash','real_estate'].includes(a.type)) return 0;
  const prev = a.prevPrice!=null ? a.prevPrice : (a.price||0);
  return ((a.price||0)-prev)*(a.shares||a.qty||0);
}
function assetFxPnL(a) {
  const cat = CATS[a.type]; if(!cat) return 0;
  const c = cat.cur; if(c==='TWD') return 0;
  const n = assetValNative(a);
  if(c==='USD') return n*(fx.usd.rate-fx.usd.prev);
  if(c==='GBP') return n*(fx.gbp.rate-fx.gbp.prev);
  return 0;
}
function assetCostTWD(a) {
  const cat = CATS[a.type]||{cur:'TWD'};
  if(a.type==='twd_cash') return a.amt||0;
  if(a.type==='usd_cash') return (a.amt||0)*fx.usd.rate;
  if(a.type==='real_estate') return a.purchasePrice||0;
  if(a.type==='gold') return toTWD((a.cost||0)*(a.qty||0)+(a.fee||0), 'USD');
  return toTWD((a.cost||0)*(a.shares||a.qty||0)+(a.fee||0), cat.cur);
}
function getAllFiltered() {
  return profile==='family'
    ? assets.filter(a=>familyMembers[a.owner]!==false)
    : assets.filter(a=>a.owner===profile);
}

function getScopeMetrics(scope) {
  const scopedAssets = scope==='family'
    ? assets.filter(a=>familyMembers[a.owner]!==false)
    : assets.filter(a=>a.owner===scope);
  const scopedDebts = scope==='family'
    ? debts.filter(d=>familyMembers[d.owner]!==false)
    : debts.filter(d=>d.owner===scope);
  const totalAssets = scopedAssets.reduce((s,a)=>s+assetValTWD(a),0);
  const totalDebt = scopedDebts.reduce((s,d)=>s+debtToTWD(d),0);
  return {
    totalAssets:Math.round(totalAssets),
    totalDebt:Math.round(totalDebt),
    netWorth:Math.round(totalAssets-totalDebt),
    assetCount:scopedAssets.length,
    debtCount:scopedDebts.length,
    assetTypes:[...new Set(scopedAssets.map(a=>a.type))],
  };
}

function completeInitialSetup() {
  if(gameState.onboarding.status==='complete') return;
  if(!assets.length && !debts.length) {
    alert('請先建立至少一筆資產或負債，再完成初始建檔。');
    return;
  }
  if(!confirm('完成後會以目前資料作為養成起點。未來仍可補登舊資料，且不會重複發放獎勵。確定完成建檔？')) return;
  syncGameHistoryEvents();
  const completedAt = new Date().toISOString();
  gameState.onboarding.status = 'complete';
  gameState.onboarding.completedAt = completedAt;
  gameState.baseline = {
    capturedAt:completedAt,
    fx:{usd:fx.usd.rate,gbp:fx.gbp.rate},
    me:getScopeMetrics('me'),
    wife:getScopeMetrics('wife'),
    family:getScopeMetrics('family'),
  };
  gameState.historyEvents = gameState.historyEvents.map(e=>({
    ...e,
    source:'initial_archive',
    rewardEligible:false,
    pendingAnimation:false,
  }));
  unlockAchievement({
    id:'initial_archive_complete', scope:'family', title:'完成初始建檔',
    metricValue:gameState.baseline.family.totalAssets, source:'initial_archive',
  });
  saveData();
  renderAll();
  alert('初始建檔完成！你的島嶼起始基準已保存。');
}

function renderGameSetupCard() {
  const el = document.getElementById('game-setup-card');
  if(!el) return;
  const events = collectFinancialEvents();
  const oldest = events[0]?.effectiveDate || '尚未建立資料';
  if(gameState.onboarding.status!=='complete') {
    el.className = 'game-setup-card';
    el.innerHTML = '<div class="game-setup-icon">🏝️</div>'
      +'<div class="game-setup-content"><div class="game-setup-title">正在建立你的島嶼歷史</div>'
      +'<div class="game-setup-sub">已整理 '+events.length+' 筆事件'+(events.length?' · 最早可追溯至 '+oldest:'')+'。可以分幾天補登，準備好再完成。</div></div>'
      +'<button class="btn-primary game-setup-action" onclick="completeInitialSetup()">完成初始建檔</button>';
    return;
  }
  const pending = (gameState.historyEvents||[]).filter(e=>e.pendingAnimation).length;
  if(pending>0) {
    el.className = 'game-setup-card complete';
    el.innerHTML = '<div class="game-setup-icon">📖</div>'
      +'<div class="game-setup-content"><div class="game-setup-title">島嶼歷史新增了 '+pending+' 頁</div>'
      +'<div class="game-setup-sub">新紀錄與補登資料已排進時間線，可先查看片段再收進島史。</div></div>'
      +'<button class="btn-primary game-setup-action" onclick="openGameHistoryModal()">查看片段</button>';
  } else {
    el.className = 'game-setup-card complete';
    el.innerHTML = '<div class="game-setup-icon">🌱</div>'
      +'<div class="game-setup-content"><div class="game-setup-title">島嶼起始基準已建立</div>'
      +'<div class="game-setup-sub">完成於 '+gameState.onboarding.completedAt.slice(0,10)+'，新的財務事件將從這裡開始養成。</div></div>';
  }
}

function pendingGameHistoryEvents() {
  return (gameState.historyEvents||[])
    .filter(e=>e.pendingAnimation)
    .sort((a,b)=>a.effectiveDate.localeCompare(b.effectiveDate)||a.id.localeCompare(b.id));
}

function formatGameEvent(e) {
  const labels = {
    asset_created:'新增資產',
    debt_started:'新增負債',
    dividend_received:'收到配息',
    sell:'賣出紀錄',
    transaction:'交易紀錄',
  };
  const source = e.source==='backfill' ? '補登舊資料' : '新紀錄';
  return {
    title:labels[e.kind]||labels[e.action]||'財務事件',
    source,
    detail:e.label||'未命名事件',
  };
}

function openGameHistoryModal() {
  const overlay = document.getElementById('game-history-modal-overlay');
  const list = document.getElementById('game-history-list');
  if(!overlay || !list) return;
  const events = pendingGameHistoryEvents();
  list.innerHTML = events.length ? events.map(e=>{
    const item = formatGameEvent(e);
    return '<div class="history-fragment">'
      +'<div class="history-date">'+escapeHtml(e.effectiveDate)+'</div>'
      +'<div class="history-body"><div class="history-title">'+escapeHtml(item.title)+'</div>'
      +'<div class="history-sub">'+escapeHtml(item.detail)+' · '+escapeHtml(item.source)+'</div></div>'
      +'</div>';
  }).join('') : '<div class="game-empty-note">目前沒有待查看的島史片段。</div>';
  overlay.style.display = 'flex';
}

function closeGameHistoryModal() {
  const overlay = document.getElementById('game-history-modal-overlay');
  if(overlay) overlay.style.display = 'none';
}

function gameHistoryOverlayClick(e) {
  if(e.target===document.getElementById('game-history-modal-overlay')) closeGameHistoryModal();
}

function markGameHistorySeen() {
  gameState.historyEvents = (gameState.historyEvents||[]).map(e=>e.pendingAnimation ? {...e, pendingAnimation:false} : e);
  saveData();
  closeGameHistoryModal();
  renderAll();
}

function renderGameAchievementCard() {
  const el = document.getElementById('game-achievement-card');
  if(!el) return;
  const progress = getGameProgress();
  const achievements = [...(progress.achievements||[])].sort((a,b)=>(b.unlockedAt||'').localeCompare(a.unlockedAt||''));
  if(progress.status!=='complete') {
    el.innerHTML = '<div class="game-achievement-head"><div><div class="game-achievement-title">島嶼居民</div>'
      +'<div class="game-achievement-sub">完成初始建檔後，新的紀錄才會開始解鎖居民與里程碑。</div></div>'
      +'<div class="game-achievement-count">0</div></div>';
    return;
  }
  const recent = achievements.slice(0,3);
  const cards = recent.length ? recent.map(a=>
    '<div class="resident-chip"><span class="resident-icon">'+achievementIcon(a.id)+'</span>'
    +'<span><b>'+a.title+'</b><small>'+((a.unlockedAt||'').slice(0,10)||'')+'</small></span></div>'
  ).join('') : '<div class="game-empty-note">還沒有新居民。新增完成建檔後的紀錄，就會從這裡開始。</div>';
  el.innerHTML = '<div class="game-achievement-head"><div><div class="game-achievement-title">島嶼居民</div>'
    +'<div class="game-achievement-sub">從起始基準後累積的財務行為，不會追溯初始建檔資料。</div></div>'
    +'<div class="game-achievement-count">'+achievements.length+'</div></div>'
    +'<div class="resident-list">'+cards+'</div>'
    +'<div class="game-progress-grid">'
    +'<div><span>新事件</span><b>'+progress.liveEvents+'</b></div>'
    +'<div><span>淨值成長</span><b>'+fmtTWD(progress.familyGrowth)+'</b></div>'
    +'<div><span>新類型</span><b>'+progress.addedAssetTypes+'</b></div>'
    +'<div><span>紀錄天數</span><b>'+progress.recordDays+'</b></div>'
    +'</div>';
}

function achievementIcon(id) {
  if(id==='initial_archive_complete') return '🌱';
  if(id==='first_live_event') return '✨';
  if(id==='net_growth_10k') return '⛰️';
  if(id==='asset_type_added_after_baseline') return '🧭';
  if(id==='first_dividend_after_baseline') return '🍎';
  if(id==='record_days_3') return '📘';
  return '🏅';
}

// 合併同 ticker
function groupAssets(all) {
  const map = {};
  all.forEach((a, idx) => {
    const key = a.type+'__'+(a.ticker||a.type+'_'+idx);
    if(!map[key]) map[key] = {key, type:a.type, ticker:a.ticker||'', name:a.name||'', items:[], color:(CATS[a.type]||{}).color||'#888'};
    map[key].items.push({...a, _idx: assets.indexOf(a)});
    if(TW_NAMES[a.ticker]) map[key].name = TW_NAMES[a.ticker];
  });
  return Object.values(map);
}

// 渲染首頁
function renderAll() {
  renderGameSetupCard();
  renderGameAchievementCard();
  const all = getAllFiltered();
  const totalAssets = all.reduce((s,a)=>s+assetValTWD(a),0);
  const debtTotal   = includeDebt ? totalDebtTWD() : 0;
  const totalTWD    = totalAssets - debtTotal;
  const todayTWD    = all.reduce((s,a)=>s+toTWD(assetTodayNative(a),(CATS[a.type]||{cur:'TWD'}).cur),0);
  const fxTWD       = all.reduce((s,a)=>s+assetFxPnL(a),0);
  const unrealTWD   = all.reduce((s,a)=>s+assetValTWD(a)-assetCostTWD(a),0);
  const costTWD     = all.reduce((s,a)=>s+assetCostTWD(a),0);
  const unrealPct   = costTWD ? unrealTWD/costTWD*100 : 0;
  const todayBase   = totalTWD - todayTWD;
  const todayPct    = todayBase ? todayTWD/todayBase*100 : 0;

  const lmap = {me:names.me+'的資產淨值', wife:names.wife+'的資產淨值', family:'總資產淨值'};
  document.getElementById('total-label').textContent = lmap[profile];
  document.getElementById('total-val').textContent   = fmtTWD(totalTWD);
  document.getElementById('today-sub').innerHTML =
    '今日損益 <span class="'+CLS(todayTWD)+'">'+(todayTWD>=0?'+':'')+fmtTWD(todayTWD)+'</span>（<span class="'+CLS(todayPct)+'">'+PCT(todayPct)+'</span>）';
  document.getElementById('debt-toggle-row').style.display = debts.length>0?'flex':'none';

  document.getElementById('m-unreal').textContent    = (unrealTWD>=0?'+':'')+fmtTWD(unrealTWD);
  document.getElementById('m-unreal').className      = 'mval '+CLS(unrealTWD);
  document.getElementById('m-unreal-pct').textContent = PCT(unrealPct);
  document.getElementById('m-unreal-pct').className  = 'msub '+CLS(unrealPct);
  document.getElementById('m-today').textContent     = (todayTWD>=0?'+':'')+fmtTWD(todayTWD);
  document.getElementById('m-today').className       = 'mval '+CLS(todayTWD);
  document.getElementById('m-today-pct').textContent = PCT(todayPct);
  document.getElementById('m-today-pct').className   = 'msub '+CLS(todayPct);
  const fxDisp = Math.abs(fxTWD)>1 ? (fxTWD>=0?'+':'')+fmtTWD(fxTWD) : '—';
  document.getElementById('m-fx').textContent = fxDisp;
  document.getElementById('m-fx').className   = 'mval '+(Math.abs(fxTWD)>1?CLS(fxTWD):'');
  document.getElementById('m-count').textContent = groupAssets(all).length;

  renderTrend(all, totalTWD);
  renderDonut(all);
  renderSections(all);
}

function renderTrend(all, totalTWD) {
  const today    = new Date();
  const todayISO = todayStr();
  const debtTotal= includeDebt ? totalDebtTWD() : 0;

  // 決定起始日期
  const buyDates = all.filter(a=>a.buyDate).map(a=>a.buyDate).sort();
  const earliest = buyDates[0] || todayISO;
  let startDate;
  if(chartPeriod==='1M') { startDate=new Date(today); startDate.setDate(startDate.getDate()-30); }
  else if(chartPeriod==='1Y') { startDate=new Date(today.getFullYear(),0,1); }
  else { startDate=new Date(earliest); }

  // 建立日期陣列
  const dates=[];
  const cur=new Date(startDate);
  while(cur<=today){ dates.push(cur.toISOString().split('T')[0]); cur.setDate(cur.getDate()+1); }

  // fill-forward：取最近一筆已知收盤價
  const _fwCache = {};
  function getPrice(sym, date) {
    const map = historyPrices[sym];
    if(!map) return null;
    const cacheKey = sym+'|'+date;
    if(_fwCache[cacheKey]!==undefined) return _fwCache[cacheKey];
    let last=null;
    for(const d of Object.keys(map).sort()){
      if(d<=date) last=map[d]; else break;
    }
    _fwCache[cacheKey]=last;
    return last;
  }

  const labels=[], data=[];
  dates.forEach(date => {
    const usdRate = getPrice('USDTWD=X',date) || fx.usd.rate;
    const gbpUsd  = getPrice('GBPUSD=X',date)  || (fx.gbp.rate/fx.usd.rate);
    const gbpRate = gbpUsd * usdRate;

    let dayVal=0;
    all.forEach(a=>{
      if(a.buyDate && a.buyDate>date) return;
      if(a.type==='twd_cash')     { dayVal+=a.amt||0; return; }
      if(a.type==='usd_cash')     { dayVal+=(a.amt||0)*usdRate; return; }
      if(a.type==='real_estate')  { dayVal+=a.currentValue||a.purchasePrice||0; return; }
      if(a.type==='tw_fund') {
        const nav=a.price||a.cost||0, qty=a.shares||0, fc=a.currency||'TWD';
        dayVal+=fc==='USD'?qty*nav*usdRate:qty*nav; return;
      }
      const sym=getHistorySymbol(a);
      const price=(sym?getPrice(sym,date):null)||a.price||a.cost||0;
      const qty=a.shares||a.qty||0;
      if(a.type==='tw_stock')         dayVal+=qty*price;
      else if(a.type==='us_stock')    dayVal+=qty*price*usdRate;
      else if(a.type==='uk_stock')    dayVal+=qty*price*gbpRate;
      else if(a.type==='uk_stock_usd')dayVal+=qty*price*usdRate;
      else if(a.type==='gold')        dayVal+=qty*price*usdRate;
      else if(a.type==='crypto')      dayVal+=qty*price*usdRate;
    });
    const d2=new Date(date);
    labels.push((d2.getMonth()+1)+'/'+d2.getDate());
    data.push(Math.round(dayVal-debtTotal));
  });

  if(trendChart) trendChart.destroy();
  const minVal=Math.min(...data);
  trendChart=new Chart(document.getElementById('trend-chart').getContext('2d'),{
    type:'line',
    data:{labels,datasets:[{data,borderColor:'var(--accent)',backgroundColor:'rgba(2,132,199,0.07)',borderWidth:2,pointRadius:0,fill:true,tension:0.3}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:i=>'TWD '+i.raw.toLocaleString()}}},
      scales:{
        x:{ticks:{maxTicksLimit:6,color:'var(--text2)'},grid:{display:false},border:{display:false}},
        y:{min:minVal<0?minVal*1.1:minVal*0.95,
           ticks:{callback:v=>Math.abs(v)>=10000?(v/10000).toFixed(0)+'萬':v,color:'var(--text2)',maxTicksLimit:4},
           grid:{color:'rgba(128,128,128,0.1)'},border:{display:false}}
      }
    }
  });
}

async function fetchAndRenderHistory() {
  if(historyFetching) return;
  historyFetching=true;
  const all=getAllFiltered();
  const yahooRange = chartPeriod==='1M'?'1mo':chartPeriod==='1Y'?'ytd':'max';
  const cryptoDays = chartPeriod==='1M'?'30':chartPeriod==='1Y'?'365':'max';

  const yahooSyms=new Set(['USDTWD=X','GBPUSD=X']);
  const cryptoMap={};
  all.forEach(a=>{
    if(['twd_cash','usd_cash','real_estate','tw_fund'].includes(a.type)) return;
    if(a.type==='crypto'){
      const id=CRYPTO_IDS[a.ticker?.toUpperCase()];
      if(id) cryptoMap[a.ticker]=id;
    } else {
      const sym=getHistorySymbol(a);
      if(sym) yahooSyms.add(sym);
    }
  });

  try {
    await Promise.all([
      ...[...yahooSyms].map(async sym=>{
        const map=await proxyHistory(sym, yahooRange);
        if(Object.keys(map).length){
          historyPrices[sym]=map;
          if(sym==='USDTWD=X') historyFX['USDTWD']=map;
          if(sym==='GBPUSD=X') historyFX['GBPUSD']=map;
        }
      }),
      ...Object.entries(cryptoMap).map(async([ticker,id])=>{
        const map=await proxyCryptoHistory(id, cryptoDays);
        if(Object.keys(map).length) historyPrices['crypto_'+ticker]=map;
      })
    ]);
  } catch(e){ console.warn('history fetch error',e); }

  historyFetching=false;
  // 用真實歷史資料重繪趨勢圖
  const all2=getAllFiltered();
  const totalTWD2=all2.reduce((s,a)=>s+assetValTWD(a),0)-(includeDebt?totalDebtTWD():0);
  renderTrend(all2, totalTWD2);
}

function renderDonut(all) {
  const groups = groupAssets(all);
  let slices = [];
  if(dim==='detail') {
    const MERGE = new Set(['twd_cash','usd_cash','real_estate','gold']);
    const sliceMap = {};
    groups.forEach(g => {
      const key   = MERGE.has(g.type) ? g.type
                  : g.ticker ? g.type+'_'+g.ticker
                  : (g.items[0]?.fundCode ? 'fund_'+g.items[0].fundCode : g.key);
      const label = MERGE.has(g.type) ? (CATS[g.type]?.label||g.type)
                  : g.ticker ? g.ticker
                  : (g.name||CATS[g.type]?.label||g.type);
      if(!sliceMap[key]) sliceMap[key]={label,value:0,color:g.color};
      sliceMap[key].value += g.items.reduce((s,a)=>s+assetValTWD(a),0);
    });
    slices = Object.values(sliceMap);
  } else {
    Object.entries(TYPE_GROUPS).forEach(([n,g]) => {
      const v = all.filter(a=>g.types.includes(a.type)).reduce((s,a)=>s+assetValTWD(a),0);
      if(v>0) slices.push({label:n, value:v, color:g.color});
    });
  }
  slices.sort((a,b)=>b.value-a.value);
  const total = slices.reduce((s,x)=>s+x.value,0)||1;
  const dcLbl={me:names.me+'資產',wife:names.wife+'資產',family:'總資產'};
  document.getElementById('dc-label').textContent = dcLbl[profile]||'總資產';
  document.getElementById('dc-sub').textContent   = fmtTWD(total);
  if(donutChart) donutChart.destroy();
  donutChart = new Chart(document.getElementById('donut-chart').getContext('2d'), {
    type:'doughnut',
    data:{labels:slices.map(s=>s.label), datasets:[{data:slices.map(s=>s.value), backgroundColor:slices.map(s=>s.color), borderWidth:2, borderColor:'transparent', hoverOffset:6}]},
    options:{responsive:true, maintainAspectRatio:true, cutout:'68%',
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:i=>' '+i.label+': '+fmtTWD(i.raw)+' ('+(i.raw/total*100).toFixed(1)+'%)'}}}}
  });
  document.getElementById('donut-legend').innerHTML = slices.map(s=>
    '<div class="legend-item"><span class="legend-dot" style="background:'+s.color+'"></span>'+
    '<span class="legend-name">'+s.label+'</span>'+
    '<span class="legend-amt">'+fmtTWD(s.value)+'</span>'+
    '<span class="legend-pct">'+(s.value/total*100).toFixed(1)+'%</span></div>'
  ).join('');
}

function renderSections(all) {
  const groups = groupAssets(all);
  // 依類別排序
  const catOrder = Object.keys(CATS);
  groups.sort((a,b)=>catOrder.indexOf(a.type)-catOrder.indexOf(b.type));

  // 按類別分組
  const byCat = {};
  groups.forEach(g => {
    if(!byCat[g.type]) byCat[g.type] = [];
    byCat[g.type].push(g);
  });

  document.getElementById('asset-sections').innerHTML = catOrder.map(k => {
    if(!byCat[k]) return '';
    const cat    = CATS[k];
    const catTWD = byCat[k].reduce((s,g)=>s+g.items.reduce((ss,a)=>ss+assetValTWD(a),0),0);
    const hasFx  = ['us_stock','uk_stock','uk_stock_usd','usd_cash','crypto','gold'].includes(k);
    const rows   = byCat[k].map(g => {
      const groupVal   = g.items.reduce((s,a)=>s+assetValTWD(a),0);
      const groupToday = g.items.reduce((s,a)=>s+assetTodayNative(a),0);
      const hasNoPrev  = g.items.some(a=>a.prevPriceSource==='missing');
      const groupFx    = g.items.reduce((s,a)=>s+assetFxPnL(a),0);
      const groupUnreal= g.items.reduce((s,a)=>{
        if(a.type==='real_estate') return s+(a.currentValue||a.purchasePrice||0)-(a.purchasePrice||0);
        if(['twd_cash','usd_cash'].includes(a.type)) return s;
        return s+assetValNative(a)-(a.cost||0)*(a.shares||a.qty||0)-(a.fee||0);
      },0);
      const groupCost  = g.items.reduce((s,a)=>s+(a.cost||0)*(a.shares||a.qty||0),0);
      const unrealPct  = groupCost ? groupUnreal/groupCost*100 : 0;
      const totalShares= g.items.reduce((s,a)=>s+(a.shares||a.qty||0),0);
      const avgCost    = totalShares>0 ? g.items.reduce((s,a)=>s+(a.cost||0)*(a.shares||a.qty||0),0)/totalShares : 0;
      const curPrice   = g.items[0]?.price || 0;
      const isCash     = ['twd_cash','usd_cash'].includes(k);
      const isRE       = k==='real_estate';
      const liveTag    = g.items.some(a=>a.priceSource==='live') ? '<span class="live-dot">●</span>' : '';
      const fxCell     = hasFx&&Math.abs(groupFx)>0
        ? '<div class="'+CLS(groupFx)+'" style="font-size:12px">'+(groupFx>=0?'+':'')+fmtTWD(groupFx)+'</div>'
        : '<span style="color:var(--text3)">—</span>';

      if(isCash) return '<tr onclick="openGroupDetail(\''+g.key+'\')">'
        +'<td><div class="ticker-main">'+(g.items[0]?.note||cat.label)+'</div>'
        +'<div class="ticker-sub">'+(g.items[0]?.owner==='me'?names.me:names.wife)+'</div></td>'
        +'<td><span class="badge '+cat.badge+'">'+cat.label+'</span></td>'
        +'<td class="rc" style="color:var(--text3)">—</td>'
        +'<td class="rc" style="color:var(--text3)">—</td>'
        +'<td class="rc" style="color:var(--text3)">—</td>'
        +'<td class="rc">'+fxCell+'</td>'
        +'<td class="rc"><div style="font-weight:700;font-size:13px">'+fmtCur(g.items[0]?.amt||0,cat.cur)+'</div></td></tr>';

      if(isRE) return '<tr onclick="openGroupDetail(\''+g.key+'\')">'
        +'<td><div class="ticker-main">'+(g.items[0]?.address||'不動產')+'</div>'
        +'<div class="ticker-sub">'+(g.items[0]?.owner==='me'?names.me:names.wife)+(g.items[0]?.area?' · '+g.items[0].area+'坪':'')+'</div></td>'
        +'<td><span class="badge">不動產</span></td>'
        +'<td class="rc" style="color:var(--text3)">—</td>'
        +'<td class="rc">'+fmtTWD(g.items[0]?.purchasePrice||0)+'</td>'
        +'<td class="rc" style="color:var(--text3)">—</td>'
        +'<td class="rc" style="color:var(--text3)">—</td>'
        +'<td class="rc"><div style="font-weight:700">'+fmtTWD(groupVal)+'</div>'
        +'<div class="mini '+CLS(groupUnreal)+'">'+(groupUnreal>=0?'+':'')+fmtTWD(groupUnreal)+'</div></td></tr>';

      const dispName = g.name&&g.name!==g.ticker ? g.name : '';
      return '<tr onclick="openGroupDetail(\''+g.key+'\')">'
        +'<td><div class="ticker-main">'+g.ticker+liveTag+'</div>'
        +'<div class="ticker-sub">'+dispName+(g.items.length>1?' ('+g.items.length+'筆)':'')+'</div></td>'
        +'<td><span class="badge '+cat.badge+'">'+cat.label+'</span></td>'
        +'<td class="rc"><div style="font-size:12px">'+totalShares.toLocaleString()+'</div>'
        +'<div class="mini">@ '+(curPrice?Number(curPrice).toFixed(2):'—')+'</div></td>'
        +'<td class="rc"><div style="font-size:12px">'+(avgCost?fmtCur(avgCost,cat.cur):'—')+'</div></td>'
        +'<td class="rc"><div class="'+(hasNoPrev?'':CLS(groupToday))+'" style="font-size:12px">'+(hasNoPrev?'<span style="color:var(--text3);font-size:10px">N/A</span>':(groupToday?(groupToday>=0?'+':'')+fmtCur(groupToday,cat.cur):'—'))+'</div></td>'
        +'<td class="rc">'+fxCell+'</td>'
        +'<td class="rc"><div style="font-weight:700;font-size:12px">'+fmtCur(g.items.reduce((s,a)=>s+assetValNative(a),0),cat.cur)+'</div>'
        +'<div class="mini '+CLS(groupUnreal)+'">'+(groupUnreal?(groupUnreal>=0?'+':'')+fmtCur(groupUnreal,cat.cur)+' ('+PCT(unrealPct)+')':'—')+'</div></td></tr>';
    }).join('');

    return '<div class="cat-section">'
      +'<div class="cat-header"><span class="cat-dot" style="background:'+cat.color+'"></span>'
      +'<span class="cat-title">'+cat.label+'</span>'
      +'<span class="cat-sub">'+cat.cur+'</span>'
      +'<span class="cat-total">'+fmtTWD(catTWD)+'</span></div>'
      +'<div class="card"><div style="overflow-x:auto"><table><thead><tr>'
      +'<th style="width:18%">標的</th><th style="width:10%">類別</th>'
      +'<th style="width:13%;text-align:right">股數／現價</th>'
      +'<th style="width:13%;text-align:right">均價</th>'
      +'<th style="width:14%;text-align:right">今日損益</th>'
      +'<th style="width:12%;text-align:right">匯率損益</th>'
      +'<th style="width:20%;text-align:right">未實現損益</th>'
      +'</tr></thead><tbody>'+rows+'</tbody></table></div></div></div>';
  }).join('');
}

// 標的明細 Modal
function openGroupDetail(key) {
  const all = getAllFiltered();
  const group = groupAssets(all).find(g=>g.key===key);
  if(!group) return;
  detailAsset = group;
  const type = group.type;
  const cat = CATS[type]||{cur:'TWD'};
  const modal = document.getElementById('detail-modal');
  const title = document.getElementById('detail-modal-title');
  const body  = document.getElementById('detail-modal-body');
  title.textContent = (group.name||group.ticker||cat.label) + ' 明細';
  const sortedItems = [...group.items].sort((a,b)=>(a.buyDate||'').localeCompare(b.buyDate||''));
  body.innerHTML = sortedItems.map(a => {
    const idx = a._idx;
    const isCash = ['twd_cash','usd_cash'].includes(a.type);
    const isRE   = a.type==='real_estate';
    const isGold = a.type==='gold';
    const costTotal = fmtCur((a.cost||0)*(a.shares||a.qty||0)+(a.fee||0), cat.cur);
    if(isCash) return '<div class="detail-row" onclick="openEditModal('+idx+')">'
      +'<div><div class="detail-main">'+(a.note||cat.label)+'</div>'
      +'<div class="detail-sub">'+(a.owner==='me'?names.me:names.wife)+'</div></div>'
      +'<div class="detail-val">'+fmtCur(a.amt||0,cat.cur)+'</div></div>';
    if(isRE) return '<div class="detail-row" onclick="openEditModal('+idx+')">'
      +'<div><div class="detail-main">'+(a.address||'不動產')+'</div>'
      +'<div class="detail-sub">'+(a.buyDate||'')+(a.area?' · '+a.area+'坪':'')+'</div></div>'
      +'<div class="detail-val">'+fmtTWD(a.currentValue||a.purchasePrice||0)+'</div></div>';
    return '<div class="detail-row" onclick="openEditModal('+idx+')">'
      +'<div><div class="detail-main">'+(isGold?(a.qty||0)+' oz':'股數 '+(a.shares||a.qty||0))+'</div>'
      +'<div class="detail-sub">均價 '+fmtCur(a.cost||0,cat.cur)+(a.buyDate?' · '+a.buyDate:'')+'</div></div>'
      +'<div class="detail-val">'+costTotal+'</div></div>';
  }).join('');

  // 累計手續費
  const totalFee=group.items.reduce((s,a)=>s+(a.fee||0),0);
  if(totalFee>0) body.innerHTML+='<div style="padding:8px 0;font-size:12px;color:var(--text2);border-top:1px solid var(--border);margin-top:8px">累計手續費：<span style="font-weight:600;color:var(--text)">'+fmtCur(totalFee,cat.cur)+'</span></div>';
  // 新增按鈕
  body.innerHTML += '<button class="btn-primary" style="width:100%;margin-top:12px;justify-content:center" onclick="addToGroup()"><i class="ti ti-plus"></i> 新增一筆</button>';
  if(!['twd_cash','usd_cash','real_estate'].includes(type)) {
    body.innerHTML += '<button class="btn-secondary" style="width:100%;margin-top:8px;justify-content:center;color:var(--red)" onclick="openSellModal()"><i class="ti ti-trending-down"></i> 賣出</button>';
    body.innerHTML += '<button class="btn-secondary" style="width:100%;margin-top:8px;justify-content:center" onclick="openDividendModal()"><i class="ti ti-coins"></i> 新增配息</button>';
  }
  // 賣出紀錄區塊
  const sellRecs = transactions.filter(t=>t.action==='sell'&&t.ticker===group.ticker&&t.type===group.type).sort((a,b)=>b.date.localeCompare(a.date));
  if(sellRecs.length > 0) {
    body.innerHTML += '<div style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px">'
      +'<div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:8px"><i class="ti ti-arrows-exchange" style="font-size:12px;vertical-align:-1px"></i> 賣出紀錄</div>'
      + sellRecs.map(t=>{
        const pnlCls = t.realizedPnL>=0?'pos':'neg';
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">'
          +'<div><div style="font-size:13px;font-weight:600" class="'+pnlCls+'">'+fmtCur(t.realizedPnL,t.currency)+'</div>'
          +'<div style="font-size:11px;color:var(--text2);margin-top:2px">'+t.date+' · 賣 '+t.shares+' 股 @ '+fmtCur(t.sellPrice,t.currency)+'</div></div>'
          +'<div style="text-align:right;font-size:11px;color:var(--text2)">淨收入<br><span style="font-weight:600;color:var(--text)">'+fmtCur(t.netProceeds,t.currency)+'</span></div></div>';
      }).join('')
      +'</div>';
  }
  // 配息紀錄區塊
  const divRecs = dividends.filter(d=>d.sourceKey===key).sort((a,b)=>b.date.localeCompare(a.date));
  if(divRecs.length > 0) {
    body.innerHTML += '<div style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px">'
      +'<div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:8px"><i class="ti ti-coins" style="font-size:12px;vertical-align:-1px"></i> 配息紀錄</div>'
      + divRecs.map(d => {
        const destLabel = d.destination==='cash'
          ? '存入 '+(d.cashLabel||'現金帳戶')
          : '再投入 '+(d.targetName||d.targetTicker||'')+(d.targetShares?' · '+d.targetShares+' 股':'');
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">'
          +'<div><div style="font-size:13px;font-weight:600;color:var(--text)">'+fmtCur(d.amount,d.currency)+'</div>'
          +'<div style="font-size:11px;color:var(--text2);margin-top:2px">'+d.date+' · '+destLabel+'</div></div></div>';
      }).join('')
      +'</div>';
  }
  document.getElementById('detail-modal-overlay').style.display = 'flex';
}
function addToGroup() {
  if(!detailAsset) return;
  closeDetailModal();
  selType = detailAsset.type;
  if(detailAsset.type==='uk_stock_usd') selUKCur='USD';
  else if(detailAsset.type==='uk_stock') selUKCur='GBP';
  openAddModal();
  // 預填 ticker
  setTimeout(()=>{
    const f = document.getElementById('f-ticker');
    if(f && detailAsset.ticker) { f.value=detailAsset.ticker; }
    const fn = document.getElementById('f-name');
    if(fn && detailAsset.name) fn.value=detailAsset.name;
  }, 50);
}
function closeDetailModal() {
  document.getElementById('detail-modal-overlay').style.display = 'none';
}
function detailOverlayClick(e) {
  if(e.target===document.getElementById('detail-modal-overlay')) closeDetailModal();
}

// 賣出 Modal
function openSellModal() {
  if(!detailAsset) return;
  const isGold   = detailAsset.type==='gold';
  const isCrypto = detailAsset.type==='crypto';
  const isTWStock= detailAsset.type==='tw_stock';
  const cat = CATS[detailAsset.type]||{cur:'TWD'};
  document.getElementById('sell-modal-title').textContent = (detailAsset.name||detailAsset.ticker||'') + ' 賣出';
  document.getElementById('sell-date').value   = todayStr();
  document.getElementById('sell-shares').value = '';
  document.getElementById('sell-price').value  = '';
  document.getElementById('sell-fee').value    = '';
  document.getElementById('sell-tax').value    = '';
  document.getElementById('sell-shares-label').textContent = isGold ? '賣出盎司數' : isCrypto ? '賣出數量' : '賣出股數';
  document.getElementById('sell-tax-hint').textContent = isTWStock ? '台股賣出預設 0.3%（可修改）' : '';
  document.getElementById('sell-preview').style.display = 'none';
  // 台股預填交易稅（等使用者輸入價格和股數後再自動算，這裡先清空）
  document.getElementById('sell-modal-overlay').style.display = 'flex';
}
function closeSellModal() {
  document.getElementById('sell-modal-overlay').style.display = 'none';
}
function sellOverlayClick(e) {
  if(e.target===document.getElementById('sell-modal-overlay')) closeSellModal();
}

// FIFO 批次配對
function fifoMatch(group, sharesToSell) {
  const isQty = ['crypto','gold'].includes(group.type);
  const lots = [...group.items]
    .sort((a,b)=>(a.buyDate||'').localeCompare(b.buyDate||''))
    .filter(a => {
      const rem = a.sharesRemaining ?? (isQty ? (a.qty||0) : (a.shares||0));
      return rem > 0;
    });
  let remaining = sharesToSell;
  const matched = [];
  for(const lot of lots) {
    if(remaining <= 0) break;
    const lotTotal    = isQty ? (lot.qty||0) : (lot.shares||0);
    const lotRemaining= lot.sharesRemaining ?? lotTotal;
    const take        = Math.min(lotRemaining, remaining);
    if(take <= 0) continue;
    const allocatedBuyFee = lotTotal > 0 ? (lot.fee||0) * (take / lotTotal) : 0;
    matched.push({ lotId: lot.id||('lot_'+lot._idx), lotIdx: lot._idx, shares: take, unitCost: lot.cost||0, allocatedBuyFee, buyDate: lot.buyDate||'' });
    remaining -= take;
  }
  return { matched, unfilled: Math.max(0, remaining) };
}

function updateSellPreview() {
  if(!detailAsset) return;
  const shares = parseFloat(document.getElementById('sell-shares').value)||0;
  const price  = parseFloat(document.getElementById('sell-price').value)||0;
  const fee    = parseFloat(document.getElementById('sell-fee').value)||0;
  const isTWStock = detailAsset.type==='tw_stock';
  // 台股自動計算交易稅
  if(isTWStock && shares && price && !document.getElementById('sell-tax').value) {
    document.getElementById('sell-tax').value = (shares * price * 0.003).toFixed(0);
  }
  const tax = parseFloat(document.getElementById('sell-tax').value)||0;
  const preview = document.getElementById('sell-preview');
  if(!shares || !price) { preview.style.display='none'; return; }
  const { matched, unfilled } = fifoMatch(detailAsset, shares);
  const cat = CATS[detailAsset.type]||{cur:'TWD'};
  const cur = cat.cur;
  const grossProceeds = shares * price;
  const netProceeds   = grossProceeds - fee - tax;
  const costBasis     = matched.reduce((s,m)=>s + m.shares*m.unitCost + m.allocatedBuyFee, 0);
  const pnl           = netProceeds - costBasis;
  const lotsHtml = matched.length > 0
    ? '<div style="font-weight:600;color:var(--text);margin-bottom:4px">本次將售出批次：</div>'
      + matched.map(m=>'<div>'+m.buyDate+' 批 · '+m.shares+' 股 @ '+fmtCur(m.unitCost,cur)+'</div>').join('')
      + (unfilled>0 ? '<div style="color:var(--red);margin-top:4px">⚠️ 持倉不足，尚缺 '+unfilled+' 股</div>' : '')
    : '<div style="color:var(--red)">無可用批次</div>';
  document.getElementById('sell-preview-lots').innerHTML = lotsHtml;
  document.getElementById('sp-gross').textContent = fmtCur(grossProceeds, cur);
  document.getElementById('sp-fees').textContent  = '−'+fmtCur(fee+tax, cur);
  document.getElementById('sp-cost').textContent  = '−'+fmtCur(costBasis, cur);
  document.getElementById('sp-pnl').innerHTML = '<span class="'+(pnl>=0?'pos':'neg')+'" style="font-size:14px">'+fmtCur(pnl,cur)+'</span>';
  preview.style.display = 'block';
}

function submitSell() {
  if(!detailAsset) return;
  const date   = document.getElementById('sell-date').value || todayStr();
  const shares = parseFloat(document.getElementById('sell-shares').value)||0;
  const price  = parseFloat(document.getElementById('sell-price').value)||0;
  const fee    = parseFloat(document.getElementById('sell-fee').value)||0;
  const tax    = parseFloat(document.getElementById('sell-tax').value)||0;
  if(!shares||!price) return;
  const { matched, unfilled } = fifoMatch(detailAsset, shares);
  if(unfilled > 0) { alert('持倉數量不足，最多可賣出 '+(shares-unfilled)+' 股'); return; }
  const cat = CATS[detailAsset.type]||{cur:'TWD'};
  const cur = cat.cur;
  const isQty = ['crypto','gold'].includes(detailAsset.type);
  const grossProceeds = shares * price;
  const netProceeds   = grossProceeds - fee - tax;
  const costBasis     = matched.reduce((s,m)=>s + m.shares*m.unitCost + m.allocatedBuyFee, 0);
  const realizedPnL   = netProceeds - costBasis;
  const fxRate = cur==='USD' ? fx.usd.rate : cur==='GBP' ? fx.gbp.rate : 1;

  const record = {
    id: makeId('transaction'), action:'sell', date, effectiveDate:eventDate(date), recordedAt:new Date().toISOString(),
    ticker: detailAsset.ticker, name: detailAsset.name||detailAsset.ticker,
    type: detailAsset.type, owner: detailAsset.items[0]?.owner||'me', currency: cur,
    shares, sellPrice: price, grossProceeds, sellFee: fee, transactionTax: tax,
    netProceeds, costBasis, realizedPnL, fxRate, realizedPnLTWD: realizedPnL * fxRate,
    matchedLots: matched
  };

  // FIFO 扣減各批次剩餘數量
  matched.forEach(m => {
    const idx = m.lotIdx;
    if(idx == null || !assets[idx]) return;
    const a = assets[idx];
    const cur = isQty ? (a.qty||0) : (a.shares||0);
    const next = +(cur - m.shares).toFixed(8);
    if(next <= 0) {
      a._toDelete = true;
    } else {
      if(isQty) a.qty = next; else a.shares = next;
      a.sharesRemaining = next;
    }
  });
  assets = assets.filter(a => !a._toDelete);

  transactions.push(record);
  const srcKey = detailAsset.key;
  saveData();
  closeSellModal();
  renderAll();
  // 若該標的還有剩餘持倉則重開明細
  const stillExists = groupAssets(getAllFiltered()).find(g=>g.key===srcKey);
  if(stillExists) openGroupDetail(srcKey); else closeDetailModal();
}

// 配息 Modal
function openDividendModal() {
  if(!detailAsset) return;
  const cat = CATS[detailAsset.type]||{cur:'TWD'};
  document.getElementById('div-date').value = todayStr();
  document.getElementById('div-amount').value = '';
  document.getElementById('div-currency').value = cat.cur;

  // 填入現金帳戶選項（全部現金資產，不限 profile）
  const cashSel = document.getElementById('div-cash-account');
  cashSel.innerHTML = '';
  assets.forEach((a, idx) => {
    if(!['twd_cash','usd_cash'].includes(a.type)) return;
    const c = CATS[a.type];
    cashSel.innerHTML += '<option value="'+idx+'">'+(a.note||c.label)+' · '+(a.owner==='me'?names.me:names.wife)+' ('+fmtCur(a.amt||0,c.cur)+')</option>';
  });
  if(!cashSel.options.length) cashSel.innerHTML = '<option value="">（尚無現金帳戶）</option>';

  // 填入再投入標的選項（全部非現金、非不動產標的）
  const targetSel = document.getElementById('div-target-asset');
  targetSel.innerHTML = '';
  groupAssets(assets).forEach(g => {
    if(['twd_cash','usd_cash','real_estate'].includes(g.type)) return;
    const c = CATS[g.type]||{};
    targetSel.innerHTML += '<option value="'+g.key+'">'+(g.name||g.ticker||g.key)+' ('+c.label+')</option>';
  });
  if(!targetSel.options.length) targetSel.innerHTML = '<option value="">（尚無投資標的）</option>';

  setDivDest('cash');
  document.getElementById('dividend-modal-overlay').style.display = 'flex';
}
function closeDividendModal() {
  document.getElementById('dividend-modal-overlay').style.display = 'none';
}
function divOverlayClick(e) {
  if(e.target===document.getElementById('dividend-modal-overlay')) closeDividendModal();
}
function setDivDest(d) {
  divDest = d;
  document.getElementById('div-dest-cash').classList.toggle('active', d==='cash');
  document.getElementById('div-dest-reinvest').classList.toggle('active', d==='reinvest');
  document.getElementById('div-cash-section').style.display = d==='cash' ? '' : 'none';
  document.getElementById('div-reinvest-section').style.display = d==='reinvest' ? '' : 'none';
}
function submitDividend() {
  if(!detailAsset) return;
  const date = document.getElementById('div-date').value || todayStr();
  const amount = parseFloat(document.getElementById('div-amount').value)||0;
  if(!amount) return;
  const currency = document.getElementById('div-currency').value;
  const sourceName = detailAsset.name||detailAsset.ticker||detailAsset.key;

  const record = {
    id:makeId('dividend'), date, effectiveDate:eventDate(date), recordedAt:new Date().toISOString(),
    amount, currency, sourceKey:detailAsset.key, sourceName, destination:divDest,
    owner:detailAsset.items?.[0]?.owner||null
  };

  if(divDest === 'cash') {
    const cashIdx = parseInt(document.getElementById('div-cash-account').value);
    if(isNaN(cashIdx) || !assets[cashIdx]) return;
    assets[cashIdx].amt = (assets[cashIdx].amt||0) + amount;
    const ca = assets[cashIdx];
    record.cashIdx = cashIdx;
    record.cashLabel = (ca.note||CATS[ca.type].label)+' · '+(ca.owner==='me'?names.me:names.wife);
    record.cashType = ca.type;
  } else {
    const targetKey = document.getElementById('div-target-asset').value;
    if(!targetKey) return;
    const shares = parseFloat(document.getElementById('div-shares').value)||0;
    const price  = parseFloat(document.getElementById('div-price').value)||0;
    const fee    = parseFloat(document.getElementById('div-fee').value)||0;
    if(!shares||!price) return;

    const tg = groupAssets(assets).find(g=>g.key===targetKey);
    if(!tg) return;
    const fi = tg.items[0];
    const ttype = tg.type;
    let newPos;
    if(ttype==='tw_fund') {
      newPos = {type:ttype,fundCode:fi?.fundCode||'',name:tg.name,shares,cost:price,fee,price:fi?.price||price,prevPrice:fi?.prevPrice||price,currency:fi?.currency||'TWD',owner:fi?.owner||'me',buyDate:date,effectiveDate:eventDate(date),recordedAt:new Date().toISOString(),priceSource:''};
    } else if(ttype==='crypto') {
      newPos = {type:ttype,ticker:tg.ticker,qty:shares,cost:price,fee,price:fi?.price||price,prevPrice:fi?.prevPrice||price,owner:fi?.owner||'me',buyDate:date,effectiveDate:eventDate(date),recordedAt:new Date().toISOString(),note:'配息再投入',priceSource:''};
    } else if(ttype==='gold') {
      newPos = {type:ttype,qty:shares,cost:price,fee,price:fi?.price||price,prevPrice:fi?.prevPrice||price,owner:fi?.owner||'me',buyDate:date,effectiveDate:eventDate(date),recordedAt:new Date().toISOString(),note:'配息再投入',priceSource:''};
    } else {
      newPos = {type:ttype,ticker:tg.ticker,name:tg.name,shares,cost:price,fee,feeType:'manual',feePct:fi?.feePct||0.1425,feeManual:fee,price:fi?.price||price,prevPrice:fi?.prevPrice||price,owner:fi?.owner||'me',buyDate:date,effectiveDate:eventDate(date),recordedAt:new Date().toISOString(),note:'配息再投入',priceSource:''};
    }
    newPos.id = makeId('asset');
    newPos.sharesRemaining = newPos.shares || newPos.qty || 0;
    assets.push(newPos);
    record.targetKey = targetKey;
    record.targetTicker = tg.ticker;
    record.targetName = tg.name||tg.ticker;
    record.targetShares = shares;
    record.targetPrice = price;
    record.targetFee = fee;
  }

  dividends.push(record);
  const srcKey = detailAsset.key;
  saveData();
  closeDividendModal();
  // 重開明細 Modal 以顯示最新配息紀錄
  openGroupDetail(srcKey);
}

// 基金搜尋
let fundSearchTimer = null;
function onFundInput() {
  clearTimeout(fundSearchTimer);
  const q = document.getElementById('f-fund-search').value.trim();
  const dd = document.getElementById('ac-fund-dd');
  if(!q) { dd.style.display='none'; return; }
  dd.innerHTML = '<div class="ac-item" style="color:var(--text2)">搜尋中…</div>';
  dd.style.display = 'block';
  fundSearchTimer = setTimeout(async () => {
    try {
      const results = await proxyFundSearch(q);
      if(!results.length) { dd.innerHTML='<div class="ac-item" style="color:var(--text2)">找不到結果</div>'; return; }
      dd.innerHTML = results.slice(0,10).map(f=>
        '<div class="ac-item" onclick="selectFund(\''+f.id.replace(/'/g,"\\'")+'\',' +
        '\''+f.name.replace(/'/g,"\\'")+'\',\''+f.currency+'\','+f.nav+',\''+f.type+'\')">'
        +'<span class="ac-sym">'+f.id+'</span>'
        +'<span class="ac-name">'+f.name+'<span style="color:var(--text3);font-size:10px"> · '+(f.type==='domestic'?'境內':'境外')+' '+f.currency+'</span></span></div>'
      ).join('');
    } catch { dd.innerHTML='<div class="ac-item" style="color:var(--red)">搜尋失敗</div>'; }
  }, 500);
}
function selectFund(id, name, currency, nav, fundType) {
  document.getElementById('f-fund-search').value = name;
  document.getElementById('f-fund-code').value   = id;
  document.getElementById('f-fund-name').value   = name;
  document.getElementById('f-fund-cur').value    = currency;
  document.getElementById('f-fund-nav').value    = nav || '';
  document.getElementById('ac-fund-dd').style.display = 'none';
}

// 股票搜尋
let acSearchTimer = null;
function onTickerInput() {
  clearTimeout(acSearchTimer);
  const q  = document.getElementById('f-ticker').value.trim();
  const dd = document.getElementById('ac-dropdown');
  if(!q) { dd.style.display='none'; return; }
  dd.innerHTML = '<div class="ac-item" style="color:var(--text2)">搜尋中…</div>';
  dd.style.display = 'block';
  acSearchTimer = setTimeout(async () => {
    try {
      const results = await proxySearch(q, selType);
      if(!results.length) { dd.innerHTML='<div class="ac-item" style="color:var(--text2)">找不到，請直接輸入代碼</div>'; return; }
      dd.innerHTML = results.slice(0,8).map(x => {
        const raw  = x.symbol||'';
        const disp = raw.replace(/\.(TW|L)$/,'');
        const name = TW_NAMES[disp]||x.description||disp;
        return '<div class="ac-item" onclick="selectTicker(\''+raw.replace(/'/g,"\\'")+'\',' +
          '\''+name.replace(/'/g,"\\'")+'\')"><span class="ac-sym">'+disp+'</span><span class="ac-name">'+name+'</span></div>';
      }).join('');
    } catch { dd.innerHTML='<div class="ac-item" style="color:var(--red)">搜尋失敗</div>'; }
  }, 500);
}
async function selectTicker(rawSym, name) {
  const disp = rawSym.replace(/\.(TW|L)$/,'');
  document.getElementById('f-ticker').value = disp;
  document.getElementById('f-name').value   = TW_NAMES[disp]||name;
  document.getElementById('ac-dropdown').style.display = 'none';
  const statusEl = document.getElementById('price-status');
  const priceEl  = document.getElementById('f-price');
  statusEl.textContent = '查詢即時報價…'; statusEl.className = 'price-status price-loading';
  try {
    const q = await proxyQuote(rawSym);
    priceEl.value = q.price; priceEl.dataset.prevClose = q.prevClose;
    if(q.name && !TW_NAMES[disp]) document.getElementById('f-name').value = q.name;
    statusEl.textContent = '✓ 即時報價'; statusEl.className = 'price-status price-ok';
  } catch { statusEl.textContent = '查詢失敗，請手動輸入'; statusEl.className = 'price-status price-err'; }
}
function hideAC() { document.getElementById('ac-dropdown').style.display='none'; }

// 加密貨幣
function onCryptoInput() {
  const q  = document.getElementById('f-cry-ticker').value.trim().toUpperCase();
  const dd = document.getElementById('ac-crypto-dd');
  if(!q) { dd.style.display='none'; return; }
  const matches = Object.keys(CRYPTO_IDS).filter(s=>s.startsWith(q));
  if(!matches.length) { dd.style.display='none'; return; }
  dd.innerHTML = matches.map(s=>'<div class="ac-item" onclick="selectCrypto(\''+s+'\')"><span class="ac-sym">'+s+'</span></div>').join('');
  dd.style.display = 'block';
}
async function selectCrypto(sym) {
  document.getElementById('f-cry-ticker').value = sym;
  document.getElementById('ac-crypto-dd').style.display = 'none';
  const statusEl = document.getElementById('cry-price-status');
  const priceEl  = document.getElementById('f-cry-price');
  statusEl.textContent = '查詢即時報價…'; statusEl.className = 'price-status price-loading';
  try {
    const id = CRYPTO_IDS[sym]||sym.toLowerCase();
    const d  = await proxyCrypto(id);
    const e  = d[id]; if(!e) throw new Error('no data');
    priceEl.value = e.usd.toFixed(2);
    priceEl.dataset.prevClose = (e.usd/(1+(e.usd_24h_change||0)/100)).toFixed(2);
    statusEl.textContent = '✓ 即時報價'; statusEl.className = 'price-status price-ok';
  } catch { statusEl.textContent = '查詢失敗'; statusEl.className = 'price-status price-err'; }
}

// 黃金
async function fetchGoldPrice() {
  const statusEl = document.getElementById('gold-price-status');
  const priceEl  = document.getElementById('f-gold-price');
  statusEl.textContent = '查詢中…'; statusEl.className = 'price-status price-loading';
  try {
    const q = await proxyQuote('GC=F');
    priceEl.value = q.price.toFixed(2); priceEl.dataset.prevClose = q.prevClose;
    statusEl.textContent = '✓ USD/盎司'; statusEl.className = 'price-status price-ok';
  } catch { statusEl.textContent = '查詢失敗'; statusEl.className = 'price-status price-err'; }
}

// 英股幣別
function setUKCur(cur) {
  selUKCur = cur;
  selType  = cur==='USD' ? 'uk_stock_usd' : 'uk_stock';
  document.getElementById('uk-cur-usd').classList.toggle('active', cur==='USD');
  document.getElementById('uk-cur-gbp').classList.toggle('active', cur==='GBP');
  document.getElementById('funit').textContent = cur;
}

// 資產 Modal
function openAddModal() {
  editIndex = -1;
  document.getElementById('modal-title-text').textContent = '新增資產';
  document.getElementById('step1').style.display = selType ? 'none' : 'block';
  document.getElementById('step2').style.display = selType ? 'block' : 'none';
  document.getElementById('back-btn').style.display = '';
  document.getElementById('submit-btn').textContent = '新增';
  document.getElementById('delete-btn').style.display = 'none';
  document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('selected'));
  if(selType) pickType(selType, false);
  document.getElementById('modal-overlay').style.display = 'flex';
}
function openEditModal(idx) {
  const a = assets[idx]; if(!a) return;
  editIndex = idx; selType = a.type;
  document.getElementById('modal-title-text').textContent = '編輯資產';
  document.getElementById('step1').style.display = 'none';
  document.getElementById('step2').style.display = 'block';
  document.getElementById('back-btn').style.display = 'none';
  document.getElementById('submit-btn').textContent = '儲存';
  document.getElementById('delete-btn').style.display = '';
  showFormForType(a.type);
  // 英股幣別
  if(a.type==='uk_stock_usd') setUKCur('USD');
  else if(a.type==='uk_stock') setUKCur('GBP');
  // 填入資料
  const isCash = ['twd_cash','usd_cash'].includes(a.type);
  const isFund = a.type==='tw_fund';
  const isCrypto = a.type==='crypto';
  const isRE = a.type==='real_estate';
  const isGold = a.type==='gold';
  if(isCash) {
    document.getElementById('cash-lbl').textContent='金額（'+(CATS[a.type]||{cur:'TWD'}).cur+'）';
    document.getElementById('f-cash-amt').value = a.amt||'';
    document.getElementById('f-cash-owner').value = a.owner||'me';
    document.getElementById('f-cash-date').value = a.effectiveDate||a.buyDate||todayStr();
    document.getElementById('f-cash-note').value = a.note||'';
  } else if(isFund) {
    document.getElementById('f-fund-search').value = a.name||'';
    document.getElementById('f-fund-code').value   = a.fundCode||'';
    document.getElementById('f-fund-name').value   = a.name||'';
    document.getElementById('f-fund-cur').value    = a.currency||'TWD';
    document.getElementById('f-fund-qty').value    = a.shares||'';
    document.getElementById('f-fund-cost').value   = a.cost||'';
    document.getElementById('f-fund-nav').value    = a.price||'';
    document.getElementById('f-fund-date').value   = a.buyDate||'';
    document.getElementById('f-fund-owner').value  = a.owner||'me';
    document.getElementById('f-fund-fee').value    = a.fee||'';
  } else if(isCrypto) {
    document.getElementById('f-cry-ticker').value = a.ticker||'';
    document.getElementById('f-cry-qty').value    = a.qty||'';
    document.getElementById('f-cry-cost').value   = a.cost||'';
    document.getElementById('f-cry-price').value  = a.price!=null?Number(a.price).toFixed(2):'';
    document.getElementById('f-cry-date').value   = a.buyDate||'';
    document.getElementById('f-cry-owner').value  = a.owner||'me';
    document.getElementById('f-cry-note').value   = a.note||'';
    document.getElementById('f-cry-fee').value    = a.fee||'';
    document.getElementById('cry-price-status').textContent='';
  } else if(isRE) {
    document.getElementById('f-re-address').value  = a.address||'';
    document.getElementById('f-re-area').value     = a.area||'';
    document.getElementById('f-re-purchase').value = a.purchasePrice||'';
    document.getElementById('f-re-current').value  = a.currentValue||'';
    document.getElementById('f-re-date').value     = a.buyDate||'';
    document.getElementById('f-re-owner').value    = a.owner||'me';
    document.getElementById('f-re-note').value     = a.note||'';
  } else if(isGold) {
    document.getElementById('f-gold-qty').value   = a.qty||'';
    document.getElementById('f-gold-cost').value  = a.cost||'';
    document.getElementById('f-gold-price').value = a.price!=null?Number(a.price).toFixed(2):'';
    document.getElementById('f-gold-date').value  = a.buyDate||'';
    document.getElementById('f-gold-owner').value = a.owner||'me';
    document.getElementById('f-gold-note').value  = a.note||'';
    document.getElementById('f-gold-fee').value   = a.fee||'';
    document.getElementById('gold-price-status').textContent='';
  } else {
    document.getElementById('f-ticker').value     = a.ticker||'';
    document.getElementById('f-name').value       = TW_NAMES[a.ticker]||a.name||'';
    document.getElementById('f-shares').value     = a.shares||'';
    document.getElementById('f-cost').value       = a.cost||'';
    document.getElementById('f-price').value      = a.price!=null?Number(a.price).toFixed(2):'';
    document.getElementById('f-date').value       = a.buyDate||'';
    document.getElementById('f-owner').value      = a.owner||'me';
    document.getElementById('f-note').value       = a.note||'';
    document.getElementById('f-fee-type').value   = a.feeType||'pct';
    document.getElementById('f-fee-pct').value    = a.feePct!=null?a.feePct:0.1425;
    document.getElementById('f-fee-manual').value = a.feeManual||0;
    document.getElementById('funit').textContent  = (CATS[a.type]||{cur:'TWD'}).cur;
    document.getElementById('price-status').textContent = '';
    updateFeeUI(); calcFee();
  }
  document.getElementById('modal-overlay').style.display = 'flex';
}
function showFormForType(t) {
  const isCash   = ['twd_cash','usd_cash'].includes(t);
  const isFund   = t==='tw_fund';
  const isCrypto = t==='crypto';
  const isRE     = t==='real_estate';
  const isGold   = t==='gold';
  const isUK     = t==='uk_stock'||t==='uk_stock_usd';
  document.getElementById('form-stock').style.display  = (!isCash&&!isFund&&!isCrypto&&!isRE&&!isGold)?'block':'none';
  document.getElementById('form-cash').style.display   = isCash?'block':'none';
  document.getElementById('form-fund').style.display   = isFund?'block':'none';
  document.getElementById('form-crypto').style.display = isCrypto?'block':'none';
  document.getElementById('re-form').style.display     = isRE?'block':'none';
  document.getElementById('form-gold').style.display   = isGold?'block':'none';
  document.getElementById('uk-cur-selector').style.display = isUK?'flex':'none';
}
function closeModal() {
  document.getElementById('modal-overlay').style.display='none';
  hideAC();
  document.getElementById('ac-crypto-dd').style.display='none';
}
function overlayClick(e) { if(e.target===document.getElementById('modal-overlay')) closeModal(); }
function goStep1() {
  selType=null;
  document.getElementById('step1').style.display='block';
  document.getElementById('step2').style.display='none';
  document.getElementById('uk-cur-selector').style.display='none';
  document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('selected'));
}
function pickType(t, resetCurrency=true) {
  selType = t;
  document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('selected'));
  document.getElementById('t-'+t)?.classList.add('selected');
  document.getElementById('step1').style.display='none';
  document.getElementById('step2').style.display='block';
  showFormForType(t);
  if(t==='uk_stock'||t==='uk_stock_usd') {
    setUKCur(resetCurrency ? 'USD' : selUKCur);
  }
  const cat = CATS[t];
  if(cat) {
    if(t!=='uk_stock'&&t!=='uk_stock_usd') document.getElementById('funit').textContent=cat.cur;
    document.getElementById('cash-lbl').textContent='金額（'+cat.cur+'）';
  }
  ['f-ticker','f-name','f-shares','f-cost','f-note','f-cash-note','f-cry-note'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['f-price','f-cry-price'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['price-status','cry-price-status'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='';});
  document.getElementById('ac-dropdown').style.display='none';
  ['f-date','f-cash-date','f-fund-date','f-cry-date','f-re-date','f-gold-date'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=todayStr();});
  updateFeeUI();
}
function updateFeeUI() {
  const t = document.getElementById('f-fee-type').value;
  document.getElementById('fpw').style.display = t==='pct'?'block':'none';
  document.getElementById('fmw').style.display = t==='manual'?'block':'none';
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
  else if(t==='pct') el.textContent='總額 '+c+' '+Math.round(p).toLocaleString()+' × '+pct+'% = 費 '+c+' '+fee.toFixed(2)+'　→ 總費用 '+c+' '+(p+fee).toFixed(2);
  else el.textContent='總額 '+c+' '+Math.round(p).toLocaleString()+' + 費 '+c+' '+manual+' → '+c+' '+(p+manual).toFixed(2);
}
function submitAsset() {
  const t = selType;
  const today = todayStr();
  const existing = editIndex>=0 ? assets[editIndex] : null;
  let obj;
  if(['twd_cash','usd_cash'].includes(t)) {
    const amt=parseFloat(document.getElementById('f-cash-amt').value)||0; if(!amt) return;
    const cashDate = document.getElementById('f-cash-date').value||today;
    obj={type:t,amt,note:document.getElementById('f-cash-note').value,owner:document.getElementById('f-cash-owner').value,buyDate:cashDate,effectiveDate:eventDate(cashDate)};
  } else if(t==='tw_fund') {
    const code=document.getElementById('f-fund-code').value.trim();
    const name=document.getElementById('f-fund-name').value.trim();
    const qty=parseFloat(document.getElementById('f-fund-qty').value)||0;
    const cost=parseFloat(document.getElementById('f-fund-cost').value)||0;
    const nav=parseFloat(document.getElementById('f-fund-nav').value)||0;
    const cur=document.getElementById('f-fund-cur').value||'TWD';
    if(!code||!qty) return;
    obj={type:'tw_fund',fundCode:code,name,shares:qty,cost,fee:parseFloat(document.getElementById('f-fund-fee').value)||0,price:nav,prevPrice:nav,currency:cur,owner:document.getElementById('f-fund-owner').value,buyDate:document.getElementById('f-fund-date').value||today,priceSource:nav?'live':''};
  } else if(t==='crypto') {
    const ticker=document.getElementById('f-cry-ticker').value.trim().toUpperCase();
    const qty=parseFloat(document.getElementById('f-cry-qty').value)||0;
    const cost=parseFloat(document.getElementById('f-cry-cost').value)||0;
    const price=parseFloat(document.getElementById('f-cry-price').value)||0;
    const prevPrice=parseFloat(document.getElementById('f-cry-price').dataset.prevClose)||price;
    if(!ticker||!qty) return;
    obj={type:'crypto',ticker,qty,cost,fee:parseFloat(document.getElementById('f-cry-fee').value)||0,price,prevPrice,owner:document.getElementById('f-cry-owner').value,buyDate:document.getElementById('f-cry-date').value||today,note:document.getElementById('f-cry-note').value,priceSource:price?'live':''};
  } else if(t==='real_estate') {
    const address=document.getElementById('f-re-address').value.trim();
    const purchasePrice=parseFloat(document.getElementById('f-re-purchase').value)||0;
    if(!address||!purchasePrice) return;
    obj={type:'real_estate',address,area:parseFloat(document.getElementById('f-re-area').value)||0,purchasePrice,currentValue:parseFloat(document.getElementById('f-re-current').value)||purchasePrice,buyDate:document.getElementById('f-re-date').value||today,owner:document.getElementById('f-re-owner').value,note:document.getElementById('f-re-note').value};
  } else if(t==='gold') {
    const qty=parseFloat(document.getElementById('f-gold-qty').value)||0;
    const cost=parseFloat(document.getElementById('f-gold-cost').value)||0;
    const price=parseFloat(document.getElementById('f-gold-price').value)||0;
    const prevPrice=parseFloat(document.getElementById('f-gold-price').dataset.prevClose)||price;
    if(!qty) return;
    obj={type:'gold',qty,cost,fee:parseFloat(document.getElementById('f-gold-fee').value)||0,price,prevPrice,owner:document.getElementById('f-gold-owner').value,buyDate:document.getElementById('f-gold-date').value||today,note:document.getElementById('f-gold-note').value,priceSource:price?'live':''};
  } else {
    const ticker=document.getElementById('f-ticker').value.trim().toUpperCase();
    const name=document.getElementById('f-name').value.trim()||TW_NAMES[ticker]||ticker;
    const shares=parseFloat(document.getElementById('f-shares').value)||0;
    const cost=parseFloat(document.getElementById('f-cost').value)||0;
    const price=parseFloat(document.getElementById('f-price').value)||0;
    const prevPrice=parseFloat(document.getElementById('f-price').dataset.prevClose)||price;
    const feeType=document.getElementById('f-fee-type').value;
    const feePct=parseFloat(document.getElementById('f-fee-pct').value)||0;
    const feeManual=parseFloat(document.getElementById('f-fee-manual').value)||0;
    const fee=feeType==='none'?0:feeType==='pct'?shares*cost*feePct/100:feeManual;
    if(!ticker||!shares||!cost) return;
    obj={type:t,ticker,name,shares,cost,price:price||cost,prevPrice:prevPrice||price||cost,fee,feeType,feePct,feeManual,owner:document.getElementById('f-owner').value,buyDate:document.getElementById('f-date').value||today,note:document.getElementById('f-note').value,priceSource:price?'live':''};
  }
  obj.id = existing?.id || obj.id || makeId('asset');
  obj.recordedAt = existing?.recordedAt || new Date().toISOString();
  obj.effectiveDate = eventDate(obj.effectiveDate || obj.buyDate);
  if(!obj.buyDate) obj.buyDate = obj.effectiveDate;
  // 非現金/不動產資產加上剩餘持倉數量（供 FIFO 賣出使用）
  if(!['twd_cash','usd_cash','real_estate'].includes(obj.type)) {
    const totalUnits = obj.shares || obj.qty || 0;
    obj.sharesRemaining = existing?.sharesRemaining!=null ? Math.min(existing.sharesRemaining, totalUnits) : totalUnits;
  }
  if(editIndex>=0) assets[editIndex]=obj; else assets.push(obj);
  rebalRows=[]; saveData(); closeModal(); renderAll();
}
function deleteAsset() {
  if(editIndex<0) return;
  if(!confirm('確定刪除？')) return;
  assets.splice(editIndex,1); rebalRows=[]; saveData(); closeModal(); closeDetailModal(); renderAll();
}

// 債務 Modal
function openDebtModal() {
  debtEditIndex=-1;
  document.getElementById('debt-modal-title').textContent='新增負債';
  document.getElementById('debt-submit-btn').textContent='新增';
  document.getElementById('debt-delete-btn').style.display='none';
  ['d-name','d-principal','d-rate','d-total-months','d-grace','d-remaining','d-rate-mid','d-remain-months','d-grace-mid','d-note','d-pay-day-input','d-pay-day-mid-input'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('d-type').value='mortgage';
  document.getElementById('d-currency').value='TWD';
  document.getElementById('d-owner').value='me';
  document.getElementById('d-start-date').value=todayStr();
  document.getElementById('d-pay-day-input').value='25';
  document.getElementById('d-pay-day-mid-input').value='25';
  document.getElementById('d-method').value='equal';
  document.getElementById('d-method-mid').value='equal';
  setDebtMode('new');
  document.getElementById('debt-calc-preview').style.display='none';
  document.getElementById('debt-modal-overlay').style.display='flex';
}
function openDebtEditModal(idx) {
  const d=debts[idx]; if(!d) return;
  debtEditIndex=idx;
  document.getElementById('debt-modal-title').textContent='編輯負債';
  document.getElementById('debt-submit-btn').textContent='儲存';
  document.getElementById('debt-delete-btn').style.display='';
  document.getElementById('d-type').value=d.debtType||'mortgage';
  document.getElementById('d-currency').value=d.currency||'TWD';
  document.getElementById('d-name').value=d.name||'';
  document.getElementById('d-owner').value=d.owner||'me';
  document.getElementById('d-start-date').value=d.startDate||d.effectiveDate||todayStr();
  document.getElementById('d-note').value=d.note||'';
  const mode=d.mode||'mid'; setDebtMode(mode);
  if(mode==='new') {
    document.getElementById('d-principal').value=d.principal||'';
    document.getElementById('d-rate').value=d.rate||'';
    document.getElementById('d-total-months').value=d.totalMonths||'';
    document.getElementById('d-grace').value=d.grace||'';
    document.getElementById('d-pay-day-input').value=d.payDay||'25';
    document.getElementById('d-method').value=d.method||'equal';
  } else {
    document.getElementById('d-remaining').value=d.remaining||'';
    document.getElementById('d-rate-mid').value=d.rate||'';
    document.getElementById('d-remain-months').value=d.remainMonths||'';
    document.getElementById('d-grace-mid').value=d.graceRemain||'';
    document.getElementById('d-pay-day-mid-input').value=d.payDay||'25';
    document.getElementById('d-method-mid').value=d.method||'equal';
  }
  calcDebtPayment();
  document.getElementById('debt-modal-overlay').style.display='flex';
}
function closeDebtModal() { document.getElementById('debt-modal-overlay').style.display='none'; }
function debtOverlayClick(e) { if(e.target===document.getElementById('debt-modal-overlay')) closeDebtModal(); }
function setDebtMode(mode) {
  debtMode=mode;
  document.getElementById('seg-new').classList.toggle('active',mode==='new');
  document.getElementById('seg-mid').classList.toggle('active',mode==='mid');
  document.getElementById('debt-form-new').style.display=mode==='new'?'block':'none';
  document.getElementById('debt-form-mid').style.display=mode==='mid'?'block':'none';
  calcDebtPayment();
}
function calcDebtPayment() {
  let principal,rate,months,grace,method;
  if(debtMode==='new') {
    principal=parseFloat(document.getElementById('d-principal').value)||0;
    rate=parseFloat(document.getElementById('d-rate').value)||0;
    months=parseInt(document.getElementById('d-total-months').value)||0;
    grace=parseInt(document.getElementById('d-grace').value)||0;
    method=document.getElementById('d-method').value;
  } else {
    principal=parseFloat(document.getElementById('d-remaining').value)||0;
    rate=parseFloat(document.getElementById('d-rate-mid').value)||0;
    months=parseInt(document.getElementById('d-remain-months').value)||0;
    grace=parseInt(document.getElementById('d-grace-mid').value)||0;
    method=document.getElementById('d-method-mid').value;
  }
  const preview=document.getElementById('debt-calc-preview');
  if(!principal||!months){preview.style.display='none';return;}
  const result=calcMonthlyPayment(principal,rate,months,grace,method);
  const cur=document.getElementById('d-currency').value||'TWD';
  preview.style.display='block';
  document.getElementById('debt-calc-total').textContent=fmtCur(result.total,cur);
  document.getElementById('debt-calc-detail').textContent=grace>0?'寬限期中，僅繳利息':'本金 '+fmtCur(result.principal,cur)+' ＋ 利息 '+fmtCur(result.interest,cur);
}
function submitDebt() {
  const debtType=document.getElementById('d-type').value;
  const currency=document.getElementById('d-currency').value;
  const name=document.getElementById('d-name').value.trim();
  const owner=document.getElementById('d-owner').value;
  const note=document.getElementById('d-note').value;
  const existing = debtEditIndex>=0 ? debts[debtEditIndex] : null;
  const startDate=eventDate(document.getElementById('d-start-date').value||todayStr());
  let obj={debtType,currency,name,owner,note,mode:debtMode,startDate,effectiveDate:startDate,id:existing?.id||makeId('debt'),recordedAt:existing?.recordedAt||new Date().toISOString()};
  if(debtMode==='new') {
    const principal=parseFloat(document.getElementById('d-principal').value)||0; if(!principal) return;
    obj.principal=principal; obj.remaining=principal;
    obj.rate=parseFloat(document.getElementById('d-rate').value)||0;
    obj.totalMonths=parseInt(document.getElementById('d-total-months').value)||0;
    obj.remainMonths=obj.totalMonths;
    obj.grace=parseInt(document.getElementById('d-grace').value)||0; obj.graceRemain=obj.grace;
    obj.payDay=parseInt(document.getElementById('d-pay-day-input').value)||25;
    obj.method=document.getElementById('d-method').value;
  } else {
    const remaining=parseFloat(document.getElementById('d-remaining').value)||0; if(!remaining) return;
    obj.remaining=remaining; obj.principal=remaining;
    obj.rate=parseFloat(document.getElementById('d-rate-mid').value)||0;
    obj.remainMonths=parseInt(document.getElementById('d-remain-months').value)||0; obj.totalMonths=obj.remainMonths;
    obj.graceRemain=parseInt(document.getElementById('d-grace-mid').value)||0;
    obj.payDay=parseInt(document.getElementById('d-pay-day-mid-input').value)||25;
    obj.method=document.getElementById('d-method-mid').value;
  }
  if(debtEditIndex>=0) debts[debtEditIndex]=obj; else debts.push(obj);
  saveData(); closeDebtModal(); renderDebt(); renderAll();
}
function deleteDebt() {
  if(debtEditIndex<0) return;
  if(!confirm('確定刪除這筆負債？')) return;
  debts.splice(debtEditIndex,1); saveData(); closeDebtModal(); renderDebt(); renderAll();
}

// 債務頁渲染
function renderDebt() {
  const all=getFilteredDebts();
  const empty=document.getElementById('debt-empty-state');
  const content=document.getElementById('debt-has-content');
  if(!all.length){empty.style.display='block';content.style.display='none';return;}
  empty.style.display='none'; content.style.display='block';
  document.getElementById('debt-total-display').textContent=fmtTWD(totalDebtTWD());
  document.getElementById('debt-monthly-display').textContent=fmtTWD(totalMonthlyTWD());
  document.getElementById('debt-count-display').textContent=all.length+' 筆';
  const totalW=all.reduce((s,d)=>s+(d.remaining||0),0);
  const wRate=totalW>0?all.reduce((s,d)=>s+(d.rate||0)*(d.remaining||0),0)/totalW:all.reduce((s,d)=>s+(d.rate||0),0)/all.length;
  document.getElementById('debt-rate-display').textContent=wRate.toFixed(2)+'%';
  document.getElementById('debt-include-display').textContent=includeDebt?'是（點擊切換）':'否（點擊切換）';
  const today=new Date();
  document.getElementById('debt-list').innerHTML=all.map(d=>{
    const idx=debts.indexOf(d);
    const typeInfo=DEBT_TYPES[d.debtType]||DEBT_TYPES.other;
    const remaining=d.remaining||0, original=d.principal||remaining;
    const paidPct=original>0?Math.round((original-remaining)/original*100):0;
    const monthlyAmt=getDebtMonthlyTWD(d);
    const remainStr=d.remainMonths?d.remainMonths+' 期':'—';
    const graceStr=d.graceRemain>0?'剩 '+d.graceRemain+' 月':'無';
    const cur=d.currency||'TWD';
    const ownerName=d.owner==='me'?names.me:names.wife;
    const payDay=d.payDay||25;
    const thisMonth=today.getDate()<=payDay?new Date(today.getFullYear(),today.getMonth(),payDay):new Date(today.getFullYear(),today.getMonth()+1,payDay);
    const daysLeft=Math.ceil((thisMonth-today)/86400000);
    const isPaid=d.lastPaidMonth===today.getFullYear()+'-'+(today.getMonth()+1);
    const reminderDiv=isPaid
      ?'<div style="margin-top:10px;padding:8px;background:var(--bg2);border-radius:var(--radius);font-size:13px;text-align:center;color:var(--green)">✓ 本月已自動扣款</div>'
      :'<div style="margin-top:10px;padding:8px;background:var(--bg2);border-radius:var(--radius);font-size:13px;text-align:center;color:var(--text2)">📅 還款日：每月 '+payDay+' 日（還有 '+daysLeft+' 天）</div>';
    return '<div class="debt-card" onclick="openDebtEditModal('+idx+')">'
      +'<div class="debt-card-top"><div>'
      +'<div class="debt-card-name">'+typeInfo.label+(d.name?' · '+d.name:'')+'</div>'
      +'<div class="debt-card-sub">'+ownerName+' · 每月 '+payDay+' 日'+(d.note?' · '+d.note:'')+'</div></div>'
      +'<div><div class="debt-card-amount">'+fmtCur(remaining,cur)+'</div>'
      +'<div class="debt-card-amount-sub">剩餘本金</div></div></div>'
      +'<div class="debt-progress-wrap">'
      +'<div class="debt-progress-label"><span>已還 '+paidPct+'%</span><span>剩 '+remainStr+'</span></div>'
      +'<div class="debt-progress-bar"><div class="debt-progress-fill" style="width:'+paidPct+'%"></div></div></div>'
      +'<div class="debt-detail-grid">'
      +'<div class="debt-detail-item"><div class="debt-detail-label">年利率</div><div class="debt-detail-val">'+(d.rate||0)+'%</div></div>'
      +'<div class="debt-detail-item"><div class="debt-detail-label">本月應還</div><div class="debt-detail-val">'+fmtTWD(monthlyAmt)+'</div></div>'
      +'<div class="debt-detail-item"><div class="debt-detail-label">寬限期</div><div class="debt-detail-val">'+graceStr+'</div></div>'
      +'</div>'+reminderDiv+'</div>';
  }).join('');
}

// 自動扣款
function checkAutoDeduct() {
  const today=new Date();
  const ym=today.getFullYear()+'-'+(today.getMonth()+1);
  let changed=false;
  debts.forEach(d=>{
    if(d.lastPaidMonth===ym) return;
    if(today.getDate()<(d.payDay||25)) return;
    const result=calcMonthlyPayment(d.remaining||0,d.rate||0,d.remainMonths||0,d.graceRemain||0,d.method||'equal');
    d.remaining=Math.max(0,(d.remaining||0)-result.principal);
    d.remainMonths=Math.max(0,(d.remainMonths||0)-1);
    if(d.graceRemain>0) d.graceRemain--;
    d.lastPaidMonth=ym; changed=true;
  });
  if(changed) saveData();
}

// 再平衡
function renderRebal() {
  const bar=document.getElementById('rebal-profile-bar');
  if(bar) bar.innerHTML=['me','wife','family'].map(p=>
    '<button class="pbtn'+(rebalProfile===p?' active':'')+'" onclick="setRebalProfile(\''+p+'\')">'
    +(p==='me'?names.me:p==='wife'?names.wife:'總資產')+'</button>').join('');
  const rebalAssets=rebalProfile==='family'?assets.filter(a=>familyMembers[a.owner]!==false):assets.filter(a=>a.owner===rebalProfile);
  const all=rebalAssets.filter(a=>!['twd_cash','usd_cash','real_estate'].includes(a.type));
  const totalTWD=all.reduce((s,a)=>s+assetValTWD(a),0)||1;
  const tickerMap={};
  all.forEach(a=>{
    const key=a.ticker||a.type;
    if(!tickerMap[key]) tickerMap[key]={ticker:key,name:TW_NAMES[key]||a.name||key,valueTWD:0,price:a.price||0,type:a.type};
    tickerMap[key].valueTWD+=assetValTWD(a);
  });
  if(!rebalRows.length) {
    rebalRows=Object.values(tickerMap).map(r=>({ticker:r.ticker,name:r.name,nowPct:r.valueTWD/totalTWD*100,targetPct:Math.round(r.valueTWD/totalTWD*100),price:r.price,type:r.type}));
  } else {
    rebalRows.forEach(r=>{if(tickerMap[r.ticker]){r.nowPct=tickerMap[r.ticker].valueTWD/totalTWD*100;r.price=tickerMap[r.ticker].price||r.price;}});
  }
  document.getElementById('rebal-rows').innerHTML=rebalRows.map((r,i)=>
    `<div class="rebal-row"><div style="flex:1;min-width:0"><div class="rebal-ticker">${r.ticker}</div><div class="rebal-name">${r.name!==r.ticker?r.name:''}</div></div><div class="rebal-now">${r.nowPct.toFixed(1)}%</div><i class="ti ti-arrow-right rebal-arrow"></i><div class="iuw rebal-target"><input type="number" value="${r.targetPct}" min="0" max="100" style="width:65px;text-align:center;padding:6px 8px" oninput="rebalRows[${i}].targetPct=parseFloat(this.value)||0"><span class="iunit" style="right:4px">%</span></div><button class="del-btn" onclick="rebalRemoveRow(${i})"><i class="ti ti-trash"></i></button></div>`
  ).join('');
}
function setRebalProfile(p){rebalProfile=p;rebalRows=[];renderRebal();}
function rebalAddRow(){
  const ticker=document.getElementById('rebal-add-ticker').value.trim().toUpperCase();
  if(!ticker||rebalRows.find(r=>r.ticker===ticker)) return;
  const found=assets.find(a=>a.ticker===ticker);
  rebalRows.push({ticker,name:TW_NAMES[ticker]||found?.name||ticker,nowPct:0,targetPct:0,price:found?.price||0,type:found?.type||'us_stock'});
  document.getElementById('rebal-add-ticker').value='';renderRebal();
}
function rebalRemoveRow(i){rebalRows.splice(i,1);renderRebal();}
function calcRebal(){
  const amount=parseFloat(document.getElementById('rebal-amount').value)||0;
  if(!amount||!rebalRows.length) return;
  const totalTarget=rebalRows.reduce((s,r)=>s+r.targetPct,0); if(!totalTarget) return;
  const rebalAssets=rebalProfile==='family'?assets.filter(a=>familyMembers[a.owner]!==false):assets.filter(a=>a.owner===rebalProfile);
  const totalNow=rebalAssets.reduce((s,a)=>s+assetValTWD(a),0);
  const totalAfter=totalNow+amount;
  const result=document.getElementById('rebal-result');
  result.style.display='block';
  let html='<div style="font-size:12px;color:var(--text2);margin-bottom:8px">投入 '+fmtTWD(amount)+' 後總資產約 '+fmtTWD(totalAfter)+'</div>';
  rebalRows.forEach(r=>{
    const targetValueTWD=totalAfter*(r.targetPct/totalTarget);
    const nowValueTWD=rebalAssets.filter(a=>a.ticker===r.ticker).reduce((s,a)=>s+assetValTWD(a),0);
    const buyTWD=Math.max(0,targetValueTWD-nowValueTWD);
    const cat=CATS[r.type]||CATS['us_stock'];
    const priceInTWD=toTWD(r.price||0,cat.cur);
    const shares=priceInTWD>0?Math.floor(buyTWD/priceInTWD):0;
    html+='<div class="rebal-result-row"><div><div style="font-weight:600">'+r.ticker+'</div><div class="mini">目標 '+r.targetPct+'% → '+fmtTWD(targetValueTWD)+'</div></div><div class="rebal-buy">'+(buyTWD>0?'買入 '+(shares>0?shares+'股 ':'')+fmtTWD(buyTWD):'已達標 ✓')+'</div></div>';
  });
  result.innerHTML=html;
}

// UI 輔助
function setProfile(p){
  profile=p;
  ['me','wife','family'].forEach(id=>document.getElementById('pb-'+id)?.classList.toggle('active',id===p));
  rebalRows=[]; renderAll();
}
function setChartPeriod(btn,p){
  chartPeriod=p;
  btn.closest('.period-bar').querySelectorAll('.pbtn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  // 清除歷史快取，以符合新時間區間
  historyPrices={}; historyFX={};
  renderAll();
  fetchAndRenderHistory();
}
function setDim(btn,d){dim=d;document.querySelectorAll('.dbtn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderAll();}
function toggleRename(){const b=document.getElementById('rename-bar');b.style.display=b.style.display==='none'?'block':'none';}
function applyRename(){
  names.me=document.getElementById('rn-me').value||'我';
  names.wife=document.getElementById('rn-wife').value||'太太';
  updateNameLabels();
  document.getElementById('rename-bar').style.display='none';
  saveData(); renderAll();
}

// 初始化
loadData();
checkAutoDeduct();
renderAll();
fetchAll(); // fetchAll 完成後會自動呼叫 fetchAndRenderHistory
