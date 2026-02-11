import { GoogleGenerativeAI } from '@google/generative-ai';
import { JAMIE_PROMPT, THOMAS_PROMPT } from '../server/characters.js';
import { DISCUSSION_ORCHESTRATOR_PROMPT } from '../server/agents/discussionOrchestrator.js';
import { loadActivity } from '../server/activityParser.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { messages, agentState, activitySlug } = req.body;

    if (!messages) {
        return res.status(400).json({ error: 'Messages are required' });
    }

    let themes = null;
    if (activitySlug) {
        const activity = loadActivity(activitySlug);
        if (activity) themes = activity.themes;
    }

    try {
        const recentMessages = messages.slice(-12);
        const historyText = recentMessages.map(m => {
            const role = m.role === 'user' ? 'User' : (m.character?.toUpperCase() || 'Assistant');
            return `${role}: ${m.content}`;
        }).join('\n');

        // Inject activity-specific themes if available
        let orchestratorPrompt = DISCUSSION_ORCHESTRATOR_PROMPT;
        if (themes && themes.length > 0) {
            const themesText = themes.map((t, i) => `${i + 1}. ${t}`).join('\n');
            orchestratorPrompt = orchestratorPrompt.replace(
                /MODEL ANSWER THEMES \(count how many[^)]*\):\n([\s\S]*?)(?=\nTASK:)/,
                `MODEL ANSWER THEMES (count how many the user has clearly addressed; ${themes.length} total):\n${themesText}\n`
            );
        }

        const fullPrompt = orchestratorPrompt
            .replace('{{TRANSCRIPT}}', '[TRANSCRIPT OMITTED FOR SPEED - use your knowledge of the reading themes]')
            .replace('{{JAMIE_PROFILE}}', JAMIE_PROMPT)
            .replace('{{THOMAS_GOOSE_PROFILE}}', THOMAS_PROMPT)
            .replace('{{AGENT_STATE}}', JSON.stringify(agentState || {}))
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
        console.error('Error in chat:', error);
        res.status(500).json({ error: 'Failed to generate discussion' });
    }
}
