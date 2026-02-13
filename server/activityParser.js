import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const activitiesDir = path.join(__dirname, '..', 'activities');

/**
 * Extract a section's content between a heading and the next heading of equal or higher level.
 */
function getSection(content, heading, level = 2) {
    const prefix = '#'.repeat(level);
    const regex = new RegExp(`^${prefix}\\s+${escapeRegex(heading)}\\s*$`, 'im');
    const match = content.match(regex);
    if (!match) return '';

    const start = match.index + match[0].length;
    // Find next heading of same or higher level
    const nextHeading = new RegExp(`^#{1,${level}}\\s+`, 'im');
    const rest = content.slice(start);
    const nextMatch = rest.match(nextHeading);
    return nextMatch ? rest.slice(0, nextMatch.index).trim() : rest.trim();
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract a subsection (### heading) within a parent section's content.
 */
function getSubSection(sectionContent, heading) {
    const regex = new RegExp(`^###\\s+${escapeRegex(heading)}\\s*$`, 'im');
    const match = sectionContent.match(regex);
    if (!match) return '';

    const start = match.index + match[0].length;
    const rest = sectionContent.slice(start);
    const nextMatch = rest.match(/^###\s+/im);
    return nextMatch ? rest.slice(0, nextMatch.index).trim() : rest.trim();
}

/**
 * Parse a "- key: value" line from markdown content.
 */
function parseField(content, key) {
    const regex = new RegExp(`^-\\s+${escapeRegex(key)}:\\s*(.+)$`, 'im');
    const match = content.match(regex);
    if (!match) return '';
    return match[1].trim().replace(/^["']|["']$/g, '');
}

/**
 * Parse a comma-separated list field.
 */
function parseListField(content, key) {
    const value = parseField(content, key);
    if (!value) return [];
    return value.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Parse a rubric dimension's level descriptors (level_1 through level_5).
 */
function parseRubricDimension(content) {
    if (!content) return null;
    const levels = {};
    for (let i = 1; i <= 5; i++) {
        const desc = parseField(content, `level_${i}`);
        if (desc) levels[i] = desc;
    }
    return Object.keys(levels).length > 0 ? levels : null;
}

/**
 * Parse numbered list items (1. item, 2. item, etc.)
 */
function parseNumberedList(content) {
    const lines = content.split('\n');
    return lines
        .map(line => line.match(/^\d+\.\s+(.+)$/))
        .filter(Boolean)
        .map(match => match[1].trim());
}

/**
 * Parse activity markdown from a raw string + slug (no file I/O needed).
 */
export function parseActivityFromString(raw, slug) {
    const { data: frontmatter, content } = matter(raw);

    // # Question (level 1)
    const questionMatch = content.match(/^#\s+Question\s*$([\s\S]*?)(?=^##\s+)/im);
    const questionText = questionMatch ? questionMatch[1].trim() : '';

    // ## Meta
    const metaSection = getSection(content, 'Meta');
    const tag = parseField(metaSection, 'tag');
    const askedBy = parseField(metaSection, 'askedBy');

    // ## Themes
    const themesSection = getSection(content, 'Themes');
    const themes = parseNumberedList(themesSection);

    // ## Character Positions
    const charSection = getSection(content, 'Character Positions');
    const jamiePos = getSubSection(charSection, 'Jamie');
    const thomasPos = getSubSection(charSection, 'Thomas');

    // ## Initial Messages
    const msgSection = getSection(content, 'Initial Messages');
    const jamieMsg = getSubSection(msgSection, 'Jamie');
    const thomasMsg = getSubSection(msgSection, 'Thomas');

    // ## Grading
    const gradingSection = getSection(content, 'Grading');
    const gradingQuestion = parseField(gradingSection, 'question');
    const keywordsContent = parseListField(gradingSection, 'keywords_content');
    const keywordsEvidence = parseListField(gradingSection, 'keywords_evidence');

    // ## Rubric
    const rubricSection = getSection(content, 'Rubric');
    const rubric = rubricSection ? {
        content: parseRubricDimension(getSubSection(rubricSection, 'Content')),
        understanding: parseRubricDimension(getSubSection(rubricSection, 'Understanding')),
        connections: parseRubricDimension(getSubSection(rubricSection, 'Connections')),
        evidence: parseRubricDimension(getSubSection(rubricSection, 'Evidence')),
    } : null;

    // ## Checklist
    const checklistSection = getSection(content, 'Checklist');
    const checklist = [];
    const checklistRegex = /^-\s+(\w+):\s+(.+)$/gim;
    let clMatch;
    while ((clMatch = checklistRegex.exec(checklistSection)) !== null) {
        checklist.push({ id: clMatch[1], label: clMatch[2].trim() });
    }

    return {
        slug,
        title: frontmatter.title || slug,
        thumbnail: frontmatter.thumbnail || '',
        topics: frontmatter.topics || [],
        pdf: frontmatter.pdf || '',
        question: {
            text: questionText,
            tag,
            askedBy,
        },
        themes,
        characterPositions: {
            jamie: {
                opinion: parseField(jamiePos, 'opinion'),
                status: parseField(jamiePos, 'status') || 'RED',
            },
            thomas: {
                opinion: parseField(thomasPos, 'opinion'),
                status: parseField(thomasPos, 'status') || 'RED',
            },
        },
        initialMessages: {
            jamie: jamieMsg,
            thomas: thomasMsg,
        },
        grading: {
            question: gradingQuestion || questionText,
            keywordsContent,
            keywordsEvidence,
        },
        rubric,
        checklist,
    };
}

/**
 * Parse a single activity markdown file into a structured object.
 */
export function parseActivity(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const slug = path.basename(filePath, '.md');
    return parseActivityFromString(raw, slug);
}

/**
 * Load all activity files from the /activities directory.
 * Excludes TEMPLATE.md.
 */
export function loadAllActivities() {
    const files = fs.readdirSync(activitiesDir)
        .filter(f => f.endsWith('.md') && f !== 'TEMPLATE.md');

    return files.map(f => parseActivity(path.join(activitiesDir, f)));
}

/**
 * Load a single activity by slug.
 */
export function loadActivity(slug) {
    const filePath = path.join(activitiesDir, `${slug}.md`);
    if (!fs.existsSync(filePath)) return null;
    return parseActivity(filePath);
}
