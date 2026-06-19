export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { type, symbol, ids, from, to, date } = req.query;

  try {
    if (type === 'quote') {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        }
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
      res.json({ result: quotes.map(q => ({ symbol: q.symbol, description: q.longname || q.shortname || q.symbol, type: 'Common Stock' })) });

    } else if (type === 'crypto') {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true`;
      const r = await fetch(url);
      res.json(await r.json());

    } else if (type === 'fx') {
      // 使用 Yahoo Finance 抓匯率，更準確
      const pairs = { 'TWD': 'USDTWD=X', 'GBP': 'GBPUSD=X' };
      const result = { rates: {} };

      // USD/TWD
      try {
        const r1 = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/USDTWD=X?interval=1d&range=5d`, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
        });
        const d1 = await r1.json();
        const meta1 = d1?.chart?.result?.[0]?.meta;
        if (meta1?.regularMarketPrice) {
          result.rates.TWD = meta1.regularMarketPrice;
          // 昨日收盤
          const closes = d1?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
          result.prevTWD = closes[closes.length - 2] || meta1.chartPreviousClose || meta1.regularMarketPrice;
        }
      } catch {}

      // GBP/TWD (先抓 GBP/USD 再換算)
      try {
        const r2 = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/GBPUSD=X?interval=1d&range=5d`, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
        });
        const d2 = await r2.json();
        const meta2 = d2?.chart?.result?.[0]?.meta;
        if (meta2?.regularMarketPrice && result.rates.TWD) {
          result.rates.GBP = meta2.regularMarketPrice; // GBP/USD
          result.gbpUsd = meta2.regularMarketPrice;
          const closes2 = d2?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
          result.prevGbpUsd = closes2[closes2.length - 2] || meta2.chartPreviousClose || meta2.regularMarketPrice;
          // GBP/TWD = GBP/USD * USD/TWD
          result.rates.GBPTWD = meta2.regularMarketPrice * result.rates.TWD;
          result.prevGBPTWD = result.prevGbpUsd * (result.prevTWD || result.rates.TWD);
        }
      } catch {}

      res.json(result);

    } else {
      res.status(400).json({ error: 'unknown type' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
