import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { JAMIE_PROMPT, THOMAS_PROMPT, COLLABORATIVE_SYSTEM_PROMPT } from './characters.js';
import { DISCUSSION_ORCHESTRATOR_PROMPT } from './agents/discussionOrchestrator.js';
import { loadAllActivities, loadActivity, parseActivityFromString } from './activityParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Multer config for PDF uploads — store in memory, then save to public/assets/
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed'));
    },
});

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

// --- Upload PDF and generate multiple activities ---

const QUESTION_TYPES = [
    {
        type: 'comprehension',
        instruction: 'Create a comprehension question that asks students to identify and explain key facts, details, or concepts from the reading. Focus on WHAT happened or WHAT the text describes.',
    },
    {
        type: 'comparison',
        instruction: 'Create a comparison question that asks students to identify similarities and differences between two or more things discussed in the reading (e.g. regions, groups, causes, effects).',
    },
    {
        type: 'analysis',
        instruction: 'Create an analysis question that asks students to explore WHY something happened, evaluate causes and effects, or make connections between ideas in the reading.',
    },
];

async function generateActivityFromText(readingText, title, pdfPath, questionType) {
    const templatePath = path.join(__dirname, '..', 'activities', 'TEMPLATE.md');
    const template = fs.readFileSync(templatePath, 'utf8');

    const typeInfo = QUESTION_TYPES.find(q => q.type === questionType) || QUESTION_TYPES[0];

    const prompt = `You are an educational content designer. Given the following reading text, generate a complete activity markdown file following the exact template format below.

TEMPLATE FORMAT:
${template}

READING TEXT:
${readingText}

TITLE: ${title}
PDF PATH: ${pdfPath}

QUESTION TYPE: ${typeInfo.type}
${typeInfo.instruction}

Generate a complete activity markdown file. Requirements:

LENGTH & STYLE — follow these examples closely:
- Question: ONE short sentence, ~10-15 words max. Example: "How did the drought affect forests and other non-farming communities across Canada?"
- Character opinions: 2-3 short sentences each, ~25-40 words, written in FIRST PERSON (the character speaking as "I"). Example: "I keep thinking about the crops — wheat, canola, barley — all wiped out. And the ranchers had to sell off their cattle because the pastures were barren."
- Initial messages: 1-2 casual short sentences, ~15-25 words. Jamie example: "Hi! Thanks so much for helping us! I keep thinking about the poor dehydrated crops... but Thomas keeps shutting it down." Thomas example: "Jamie keeps mentioning farms, but I don't think that's relevant. I need some strong evidence. What did the reading say?"
- Keep ALL text conversational, brief, and age-appropriate for students.

CONTENT:
- The question MUST be of type "${typeInfo.type}" — follow the instruction above
- Use tag: ${typeInfo.type.charAt(0).toUpperCase() + typeInfo.type.slice(1)} in the Meta section
- Set the pdf field in frontmatter to exactly: "${pdfPath}"
- Set the title in frontmatter to exactly: "${title}"
- Identify 5-7 key themes/facts students should address for THIS specific question
- Write realistic character positions (Jamie = enthusiastic but incomplete/off-track, Thomas = analytical but incomplete — they should DISAGREE or have different incomplete perspectives)
- Write natural opening messages — Jamie should be friendly and bring up something slightly off-topic, Thomas should be skeptical and demand evidence
- Include relevant grading keywords (keywords_content for themes, keywords_evidence for specific facts/numbers)
- Generate a ## Rubric section with 4 subsections (Content, Understanding, Connections, Evidence), each with level_1 through level_5 descriptors. Each level must be specific to THIS question and reading — reference actual themes, facts, and numbers from the text. Use measurable criteria (e.g. "Mentions 1-2 of the 7 themes" not "Shows some understanding")
- Keep the checklist as-is (analogy, example, story)
- Use the exact markdown format from the template (YAML frontmatter + sections)
- Do NOT include HTML comments from the template
- Use this exact thumbnail path: "/assets/placeholder.jpg"

Output ONLY the markdown file content, nothing else.`;

    const result = await model.generateContent(prompt);
    return result.response.text().replace(/```markdown|```/g, '').trim();
}

