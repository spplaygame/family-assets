const API = '/api/quote';
const CATS = {
  tw_stock:{label:'台股',cur:'TWD',color:'#378ADD',badge:'btw'},
  us_stock:{label:'美股',cur:'USD',color:'#639922',badge:'bus'},
  uk_stock:{label:'英股',cur:'GBP',color:'#BA7517',badge:'buk'},
  tw_fund:{label:'台灣基金',cur:'TWD',color:'#7F77DD',badge:'bfund'},
  twd_cash:{label:'台幣現金',cur:'TWD',color:'#888780',badge:''},
  usd_cash:{label:'美元現金',cur:'USD',color:'#1D9E75',badge:'bus'},
  crypto:{label:'加密貨幣',cur:'USD',color:'#D85A30',badge:'bcrypto'},
};
const TYPE_GROUPS={
  股票:{types:['tw_stock','us_stock','uk_stock'],color:'#378ADD'},
  基金:{types:['tw_fund'],color:'#7F77DD'},
  現金:{types:['twd_cash','usd_cash'],color:'#888780'},
  加密貨幣:{types:['crypto'],color:'#D85A30'},
};
const DEBT_TYPES={
  mortgage:{label:'🏠 房貸'},car:{label:'🚗 車貸'},
  personal:{label:'💳 信貸'},student:{label:'🎓 學貸'},
  business:{label:'🏢 企業貸款'},other:{label:'📋 其他'},
};
const SECURITIES=[
  {sym:'VT',name:'Vanguard Total World Stock ETF',type:'us_stock'},
  {sym:'VTI',name:'Vanguard Total Stock Market ETF',type:'us_stock'},
  {sym:'VXUS',name:'Vanguard Total International Stock ETF',type:'us_stock'},
  {sym:'VOO',name:'Vanguard S&P 500 ETF',type:'us_stock'},
  {sym:'VEA',name:'Vanguard FTSE Developed Markets ETF',type:'us_stock'},
  {sym:'VWO',name:'Vanguard FTSE Emerging Markets ETF',type:'us_stock'},
  {sym:'BND',name:'Vanguard Total Bond Market ETF',type:'us_stock'},
  {sym:'QQQ',name:'Invesco QQQ Trust (Nasdaq 100)',type:'us_stock'},
  {sym:'SPY',name:'SPDR S&P 500 ETF Trust',type:'us_stock'},
  {sym:'IVV',name:'iShares Core S&P 500 ETF',type:'us_stock'},
  {sym:'GLD',name:'SPDR Gold Shares',type:'us_stock'},
  {sym:'SCHD',name:'Schwab US Dividend Equity ETF',type:'us_stock'},
  {sym:'AAPL',name:'Apple Inc.',type:'us_stock'},
  {sym:'MSFT',name:'Microsoft Corporation',type:'us_stock'},
  {sym:'NVDA',name:'NVIDIA Corporation',type:'us_stock'},
  {sym:'GOOGL',name:'Alphabet Inc.',type:'us_stock'},
  {sym:'AMZN',name:'Amazon.com Inc.',type:'us_stock'},
  {sym:'META',name:'Meta Platforms Inc.',type:'us_stock'},
  {sym:'TSLA',name:'Tesla Inc.',type:'us_stock'},
  {sym:'BRKB',name:'Berkshire Hathaway Class B',type:'us_stock'},
  {sym:'VWRA',name:'Vanguard FTSE All-World UCITS ETF',type:'us_stock'},
  {sym:'VUSA',name:'Vanguard S&P 500 UCITS ETF',type:'us_stock'},
  {sym:'VHYL',name:'Vanguard FTSE All-World High Dividend Yield UCITS ETF',type:'us_stock'},
  {sym:'VWRP',name:'Vanguard FTSE All-World UCITS ETF (GBP)',type:'uk_stock'},
  {sym:'HSBC',name:'HSBC Holdings plc',type:'uk_stock'},
  {sym:'BP',name:'BP plc',type:'uk_stock'},
  {sym:'2330',name:'台積電',type:'tw_stock'},
  {sym:'2317',name:'鴻海精密',type:'tw_stock'},
  {sym:'2454',name:'聯發科技',type:'tw_stock'},
  {sym:'2882',name:'國泰金控',type:'tw_stock'},
  {sym:'2881',name:'富邦金控',type:'tw_stock'},
  {sym:'0050',name:'元大台灣50',type:'tw_stock'},
  {sym:'0056',name:'元大高股息',type:'tw_stock'},
  {sym:'006208',name:'富邦台灣50',type:'tw_stock'},
  {sym:'00878',name:'國泰永續高股息',type:'tw_stock'},
  {sym:'BTC',name:'Bitcoin',type:'crypto'},
  {sym:'ETH',name:'Ethereum',type:'crypto'},
  {sym:'SOL',name:'Solana',type:'crypto'},
  {sym:'BNB',name:'BNB',type:'crypto'},
  {sym:'XRP',name:'XRP',type:'crypto'},
  {sym:'DOGE',name:'Dogecoin',type:'crypto'},
];
const CRYPTO_IDS={BTC:'bitcoin',ETH:'ethereum',SOL:'solana',BNB:'binancecoin',XRP:'ripple',ADA:'cardano',DOGE:'dogecoin',AVAX:'avalanche-2'};

function toYahooSymbol(ticker,type){
  if(type==='tw_stock'||type==='tw_fund') return ticker+'.TW';
  if(type==='uk_stock') return ticker+'.L';
  return ticker;
}

let profile='me',chartPeriod='1M',dim='detail',selType=null;
let trendChart=null,donutChart=null,fetching=false;
let names={me:'我',wife:'太太'};
let assets=[],debts=[];
let fx={usd:{rate:32.0,prev:32.0},gbp:{rate:40.5,prev:40.5}};
let editIndex=-1,debtEditIndex=-1,acTimer=null,rebalRows=[];
let includeDebt=true,debtMode='new';
let familyMembers={me:true,wife:true};

const todayStr=()=>new Date().toISOString().split('T')[0];
const PCT=v=>(v>=0?'+':'')+v.toFixed(2)+'%';
const CLS=v=>v>=0?'pos':'neg';
const fmtTWD=v=>{const a=Math.abs(Math.round(v));return(v<0?'-':'')+' TWD '+a.toLocaleString();};
const fmtCur=(v,c)=>{
  if(c==='TWD') return fmtTWD(v);
  if(c==='USD') return(v<0?'-':'')+'USD '+Math.abs(v).toFixed(2);
  if(c==='GBP') return(v<0?'-':'')+'GBP '+Math.abs(v).toFixed(2);
  return String(v);
};
const toTWD=(v,c)=>c==='USD'?v*fx.usd.rate:c==='GBP'?v*fx.gbp.rate:v;

