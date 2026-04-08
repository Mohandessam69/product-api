export default async function handler(req, res) {
  const { query } = req.query;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Gemini يفهم الـ query ويحوله لسيرش صح
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Convert this shopping request to a simple English search query for Google Shopping. Return ONLY the search query, nothing else: "${query}"`
          }]
        }]
      })
    }
  );
  
  const geminiData = await geminiRes.json();
  const searchQuery = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || query;
  
  // SerpAPI تسرش بالـ query الجديد
  const serpRes = await fetch(
    `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(searchQuery)}&api_key=${process.env.SERPAPI_KEY}`
  );
  
  const serpData = await serpRes.json();
  
  const results = (serpData.shopping_results || []).map(p => ({
    title: p.title,
    price: p.price,
    source: p.source,
    thumbnail: p.thumbnail,
    link: p.source_url || p.product_link || p.link
  }));
  
  res.json(results);
}
