import { GoogleGenerativeAI } from '@google/generative-ai';
import { JAMIE_PROMPT, THOMAS_PROMPT, INITIAL_POSITIONS } from '../server/characters.js';
import { DISCUSSION_ORCHESTRATOR_PROMPT } from '../server/agents/discussionOrchestrator.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { messages, agentState } = req.body;

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

        const cleaned = responseText.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleaned);

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
    } catch (error) {
        console.error('Error in orchestrator:', error);
        res.status(500).json({ error: 'Failed to generate discussion' });
    }
}