function saveData(){
  localStorage.setItem('family_assets',JSON.stringify(assets));
  localStorage.setItem('family_names',JSON.stringify(names));
  localStorage.setItem('family_debts',JSON.stringify(debts));
  localStorage.setItem('include_debt',JSON.stringify(includeDebt));
  localStorage.setItem('family_members',JSON.stringify(familyMembers));
}
function loadData(){
  try{
    const a=localStorage.getItem('family_assets');
    const n=localStorage.getItem('family_names');
    const d=localStorage.getItem('family_debts');
    const id=localStorage.getItem('include_debt');
    const fm=localStorage.getItem('family_members');
    if(a) assets=JSON.parse(a);
    if(d) debts=JSON.parse(d);
    if(id!==null) includeDebt=JSON.parse(id);
    if(fm) familyMembers=JSON.parse(fm);
    if(n){names=JSON.parse(n);updateNameLabels();}
    const theme=localStorage.getItem('theme')||'arctic';
    applyTheme(theme);
    updateDebtToggleUI();
    updateFamilyToggleUI();
  }catch(e){console.warn(e);}
}

function updateNameLabels(){
  document.getElementById('lbl-me').textContent=names.me+'的資產';
  document.getElementById('lbl-wife').textContent=names.wife+'的資產';
  document.getElementById('rn-me').value=names.me;
  document.getElementById('rn-wife').value=names.wife;
  document.getElementById('set-name-me').textContent=names.me+' / '+names.wife;
  document.getElementById('family-check-me-label').textContent=names.me+'的資產';
  document.getElementById('family-check-wife-label').textContent=names.wife+'的資產';
  ['f-owner','f-cash-owner','f-cry-owner','d-owner'].forEach(id=>{
    const s=document.getElementById(id);
    if(s){s.options[0].text=names.me;s.options[1].text=names.wife;}
  });
}

function setTheme(t){applyTheme(t);localStorage.setItem('theme',t);}
function applyTheme(t){
  document.body.dataset.theme=t==='arctic'?'':t;
  document.querySelectorAll('.theme-btn').forEach(b=>b.classList.remove('active'));
  const el=document.getElementById('theme-'+t);
  if(el) el.classList.add('active');
}

function switchPage(name){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  document.getElementById('nav-'+name).classList.add('active');
  if(name==='rebal') renderRebal();
  if(name==='debt') renderDebt();
}

function toggleFamilyMember(member){
  familyMembers[member]=!familyMembers[member];
  updateFamilyToggleUI();
  saveData();
  if(profile==='family') renderAll();
}
function updateFamilyToggleUI(){
  ['me','wife'].forEach(m=>{
    const sw=document.getElementById('family-toggle-'+m);
    if(sw){if(familyMembers[m])sw.classList.add('on');else sw.classList.remove('on');}
  });
}

async function proxyQuote(s){const r=await fetch(API+'?type=quote&symbol='+encodeURIComponent(s));const d=await r.json();if(d.error)throw new Error(d.error);return d;}
async function proxySearch(q){const r=await fetch(API+'?type=search&symbol='+encodeURIComponent(q));const d=await r.json();return d.result||[];}
async function proxyCrypto(ids){const r=await fetch(API+'?type=crypto&ids='+encodeURIComponent(ids));return await r.json();}
async function proxyFX(){const r=await fetch(API+'?type=fx');return await r.json();}

async function fetchFX(){
  const d=await proxyFX();
  if(d.rates&&d.rates.TWD){
    const usdTWD=d.rates.TWD,prevTWD=d.prevTWD||usdTWD;
    const gbpTWD=d.rates.GBPTWD||(d.gbpUsd?d.gbpUsd*usdTWD:fx.gbp.rate);
    const prevGBPTWD=d.prevGBPTWD||gbpTWD;
    fx={usd:{rate:usdTWD,prev:prevTWD},gbp:{rate:gbpTWD,prev:prevGBPTWD}};
  }
}

async function fetchAll(){
  if(fetching) return;
  fetching=true;
  const btn=document.getElementById('refresh-btn');
  btn.disabled=true;
  btn.innerHTML='<span class="spin"><i class="ti ti-loader-2"></i></span> 查詢中…';
  try{await fetchFX();updateFxBar();}catch(e){console.warn('FX fail',e);}
  for(const a of assets.filter(x=>['tw_stock','tw_fund','us_stock','uk_stock'].includes(x.type))){
    try{const q=await proxyQuote(toYahooSymbol(a.ticker,a.type));a.prevPrice=q.prevClose;a.price=q.price;if(q.name&&!a.name)a.name=q.name;a.priceSource='live';}
    catch{a.priceSource='error';}
  }
  const ca=assets.filter(x=>x.type==='crypto');
  if(ca.length){
    try{
      const ids=ca.map(a=>CRYPTO_IDS[a.ticker.toUpperCase()]||a.ticker.toLowerCase()).join(',');
      const d=await proxyCrypto(ids);
      ca.forEach(a=>{const id=CRYPTO_IDS[a.ticker.toUpperCase()]||a.ticker.toLowerCase();if(d[id]){a.price=d[id].usd;a.prevPrice=a.price/(1+(d[id].usd_24h_change||0)/100);a.priceSource='live';}});
    }catch{ca.forEach(a=>a.priceSource='error');}
  }
  saveData();
  const now=new Date();
  document.getElementById('last-upd').textContent='更新於 '+now.getHours()+':'+String(now.getMinutes()).padStart(2,'0');
  fetching=false;btn.disabled=false;btn.innerHTML='<i class="ti ti-refresh"></i> 更新報價';
  renderAll();
}

function updateFxBar(){
  const uChg=fx.usd.prev?(fx.usd.rate-fx.usd.prev)/fx.usd.prev*100:0;
  const gChg=fx.gbp.prev?(fx.gbp.rate-fx.gbp.prev)/fx.gbp.prev*100:0;
  document.getElementById('r-usd').textContent=fx.usd.rate.toFixed(3);
  document.getElementById('rc-usd').textContent=(uChg>=0?'+':'')+uChg.toFixed(2)+'%';
  document.getElementById('rc-usd').className=CLS(uChg);
  document.getElementById('r-gbp').textContent=fx.gbp.rate.toFixed(3);
  document.getElementById('rc-gbp').textContent=(gChg>=0?'+':'')+gChg.toFixed(2)+'%';
  document.getElementById('rc-gbp').className=CLS(gChg);
}

function toggleDebtInclusion(){
  includeDebt=!includeDebt;
  updateDebtToggleUI();
  saveData();renderAll();
}
function updateDebtToggleUI(){
  const sw=document.getElementById('debt-toggle');
  const lbl=document.getElementById('debt-toggle-label');
  const inc=document.getElementById('debt-include-display');
  if(includeDebt){sw.classList.add('on');if(lbl)lbl.textContent='含債務';if(inc)inc.textContent='是（點擊切換）';}
  else{sw.classList.remove('on');if(lbl)lbl.textContent='不含債務';if(inc)inc.textContent='否（點擊切換）';}
}

