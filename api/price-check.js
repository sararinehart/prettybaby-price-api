import fetch from 'node-fetch';
import cheerio from 'cheerio';

export default async function handler(req, res) {
  const { product_name, brand } = req.query;
  const query = encodeURIComponent(`${product_name} ${brand}`);

  const urls = [
    `https://www.sephora.com/search?keyword=${query}`,
    `https://www.ulta.com/search?Ntt=${query}`,
    `https://www.lookfantastic.com/search.list?search=${query}`
  ];

  const results = [];

  for (const url of urls) {
    try {
      const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await resp.text();
      const $ = cheerio.load(html);

      let price = $('meta[itemprop="price"]').attr('content') || $('span.Price').first().text();
      let size = $('div.ProductSize').first().text() || "1 oz";

      if (price) {
        let priceNum = parseFloat(price.replace(/[^0-9.]/g, ''));
        let oz = parseFloat(size.replace(/[^0-9.]/g, '')) || 1;
        let pricePerOz = (priceNum / oz).toFixed(2);

        results.push({
          retailer: new URL(url).hostname,
          price: `$${priceNum.toFixed(2)}`,
          size,
          price_per_ounce: `$${pricePerOz}`,
          url
        });
      }
    } catch (err) {
      continue;
    }
  }

  const best = results.sort((a, b) =>
    parseFloat(a.price_per_ounce.slice(1)) - parseFloat(b.price_per_ounce.slice(1))
  )[0];

  res.status(200).json({
    product: `${brand} ${product_name}`,
    results,
    best_value: best || "No price data found."
  });
}