app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
    console.log('[upload-pdf] Request received, file:', req.file?.originalname, 'size:', req.file?.size);

    if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    try {
        // 1. Generate slug from filename
        const originalName = path.basename(req.file.originalname, '.pdf');
        const slug = originalName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

        // Check for existing hardcoded activities (e.g. Drought_Reading.pdf)
        const HARDCODED_ACTIVITIES = {
            'drought-reading': ['drought-q1-comprehension', 'drought-q2-comparison'],
        };

        if (HARDCODED_ACTIVITIES[slug]) {
            console.log(`[upload-pdf] Using hardcoded activities for "${slug}"`);
            const activities = HARDCODED_ACTIVITIES[slug]
                .map(s => loadActivity(s))
                .filter(Boolean);

            if (activities.length > 0) {
                const summaries = activities.map(a => ({
                    slug: a.slug,
                    title: a.title,
                    thumbnail: a.thumbnail,
                    topics: a.topics,
                    questionText: a.question.text,
                    tag: a.question.tag,
                    askedBy: a.question.askedBy,
                }));
                return res.json({ activities: summaries, pdfPath: activities[0].pdf });
            }
        }

        const pdfFilename = `${slug}.pdf`;
        const pdfPath = `/assets/${pdfFilename}`;

        // 2. Save PDF to public/assets/
        const assetsDir = path.join(__dirname, '..', 'public', 'assets');
        if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
        fs.writeFileSync(path.join(assetsDir, pdfFilename), req.file.buffer);
        console.log('[upload-pdf] PDF saved to', pdfPath);

        // 3. Extract text from PDF
        const pdfData = await pdfParse(req.file.buffer);
        const readingText = pdfData.text;
        console.log('[upload-pdf] Extracted text length:', readingText?.length);

        if (!readingText || readingText.trim().length < 50) {
            return res.status(400).json({ error: 'Could not extract enough text from PDF. The file may be image-based or empty.' });
        }

        // 4. Generate a clean title from filename
        const title = originalName
            .replace(/[_-]+/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());

        // 5. Generate 2-3 activities in parallel
        console.log('[upload-pdf] Generating 3 activities for:', title);
        const typesToGenerate = QUESTION_TYPES.slice(0, 3);
        const results = await Promise.allSettled(
            typesToGenerate.map(qt => generateActivityFromText(readingText, title, pdfPath, qt.type))
        );

        const activities = [];
        for (let i = 0; i < results.length; i++) {
            if (results[i].status !== 'fulfilled') {
                console.error(`[upload-pdf] Failed to generate ${typesToGenerate[i].type}:`, results[i].reason?.message || results[i].reason);
                continue;
            }

            const generatedMd = results[i].value;
            const activitySlug = `${slug}-q${i + 1}-${typesToGenerate[i].type}`;
            const filePath = path.join(__dirname, '..', 'activities', `${activitySlug}.md`);
            fs.writeFileSync(filePath, generatedMd, 'utf8');
            console.log(`[upload-pdf] Saved activity: ${activitySlug}.md`);

            try {
                const activity = loadActivity(activitySlug);
                if (activity) activities.push(activity);
            } catch (parseErr) {
                console.error(`[upload-pdf] Failed to parse ${activitySlug}:`, parseErr.message);
            }
        }

        if (activities.length === 0) {
            return res.status(500).json({ error: 'Failed to generate any activities from the PDF' });
        }

        console.log(`[upload-pdf] Success! Generated ${activities.length} activities`);
        res.json({ activities, pdfPath });
    } catch (error) {
        console.error('[upload-pdf] Error:', error.message || error);
        res.status(500).json({ error: 'Failed to process PDF: ' + (error.message || 'Unknown error') });
    }
});

// --- Upload YouTube and generate activities ---

function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

