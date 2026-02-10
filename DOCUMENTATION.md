# Protege - Learn by Discussion

An AI-powered learning tool where students discuss a reading passage with two AI character peers — Jamie the Beaver and Thomas the Goose — before writing a graded final answer.

---

## Table of Contents

1. [User Flow](#user-flow)
2. [AI Characters](#ai-characters)
3. [RED / YELLOW / GREEN Status System](#redyellowgreen-status-system)
4. [Learning Checklist](#learning-checklist)
5. [Grading System](#grading-system)
6. [Technical Architecture](#technical-architecture)

---

## User Flow

### Step 1: Home Page
The student lands on the home page and clicks to start the activity.

### Step 2: Loading Screen
A brief loading transition (1 second) before the question selection screen.

### Step 3: Question Selection
The student selects a discussion question from the available options. Currently, the question is:
> "How did the drought affect forests and non-farming communities across Canada?"

### Step 4: Discussion Phase
This is the core of the experience. The screen splits into two columns:

- **Left column**: A chat interface where the student discusses the reading with Jamie and Thomas. The question is displayed at the top in a bordered box, with the subtitle: *"Thomas and Jamie have different stances on this question. Try to clarify the correct answer."*
- **Right column**: A PDF viewer showing the source reading (Drought Reading), along with tabs for Whiteboard and Rubric.

**How the discussion works:**
1. Jamie and Thomas send opening messages establishing their (intentionally incomplete) understanding.
2. The student types messages to explain, clarify, and provide evidence from the reading.
3. After each student message, both AI characters respond — reacting, asking subtle follow-up questions, and updating their internal understanding.
4. The characters never evaluate the student's answer directly. They only react, wonder aloud, and ask open questions.
5. As the student covers more themes, the characters' statuses progress from RED to YELLOW to GREEN.
6. Once characters reach GREEN (5+ themes addressed), they signal readiness to wrap up.

### Step 5: Finish Conversation
The student clicks "Finish Conversation" (or submits a message as their answer). A modal appears where they write their final answer to the question.

### Step 6: Results Page 1 — Grading
The student's final answer is graded by AI across 4 dimensions (see [Grading System](#grading-system)). Scores and feedback are displayed.

### Step 7: Results Page 2 — Reflection
A second results page showing the conversation summary, agent states, and discussion outcomes.

---

## AI Characters

### Jamie the Beaver

**Role:** The Eager Connector

**Personality:** Warm, enthusiastic, and tangential. Jamie sees the world through relationships and personal stories. They make unexpected connections between ideas and tend to go on detours.

**Speech style:**
- Uses "Wait..." and "Oh!" as conversational openers
- Warm and exclamation-heavy
- Asks questions as if already expecting to be wrong
- Makes tangential connections and assigns emotions to things

**Starting stance:** Focused on farming impacts (crops, ranchers, cattle) — intentionally off-topic to prompt the student to redirect toward forests and non-farming communities.

**Opening message:**
> "Hi! Thanks so much for helping us! I keep thinking about the poor dehydrated crops... but Thomas keeps shutting it down."

**Core fear:** Being irrelevant or forgotten; that their natural way of thinking is wrong.

---

### Thomas the Goose

**Role:** The Precision Perfectionist

**Personality:** Precise, skeptical, and rigorous. Thomas demands evidence and won't accept vague explanations. They challenge imprecise terminology and insist on step-by-step reasoning.

**Speech style:**
- Precise and subtle
- Uses absolute language when certain, qualifiers when uncertain
- Challenges vagueness directly
- Takes metaphors literally

**Starting stance:** Knows the answer is about forests/non-farming but lacks specific evidence — needs the student to provide it.

**Opening message:**
> "Jamie keeps mentioning farms, but I don't think that's relevant. I need some strong evidence. What did the reading say?"

**Core fear:** Being wrong; has built identity around correctness through rigorous thinking.

---

### Interaction Rules (Both Characters)

- **Never evaluate** the student's answer (no "Correct," "Good point," "You're missing X")
- **Only react** to what's already been said — never introduce new facts
- **Be subtle** — don't ask obvious questions that name the missing piece
- **Turn-taking**: Only one character asks a question per round; the other reacts with a short statement
- At GREEN status (5+ themes), both signal readiness to wrap up rather than continuing to probe

---

## RED/YELLOW/GREEN Status System

Each character independently tracks how convinced they are based on how many of the 7 model answer themes the student has addressed.

### The 7 Themes

1. Wildfires were alarming (tinder-dry conditions, below-normal rainfall)
2. Scale of destruction (e.g., 6.5 million hectares)
3. Fires affected farms, towns, rural/First Nations communities
4. Air quality deteriorated
5. Health risks (children, elderly, breathing problems)
6. Eastern Newfoundland was affected
7. Bans and/or evacuations were imposed

### Status Levels

| Status | Themes Addressed | Meaning |
|--------|-----------------|---------|
| **RED** | 0–2 | Little or vague evidence; character not convinced |
| **YELLOW** | 3–4 | Good progress with specific evidence; partly convinced |
| **GREEN** | 5+ | Strong majority of themes covered; character convinced |

### Behavior by Status

- **RED**: Characters keep asking subtle, open-ended questions to draw out more information
- **YELLOW**: Characters acknowledge progress but continue probing for remaining gaps
- **GREEN**: Characters stop asking follow-up questions and signal they're satisfied (e.g., "I think we've got the main stuff — ready to put it down?")

---

## Learning Checklist

The system tracks whether the student demonstrates three learning behaviors during the discussion. These are displayed as a checklist in the UI next to the question.

| Item | Description | Example |
|------|-------------|---------|
| **Use an analogy** | Student uses a comparison to explain a concept | "It's like a domino effect..." |
| **Bring up an example** | Student cites a specific fact, statistic, or detail from the reading | "The text mentions 6.5 million hectares" |
| **Tell a story** (Bonus) | Student constructs a narrative to illustrate their point | Describing what happened to a community |

The AI evaluates these from the student's messages (not the agents') and returns `true`/`false` for each after every exchange. Once an item is marked `true`, it stays checked for the rest of the conversation.

---

## Grading System

When the student submits their final written answer, it is graded by the Gemini AI across 4 dimensions.

### Question Being Graded

> "How did the drought affect forests and non-farming communities across Canada?"

### Dimensions

#### 1. Content (Theme Coverage)

How many of the 7 key themes the response addresses.

| Themes Covered | Score Range |
|---------------|-------------|
| 0 themes | 0–15 |
| 1–2 themes | 15–35 |
| 3–4 themes | 35–60 |
| 5–6 themes | 60–85 |
| 7 themes | 85–100 |

Key themes: wildfires, scale (6.5M hectares), First Nations/community impact, air quality, health risks, Eastern Newfoundland, bans/evacuations.

#### 2. Understanding

Clarity, coherence, and depth beyond simply listing facts. Evaluates whether the student demonstrates genuine comprehension.

Score: 0–100

#### 3. Connections

Cause-effect reasoning and linking between concepts. The ideal chain: drought → wildfires → air quality → health risks → displacement/evacuations.

Score: 0–100

#### 4. Evidence

Use of specific numbers, place names, or details from the source text. If a student cites "6.8 million" hectares, the grader notes the correction to 6.5 million.

Score: 0–100

### Feedback Style

- Written in second person ("you")
- One short, encouraging sentence per dimension
- Supportive tone — acknowledges what was done well and gently suggests areas for improvement
- Example: "Try exploring themes like wildfires or air quality" (not "You failed to address any themes")

### Fallback Grading

If the AI grading fails (API error), a keyword-based fallback system activates:

**Content keywords** (9): wildfire, forest, air quality, evacuat, health, newfoundland, communities, first nations, bans

**Evidence keywords** (7): 6.5 million, 6.8 million, hectare, newfoundland, first nations, pregnant, children

- **Content score**: (keyword hits / 7) * 100
- **Evidence score**: (keyword hits / 5) * 100
- **Understanding score**: Based on word count — min(wordCount/50, 1) * 70 + 10
- **Connections score**: (content hits / 7) * 60 + 10

---

## Technical Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Backend (dev) | Express.js on port 3001 |
| Backend (prod) | Vercel Serverless Functions |
| AI Model | Google Gemini (`gemini-3-flash-preview`) |
| Deployment | Vercel |

### Project Structure

```
├── src/                    # React frontend
│   ├── App.jsx             # Main app, state management, routing
│   └── components/         # UI components (Chat, QuestionSection, ResultsPage, etc.)
├── server/                 # Express.js backend (dev)
│   ├── index.js            # Express server with API routes
│   ├── characters.js       # Character prompts and initial state
│   └── agents/
│       └── discussionOrchestrator.js  # AI orchestrator prompt
├── api/                    # Vercel serverless functions (prod)
│   ├── chat.js             # Discussion endpoint
│   └── check-answer.js     # Grading endpoint
├── characters/             # Character prompt files (.md)
├── content/                # Reading material (PDF + markdown)
└── vercel.json             # Deployment configuration
```

### API Endpoints

#### `POST /api/chat`

Orchestrates a discussion round between Jamie, Thomas, and the student.

**Request:**
```json
{
  "messages": [{ "role": "user|assistant", "character": "jamie|thomas", "content": "..." }],
  "agentState": {
    "jamie": { "opinion": "...", "status": "RED|YELLOW|GREEN" },
    "thomas": { "opinion": "...", "status": "RED|YELLOW|GREEN" }
  }
}
```

**Response:**
```json
{
  "responses": [
    { "character": "jamie", "message": "..." },
    { "character": "thomas", "message": "..." }
  ],
  "updatedState": {
    "jamie": { "opinion": "...", "status": "RED|YELLOW|GREEN", "thought": "..." },
    "thomas": { "opinion": "...", "status": "RED|YELLOW|GREEN", "thought": "..." }
  },
  "checklist": { "analogy": true, "example": false, "story": false },
  "facts": [{ "fact": "...", "status": "HIDDEN|UNCOVERED" }]
}
```

#### `POST /api/check-answer`

Grades the student's final written answer.

**Request:**
```json
{ "answer": "The student's written response..." }
```

**Response:**
```json
{
  "content": { "score": 75, "feedback": "..." },
  "understanding": { "score": 60, "feedback": "..." },
  "connections": { "score": 50, "feedback": "..." },
  "evidence": { "score": 80, "feedback": "..." }
}
```

### What Happens on Each Message

When the student sends a message, here is exactly what happens end-to-end:

#### 1. Frontend Prepares the Request

- The student's new message is appended to the full chat history array.
- A duplicate check prevents the same message from being sent twice within 1 second.
- Both typing indicators (`isJamieTyping`, `isThomasTyping`) are set to `true`, which disables the input and shows typing animations.
- The frontend sends the **entire conversation history** (every message from the start) plus the **current agent state** (each character's opinion and RED/YELLOW/GREEN status) to `POST /api/chat`.

#### 2. Backend Builds the Orchestrator Prompt

The server constructs a single large prompt by injecting context into the orchestrator template:

| Placeholder | What Gets Injected |
|---|---|
| `{{TRANSCRIPT}}` | Omitted for speed — the AI uses its knowledge of the reading themes |
| `{{JAMIE_PROFILE}}` | Jamie's full character prompt (~7KB from `JAMIE_BEAVER_V2.md`) |
| `{{THOMAS_GOOSE_PROFILE}}` | Thomas's full character prompt (~9KB from `THOMAS_GOOSE_V2.md`) |
| `{{AGENT_STATE}}` | JSON of each character's current opinion and status |
| `{{HISTORY}}` | The full conversation formatted as `User: ...`, `JAMIE: ...`, `THOMAS: ...` |

This means every API call sends the full context — the AI has no memory between calls.

#### 3. The Orchestrator Evaluates (What the AI Considers)

The AI processes the prompt and performs these tasks in a single pass:

1. **Fact Analysis**: Scans the conversation to determine which facts from the source reading have been uncovered vs. still hidden. Outputs a list of facts with `HIDDEN` or `UNCOVERED` status.

2. **Theme Counting**: Counts how many of the 7 model answer themes the student has clearly addressed across the entire conversation (not just the latest message). This determines the RED/YELLOW/GREEN status.

3. **Status Update**: Sets each character's status independently:
   - RED (0–2 themes) → YELLOW (3–4) → GREEN (5+)

4. **Turn-Taking Decision**: Checks the conversation history to see which character asked a question last. The *other* character asks this round; the one who asked last gives a short reaction instead.

5. **Message Generation**: Writes each character's response following their personality rules:
   - Must be under 15 words
   - Must never evaluate the student's answer
   - Must never name what's missing
   - At GREEN: signals readiness to wrap up instead of asking more questions

6. **Thought Process**: Each character outputs internal reasoning (`thoughtProcess`) explaining what they noticed and why they're responding the way they are. This is not shown to the student but is stored in state.

7. **Opinion Update**: Each character writes an updated 1–2 sentence summary of their current understanding (`updatedOpinion`), reflecting what the student has taught them so far.

8. **Learning Checklist Evaluation**: Scans only the student's messages (not the agents') for:
   - **Analogy**: Did they compare a concept to something else?
   - **Example**: Did they cite a specific fact, statistic, or detail from the text?
   - **Story**: Did they construct a narrative to illustrate a point?

   Each is `true` if it appeared at any point in the conversation. Once `true`, it stays `true`.

#### 4. Backend Parses and Returns

- The raw AI response (which is JSON wrapped in markdown code fences) is cleaned: `` ```json `` and `` ``` `` markers are stripped.
- The JSON is parsed. If parsing fails, a 500 error is returned.
- The server restructures the response into the final shape:
  - `responses[]` — the two character messages
  - `updatedState` — new opinions, statuses, and thought processes
  - `checklist` — analogy/example/story booleans
  - `facts[]` — fact list with HIDDEN/UNCOVERED statuses

#### 5. Frontend Updates the UI

- The two character messages are appended to the chat with their updated status colors.
- `agentState` is updated with new opinions and statuses (drives the status indicators).
- The checklist is merged — items only transition from unchecked to checked, never back.
- Typing indicators are cleared and the input is re-enabled.
- The cycle repeats with the next student message.

### Data Flow (Summary)

```
Student types message
  → Frontend sends full chat history + agent state to POST /api/chat
  → Backend injects history, character prompts, and state into orchestrator prompt
  → Gemini AI evaluates themes, generates responses, updates statuses and checklist
  → Backend parses JSON response and returns structured data
  → Frontend updates chat, status indicators, and checklist
  → Repeat until student clicks "Finish Conversation"
  → Student writes final answer
  → POST /api/check-answer sends answer to Gemini for grading
  → Grading response (4 dimensions) displayed on results pages
```

### Dev vs Production

- **Development**: Vite dev server (port 3000) proxies `/api/*` to Express (port 3001)
- **Production**: Vercel serves the built frontend and routes `/api/*` to serverless functions in `api/`
- The `api/` serverless functions import shared modules from `server/` to stay in sync
