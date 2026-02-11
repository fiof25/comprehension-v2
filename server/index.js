import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { JAMIE_PROMPT, THOMAS_PROMPT, COLLABORATIVE_SYSTEM_PROMPT } from './characters.js';
import { DISCUSSION_ORCHESTRATOR_PROMPT } from './agents/discussionOrchestrator.js';
import { loadAllActivities, loadActivity } from './activityParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// --- Activity endpoints ---

app.get('/api/activities', (req, res) => {
    try {
        const activities = loadAllActivities();
        const summary = activities.map(a => ({
            slug: a.slug,
            title: a.title,
            thumbnail: a.thumbnail,
            topics: a.topics,
            questionText: a.question.text,
            tag: a.question.tag,
            askedBy: a.question.askedBy,
        }));
        res.json(summary);
    } catch (error) {
        console.error('Error loading activities:', error);
        res.status(500).json({ error: 'Failed to load activities' });
    }
});

app.get('/api/activities/:slug', (req, res) => {
    try {
        const activity = loadActivity(req.params.slug);
        if (!activity) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        res.json(activity);
    } catch (error) {
        console.error('Error loading activity:', error);
        res.status(500).json({ error: 'Failed to load activity' });
    }
});

// --- Generate activity from reading text ---

app.post('/api/generate-activity', async (req, res) => {
    const { readingText, title } = req.body;

    if (!readingText || !title) {
        return res.status(400).json({ error: 'readingText and title are required' });
    }

    try {
        const templatePath = path.join(__dirname, '..', 'activities', 'TEMPLATE.md');
        const template = fs.readFileSync(templatePath, 'utf8');

        const prompt = `You are an educational content designer. Given the following reading text, generate a complete activity markdown file following the exact template format below.

TEMPLATE FORMAT:
${template}

READING TEXT:
${readingText}

TITLE: ${title}

Generate a complete activity markdown file. Requirements:
- Create a thoughtful comprehension question based on the reading
- Identify 5-7 key themes/facts students should address
- Write realistic character positions (Jamie = enthusiastic but incomplete, Thomas = analytical but incomplete)
- Write natural opening messages for both characters
- Include relevant grading keywords
- Keep the checklist as-is (analogy, example, story)
- Use the exact markdown format from the template (YAML frontmatter + sections)
- Do NOT include HTML comments from the template

Output ONLY the markdown file content, nothing else.`;

        const result = await model.generateContent(prompt);
        const generatedMd = result.response.text().replace(/```markdown|```/g, '').trim();

        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const filePath = path.join(__dirname, '..', 'activities', `${slug}.md`);
        fs.writeFileSync(filePath, generatedMd, 'utf8');

        const activity = loadActivity(slug);
        res.json(activity);
    } catch (error) {
        console.error('Error generating activity:', error);
        res.status(500).json({ error: 'Failed to generate activity' });
    }
});

// --- Chat endpoint (activity-aware) ---

app.post('/api/chat', async (req, res) => {
    const { messages, agentState, activitySlug } = req.body;
    console.log(`Chat request received. History length: ${messages?.length}, activity: ${activitySlug || 'default'}`);

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

// --- Check answer endpoint (activity-aware) ---

app.post('/api/check-answer', async (req, res) => {
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
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
