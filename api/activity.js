import { loadActivity } from '../server/activityParser.js';

export default function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { slug } = req.query;

    if (!slug) {
        return res.status(400).json({ error: 'slug query parameter is required' });
    }

    try {
        const activity = loadActivity(slug);
        if (!activity) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        res.json(activity);
    } catch (error) {
        console.error('Error loading activity:', error);
        res.status(500).json({ error: 'Failed to load activity' });
    }
}
