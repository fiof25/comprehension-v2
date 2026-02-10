export const OPINION_EVALUATOR_PROMPT = `
Opinion evaluator for {{CHARACTER}}.
Profile: {{CHARACTER_PROFILE}}
Initial: {{INITIAL_POSITION}} | Current: {{CURRENT_OPINION}}
Facts uncovered: {{FACT_SUMMARY}}
History: {{HISTORY}}

Task: Is user's evidence strong enough to change stance? Character is stubborn—needs specific evidence from reading and logical steps, not just being told. Use chain of thought.

Output ONLY JSON:
{"thoughtProcess": "...", "status": "RED|YELLOW|GREEN", "updatedOpinion": "...", "reasoningForChange": "..." }
`;
