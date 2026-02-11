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
    let rubric = null;
    if (activitySlug) {
        const activity = loadActivity(activitySlug);
        if (activity) {
            grading = activity.grading;
            rubric = activity.rubric;
        }
    }

    const gradingQuestion = grading?.question || 'How did the drought affect forests and non-farming communities across Canada?';
    const keywordsContent = grading?.keywordsContent?.length ? grading.keywordsContent : ['wildfire', 'forest', 'air quality', 'evacuat', 'health', 'newfoundland', 'communities', 'first nations', 'bans'];
    const keywordsEvidence = grading?.keywordsEvidence?.length ? grading.keywordsEvidence : ['6.5 million', '6.8 million', 'hectare', 'newfoundland', 'first nations', 'pregnant', 'children'];

    // Build rubric text for the prompt
    const dimensions = ['content', 'understanding', 'connections', 'evidence'];
    let rubricText = '';
    if (rubric) {
        for (const dim of dimensions) {
            if (rubric[dim]) {
                rubricText += `\n${dim.charAt(0).toUpperCase() + dim.slice(1)}:\n`;
                for (let lvl = 1; lvl <= 5; lvl++) {
                    if (rubric[dim][lvl]) rubricText += `  Level ${lvl}: ${rubric[dim][lvl]}\n`;
                }
            }
        }
    }

    try {
        let prompt;
        if (rubricText) {
            prompt = `Grade this student response to: "${gradingQuestion}"

RUBRIC — assign exactly one level (1-5) per dimension based on which level best matches the response:
${rubricText}
Student response: "${answer}"

For each dimension, pick the single level (1-5) that best describes the response. Write feedback in second person ("you"), keep it to one short encouraging sentence. Be supportive.

Respond ONLY with valid JSON:
{
  "content": {"level": number, "feedback": "short sentence"},
  "understanding": {"level": number, "feedback": "short sentence"},
  "connections": {"level": number, "feedback": "short sentence"},
  "evidence": {"level": number, "feedback": "short sentence"}
}`;
        } else {
            prompt = `Grade this response to: "${gradingQuestion}"

Key themes (${keywordsContent.length}): ${keywordsContent.join(', ')}.

Response: "${answer}"

Score on 4 dimensions using levels 1-5. Write feedback in second person ("you"), keep it to one short encouraging sentence. Be supportive.

1. Content: Theme coverage. 0 themes=1, 1-2 themes=2, 3-4=3, 5-6=4, 7+=5.
2. Understanding: Clarity and depth. Incoherent=1, lists facts=2, basic analysis=3, clear comprehension=4, deep synthesis=5.
3. Connections: Cause-effect links. None=1, one vague=2, 2-3 links=3, multiple clear=4, rich web=5.
4. Evidence: Specific details cited. None=1, 1-2 vague=2, 3-4 specific=3, 5-6 precise=4, 7+ woven in=5.

Respond ONLY with valid JSON:
{
  "content": {"level": number, "feedback": "short sentence"},
  "understanding": {"level": number, "feedback": "short sentence"},
  "connections": {"level": number, "feedback": "short sentence"},
  "evidence": {"level": number, "feedback": "short sentence"}
}`;
        }

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const cleanedJson = responseText.replace(/```json|```/g, '').trim();
        const grades = JSON.parse(cleanedJson);

        for (const dim of dimensions) {
            if (grades[dim]) {
                grades[dim].level = Math.max(1, Math.min(5, Math.round(grades[dim].level || 1)));
            }
        }

        res.json(grades);
    } catch (error) {
        console.error('Error grading answer with Gemini:', error);
        const lower = answer.toLowerCase();
        const contentHits = keywordsContent.filter(k => lower.includes(k)).length;
        const evidenceHits = keywordsEvidence.filter(k => lower.includes(k)).length;
        const totalKeywords = Math.max(keywordsContent.length, 1);

        const contentLevel = contentHits === 0 ? 1 : contentHits <= 2 ? 2 : contentHits <= 4 ? 3 : contentHits <= 6 ? 4 : 5;
        const evidenceLevel = evidenceHits === 0 ? 1 : evidenceHits <= 2 ? 2 : evidenceHits <= 4 ? 3 : evidenceHits <= 6 ? 4 : 5;
        const wordCount = answer.split(/\s+/).length;
        const understandingLevel = wordCount < 10 ? 1 : wordCount < 30 ? 2 : wordCount < 60 ? 3 : wordCount < 100 ? 4 : 5;
        const connectionsLevel = Math.max(1, Math.min(5, Math.round(contentLevel * 0.8)));

        res.json({
            content: { level: contentLevel, feedback: `${contentHits} of ${totalKeywords} key themes identified.` },
            understanding: { level: understandingLevel, feedback: 'Based on response length and structure.' },
            connections: { level: connectionsLevel, feedback: 'Consider linking cause and effect more explicitly.' },
            evidence: { level: evidenceLevel, feedback: `${evidenceHits} specific details from the text cited.` },
        });
    }
}
