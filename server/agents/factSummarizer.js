export const FACT_SUMMARIZER_PROMPT = `
Fact extraction. Reading: {{TRANSCRIPT}} | History: {{HISTORY}}
Question: how did drought affect forests and non-farming communities?
For each key fact: status UNCOVERED / HIDDEN / MISUNDERSTOOD. Short summary.
Output ONLY JSON: {"facts": [{"fact": "...", "status": "..."}, ...], "summary": "..."}
`;
