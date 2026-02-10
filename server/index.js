import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { JAMIE_PROMPT, THOMAS_PROMPT, COLLABORATIVE_SYSTEM_PROMPT, INITIAL_POSITIONS } from './characters.js';
import { DISCUSSION_ORCHESTRATOR_PROMPT } from './agents/discussionOrchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Reading content (source of truth for evaluation)
const TRANSCRIPT = fs.readFileSync(path.join(__dirname, '..', 'content', 'DROUGHT_READING.md'), 'utf8');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-3-flash-preview", 
});

app.post('/api/chat', async (req, res) => {
    const { messages, agentState } = req.body;
    console.log(`Chat request received. History length: ${messages?.length}`);

    if (!messages) {
        return res.status(400).json({ error: 'Messages are required' });
    }

    try {
        // Send last 12 messages to keep prompt small; agent state carries context forward
        const recentMessages = messages.slice(-12);
        const historyText = recentMessages.map(m => {
            const role = m.role === 'user' ? 'User' : (m.character?.toUpperCase() || 'Assistant');
            return `${role}: ${m.content}`;
        }).join('\n');

        const fullPrompt = DISCUSSION_ORCHESTRATOR_PROMPT
            .replace('{{TRANSCRIPT}}', '[TRANSCRIPT OMITTED FOR SPEED - use your knowledge of the drought reading themes]')
            .replace('{{JAMIE_PROFILE}}', JAMIE_PROMPT)
            .replace('{{THOMAS_GOOSE_PROFILE}}', THOMAS_PROMPT)
            .replace('{{AGENT_STATE}}', JSON.stringify(agentState || INITIAL_POSITIONS))
            .replace('{{HISTORY}}', historyText);

        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text();
        
        try {
            const cleaned = responseText.replace(/```json|```/g, '').trim();
            const data = JSON.parse(cleaned);
            
            console.log("Orchestrator Thought (Jamie):", data.jamie?.thoughtProcess);
            console.log("Orchestrator Thought (Thomas):", data.thomas?.thoughtProcess);

            console.log("Checklist:", data.checklist);

            res.json({
                responses: [
                    { character: 'jamie', message: data.jamie.message },
                    { character: 'thomas', message: data.thomas.message }
                ],
                updatedState: {
                    jamie: {
                        opinion: data.jamie.updatedOpinion,
                        status: data.jamie.status,
                        thought: data.jamie.thoughtProcess
                    },
                    thomas: {
                        opinion: data.thomas.updatedOpinion,
                        status: data.thomas.status,
                        thought: data.thomas.thoughtProcess
                    }
                },
                checklist: data.checklist || null,
                facts: data.facts
            });
        } catch (parseError) {
            console.error('JSON Parse Error:', responseText);
            throw new Error('Failed to parse AI response');
        }
    } catch (error) {
        console.error('Error in orchestrator:', error);
        res.status(500).json({ error: 'Failed to generate discussion' });
    }
});

app.post('/api/check-answer', async (req, res) => {
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
        const lower = answer.toLowerCase();
        const contentKeywords = ['wildfire', 'forest', 'air quality', 'evacuat', 'health', 'newfoundland', 'communities', 'first nations', 'bans'];
        const evidenceKeywords = ['6.5 million', '6.8 million', 'hectare', 'newfoundland', 'first nations', 'pregnant', 'children'];
        const contentHits = contentKeywords.filter(k => lower.includes(k)).length;
        const evidenceHits = evidenceKeywords.filter(k => lower.includes(k)).length;
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
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
