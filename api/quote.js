const FINNHUB_KEY = 'd8pjvgpr01qujv4ic1tgd8pjvgpr01qujv4ic1u0';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const FRANKFURTER_BASE = 'https://api.frankfurter.app';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { type, symbol, ids, from, to, date } = req.query;

  try {
    if (type === 'quote') {
      // Finnhub quote
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`;
      const r = await fetch(url);
      const d = await r.json();
      if (!d.c || d.c === 0) {
        res.status(404).json({ error: 'no data' }); return;
      }
      res.json({ price: d.c, prevClose: d.pc, open: d.o, high: d.h, low: d.l });

    } else if (type === 'search') {
      // Finnhub search
      const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`;
      const r = await fetch(url);
      const d = await r.json();
      res.json(d);

    } else if (type === 'crypto') {
      // CoinGecko price
      const url = `${COINGECKO_BASE}/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true`;
      const r = await fetch(url);
      const d = await r.json();
      res.json(d);

    } else if (type === 'fx') {
      // Frankfurter FX
      const base = date ? `${FRANKFURTER_BASE}/${date}` : `${FRANKFURTER_BASE}/latest`;
      const url = `${base}?from=${from}&to=${to}`;
      const r = await fetch(url);
      const d = await r.json();
      res.json(d);

    } else {
      res.status(400).json({ error: 'unknown type' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
