export default async function handler(req, res) {
  const { query } = req.query;
  
  const response = await fetch(
    `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&location=Egypt&api_key=${process.env.SERPAPI_KEY}`
  );
  
  const data = await response.json();
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const results = (data.shopping_results || []).map(p => ({
    title: p.title,
    price: p.price,
    source: p.source,
    thumbnail: p.thumbnail,
    link: p.product_link || p.link
  }));
  
  res.json(results);
}