function debtToTWD(d){return toTWD(d.remaining||0,d.currency||'TWD');}
function calcMonthlyPayment(principal,annualRate,totalMonths,graceMonths,method){
  const monthlyRate=annualRate/100/12;
  const grace=graceMonths||0;
  if(monthlyRate===0) return{total:principal/totalMonths,principal:principal/totalMonths,interest:0};
  if(method==='equal'){
    const payment=principal*monthlyRate*Math.pow(1+monthlyRate,totalMonths)/(Math.pow(1+monthlyRate,totalMonths)-1);
    const interest=principal*monthlyRate;
    if(grace>0) return{total:interest,principal:0,interest};
    return{total:payment,principal:payment-interest,interest};
  }else{
    const prinPart=principal/totalMonths;
    const interest=principal*monthlyRate;
    if(grace>0) return{total:interest,principal:0,interest};
    return{total:prinPart+interest,principal:prinPart,interest};
  }
}
function getDebtMonthlyTWD(d){
  const p=d.remaining||0,r=d.rate||0,m=d.remainMonths||0,g=d.graceRemain||0,method=d.method||'equal';
  const result=calcMonthlyPayment(p,r,m,g,method);
  return toTWD(result.total,d.currency||'TWD');
}
function totalDebtTWD(){return getFilteredDebts().reduce((s,d)=>s+debtToTWD(d),0);}
function totalMonthlyTWD(){return getFilteredDebts().reduce((s,d)=>s+getDebtMonthlyTWD(d),0);}
function getFilteredDebts(){return profile==='family'?debts:debts.filter(d=>d.owner===profile);}

