const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');

dotenv.config();

// Try to initialize GenAI fallback gracefully if no key is provided yet
let ai;
try {
    if (process.env.GEMINI_API_KEY) {
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } else {
        console.warn("GEMINI_API_KEY is not set in backend/.env. LLM features will fail gracefully.");
    }
} catch (e) {
    console.error("Failed to initialize GoogleGenAI", e);
}


/**
 * Calls the Master LLM (default: Gemini) to generate rich world 
 * initialization data based on user input.
 * 
 * We design this keeping expandability in mind: if swapped to OpenAI, 
 * only this internal function wrapper needs changing.
 * 
 * @param {string} worldName 
 * @param {string} setting 
 * @param {object} userTables 
 * @returns {Promise<object>}
 */
async function generateWorldInitialization(worldName, setting, userTables) {
    if (!ai) {
        return _mockFallbackResponse();
    }

    const prompt = `
You are the Master AI for a dynamic simulation system.
The user is creating a new world with the following core details:

World Name: "${worldName}"
Background Setting: "${setting}"
User Defined Tables: ${JSON.stringify(userTables)}

Your job is to expand this into a cohesive simulation starting point.
You must return a STRICT JSON object with no markdown formatting or backticks. It must contain EXACTLY three keys:
1. "expandedSetting": A richer, 2-paragraph description of the lore, atmosphere, and current state of the world based on the background setting.
2. "campaignGoal": A 1-sentence overarching objective or core conflict for this simulation.
3. "generatedTables": An object containing 2 or 3 additional empty or minimally pre-filled tables (arrays of objects) that make sense for this specific setting (e.g. "factions", "rate", "locations", "artifacts"). Do not duplicate the tables the user already provided.

Output raw JSON only.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        const textResponse = response.text;

        // Safety parse
        return JSON.parse(textResponse);

    } catch (err) {
        console.error("Error during LLM generation:", err);
        return _mockFallbackResponse();
    }
}

// Fallback response if the API key is missing or fails, ensuring the app doesn't crash
function _mockFallbackResponse() {
    return {
        expandedSetting: "The world stretches before you, full of mystery and danger. (Note: LLM Initialization failed or no API key was provided. This is a fallback description.)",
        campaignGoal: "Survive and uncover the truth.",
        generatedTables: {
            "locations": [],
            "factions": []
        }
    };
}

/**
 * Step 1: Triage
 * Asks the Master LLM if any complex calculations are needed based on the turn log.
 */
async function _generateCalculatorQueries(turnLog, tables, worldDetails, previousTurnLog) {
    const previousLogString = previousTurnLog
        ? `\nPrevious turn's log and resolution for context:\n${JSON.stringify(previousTurnLog, null, 2)}\n`
        : '';

    const prompt = `
You are the Triage AI for a dynamic simulation system.
World Details: ${JSON.stringify(worldDetails)}
${previousLogString}

Here is the chronological Turn Log of events and dialogues that just occurred:
${JSON.stringify(turnLog, null, 2)}

Your task is to identify if any complex, rules-based, or mathematical calculations need to be evaluated BEFORE we can update the world state. (e.g., combat damage, complex economy/trading math, probability outcomes, nuanced skill checks).
If the updates are simple (e.g., "Agent picked up a rock"), do NOT generate a query for it.

You must return a STRICT JSON object containing exactly one key: "queries". This must be an array of query objects.
If no complex calculations are needed, return an empty array for "queries".

Schema:
{
  "queries": [
    {
      "id": "q1",
      "context": "Agent A attacked Agent B with a fire spell.",
      "question": "Calculate the damage Agent B takes and their resulting HP."
    }
  ]
}

Output raw JSON only.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text).queries || [];
    } catch (err) {
        console.error("Error generating calculator queries:", err);
        return [];
    }
}

/**
 * Step 2: Calculator
 * Runs a specific query against the tables and returns a strict result.
 */
async function _runCalculatorQuery(query, tables) {
    const prompt = `
You are a Calculator AI for a simulation system. You must resolve the following specific query strictly and mathematically based on the current world state.

Current World Tables:
${JSON.stringify(tables, null, 2)}

Query Context: ${query.context}
Question: ${query.question}

Return a STRICT JSON object with exactly one key: "result". The value must be a concise string stating the numerical or logical outcome of the calculation.

Schema:
{
  "result": "Agent B takes 15 fire damage. Their HP drops from 100 to 85."
}

Output raw JSON only.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return { id: query.id, ...JSON.parse(response.text) };
    } catch (err) {
        console.error(`Error running calculator for query ${query.id}:`, err);
        return { id: query.id, result: "Calculation failed." };
    }
}


