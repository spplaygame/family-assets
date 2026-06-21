export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { type, symbol, ids, q } = req.query;

  try {
    if (type === 'quote') {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
      });
      const d = await r.json();
      const meta = d?.chart?.result?.[0]?.meta;
      if (!meta || !meta.regularMarketPrice) {
        res.status(404).json({ error: 'no data for ' + symbol }); return;
      }
      res.json({
        price: meta.regularMarketPrice,
        prevClose: meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice,
        name: meta.longName || meta.shortName || symbol,
        currency: meta.currency,
      });

    } else if (type === 'search') {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=8&newsCount=0`;
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const d = await r.json();
      const quotes = (d?.quotes || []).filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF');
      res.json({ result: quotes.map(q => ({ symbol: q.symbol, description: q.longname || q.shortname || q.symbol, exchDisp: q.exchDisp || '' })) });

    } else if (type === 'crypto') {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true`;
      const r = await fetch(url);
      res.json(await r.json());

    } else if (type === 'fx') {
      const result = { rates: {} };
      try {
        const r1 = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/USDTWD=X?interval=1d&range=5d`, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
        });
        const d1 = await r1.json();
        const meta1 = d1?.chart?.result?.[0]?.meta;
        if (meta1?.regularMarketPrice) {
          result.rates.TWD = meta1.regularMarketPrice;
          const closes = d1?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
          result.prevTWD = closes[closes.length - 2] || meta1.chartPreviousClose || meta1.regularMarketPrice;
        }
      } catch {}
      try {
        const r2 = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/GBPUSD=X?interval=1d&range=5d`, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
        });
        const d2 = await r2.json();
        const meta2 = d2?.chart?.result?.[0]?.meta;
        if (meta2?.regularMarketPrice && result.rates.TWD) {
          result.gbpUsd = meta2.regularMarketPrice;
          const closes2 = d2?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
          result.prevGbpUsd = closes2[closes2.length - 2] || meta2.chartPreviousClose || meta2.regularMarketPrice;
          result.rates.GBPTWD = meta2.regularMarketPrice * result.rates.TWD;
          result.prevGBPTWD = result.prevGbpUsd * (result.prevTWD || result.rates.TWD);
        }
      } catch {}
      res.json(result);

    } else if (type === 'fund_search') {
      // 境內基金：投信投顧公會 CSV
      // 境外基金：台灣集保 CSV
      const keyword = (q || '').toLowerCase();
      let results = [];

      // 境內基金
      try {
        const r1 = await fetch('https://www.sitca.org.tw/MemberK0000/F/03/nav.csv', {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const text = await r1.text();
        const lines = text.split('\n').slice(1); // 跳過標題
        const matched = [];
        for (const line of lines) {
          if (!line.trim()) continue;
          const cols = line.split(',');
          const name = (cols[5] || '').trim();
          const code = (cols[4] || '').trim();
          const nav  = parseFloat(cols[6]) || 0;
          const cur  = (cols[10] || 'TWD').trim();
          const date = (cols[0] || '').trim();
          if (name.includes(keyword) || code.includes(keyword)) {
            matched.push({ id: code, name, currency: cur, nav, navDate: date, type: 'domestic' });
          }
          if (matched.length >= 15) break;
        }
        results = results.concat(matched);
      } catch(e) { console.warn('domestic fund error', e.message); }

      // 境外基金
      try {
        const r2 = await fetch('https://opendata.tdcc.com.tw/getOD.ashx?id=3-4', {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const text = await r2.text();
        const lines = text.split('\n').slice(1);
        const matched = [];
        for (const line of lines) {
          if (!line.trim()) continue;
          const cols = line.split(',');
          const name = (cols[1] || '').trim();
          const code = (cols[0] || '').trim();
          const nav  = parseFloat(cols[3]) || 0;
          const cur  = (cols[5] || 'USD').trim();
          const date = (cols[2] || '').trim();
          if (name.toLowerCase().includes(keyword) || code.toLowerCase().includes(keyword)) {
            matched.push({ id: code, name, currency: cur, nav, navDate: date, type: 'foreign' });
          }
          if (matched.length >= 15) break;
        }
        results = results.concat(matched);
      } catch(e) { console.warn('foreign fund error', e.message); }

      res.json({ result: results.slice(0, 20) });

    } else if (type === 'fund_nav') {
      // 用代碼查單一境內基金最新淨值
      const code = symbol;
      const r = await fetch('https://www.sitca.org.tw/MemberK0000/F/03/nav.csv', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const text = await r.text();
      const lines = text.split('\n').slice(1);
      for (const line of lines) {
        const cols = line.split(',');
        if ((cols[4] || '').trim() === code) {
          const nav = parseFloat(cols[6]) || 0;
          res.json({ nav, prevNav: nav, navDate: (cols[0] || '').trim() });
          return;
        }
      }
      res.status(404).json({ error: 'fund not found' });

    } else {
      res.status(400).json({ error: 'unknown type' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
