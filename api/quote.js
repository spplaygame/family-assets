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
      // 先取得 Cookie
      let cookie = '';
      try {
        const init = await fetch('https://www.fundclear.com.tw/fund-search', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          }
        });
        const setCookie = init.headers.get('set-cookie');
        if (setCookie) {
          cookie = setCookie.split(',').map(c => c.trim().split(';')[0]).join('; ');
        }
      } catch(e) { console.warn('cookie fetch failed', e.message); }

      const r = await fetch('https://www.fundclear.com.tw/api/search/fund/query-fund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-TW,zh;q=0.9',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.fundclear.com.tw/fund-search',
          'Origin': 'https://www.fundclear.com.tw',
          'Cookie': cookie,
        },
        body: JSON.stringify({
          searchKey: q || '',
          fundSite: 'all',
          _pageNum: 1,
          _pageSize: 20,
          fundTypeList: ['all'],
          currencyList: ['all'],
          asiFreqList: ['all'],
          fundRiskLevelList: ['all'],
          column: '',
          asc: false,
        }),
      });
      const d = await r.json();
      const list = d?.data || [];
      const curMap = { '新台幣': 'TWD', '美元': 'USD', '歐元': 'EUR', '人民幣': 'CNY', '英鎊': 'GBP', '日圓': 'JPY' };
      res.json({
        result: list.map(f => ({
          id: f.fundCode,
          name: f.fundName,
          currency: curMap[f.currencyName] || f.currencyName || 'TWD',
          nav: parseFloat(f.navValue) || 0,
          navDate: f.navTxnDate || '',
          type: f.fundSite === 'onshore' ? 'domestic' : f.fundSite === 'offshore' ? 'foreign' : f.fundSite,
        }))
      });

    } else if (type === 'fund_nav') {
      let cookie = '';
      try {
        const init = await fetch('https://www.fundclear.com.tw/fund-search', {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
        });
        const setCookie = init.headers.get('set-cookie');
        if (setCookie) cookie = setCookie.split(',').map(c => c.trim().split(';')[0]).join('; ');
      } catch {}

      const r = await fetch('https://www.fundclear.com.tw/api/search/fund/query-fund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'https://www.fundclear.com.tw/fund-search',
          'Origin': 'https://www.fundclear.com.tw',
          'Cookie': cookie,
        },
        body: JSON.stringify({
          searchKey: symbol || '',
          fundSite: 'all',
          _pageNum: 1,
          _pageSize: 5,
          fundTypeList: ['all'],
          currencyList: ['all'],
          asiFreqList: ['all'],
          fundRiskLevelList: ['all'],
          column: '',
          asc: false,
        }),
      });
      const d = await r.json();
      const found = (d?.data || []).find(f => f.fundCode === symbol);
      if (!found) { res.status(404).json({ error: 'fund not found' }); return; }
      const nav = parseFloat(found.navValue) || 0;
      res.json({ nav, navDate: found.navTxnDate || '' });

    } else {
      res.status(400).json({ error: 'unknown type' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
