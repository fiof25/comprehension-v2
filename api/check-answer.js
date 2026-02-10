import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { answer } = req.body;

    if (!answer) {
        return res.status(400).json({ error: 'Answer is required' });
    }

    try {
        const prompt = `Grade this response to: "How did the drought affect forests and non-farming communities across Canada?"

Key themes (7): wildfires, scale (6.5M hectares), First Nations/community impact, air quality, health risks, Eastern Newfoundland, bans/evacuations.

Response: "${answer}"

Score 0-100 on 4 dimensions. Write feedback in second person ("you"), keep it to one short encouraging sentence. Be supportive—acknowledge what was done well, and gently suggest what could be improved or explored further (e.g. "Try exploring themes like wildfires or air quality" instead of "You failed to address any themes").

1. Content: Theme coverage. 0 themes=0-15, 1-2=15-35, 3-4=35-60, 5-6=60-85, 7=85-100.
2. Understanding: Clarity, coherence, depth beyond listing facts.
3. Connections: Cause-effect links (drought→wildfires→air quality→health→displacement).
4. Evidence: Specific numbers, places, or details from the text. If 6.8M is cited, note correction to 6.5M.

Respond ONLY with valid JSON:
{
  "content": {"score": number, "feedback": "short sentence"},
  "understanding": {"score": number, "feedback": "short sentence"},
  "connections": {"score": number, "feedback": "short sentence"},
  "evidence": {"score": number, "feedback": "short sentence"}
}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        const cleanedJson = responseText.replace(/```json|```/g, '').trim();
        const grades = JSON.parse(cleanedJson);

        res.json(grades);
    } catch (error) {
        console.error('Error grading answer with Gemini:', error);
        // Fallback scoring based on keywords
        const lower = answer.toLowerCase();
        const keywords = {
            content: ['wildfire', 'forest', 'air quality', 'evacuat', 'health', 'newfoundland', 'communities', 'first nations', 'bans'],
            evidence: ['6.5 million', '6.8 million', 'hectare', 'newfoundland', 'first nations', 'pregnant', 'children'],
        };
        const contentHits = keywords.content.filter(k => lower.includes(k)).length;
        const evidenceHits = keywords.evidence.filter(k => lower.includes(k)).length;
        const contentScore = Math.min(100, Math.round((contentHits / 7) * 100));
        const evidenceScore = Math.min(100, Math.round((evidenceHits / 5) * 100));
        const wordCount = answer.split(/\s+/).length;
        const understandingScore = Math.min(100, Math.round(Math.min(wordCount / 50, 1) * 70 + 10));
        const connectionsScore = Math.min(100, Math.round((contentHits / 7) * 60 + 10));

        res.json({
            content: { score: contentScore, feedback: `${contentHits} of 7 key themes identified.` },
            understanding: { score: understandingScore, feedback: 'Based on response length and structure.' },
            connections: { score: connectionsScore, feedback: 'Consider linking cause and effect more explicitly.' },
            evidence: { score: evidenceScore, feedback: `${evidenceHits} specific details from the text cited.` },
        });
    }
}
