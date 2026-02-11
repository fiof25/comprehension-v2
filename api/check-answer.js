import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadActivity } from '../server/activityParser.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { answer, activitySlug } = req.body;

    if (!answer) {
        return res.status(400).json({ error: 'Answer is required' });
    }

    let grading = null;
    if (activitySlug) {
        const activity = loadActivity(activitySlug);
        if (activity) grading = activity.grading;
    }

    const gradingQuestion = grading?.question || 'How did the drought affect forests and non-farming communities across Canada?';
    const keywordsContent = grading?.keywordsContent?.length ? grading.keywordsContent : ['wildfire', 'forest', 'air quality', 'evacuat', 'health', 'newfoundland', 'communities', 'first nations', 'bans'];
    const keywordsEvidence = grading?.keywordsEvidence?.length ? grading.keywordsEvidence : ['6.5 million', '6.8 million', 'hectare', 'newfoundland', 'first nations', 'pregnant', 'children'];

    try {
        const prompt = `Grade this response to: "${gradingQuestion}"

Key themes (${keywordsContent.length}): ${keywordsContent.join(', ')}.

Response: "${answer}"

Score 0-100 on 4 dimensions. Write feedback in second person ("you"), keep it to one short encouraging sentence. Be supportive—acknowledge what was done well, and gently suggest what could be improved or explored further.

1. Content: Theme coverage. 0 themes=0-15, 1-2=15-35, 3-4=35-60, 5-6=60-85, 7=85-100.
2. Understanding: Clarity, coherence, depth beyond listing facts.
3. Connections: Cause-effect links between themes.
4. Evidence: Specific numbers, places, or details from the text.

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
        const lower = answer.toLowerCase();
        const contentHits = keywordsContent.filter(k => lower.includes(k)).length;
        const evidenceHits = keywordsEvidence.filter(k => lower.includes(k)).length;
        const contentScore = Math.min(100, Math.round((contentHits / Math.max(keywordsContent.length, 1)) * 100));
        const evidenceScore = Math.min(100, Math.round((evidenceHits / Math.max(keywordsEvidence.length, 1)) * 100));
        const wordCount = answer.split(/\s+/).length;
        const understandingScore = Math.min(100, Math.round(Math.min(wordCount / 50, 1) * 70 + 10));
        const connectionsScore = Math.min(100, Math.round((contentHits / Math.max(keywordsContent.length, 1)) * 60 + 10));

        res.json({
            content: { score: contentScore, feedback: `${contentHits} of ${keywordsContent.length} key themes identified.` },
            understanding: { score: understandingScore, feedback: 'Based on response length and structure.' },
            connections: { score: connectionsScore, feedback: 'Consider linking cause and effect more explicitly.' },
            evidence: { score: evidenceScore, feedback: `${evidenceHits} specific details from the text cited.` },
        });
    }
}
