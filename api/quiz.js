export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { capitol, dificultate } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const prompt = `Generează O SINGURĂ întrebare grilă de matematică pentru bacalaureat românesc.
Capitol: ${capitol}
Dificultate: ${dificultate}

REGULI STRICTE:
1. Răspunde DOAR cu un obiect JSON valid, fără text în afara JSON-ului, fără markdown
2. Formulele matematice se scriu cu LaTeX: \\( \\) pentru inline, $$ $$ pentru display
3. Exact 4 variante de răspuns
4. O singură variantă corectă
5. Explicația detaliată pas cu pas

Format JSON EXACT:
{
  "intrebare": "textul întrebării cu formule LaTeX",
  "variante": ["varianta A", "varianta B", "varianta C", "varianta D"],
  "raspuns_corect": 0,
  "explicatie": "explicație detaliată pas cu pas"
}

Indexul raspuns_corect: 0=A, 1=B, 2=C, 3=D.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Invalid response from AI' });
    }
    
    const question = JSON.parse(jsonMatch[0]);
    return res.status(200).json(question);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
