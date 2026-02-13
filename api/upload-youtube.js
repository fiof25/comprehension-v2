import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseActivityFromString } from '../server/activityParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

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

async function generateActivityFromText(readingText, title, contentPath, questionType) {
    const templatePath = path.join(__dirname, '..', 'activities', 'TEMPLATE.md');
    const template = fs.readFileSync(templatePath, 'utf8');

    const typeInfo = QUESTION_TYPES.find(q => q.type === questionType) || QUESTION_TYPES[0];

    const prompt = `You are an educational content designer. Given the following reading text, generate a complete activity markdown file following the exact template format below.

TEMPLATE FORMAT:
${template}

READING TEXT:
${readingText}

TITLE: ${title}
PDF PATH: ${contentPath}

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
- Set the pdf field in frontmatter to exactly: "${contentPath}"
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

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'YouTube URL is required' });
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube URL. Please provide a valid youtube.com or youtu.be link.' });
        }

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
            const captionRes = await fetch(enTrack.baseUrl, {
                headers: { 'User-Agent': 'com.google.android.youtube/19.29.37 (Linux; U; Android 11) gzip' },
            });
            const xml = await captionRes.text();
            const segments = [...xml.matchAll(/<p[^>]*>(.*?)<\/p>/gs)];
            transcript = segments.map(m => m[1]
                .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/<[^>]+>/g, '')
            ).join(' ');
        } catch (err) {
            console.error('Transcript error:', err);
            return res.status(400).json({ error: 'Could not fetch transcript. The video may not have captions enabled.' });
        }

        if (!transcript || transcript.trim().length < 50) {
            return res.status(400).json({ error: 'Transcript is too short. The video may not have enough spoken content.' });
        }

        // 2. Get video title from oEmbed API (no API key needed)
        let title = 'YouTube Video';
        try {
            const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
            if (oembedRes.ok) {
                const oembed = await oembedRes.json();
                title = oembed.title || title;
            }
        } catch { /* fallback to default title */ }

        // 3. Build URLs
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

        // 4. Generate activities in parallel
        const typesToGenerate = QUESTION_TYPES.slice(0, 3);
        const results = await Promise.allSettled(
            typesToGenerate.map(qt => generateActivityFromText(transcript, title, embedUrl, qt.type))
        );

        const activities = [];
        for (let i = 0; i < results.length; i++) {
            if (results[i].status !== 'fulfilled') continue;

            const generatedMd = results[i].value;
            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const activitySlug = `${slug}-q${i + 1}-${typesToGenerate[i].type}`;

            try {
                const activity = parseActivityFromString(generatedMd, activitySlug);
                if (activity) {
                    activity.thumbnail = thumbnailUrl;
                    activities.push(activity);
                }
            } catch (parseErr) {
                console.error(`Failed to parse ${activitySlug}:`, parseErr);
            }

            // Try to persist (silently fails on Vercel)
            try {
                const activitiesDir = path.join(__dirname, '..', 'activities');
                fs.writeFileSync(path.join(activitiesDir, `${activitySlug}.md`), generatedMd, 'utf8');
            } catch { /* read-only on Vercel */ }
        }

        if (activities.length === 0) {
            return res.status(500).json({ error: 'Failed to generate any activities from the video' });
        }

        res.json({ activities, youtubeEmbedUrl: embedUrl, thumbnailUrl });
    } catch (error) {
        console.error('Error in upload-youtube:', error);
        res.status(500).json({ error: error.message || 'Failed to process YouTube video' });
    }
}
