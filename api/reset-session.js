import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTECTED_ACTIVITIES = new Set(['TEMPLATE.md', 'drought-q1-comprehension.md', 'drought-q2-comparison.md']);

export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let deletedFiles = [];

    // Clean generated activity files
    const activitiesDir = path.join(__dirname, '..', 'activities');
    if (fs.existsSync(activitiesDir)) {
        for (const file of fs.readdirSync(activitiesDir)) {
            if (!PROTECTED_ACTIVITIES.has(file) && file.endsWith('.md')) {
                try {
                    fs.unlinkSync(path.join(activitiesDir, file));
                    deletedFiles.push(`activities/${file}`);
                } catch (e) { /* ignore on read-only fs */ }
            }
        }
    }

    console.log(`[reset-session] Cleaned up ${deletedFiles.length} files`);
    res.json({ deleted: deletedFiles.length });
}
