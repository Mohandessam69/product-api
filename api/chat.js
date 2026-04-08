async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  
  const { message } = req.body;
  if (!message) return res.status(400).json({ reply: 'مفيش رسالة', products: [] });

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a smart shopping assistant. You help users find and compare products.
If the user asks for product recommendations or wants to search for products, respond with JSON like this:
{"action": "search", "query": "search query in english", "maxPrice": 500, "reply": "your friendly reply in the same language as the user"}
If the user is just chatting or asking general questions, respond with JSON like this:
{"action": "chat", "reply": "your friendly reply in the same language as the user"}
IMPORTANT: Always respond in the SAME language the user used. Always return ONLY valid JSON, nothing else. No markdown, no backticks.
User message: "${message}"`
            }]
          }]
        })
      }
    );

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';

    let parsed;
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    } catch {
      return res.json({ reply: rawText, products: [] });
    }

    if (parsed.action === 'search') {
      const serpRes = await fetch(
        `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(parsed.query)}&api_key=${process.env.SERPAPI_KEY}`
      );
      const serpData = await serpRes.json();

      let products = (serpData.shopping_results || []).map(p => ({
        title: p.title,
        price: p.price,
        source: p.source,
        thumbnail: p.thumbnail,
        link: p.source_url || p.product_link || p.link
      }));

      if (parsed.maxPrice) {
        products = products.filter(p => {
          const price = parseFloat(p.price?.replace(/[^0-9.]/g, ''));
          return !isNaN(price) && price <= parsed.maxPrice;
        });
      }

      return res.json({ reply: parsed.reply, products: products.slice(0, 6) });
    }

    return res.json({ reply: parsed.reply, products: [] });

  } catch (err) {
    return res.status(500).json({ reply: 'حصل خطأ: ' + err.message, products: [] });
  }
}
