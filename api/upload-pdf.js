import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseActivityFromString } from '../server/activityParser.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

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
- Use a relevant thumbnail path: "/assets/${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_banner.png"

Output ONLY the markdown file content, nothing else.`;

    const result = await model.generateContent(prompt);
    return result.response.text().replace(/```markdown|```/g, '').trim();
}

// Vercel serverless: disable body parser so we get raw body
export const config = {
    api: {
        bodyParser: false,
    },
};

// Collect raw body from request (works on both Vercel and Node streams)
function getRawBody(req) {
    return new Promise((resolve, reject) => {
        // If body is already buffered (Vercel sometimes does this)
        if (req.body && Buffer.isBuffer(req.body)) {
            return resolve(req.body);
        }
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

// Parse multipart form data from a raw buffer
async function parseMultipartFromBuffer(rawBody, contentType) {
    const { default: Busboy } = await import('busboy');
    const { Readable } = await import('stream');

    return new Promise((resolve, reject) => {
        const busboy = Busboy({ headers: { 'content-type': contentType } });
        let fileBuffer = null;
        let fileName = '';

        busboy.on('file', (fieldname, file, info) => {
            const chunks = [];
            fileName = info.filename;
            file.on('data', (chunk) => chunks.push(chunk));
            file.on('end', () => { fileBuffer = Buffer.concat(chunks); });
        });

        busboy.on('finish', () => {
            if (!fileBuffer) reject(new Error('No file uploaded'));
            else resolve({ buffer: fileBuffer, originalname: fileName });
        });

        busboy.on('error', reject);

        // Feed the raw buffer into busboy as a readable stream
        const stream = Readable.from(rawBody);
        stream.pipe(busboy);
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get raw body buffer
        const rawBody = await getRawBody(req);
        const contentType = req.headers['content-type'] || '';

        if (!contentType.includes('multipart/form-data')) {
            return res.status(400).json({ error: 'Expected multipart/form-data' });
        }

        const file = await parseMultipartFromBuffer(rawBody, contentType);

        // 1. Generate slug from filename
        const originalName = path.basename(file.originalname, '.pdf');
        const slug = originalName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const pdfPath = `/assets/${slug}.pdf`;

        // 2. Save PDF (only if filesystem is writable — skipped on Vercel)
        try {
            const assetsDir = path.join(__dirname, '..', 'public', 'assets');
            if (fs.existsSync(assetsDir)) {
                fs.writeFileSync(path.join(assetsDir, `${slug}.pdf`), file.buffer);
            }
        } catch (e) { /* read-only filesystem on Vercel — PDF lives in memory only */ }

        // 3. Extract text from PDF
        const pdfData = await pdfParse(file.buffer);
        const readingText = pdfData.text;

        if (!readingText || readingText.trim().length < 50) {
            return res.status(400).json({ error: 'Could not extract enough text from PDF.' });
        }

        // 4. Generate title
        const title = originalName
            .replace(/[_-]+/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());

        // 5. Generate activities in parallel
        const typesToGenerate = QUESTION_TYPES.slice(0, 3);
        const results = await Promise.allSettled(
            typesToGenerate.map(qt => generateActivityFromText(readingText, title, pdfPath, qt.type))
        );

        const activities = [];
        for (let i = 0; i < results.length; i++) {
            if (results[i].status !== 'fulfilled') continue;

            const generatedMd = results[i].value;
            const activitySlug = `${slug}-q${i + 1}-${typesToGenerate[i].type}`;

            // Parse in memory (no file I/O needed)
            try {
                const activity = parseActivityFromString(generatedMd, activitySlug);
                if (activity) activities.push(activity);
            } catch (parseErr) {
                console.error(`Failed to parse ${activitySlug}:`, parseErr);
            }

            // Also try to persist to disk (for local dev — will silently fail on Vercel)
            try {
                const activitiesDir = path.join(__dirname, '..', 'activities');
                fs.writeFileSync(path.join(activitiesDir, `${activitySlug}.md`), generatedMd, 'utf8');
            } catch (e) { /* read-only on Vercel */ }
        }

        if (activities.length === 0) {
            return res.status(500).json({ error: 'Failed to generate any activities' });
        }

        res.json({ activities, pdfPath });
    } catch (error) {
        console.error('Error in upload-pdf:', error);
        res.status(500).json({ error: error.message || 'Failed to process PDF' });
    }
}
