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
      // 台灣基金搜尋 - 投信投顧公會
      const keyword = encodeURIComponent(q || '');
      const domestic = `https://www.fundclear.com.tw/fundclearWeb/ESBFundService?action=getFundListByName&fundName=${keyword}&fundType=0`;
      const foreign = `https://www.fundclear.com.tw/fundclearWeb/ESBFundService?action=getFundListByName&fundName=${keyword}&fundType=1`;
      const [r1, r2] = await Promise.allSettled([
        fetch(domestic, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
        fetch(foreign, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
      ]);
      let results = [];
      if (r1.status === 'fulfilled') {
        try {
          const d = await r1.value.json();
          const list = d?.result || d?.data || d || [];
          if (Array.isArray(list)) {
            results = results.concat(list.slice(0, 10).map(f => ({
              id: f.fundCode || f.isin || '',
              name: f.fundName || f.name || '',
              currency: f.currency || 'TWD',
              nav: parseFloat(f.nav || f.navPrice || 0),
              navDate: f.navDate || '',
              type: 'domestic',
            })));
          }
        } catch {}
      }
      if (r2.status === 'fulfilled') {
        try {
          const d = await r2.value.json();
          const list = d?.result || d?.data || d || [];
          if (Array.isArray(list)) {
            results = results.concat(list.slice(0, 10).map(f => ({
              id: f.fundCode || f.isin || '',
              name: f.fundName || f.name || '',
              currency: f.currency || 'USD',
              nav: parseFloat(f.nav || f.navPrice || 0),
              navDate: f.navDate || '',
              type: 'foreign',
            })));
          }
        } catch {}
      }
      res.json({ result: results });

    } else if (type === 'fund_nav') {
      // 查單一基金淨值
      const url = `https://www.fundclear.com.tw/fundclearWeb/ESBFundService?action=getFundNavByCode&fundCode=${encodeURIComponent(symbol)}`;
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const d = await r.json();
      const nav = parseFloat(d?.nav || d?.navPrice || d?.result?.nav || 0);
      const prevNav = parseFloat(d?.prevNav || d?.result?.prevNav || nav);
      if (!nav) { res.status(404).json({ error: 'no nav' }); return; }
      res.json({ nav, prevNav, navDate: d?.navDate || d?.result?.navDate || '' });

    } else {
      res.status(400).json({ error: 'unknown type' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
