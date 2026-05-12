export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { capitol, dificultate } = req.body;
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const prompt = `Ești un profesor de matematică pentru bacalaureat românesc. Generează O SINGURĂ întrebare grilă.
Capitol: ${capitol}
Dificultate: ${dificultate}

Răspunde DOAR cu JSON valid, fără text în plus, fără markdown:
{
  "intrebare": "textul întrebării cu formule LaTeX folosind \\( \\) pentru inline și $$ $$ pentru display",
  "variante": ["varianta A", "varianta B", "varianta C", "varianta D"],
  "raspuns_corect": 0,
  "explicatie": "explicație detaliată pas cu pas cu formule LaTeX"
}

Indexul raspuns_corect: 0=A, 1=B, 2=C, 3=D. Asigură-te că există exact 4 variante.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://test-mateinfo.vercel.app',
        'X-Title': 'TestMATEINFO'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ 
        error: 'OpenRouter error ' + response.status,
        details: data?.error?.message || JSON.stringify(data)
      });
    }

    const text = data.choices?.[0]?.message?.content || '';
    if (!text) return res.status(500).json({ error: 'Empty response', raw: JSON.stringify(data).substring(0, 300) });

    const clean = text.replace(/```json|```/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'No JSON in response', text: text.substring(0, 200) });

    const question = JSON.parse(jsonMatch[0]);
    return res.status(200).json(question);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
