export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { capitol, dificultate } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const prompt = `Generează O SINGURĂ întrebare grilă de matematică pentru bacalaureat românesc.
Capitol: ${capitol}
Dificultate: ${dificultate}

Răspunde DOAR cu JSON valid (fără markdown, fără text în plus):
{
  "intrebare": "textul întrebării cu formule LaTeX folosind \\( \\) și $$ $$",
  "variante": ["varianta A", "varianta B", "varianta C", "varianta D"],
  "raspuns_corect": 0,
  "explicatie": "explicație detaliată pas cu pas"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ 
        error: 'Gemini error ' + response.status,
        details: data?.error?.message || JSON.stringify(data)
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) return res.status(500).json({ error: 'Empty Gemini response', raw: JSON.stringify(data).substring(0, 300) });

    const clean = text.replace(/```json|```/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'No JSON in response', text: text.substring(0, 200) });

    const question = JSON.parse(jsonMatch[0]);
    return res.status(200).json(question);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
