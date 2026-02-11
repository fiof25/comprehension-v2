import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadActivity } from '../server/activityParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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
}
