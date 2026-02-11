import { loadAllActivities } from '../server/activityParser.js';

export default function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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
}
