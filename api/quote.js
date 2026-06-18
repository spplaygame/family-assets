export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { type, symbol, ids, from, to, date } = req.query;

  try {
    if (type === 'quote') {
      // Yahoo Finance quote — works for TW (.TW), UK (.L), US stocks
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
      const price = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose || meta.previousClose || price;
      const name = meta.longName || meta.shortName || symbol;
      res.json({ price, prevClose, name, currency: meta.currency });

    } else if (type === 'search') {
      // Yahoo Finance search
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=8&newsCount=0`;
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const d = await r.json();
      const quotes = (d?.quotes || []).filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF');
      res.json({ result: quotes.map(q => ({ symbol: q.symbol, description: q.longname || q.shortname || q.symbol, type: 'Common Stock' })) });

    } else if (type === 'crypto') {
      // CoinGecko — no auth needed
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true`;
      const r = await fetch(url);
      const d = await r.json();
      res.json(d);

    } else if (type === 'fx') {
      // Frankfurter FX
      const base = date ? `https://api.frankfurter.app/${date}` : 'https://api.frankfurter.app/latest';
      const r = await fetch(`${base}?from=${from}&to=${to}`);
      const d = await r.json();
      res.json(d);

    } else {
      res.status(400).json({ error: 'unknown type' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