function onTickerInput(){
  clearTimeout(acTimer);
  const q=document.getElementById('f-ticker').value.trim();
  if(!q){hideAC();return;}
  const kw=q.toLowerCase();
  const local=SECURITIES.filter(s=>s.sym.toLowerCase().includes(kw)||s.name.toLowerCase().includes(kw)).slice(0,6);
  showAC(local);
  acTimer=setTimeout(async()=>{
    try{
      const remote=await proxySearch(q);
      const ri=remote.map(x=>({sym:x.symbol,name:x.description,type:guessType(x.symbol)}));
      const merged=[...local];
      ri.forEach(r=>{if(!merged.find(m=>m.sym===r.sym))merged.push(r);});
      showAC(merged.slice(0,8));
    }catch{}
  },600);
}
function guessType(sym){
  if(sym.endsWith('.TW')) return 'tw_stock';
  if(sym.endsWith('.L')) return 'uk_stock';
  return 'us_stock';
}
function showAC(items){
  const dd=document.getElementById('ac-dropdown');
  if(!items.length){dd.style.display='none';return;}
  dd.innerHTML=items.map(s=>'<div class="ac-item" onclick="selectTicker(\''+s.sym+'\',\''+s.name.replace(/'/g,"\\'")+'\',\''+s.type+'\')"><span class="ac-sym">'+s.sym+'</span><span class="ac-name">'+s.name+'</span></div>').join('');
  dd.style.display='block';
}
async function selectTicker(sym,name,type){
  document.getElementById('f-ticker').value=sym;
  document.getElementById('f-name').value=name;
  hideAC();
  const statusEl=document.getElementById('price-status');
  const priceEl=document.getElementById('f-price');
  statusEl.textContent='查詢即時報價…';statusEl.className='price-status price-loading';
  try{
    const q=await proxyQuote(toYahooSymbol(sym,selType||type));
    priceEl.value=q.price;priceEl.dataset.prevClose=q.prevClose;
    if(q.name) document.getElementById('f-name').value=q.name;
    statusEl.textContent='✓ 即時報價';statusEl.className='price-status price-ok';
  }catch{statusEl.textContent='查詢失敗，請手動輸入';statusEl.className='price-status price-err';}
}
function hideAC(){document.getElementById('ac-dropdown').style.display='none';}
function onCryptoInput(){
  const q=document.getElementById('f-cry-ticker').value.trim().toUpperCase();
  const dd=document.getElementById('ac-crypto-dd');
  if(!q){dd.style.display='none';return;}
  const matches=SECURITIES.filter(s=>s.type==='crypto'&&(s.sym.startsWith(q)||s.name.toUpperCase().startsWith(q))).slice(0,5);
  if(!matches.length){dd.style.display='none';return;}
  dd.innerHTML=matches.map(s=>'<div class="ac-item" onclick="selectCrypto(\''+s.sym+'\',\''+s.name+'\')"><span class="ac-sym">'+s.sym+'</span><span class="ac-name">'+s.name+'</span></div>').join('');
  dd.style.display='block';
}
async function selectCrypto(sym,name){
  document.getElementById('f-cry-ticker').value=sym;
  document.getElementById('ac-crypto-dd').style.display='none';
  const statusEl=document.getElementById('cry-price-status');
  const priceEl=document.getElementById('f-cry-price');
  statusEl.textContent='查詢即時報價…';statusEl.className='price-status price-loading';
  try{
    const id=CRYPTO_IDS[sym.toUpperCase()]||sym.toLowerCase();
    const d=await proxyCrypto(id);
    const entry=d[id];if(!entry)throw new Error('no data');
    priceEl.value=entry.usd.toFixed(2);
    priceEl.dataset.prevClose=(entry.usd/(1+(entry.usd_24h_change||0)/100)).toFixed(2);
    statusEl.textContent='✓ 即時報價';statusEl.className='price-status price-ok';
  }catch{statusEl.textContent='查詢失敗，請手動輸入';statusEl.className='price-status price-err';}
}

function assetValTWD(a){
  if(a.type==='twd_cash') return a.amt;
  if(a.type==='usd_cash') return a.amt*fx.usd.rate;
  if(a.type==='crypto') return(a.qty||0)*(a.price||0)*fx.usd.rate;
  return toTWD((a.price||0)*(a.shares||0),CATS[a.type].cur);
}
function assetValNative(a){
  if(a.type==='twd_cash') return a.amt;
  if(a.type==='usd_cash') return a.amt;
  if(a.type==='crypto') return(a.qty||0)*(a.price||0);
  return(a.price||0)*(a.shares||0);
}
function assetTodayNative(a){
  if(['twd_cash','usd_cash'].includes(a.type)) return 0;
  const prev=a.prevPrice!=null?a.prevPrice:(a.price||0);
  return((a.price||0)-prev)*(a.shares||a.qty||0);
}
function assetFxPnL(a){
  const c=CATS[a.type].cur;if(c==='TWD') return 0;
  const n=assetValNative(a);
  if(c==='USD') return n*(fx.usd.rate-fx.usd.prev);
  if(c==='GBP') return n*(fx.gbp.rate-fx.gbp.prev);
  return 0;
}
function assetCostTWD(a){
  if(a.type==='twd_cash') return a.amt;
  if(a.type==='usd_cash') return a.amt*fx.usd.rate;
  return toTWD((a.cost||0)*(a.shares||a.qty||0)+(a.fee||0),CATS[a.type].cur);
}
function assetUnrealTWD(a){return assetValTWD(a)-assetCostTWD(a);}
function getAllFiltered(){
  if(profile==='family') return assets.filter(a=>familyMembers[a.owner]!==false);
  return assets.filter(a=>a.owner===profile);
}
function renderAll(){
 const all=getAllFiltered();
 const totalAssets=all.reduce((s,a)=>s+assetValTWD(a),0);
 const debtTotal=includeDebt?totalDebtTWD():0;
 const totalTWD=totalAssets-debtTotal;
 const todayTWD=all.reduce((s,a)=>s+toTWD(assetTodayNative(a),CATS[a.type].cur),0);
 const fxTWD=all.reduce((s,a)=>s+assetFxPnL(a),0);
 const unrealTWD=all.reduce((s,a)=>s+assetUnrealTWD(a),0);
 const costTWD=all.reduce((s,a)=>s+assetCostTWD(a),0);
 const unrealPct=costTWD?unrealTWD/costTWD*100:0;
 const todayBase=totalTWD-todayTWD;
 const todayPct=todayBase?todayTWD/todayBase*100:0;
 const lmap={me:names.me+'的資產淨值',wife:names.wife+'的資產淨值',family:'總資產淨值'};
 document.getElementById('total-label').textContent=lmap[profile];
 document.getElementById('total-val').textContent=fmtTWD(totalTWD);
 document.getElementById('today-sub').innerHTML='今日損益 <span class="'+CLS(todayTWD)+'">'+(todayTWD>=0?'+':'')+fmtTWD(todayTWD)+'</span>（<span class="'+CLS(todayPct)+'">'+PCT(todayPct)+'</span>）';
 const debtRow=document.getElementById('debt-toggle-row');
 debtRow.style.display=debts.length>0?'flex':'none';
 document.getElementById('m-unreal').textContent=(unrealTWD>=0?'+':'')+fmtTWD(unrealTWD);
 document.getElementById('m-unreal').className='mval '+CLS(unrealTWD);
 document.getElementById('m-unreal-pct').textContent=PCT(unrealPct);
 document.getElementById('m-unreal-pct').className='msub '+CLS(unrealPct);
 document.getElementById('m-today').textContent=(todayTWD>=0?'+':'')+fmtTWD(todayTWD);
 document.getElementById('m-today').className='mval '+CLS(todayTWD);
 document.getElementById('m-today-pct').textContent=PCT(todayPct);
 document.getElementById('m-today-pct').className='msub '+CLS(todayPct);
 const fxDisplay=Math.abs(fxTWD)>1?(fxTWD>=0?'+':'')+fmtTWD(fxTWD):'—';
 document.getElementById('m-fx').textContent=fxDisplay;
 document.getElementById('m-fx').className='mval '+(Math.abs(fxTWD)>1?CLS(fxTWD):'');
 document.getElementById('m-count').textContent=all.length;
 renderTrend(all,totalTWD);renderDonut(all,totalTWD);renderSections(all);
}

function renderTrend(all,totalTWD){
 const dates=all.filter(a=>a.buyDate).map(a=>new Date(a.buyDate));
 const earliest=dates.length?new Date(Math.min(...dates)):new Date();
 const today=new Date();
 const diffDays=Math.max(1,Math.round((today-earliest)/86400000));
 const days=chartPeriod==='1M'?Math.min(30,diffDays):chartPeriod==='1Y'?Math.min(365,diffDays):diffDays;
 const labels=[],data=[];
 for(let i=days;i>=0;i--){
   const d=new Date(today);d.setDate(d.getDate()-i);
   labels.push((d.getMonth()+1)+'/'+d.getDate());
   const base=totalTWD*(1-i/Math.max(days,1)*0.08);
   data.push(Math.max(0,Math.round(base+(Math.random()-0.48)*totalTWD*0.003)));
 }
 if(trendChart) trendChart.destroy();
 trendChart=new Chart(document.getElementById('trend-chart').getContext('2d'),{
   type:'line',
   data:{labels,datasets:[{data,borderColor:'var(--accent)',backgroundColor:'rgba(2,132,199,0.07)',borderWidth:2,pointRadius:0,fill:true,tension:0.3}]},
   options:{responsive:true,maintainAspectRatio:false,
     plugins:{legend:{display:false},tooltip:{callbacks:{label:i=>'TWD '+i.raw.toLocaleString()}}},
     scales:{
       x:{ticks:{maxTicksLimit:6,color:'var(--text2)'},grid:{display:false},border:{display:false}},
       y:{ticks:{callback:v=>(v>=10000?(v/10000).toFixed(0)+'萬':v)+'',color:'var(--text2)',maxTicksLimit:4},grid:{color:'rgba(128,128,128,0.1)'},border:{display:false}}
     }
   }
 });
}

function renderDonut(all,totalTWD){
 let slices=[];
 if(dim==='detail'){slices=all.map(a=>({label:a.ticker||a.note||CATS[a.type].label,value:assetValTWD(a),color:CATS[a.type].color}));}
 else{Object.entries(TYPE_GROUPS).forEach(([n,g])=>{const v=all.filter(a=>g.types.includes(a.type)).reduce((s,a)=>s+assetValTWD(a),0);if(v>0)slices.push({label:n,value:v,color:g.color});});}
 slices.sort((a,b)=>b.value-a.value);
 const total=slices.reduce((s,x)=>s+x.value,0)||1;
 document.getElementById('dc-label').textContent='總資產';
 document.getElementById('dc-sub').textContent=fmtTWD(total);
 if(donutChart) donutChart.destroy();
 donutChart=new Chart(document.getElementById('donut-chart').getContext('2d'),{
   type:'doughnut',
   data:{labels:slices.map(s=>s.label),datasets:[{data:slices.map(s=>s.value),backgroundColor:slices.map(s=>s.color),borderWidth:2,borderColor:'transparent',hoverOffset:6}]},
   options:{responsive:true,maintainAspectRatio:true,cutout:'68%',plugins:{legend:{display:false},tooltip:{callbacks:{label:i=>' '+i.label+': '+fmtTWD(i.raw)+' ('+(i.raw/total*100).toFixed(1)+'%)'}}}}
 });
 document.getElementById('donut-legend').innerHTML=slices.map(s=>'<div class="legend-item"><span class="legend-dot" style="background:'+s.color+'"></span><span class="legend-name">'+s.label+'</span><span class="legend-amt">'+fmtTWD(s.value)+'</span><span class="legend-pct">'+(s.value/total*100).toFixed(1)+'%</span></div>').join('');
}

function renderSections(all){
 const localNames={'2330':'台積電','2317':'鴻海精密','2454':'聯發科技','2882':'國泰金控','2881':'富邦金控','0050':'元大台灣50','0056':'元大高股息','006208':'富邦台灣50','00878':'國泰永續高股息'};
 document.getElementById('asset-sections').innerHTML=Object.keys(CATS).map(k=>{
   const items=all.map(a=>({...a,_idx:assets.indexOf(a)})).filter(a=>a.type===k);
   if(!items.length) return '';
   const cat=CATS[k];
   const catTWD=items.reduce((s,a)=>s+assetValTWD(a),0);
   const hasFx=['us_stock','uk_stock','usd_cash','crypto'].includes(k);
   const isTW=['tw_stock','tw_fund'].includes(k);
   const rows=items.map(a=>{
     const valN=assetValNative(a),valTWD=assetValTWD(a);
     const todayN=assetTodayNative(a),todayTWD=toTWD(todayN,cat.cur);
     const fxPnl=assetFxPnL(a);
     const costN=(a.cost||0)*(a.shares||a.qty||0)+(a.fee||0);
     const unrealN=valN-costN,unrealPct=costN?unrealN/costN*100:0;
     const isCash=['twd_cash','usd_cash'].includes(k);
     const liveTag=a.priceSource==='live'?'<span class="live-dot">●</span>':'';
     const idx=a._idx;
     const ownerName=a.owner==='me'?names.me:names.wife;
     const displayName=isTW?(localNames[a.ticker]||a.name||''):(a.name||'');
     const fxCell=hasFx&&Math.abs(fxPnl)>0?'<div class="'+CLS(fxPnl)+'" style="font-size:12px">'+(fxPnl>=0?'+':'')+fmtTWD(fxPnl)+'</div><div class="mini">匯率 TWD</div>':'<span style="color:var(--text3)">—</span>';
     if(isCash) return '<tr onclick="openEditModal('+idx+')">'+'<td><div class="ticker-main">'+(a.note||cat.label)+'</div><div class="ticker-sub">'+ownerName+'</div></td>'+'<td><span class="badge '+cat.badge+'">'+cat.label+'</span></td>'+'<td class="rc" style="color:var(--text3)">—</td><td class="rc" style="color:var(--text3)">—</td>'+'<td class="rc" style="color:var(--text3)">—</td><td class="rc">'+fxCell+'</td>'+'<td class="rc"><div style="font-weight:700;font-size:13px">'+fmtCur(valN,cat.cur)+'</div>'+(cat.cur!=='TWD'?'<div class="mini">'+fmtTWD(valTWD)+'</div>':'')+'</td></tr>';
     return '<tr onclick="openEditModal('+idx+')">'+'<td><div class="ticker-main">'+(a.ticker||'—')+liveTag+'</div><div class="ticker-sub">'+(displayName&&displayName!==a.ticker?displayName:'')+(a.note?' · '+a.note:'')+'</div></td>'+'<td><span class="badge '+cat.badge+'">'+cat.label+'</span></td>'+'<td class="rc"><div style="font-size:12px">'+(a.shares||a.qty||0).toLocaleString()+'</div><div class="mini">@ '+(a.price!=null?Number(a.price).toFixed(2):'—')+'</div></td>'+'<td class="rc"><div style="font-size:12px">'+(a.cost?fmtCur(a.cost,cat.cur):'—')+'</div></td>'+'<td class="rc"><div class="'+CLS(todayN)+'" style="font-size:12px">'+(todayN!==0?(todayN>=0?'+':'')+fmtCur(todayN,cat.cur):'—')+'</div>'+(hasFx&&todayN!==0?'<div class="mini">'+(todayTWD>=0?'+':'')+fmtTWD(todayTWD)+'</div>':'')+'</td>'+'<td class="rc">'+fxCell+'</td>'+'<td class="rc"><div style="font-weight:700;font-size:12px">'+fmtCur(valN,cat.cur)+'</div>'+(cat.cur!=='TWD'?'<div class="mini">'+fmtTWD(valTWD)+'</div>':'')+'<div class="mini '+CLS(unrealN)+'">'+(unrealN!==0?(unrealN>=0?'+':'')+fmtCur(unrealN,cat.cur)+' ('+PCT(unrealPct)+')':'—')+'</div></td>'+'</tr>';
   }).join('');
   return '<div class="cat-section"><div class="cat-header"><span class="cat-dot" style="background:'+cat.color+'"></span><span class="cat-title">'+cat.label+'</span><span class="cat-sub">'+cat.cur+'</span><span class="cat-total">'+fmtTWD(catTWD)+'</span></div>'+'<div class="card"><div style="overflow-x:auto"><table><thead><tr>'+'<th style="width:17%">標的</th><th style="width:10%">類別</th><th style="width:12%;text-align:right">股數／現價</th>'+'<th style="width:13%;text-align:right">均價（'+cat.cur+'）</th><th style="width:16%;text-align:right">今日損益（'+cat.cur+'）</th>'+'<th style="width:13%;text-align:right">匯率損益</th><th style="width:19%;text-align:right">未實現損益（'+cat.cur+'）</th>'+'</tr></thead><tbody>'+rows+'</tbody></table></div></div></div>';
 }).join('');
}

function renderDebt(){
 const all=getFilteredDebts();
 const empty=document.getElementById('debt-empty-state');
 const content=document.getElementById('debt-has-content');
 if(!all.length){empty.style.display='block';content.style.display='none';return;}
 empty.style.display='none';content.style.display='block';
 const total=totalDebtTWD();
 const monthly=totalMonthlyTWD();
 const avgRate=all.length?all.reduce((s,d)=>s+(d.rate||0),0)/all.length:0;
 document.getElementById('debt-total-display').textContent=fmtTWD(total);
 document.getElementById('debt-monthly-display').textContent=fmtTWD(monthly);
 document.getElementById('debt-count-display').textContent=all.length+' 筆';
 document.getElementById('debt-rate-display').textContent=avgRate.toFixed(2)+'%';
 document.getElementById('debt-include-display').textContent=includeDebt?'是（點擊切換）':'否（點擊切換）';
 document.getElementById('debt-list').innerHTML=all.map((d)=>{
   const idx=debts.indexOf(d);
   const typeInfo=DEBT_TYPES[d.debtType]||DEBT_TYPES.other;
   const remaining=d.remaining||0;
   const original=d.principal||remaining;
   const paidPct=original>0?Math.round((original-remaining)/original*100):0;
   const monthlyAmt=getDebtMonthlyTWD(d);
   const remainStr=d.remainMonths?d.remainMonths+' 期':'—';
   const graceStr=d.graceRemain>0?'剩 '+d.graceRemain+' 月':'無';
   const cur=d.currency||'TWD';
   const ownerName=d.owner==='me'?names.me:names.wife;
   const result=calcMonthlyPayment(remaining,d.rate||0,d.remainMonths||0,d.graceRemain||0,d.method||'equal');
   return '<div class="debt-card" onclick="openDebtEditModal('+idx+')">'+'<div class="debt-card-top">'+'<div><div class="debt-card-name">'+typeInfo.label+(d.name?' · '+d.name:'')+'</div>'+'<div class="debt-card-sub">'+ownerName+' · 每月 '+(d.payDay||5)+' 日'+(d.note?' · '+d.note:'')+'</div></div>'+'<div><div class="debt-card-amount">'+fmtCur(remaining,cur)+'</div><div class="debt-card-amount-sub">剩餘本金</div></div>'+'</div>'+'<div class="debt-progress-wrap">'+'<div class="debt-progress-label"><span>已還 '+paidPct+'%</span><span>剩 '+remainStr+'</span></div>'+'<div class="debt-progress-bar"><div class="debt-progress-fill" style="width:'+paidPct+'%"></div></div>'+'</div>'+'<div class="debt-detail-grid">'+'<div class="debt-detail-item"><div class="debt-detail-label">年利率</div><div class="debt-detail-val">'+(d.rate||0)+'%</div></div>'+'<div class="debt-detail-item"><div class="debt-detail-label">本月應還</div><div class="debt-detail-val">'+fmtTWD(monthlyAmt)+'</div></div>'+'<div class="debt-detail-item"><div class="debt-detail-label">寬限期</div><div class="debt-detail-val">'+graceStr+'</div></div>'+'</div>'+'<button class="confirm-pay-btn" onclick="event.stopPropagation();confirmPayment('+idx+')" style="margin-top:10px;width:100%;padding:8px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer;">✓ 確認本月還款｜本金 '+fmtCur(result.principal,cur)+' ＋ 利息 '+fmtCur(result.interest,cur)+'</button>'+'</div>';
 }).join('');
}

function confirmPayment(idx){
 const d=debts[idx];if(!d) return;
 const result=calcMonthlyPayment(d.remaining||0,d.rate||0,d.remainMonths||0,d.graceRemain||0,d.method||'equal');
 if(!confirm('確認本月還款？\n本金：'+fmtCur(result.principal,d.currency||'TWD')+'\n利息：'+fmtCur(result.interest,d.currency||'TWD'))) return;
 d.remaining=Math.max(0,(d.remaining||0)-result.principal);
 d.remainMonths=Math.max(0,(d.remainMonths||0)-1);
 if(d.graceRemain>0) d.graceRemain=d.graceRemain-1;
 saveData();renderDebt();renderAll();
}

function openDebtModal(){
 debtEditIndex=-1;
 document.getElementById('debt-modal-title').textContent='新增負債';
 document.getElementById('debt-submit-btn').textContent='新增';
 document.getElementById('debt-delete-btn').style.display='none';
 ['d-name','d-principal','d-rate','d-total-months','d-grace','d-remaining','d-rate-mid','d-remain-months','d-grace-mid','d-note'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
 document.getElementById('d-type').value='mortgage';
 document.getElementById('d-currency').value='TWD';
 document.getElementById('d-owner').value='me';
 document.getElementById('d-pay-day').value='5';
 document.getElementById('d-method').value='equal';
 document.getElementById('d-pay-day-mid').value='5';
 document.getElementById('d-method-mid').value='equal';
 setDebtMode('new');
 document.getElementById('debt-calc-preview').style.display='none';
 document.getElementById('debt-modal-overlay').style.display='flex';
}

function openDebtEditModal(idx){
 const d=debts[idx];if(!d) return;
 debtEditIndex=idx;
 document.getElementById('debt-modal-title').textContent='編輯負債';
 document.getElementById('debt-submit-btn').textContent='儲存';
 document.getElementById('debt-delete-btn').style.display='';
 document.getElementById('d-type').value=d.debtType||'mortgage';
 document.getElementById('d-currency').value=d.currency||'TWD';
 document.getElementById('d-name').value=d.name||'';
 document.getElementById('d-owner').value=d.owner||'me';
 document.getElementById('d-note').value=d.note||'';
 const mode=d.mode||'mid';
 setDebtMode(mode);
 if(mode==='new'){
   document.getElementById('d-principal').value=d.principal||'';
   document.getElementById('d-rate').value=d.rate||'';
   document.getElementById('d-total-months').value=d.totalMonths||'';
   document.getElementById('d-grace').value=d.grace||'';
   document.getElementById('d-pay-day').value=d.payDay||'5';
   document.getElementById('d-method').value=d.method||'equal';
 }else{
   document.getElementById('d-remaining').value=d.remaining||'';
   document.getElementById('d-rate-mid').value=d.rate||'';
   document.getElementById('d-remain-months').value=d.remainMonths||'';
   document.getElementById('d-grace-mid').value=d.graceRemain||'';
   document.getElementById('d-pay-day-mid').value=d.payDay||'5';
   document.getElementById('d-method-mid').value=d.method||'equal';
 }
 calcDebtPayment();
 document.getElementById('debt-modal-overlay').style.display='flex';
}

function closeDebtModal(){document.getElementById('debt-modal-overlay').style.display='none';}
function debtOverlayClick(e){if(e.target===document.getElementById('debt-modal-overlay'))closeDebtModal();}

function setDebtMode(mode){
 debtMode=mode;
 document.getElementById('seg-new').classList.toggle('active',mode==='new');
 document.getElementById('seg-mid').classList.toggle('active',mode==='mid');
 document.getElementById('debt-form-new').style.display=mode==='new'?'block':'none';
 document.getElementById('debt-form-mid').style.display=mode==='mid'?'block':'none';
 calcDebtPayment();
}

function calcDebtPayment(){
 let principal,rate,months,grace,method;
 if(debtMode==='new'){
   principal=parseFloat(document.getElementById('d-principal').value)||0;
   rate=parseFloat(document.getElementById('d-rate').value)||0;
   months=parseInt(document.getElementById('d-total-months').value)||0;
   grace=parseInt(document.getElementById('d-grace').value)||0;
   method=document.getElementById('d-method').value;
 }else{
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

function submitDebt(){
 const debtType=document.getElementById('d-type').value;
 const currency=document.getElementById('d-currency').value;
 const name=document.getElementById('d-name').value.trim();
 const owner=document.getElementById('d-owner').value;
 const note=document.getElementById('d-note').value;
 let obj={debtType,currency,name,owner,note,mode:debtMode};
 if(debtMode==='new'){
   const principal=parseFloat(document.getElementById('d-principal').value)||0;
   if(!principal) return;
   obj.principal=principal;obj.remaining=principal;
   obj.rate=parseFloat(document.getElementById('d-rate').value)||0;
   obj.totalMonths=parseInt(document.getElementById('d-total-months').value)||0;
   obj.remainMonths=obj.totalMonths;
   obj.grace=parseInt(document.getElementById('d-grace').value)||0;
   obj.graceRemain=obj.grace;
   obj.payDay=parseInt(document.getElementById('d-pay-day').value)||5;
   obj.method=document.getElementById('d-method').value;
 }else{
   const remaining=parseFloat(document.getElementById('d-remaining').value)||0;
   if(!remaining) return;
   obj.remaining=remaining;obj.principal=remaining;
   obj.rate=parseFloat(document.getElementById('d-rate-mid').value)||0;
   obj.remainMonths=parseInt(document.getElementById('d-remain-months').value)||0;
   obj.totalMonths=obj.remainMonths;
   obj.graceRemain=parseInt(document.getElementById('d-grace-mid').value)||0;
   obj.payDay=parseInt(document.getElementById('d-pay-day-mid').value)||5;
   obj.method=document.getElementById('d-method-mid').value;
 }
 if(debtEditIndex>=0) debts[debtEditIndex]=obj;
 else debts.push(obj);
 saveData();closeDebtModal();renderDebt();renderAll();
}

function deleteDebt(){
 if(debtEditIndex<0) return;
 if(!confirm('確定刪除這筆負債？')) return;
 debts.splice(debtEditIndex,1);
 saveData();closeDebtModal();renderDebt();renderAll();
}

function renderRebal(){
 const all=getAllFiltered().filter(a=>!['twd_cash','usd_cash'].includes(a.type));
 const totalTWD=all.reduce((s,a)=>s+assetValTWD(a),0)||1;
 if(!rebalRows.length){rebalRows=all.map(a=>({ticker:a.ticker,name:a.name||a.ticker,nowPct:assetValTWD(a)/totalTWD*100,targetPct:Math.round(assetValTWD(a)/totalTWD*100),price:a.price||0,type:a.type}));}
 else{rebalRows.forEach(r=>{const a=all.find(x=>x.ticker===r.ticker);if(a){r.nowPct=assetValTWD(a)/totalTWD*100;r.price=a.price||r.price;}});}
 document.getElementById('rebal-rows').innerHTML=rebalRows.map((r,i)=>`<div class="rebal-row"><div style="flex:1;min-width:0"><div class="rebal-ticker">${r.ticker}</div><div class="rebal-name">${r.name!==r.ticker?r.name:''}</div></div><div class="rebal-now">${r.nowPct.toFixed(1)}%</div><i class="ti ti-arrow-right rebal-arrow"></i><div class="iuw rebal-target"><input type="number" value="${r.targetPct}" min="0" max="100" style="width:65px;text-align:center;padding:6px 8px" oninput="rebalRows[${i}].targetPct=parseFloat(this.value)||0"><span class="iunit" style="right:4px">%</span></div><button class="del-btn" onclick="rebalRemoveRow(${i})"><i class="ti ti-trash"></i></button></div>`).join('');
}
function rebalAddRow(){
 const ticker=document.getElementById('rebal-add-ticker').value.trim().toUpperCase();
 if(!ticker||rebalRows.find(r=>r.ticker===ticker)) return;
 const found=assets.find(a=>a.ticker===ticker);
 rebalRows.push({ticker,name:found?.name||ticker,nowPct:0,targetPct:0,price:found?.price||0,type:found?.type||'us_stock'});
 document.getElementById('rebal-add-ticker').value='';renderRebal();
}
function rebalRemoveRow(i){rebalRows.splice(i,1);renderRebal();}
function calcRebal(){
 const amount=parseFloat(document.getElementById('rebal-amount').value)||0;
 if(!amount||!rebalRows.length) return;
 const totalTarget=rebalRows.reduce((s,r)=>s+r.targetPct,0);
 if(!totalTarget) return;
 const all=getAllFiltered();
 const totalNow=all.reduce((s,a)=>s+assetValTWD(a),0);
 const totalAfter=totalNow+amount;
 const result=document.getElementById('rebal-result');
 result.style.display='block';
 let html='<div style="font-size:12px;color:var(--text2);margin-bottom:8px">投入 '+fmtTWD(amount)+' 後總資產約 '+fmtTWD(totalAfter)+'</div>';
 rebalRows.forEach(r=>{
   const targetValueTWD=totalAfter*(r.targetPct/totalTarget);
   const a=all.find(x=>x.ticker===r.ticker);
   const nowValueTWD=a?assetValTWD(a):0;
   const buyTWD=Math.max(0,targetValueTWD-nowValueTWD);
   const cat=CATS[r.type]||CATS['us_stock'];
   const priceInTWD=toTWD(r.price||0,cat.cur);
   const shares=priceInTWD>0?Math.floor(buyTWD/priceInTWD):0;
   html+='<div class="rebal-result-row"><div><div style="font-weight:600">'+r.ticker+'</div><div class="mini">目標 '+r.targetPct+'% → '+fmtTWD(targetValueTWD)+'</div></div><div class="rebal-buy">'+(buyTWD>0?'買入 '+(shares>0?shares+'股 ':'')+fmtTWD(buyTWD):'已達標 ✓')+'</div></div>';
 });
 result.innerHTML=html;
}

function openAddModal(){
 editIndex=-1;selType=null;
 document.getElementById('modal-title-text').textContent='新增資產';
 document.getElementById('step1').style.display='block';
 document.getElementById('step2').style.display='none';
 document.getElementById('back-btn').style.display='';
 document.getElementById('submit-btn').textContent='新增';
 document.getElementById('delete-btn').style.display='none';
 document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('selected'));
 document.getElementById('modal-overlay').style.display='flex';
}
function openEditModal(idx){
 const a=assets[idx];if(!a) return;
 editIndex=idx;selType=a.type;
 document.getElementById('modal-title-text').textContent='編輯資產';
 document.getElementById('step1').style.display='none';
 document.getElementById('step2').style.display='block';
 document.getElementById('back-btn').style.display='none';
 document.getElementById('submit-btn').textContent='儲存';
 document.getElementById('delete-btn').style.display='';
 const isCash=['twd_cash','usd_cash'].includes(a.type),isCrypto=a.type==='crypto';
 document.getElementById('form-stock').style.display=(!isCash&&!isCrypto)?'block':'none';
 document.getElementById('form-cash').style.display=isCash?'block':'none';
 document.getElementById('form-crypto').style.display=isCrypto?'block':'none';
 if(isCash){
   document.getElementById('cash-lbl').textContent='金額（'+CATS[a.type].cur+'）';
   document.getElementById('f-cash-amt').value=a.amt||'';
   document.getElementById('f-cash-owner').value=a.owner||'me';
   document.getElementById('f-cash-note').value=a.note||'';
 }else if(isCrypto){
   document.getElementById('f-cry-ticker').value=a.ticker||'';
   document.getElementById('f-cry-qty').value=a.qty||'';
   document.getElementById('f-cry-cost').value=a.cost||'';
   document.getElementById('f-cry-price').value=a.price!=null?Number(a.price).toFixed(2):'';
   document.getElementById('f-cry-date').value=a.buyDate||'';
   document.getElementById('f-cry-owner').value=a.owner||'me';
   document.getElementById('f-cry-note').value=a.note||'';
   document.getElementById('cry-price-status').textContent='';
 }else{
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
   updateFeeUI();calcFee();
 }
 document.getElementById('modal-overlay').style.display='flex';
}
function closeModal(){document.getElementById('modal-overlay').style.display='none';hideAC();document.getElementById('ac-crypto-dd').style.display='none';}
function overlayClick(e){if(e.target===document.getElementById('modal-overlay'))closeModal();}
function goStep1(){document.getElementById('step1').style.display='block';document.getElementById('step2').style.display='none';document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('selected'));}
function pickType(t){
 selType=t;
 document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('selected'));
 document.getElementById('t-'+t).classList.add('selected');
 document.getElementById('step1').style.display='none';
 document.getElementById('step2').style.display='block';
 const isCash=['twd_cash','usd_cash'].includes(t),isCrypto=t==='crypto';
 document.getElementById('form-stock').style.display=(!isCash&&!isCrypto)?'block':'none';
 document.getElementById('form-cash').style.display=isCash?'block':'none';
 document.getElementById('form-crypto').style.display=isCrypto?'block':'none';
 const cat=CATS[t];
 if(cat){document.getElementById('funit').textContent=cat.cur;document.getElementById('cash-lbl').textContent='金額（'+cat.cur+'）';}
 ['f-ticker','f-name','f-shares','f-cost','f-note','f-cash-note','f-cry-note'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
 document.getElementById('f-price').value='';document.getElementById('f-cry-price').value='';
 document.getElementById('price-status').textContent='';document.getElementById('cry-price-status').textContent='';
 if(!document.getElementById('f-date').value) document.getElementById('f-date').value=todayStr();
 if(!document.getElementById('f-cry-date').value) document.getElementById('f-cry-date').value=todayStr();
 updateFeeUI();
}
function updateFeeUI(){
 const t=document.getElementById('f-fee-type').value;
 document.getElementById('fpw').style.display=t==='pct'?'block':'none';
 document.getElementById('fmw').style.display=t==='manual'?'block':'none';
 calcFee();
}
function calcFee(){
 const sh=parseFloat(document.getElementById('f-shares').value)||0;
 const co=parseFloat(document.getElementById('f-cost').value)||0;
 const t=document.getElementById('f-fee-type').value;
 const pct=parseFloat(document.getElementById('f-fee-pct').value)||0;
 const manual=parseFloat(document.getElementById('f-fee-manual').value)||0;
 const el=document.getElementById('fee-preview');
 const c=(CATS[selType]||{cur:'TWD'}).cur;
 if(!sh||!co){el.textContent='請先輸入股數與買入成本';return;}
 const p=sh*co,fee=t==='none'?0:t==='pct'?p*pct/100:manual;
 if(t==='none') el.textContent='無手續費　買入總額：'+c+' '+Math.round(p).toLocaleString();
 else if(t==='pct') el.textContent='買入總額 '+c+' '+Math.round(p).toLocaleString()+' × '+pct+'% = 手續費 '+c+' '+fee.toFixed(2)+'　→　總費用 '+c+' '+(p+fee).toFixed(2);
 else el.textContent='買入總額 '+c+' '+Math.round(p).toLocaleString()+' + 手續費 '+c+' '+manual+' → 總費用 '+c+' '+(p+manual).toFixed(2);
}
function submitAsset(){
 const isCash=['twd_cash','usd_cash'].includes(selType),isCrypto=selType==='crypto';
 const today=todayStr();let obj;
 if(isCash){
   const amt=parseFloat(document.getElementById('f-cash-amt').value)||0;if(!amt)return;
   obj={type:selType,amt,note:document.getElementById('f-cash-note').value,owner:document.getElementById('f-cash-owner').value};
 }else if(isCrypto){
   const ticker=document.getElementById('f-cry-ticker').value.trim().toUpperCase();
   const qty=parseFloat(document.getElementById('f-cry-qty').value)||0;
   const cost=parseFloat(document.getElementById('f-cry-cost').value)||0;
   const price=parseFloat(document.getElementById('f-cry-price').value)||0;
   const prevPrice=parseFloat(document.getElementById('f-cry-price').dataset.prevClose)||price;
   if(!ticker||!qty)return;
   obj={type:'crypto',ticker,qty,cost,price,prevPrice,owner:document.getElementById('f-cry-owner').value,buyDate:document.getElementById('f-cry-date').value||today,note:document.getElementById('f-cry-note').value,priceSource:price?'live':''};
 }else{
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
   if(!ticker||!shares||!cost)return;
   obj={type:selType,ticker,name,shares,cost,price:price||cost,prevPrice:prevPrice||price||cost,fee,feeType,feePct,feeManual,owner:document.getElementById('f-owner').value,buyDate:document.getElementById('f-date').value||today,note:document.getElementById('f-note').value,priceSource:price?'live':''};
 }
 if(editIndex>=0) assets[editIndex]=obj;else assets.push(obj);
 rebalRows=[];saveData();closeModal();renderAll();
}
function deleteAsset(){
 if(editIndex<0)return;
 if(!confirm('確定刪除這筆資產？'))return;
 assets.splice(editIndex,1);rebalRows=[];saveData();closeModal();renderAll();
}
function setProfile(p){
 profile=p;
 ['me','wife','family'].forEach(id=>document.getElementById('pb-'+id)?.classList.toggle('active',id===p));
 rebalRows=[];renderAll();
}
function setChartPeriod(btn,p){chartPeriod=p;document.querySelectorAll('.pbtn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderAll();}
function setDim(btn,d){dim=d;document.querySelectorAll('.dbtn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderAll();}
function toggleRename(){const b=document.getElementById('rename-bar');b.style.display=b.style.display==='none'?'block':'none';}
function applyRename(){
 names.me=document.getElementById('rn-me').value||'我';
 names.wife=document.getElementById('rn-wife').value||'太太';
 updateNameLabels();
 document.getElementById('rename-bar').style.display='none';
 saveData();renderAll();
}

loadData();
fetchFX().then(()=>{updateFxBar();renderAll();}).catch(()=>{renderAll();});