app.post('/api/upload-youtube', async (req, res) => {
    const { url } = req.body;
    console.log('[upload-youtube] Request received, url:', url);

    if (!url) {
        return res.status(400).json({ error: 'YouTube URL is required' });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
        return res.status(400).json({ error: 'Invalid YouTube URL.' });
    }

    try {
        // 1. Fetch transcript via YouTube innertube API (Android client)
        let transcript;
        try {
            const playerRes = await fetch('https://www.youtube.com/youtubei/v1/player', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'com.google.android.youtube/19.29.37 (Linux; U; Android 11) gzip',
                },
                body: JSON.stringify({
                    context: {
                        client: { clientName: 'ANDROID', clientVersion: '19.29.37', androidSdkVersion: 30, hl: 'en', gl: 'US' },
                    },
                    videoId,
                }),
            });
            const playerData = await playerRes.json();
            const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            if (!tracks || tracks.length === 0) {
                throw new Error('No caption tracks available');
            }
            const enTrack = tracks.find(t => t.languageCode === 'en') || tracks[0];
            const captionRes = await fetch(enTrack.baseUrl);
            const xml = await captionRes.text();
            const segments = [...xml.matchAll(/<p[^>]*>(.*?)<\/p>/gs)];
            transcript = segments.map(m => m[1]
                .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/<[^>]+>/g, '')
            ).join(' ');
        } catch (err) {
            console.error('[upload-youtube] Transcript error:', err);
            return res.status(400).json({ error: 'Could not fetch transcript. The video may not have captions enabled.' });
        }

        if (!transcript || transcript.trim().length < 50) {
            return res.status(400).json({ error: 'Transcript is too short.' });
        }

        // 2. Get video title from oEmbed
        let title = 'YouTube Video';
        try {
            const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
            if (oembedRes.ok) {
                const oembed = await oembedRes.json();
                title = oembed.title || title;
            }
        } catch { /* fallback */ }

        // 3. Build URLs
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

        // 4. Generate activities
        console.log('[upload-youtube] Generating 3 activities for:', title);
        const typesToGenerate = QUESTION_TYPES.slice(0, 3);
        const results = await Promise.allSettled(
            typesToGenerate.map(qt => generateActivityFromText(transcript, title, embedUrl, qt.type))
        );

        const activities = [];
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        for (let i = 0; i < results.length; i++) {
            if (results[i].status !== 'fulfilled') {
                console.error(`[upload-youtube] Failed to generate ${typesToGenerate[i].type}:`, results[i].reason?.message);
                continue;
            }

            const generatedMd = results[i].value;
            const activitySlug = `${slug}-q${i + 1}-${typesToGenerate[i].type}`;

            try {
                const activity = parseActivityFromString(generatedMd, activitySlug);
                if (activity) {
                    activity.thumbnail = thumbnailUrl;
                    activities.push(activity);
                }
            } catch (parseErr) {
                console.error(`[upload-youtube] Failed to parse ${activitySlug}:`, parseErr.message);
            }

            // Also persist to disk for local dev
            try {
                const filePath = path.join(__dirname, '..', 'activities', `${activitySlug}.md`);
                fs.writeFileSync(filePath, generatedMd, 'utf8');
            } catch { /* ignore */ }
        }

        if (activities.length === 0) {
            return res.status(500).json({ error: 'Failed to generate any activities from the video' });
        }

        console.log(`[upload-youtube] Success! Generated ${activities.length} activities`);
        res.json({ activities, youtubeEmbedUrl: embedUrl, thumbnailUrl });
    } catch (error) {
        console.error('[upload-youtube] Error:', error.message || error);
        res.status(500).json({ error: error.message || 'Failed to process YouTube video' });
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
            // Fallback prompt without rubric (legacy activities)
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

        // Validate and clamp levels to 1-5
        for (const dim of dimensions) {
            if (grades[dim]) {
                grades[dim].level = Math.max(1, Math.min(5, Math.round(grades[dim].level || 1)));
            }
        }

        res.json(grades);
    } catch (error) {
        console.error('Error grading answer with Gemini:', error);
        // Keyword-based fallback grading mapped to levels 1-5
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
});

// --- Reset session: clean up generated files ---
const PROTECTED_ACTIVITIES = new Set(['TEMPLATE.md', 'drought-q1-comprehension.md', 'drought-q2-comparison.md']);
const PROTECTED_ASSETS = new Set([
    'Drought_Reading.pdf', 'drought-reading.pdf', 'backgroundimage.png', 'drought_banner.png',
    'drought_banner_long.png', 'hero_backdrop.svg', 'jamie_beaver.png', 'jamiechat.png',
    'ph1.png', 'ph2.png', 'ph3.png', 'ph4.png', 'q1card.png', 'q2card.png',
    'thomas_goose.png', 'thomaschat.png',
]);

app.post('/api/reset-session', (req, res) => {
    let deletedFiles = [];

    // Clean generated activity files
    const activitiesDir = path.join(__dirname, '..', 'activities');
    if (fs.existsSync(activitiesDir)) {
        for (const file of fs.readdirSync(activitiesDir)) {
            if (!PROTECTED_ACTIVITIES.has(file) && file.endsWith('.md')) {
                fs.unlinkSync(path.join(activitiesDir, file));
                deletedFiles.push(`activities/${file}`);
            }
        }
    }

    // Clean uploaded PDFs
    const assetsDir = path.join(__dirname, '..', 'public', 'assets');
    if (fs.existsSync(assetsDir)) {
        for (const file of fs.readdirSync(assetsDir)) {
            if (!PROTECTED_ASSETS.has(file)) {
                fs.unlinkSync(path.join(assetsDir, file));
                deletedFiles.push(`public/assets/${file}`);
            }
        }
    }

    console.log(`[reset-session] Cleaned up ${deletedFiles.length} files:`, deletedFiles);
    res.json({ deleted: deletedFiles.length });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