/**
 * Step 3: Combined Resolution Pipeline
 * Calls the Master LLM to process a turn log and generate state updates,
 * including dynamic delegations to the Calculator models if required.
 */
async function generateTurnResolution(turnLog, tables, worldDetails, previousTurnLog) {
    if (!ai) {
        return _mockFallbackTurnResolution();
    }

    // 1. Triage for Complex Queries
    const queries = await _generateCalculatorQueries(turnLog, tables, worldDetails, previousTurnLog);

    // 2. Run Calculators in Parallel
    const calculatorResults = [];
    if (queries && queries.length > 0) {
        const promises = queries.map(q => _runCalculatorQuery(q, tables));
        const results = await Promise.all(promises);
        calculatorResults.push(...results);
    }

    const previousLogString = previousTurnLog
        ? `\nHere is the previous turn's log and resolution for context:\n${JSON.stringify(previousTurnLog, null, 2)}\n`
        : '';

    const calculatorString = calculatorResults.length > 0
        ? `\nHere are the results from the Calculator AI for complex operations this turn:\n${JSON.stringify(calculatorResults, null, 2)}\nYou MUST rely on these calculated results to formulate your tablePatches.\n`
        : '';

    const prompt = `
You are the Master AI Orchestrator for a dynamic simulation system.
The world details are: ${JSON.stringify(worldDetails)}
The current state of the world tables:
${JSON.stringify(tables, null, 2)}
${previousLogString}${calculatorString}
Here is the chronological Turn Log of events and dialogues that just occurred:
${JSON.stringify(turnLog, null, 2)}

Your job is to read the Turn Log, extract concrete events, and translate them into strict numerical/state updates for the tables.

You must return a STRICT JSON object with no markdown formatting or backticks. It must contain EXACTLY four keys:
1. "reasoning": A brief string explaining your logic.
2. "timeAdvancementMinutes": An integer representing how many in-game minutes passed during these events.
3. "activityReport": An array of strings, each summarizing a key objective event that happened.
4. "tablePatches": An array of patch objects to apply to the tables. Each patch must have:
   - "target": The exact dot-notation path to the table or item root (e.g., "inventory.Agent A.gold", "factions.0.reputation")
   - "operation": One of "add", "subtract", "set", "remove"
   - "value": (optional string/number for add/subtract/set)
   - "key": (optional string for removing an item from an array/object)

Example tablePatches:
[
  { "target": "inventory.AgentA.gold", "operation": "add", "value": 50 },
  { "target": "inventory.AgentA.items", "operation": "remove", "key": "Iron Sword" },
  { "target": "locations.Tavern.occupants", "operation": "add", "value": "Agent A" },
  { "target": "factions.0.reputation", "operation": "subtract", "value": 10 }
]

Output raw JSON only.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        const textResponse = response.text;
        const finalJson = JSON.parse(textResponse);

        // Attach calculator results to reasoning for debugging visibility
        if (calculatorResults.length > 0) {
            finalJson.reasoning += " (Included " + calculatorResults.length + " calculator queries).";
        }

        return finalJson;

    } catch (err) {
        console.error("Error during LLM Turn Generation:", err);
        return _mockFallbackTurnResolution();
    }
}

function _mockFallbackTurnResolution() {
    return {
        reasoning: "Fallback triggered. Processed turn events without AI.",
        timeAdvancementMinutes: 10,
        activityReport: [
            "The turn ended, but the Master AI was unreachable."
        ],
        tablePatches: []
    };
}

/**
 * Agents Subjective Reporting
 * Generates an activity report from the perspective of an AI Agent, restricted by what they know.
 */
async function generateAgentReport(agentData, tables, turnLog) {
    if (!ai) {
        return `[System] ${agentData.name} acts silently (LLM Offline).`;
    }

    // Filter tables to ONLY what they are allowed to see
    const perceivedTables = {};
    if (agentData.accessibleTables && agentData.accessibleTables.length > 0) {
        agentData.accessibleTables.forEach(t => {
            if (tables[t]) {
                perceivedTables[t] = tables[t];
            }
        });
    }

    const prompt = `
You are playing the role of a character in a simulation:
Name: ${agentData.name}
Role: ${agentData.role}
Private Motivations: ${agentData.privateMotivations}

MEMORY & KNOWLEDGE
You only know the following specific truths about the world:
${JSON.stringify(perceivedTables, null, 2)}

Your past memories:
${JSON.stringify(agentData.personalMemory.slice(-5), null, 2)}

RECENT EVENTS
Here is what just happened this turn in the general area:
${JSON.stringify(turnLog.slice(-10), null, 2)}

INSTRUCTIONS
Write a brief, 1-2 sentence "Activity Report" of what you do or think right now.
RULES:
1. Act freely and selfishly according to your private motivations.
2. DO NOT meta-game. You do not know you are in a simulation.
3. You can lie, scheme, move, or simply observe.
4. Output ONLY your narrative action/thought string. Do not include your own name at the start.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        // Clean up the text
        let text = response.text.trim();
        if (text.startsWith('"') && text.endsWith('"')) {
            text = text.slice(1, -1);
        }
        return text;
    } catch (err) {
        console.error(`Error generating report for ${agentData.name}:`, err);
        return `[System Error] ${agentData.name} hesitated.`;
    }
}

