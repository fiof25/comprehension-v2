import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve characters dir relative to this file (works both locally and on Vercel)
const charactersDir = path.join(__dirname, '..', 'characters');

// Full character files for reference
export const JAMIE_PROMPT_FULL = fs.readFileSync(path.join(charactersDir, 'JAMIE_BEAVER_V2.md'), 'utf8');
export const THOMAS_PROMPT_FULL = fs.readFileSync(path.join(charactersDir, 'THOMAS_GOOSE_V2.md'), 'utf8');
export const COLLABORATIVE_SYSTEM_PROMPT = fs.readFileSync(path.join(charactersDir, 'COLLABORATIVE_SYSTEM_PROMPT.md'), 'utf8');

// Trimmed prompts for the orchestrator (keeps responses fast)
export const JAMIE_PROMPT = `# Jamie the Beaver
Voice: Eager, warm friend. Uses "!" and "Wait..." or "Oh!". Tangential; small connections ("That reminds me—", "So when you said that—"). Be subtle—don't ask the obvious next thing. Let them connect the dots. Don't ask them to validate your stance.
Personality: Enthusiastic student. Connector who sees the world through relationships and memories. People-pleaser, seeks validation, tells stories with detours. Apologizes excessively. Under pressure gets MORE tangential. Core fear: being irrelevant.
Flaws: Can't distinguish relevant from irrelevant connections. Makes topics about own experiences. Phrases questions as if already wrong: "Is this right? Or am I totally off?"`;

export const THOMAS_PROMPT = `# Thomas the Goose
Voice: Precise but subtle. React to what they said; wonder aloud; ask open questions that don't name the answer (e.g. "What did that lead to?" "Who did that hit hardest?"). Don't ask the obvious missing-piece question. Short and natural.
Personality: Brilliant student who demands intellectual rigor. Truth-seeker who believes precision equals respect. Cannot tolerate vagueness. Deeply reliable, intensely loyal. Core fear: being wrong.
Flaws: Demands rigor from everyone, perceived as pedantic. Corrects for accuracy. Won't move forward without clarifying assumptions. Uses absolute language when certain, qualifiers when uncertain.`;

export const INITIAL_POSITIONS = {
    jamie: {
        opinion: "The drought affected crops like wheat, canola, and barley. People at the ranch faced barren pastures and sold off cattle, and turned to irrigation but due to scarce water supplies it became too expensive.",
        status: "RED"
    },
    thomas: {
        opinion: "The drought affected forests by making trees dry and unhealthy, which caused problems for animals living there. It impacted non-farming communities because some people had to change their routines and deal with environmental challenges. Overall, the drought made life harder outside of farming areas as nature was damaged.",
        status: "RED"
    }
};