/**
 * AI Chat Reply Generation
 * Generates a conversational reply for a specific agent in a specific chatroom.
 */
async function generateChatReply(agentData, chatroom, tables) {
    if (!ai) {
        return `[System] ${agentData.name} replies with a nod (LLM Offline).`;
    }

    // Filter tables to ONLY what they are allowed to see
    const perceivedTables = {};
    if (agentData.accessibleTables && agentData.accessibleTables.length > 0) {
        agentData.accessibleTables.forEach(t => {
            if (tables[t]) {
                perceivedTables[t] = tables[t];
            }
        });
    }

    const recentChat = chatroom.messages.slice(-15).map(m => `[${m.senderName}]: ${m.content}`).join('\n');

    const prompt = `
You are playing the role of a character in a simulation:
Name: ${agentData.name}
Role: ${agentData.role}
Private Motivations: ${agentData.privateMotivations}

MEMORY & KNOWLEDGE
You only know the following specific truths about the world:
${JSON.stringify(perceivedTables, null, 2)}
Your past memories:
${JSON.stringify(agentData.personalMemory?.slice(-5) || [], null, 2)}

CHATROOM SETTING
You are currently talking in the chatroom: "${chatroom.name}".
Other participants in this room: ${chatroom.participants.join(', ')}.

RECENT CONVERSATION HISTORY:
${recentChat}

INSTRUCTIONS
Write your next conversational reply for the chatroom.
RULES:
1. Speak in character, reflecting your role and private motivations.
2. DO NOT meta-game. You do not know you are an AI in a simulation.
3. React naturally to the recent conversation history. Keep it brief (1-3 sentences) unless the situation demands a monologue.
4. Output ONLY your message string. Do not include your own name at the start, just the raw text you say.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        // Clean up the text
        let text = response.text.trim();
        if (text.startsWith('"') && text.endsWith('"')) {
            text = text.slice(1, -1);
        }
        return text;
    } catch (err) {
        console.error(`Error generating chat reply for ${agentData.name}:`, err);
        return `[System Error] ${agentData.name} remained silent.`;
    }
}

module.exports = {
    generateWorldInitialization,
    generateTurnResolution,
    generateAgentReport,
    generateChatReply
};
