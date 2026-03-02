const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const llmService = require('./llmService');

const app = express();
const PORT = process.env.PORT || 3001;
const SESSIONS_DIR = path.join(__dirname, 'data', 'sessions');

app.use(cors());
app.use(express.json());

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Generate new session JSON
app.post('/api/sessions', async (req, res) => {
    const { worldName, backgroundSettings, tables, agents } = req.body;

    const sessionId = uuidv4();
    const safeWorldName = worldName || `World-${sessionId.substring(0, 6)}`;
    const safeSettings = backgroundSettings || "Default setting initialized.";
    const safeTables = tables || {};
    const initialAgents = agents || [];

    // 1. Call Master LLM to expand the world properties
    const llmData = await llmService.generateWorldInitialization(safeWorldName, safeSettings, safeTables);

    // Format the agents exactly to the Phase 2 Schema
    const agentsMap = {};
    const agentsList = [];
    initialAgents.forEach(a => {
        agentsMap[a.name] = {
            name: a.name,
            role: a.role,
            publicDescription: a.publicDescription,
            privateMotivations: a.privateMotivations,
            accessibleTables: a.accessibleTables || [],
            personalMemory: []
        };
        agentsList.push(a.name);
    });

    // 2. Build the final JSON using LLM extensions
    const sessionData = {
        id: sessionId,
        worldDetails: {
            worldName: safeWorldName,
            backgroundSettings: llmData.expandedSetting,
            campaignGoal: llmData.campaignGoal,
            agentsList: agentsList
        },
        agents: agentsMap,
        worldData: {
            time: 0,
            turn: 1
        },
        tables: {
            ...safeTables,
            ...llmData.generatedTables // Merge user tables with LLM generated tables
        },
        chatrooms: [
            {
                id: uuidv4(),
                name: 'activity-report',
                participants: [], // System channel inherently
                messages: []
            }
        ],
        turnLog: [],
        pastTurnLogs: []
    };

    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);

    try {
        fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2));
        res.status(201).json(sessionData);
    } catch (err) {
        console.error(`Failed to create session JSON for ${sessionId}:`, err);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// Get all active sessions
app.get('/api/sessions', (req, res) => {
    try {
        const files = fs.readdirSync(SESSIONS_DIR);
        const sessions = [];

        files.forEach(file => {
            if (file.endsWith('.json')) {
                const filePath = path.join(SESSIONS_DIR, file);
                const fileContent = fs.readFileSync(filePath, 'utf8');
                try {
                    const sessionData = JSON.parse(fileContent);
                    sessions.push(sessionData);
                } catch (e) {
                    console.error(`Error parsing ${file}`);
                }
            }
        });

        res.status(200).json(sessions);
    } catch (err) {
        console.error('Failed to read sessions directory:', err);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// Get a specific session by ID
app.get('/api/sessions/:id', (req, res) => {
    const sessionId = req.params.id;
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);

    if (fs.existsSync(filePath)) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            res.status(200).json(JSON.parse(fileContent));
        } catch (err) {
            console.error(`Failed to read session ${sessionId}:`, err);
            res.status(500).json({ error: 'Failed to read session data' });
        }
    } else {
        res.status(404).json({ error: 'Session not found' });
    }
});

// Update a specific session by ID (e.g. saving chatrooms, messages)
app.put('/api/sessions/:id', (req, res) => {
    const sessionId = req.params.id;
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    const updatedData = req.body;

    if (fs.existsSync(filePath)) {
        try {
            // Write the entirely updated JSON back to disk
            fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
            res.status(200).json({ success: true, session: updatedData });
        } catch (err) {
            console.error(`Failed to update session ${sessionId}:`, err);
            res.status(500).json({ error: 'Failed to update session data' });
        }
    } else {
        res.status(404).json({ error: 'Session not found' });
    }
});

// Generate AI Reply for a specific Chatroom
app.post('/api/sessions/:id/chatrooms/:roomId/generate-reply', async (req, res) => {
    const sessionId = req.params.id;
    const roomId = req.params.roomId;
    const { agentName } = req.body;
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Session not found' });
    }

    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        let sessionData = JSON.parse(fileContent);

        const chatroom = sessionData.chatrooms.find(r => r.id === roomId);
        if (!chatroom) return res.status(404).json({ error: 'Chatroom not found' });

        const agents = Object.values(sessionData.agents || {});
        const agentData = agents.find(a => a.name === agentName);

        if (!agentData) return res.status(404).json({ error: 'Agent not found' });

        const replyText = await llmService.generateChatReply(
            agentData,
            chatroom,
            sessionData.tables
        );

        const newMessage = {
            id: uuidv4(),
            senderId: `agent-${agentData.name}`,
            senderName: agentData.name,
            content: replyText,
            timestamp: Date.now()
        };

        chatroom.messages.push(newMessage);

        // Push to turnLog so the Orchestrator reads this response natively later
        if (!sessionData.turnLog) sessionData.turnLog = [];
        sessionData.turnLog.push(newMessage);

        fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2));

        res.status(200).json({ message: 'Reply generated', session: sessionData });
    } catch (err) {
        console.error("AI Reply Generation Error:", err);
        res.status(500).json({ error: 'Failed to generate AI reply' });
    }
});

// Request Agent Reports (Reporting Phase)
app.post('/api/sessions/:id/request-reports', async (req, res) => {
    const sessionId = req.params.id;
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Session not found' });
    }

    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        let sessionData = JSON.parse(fileContent);

        if (!sessionData.turnLog) sessionData.turnLog = [];

        const agents = Object.values(sessionData.agents || {});

        // Execute reporting for all agents concurrently
        const reportPromises = agents.map(async (agentData) => {
            const reportText = await llmService.generateAgentReport(
                agentData,
                sessionData.tables,
                sessionData.turnLog
            );

            return {
                id: uuidv4(),
                senderId: `agent-${agentData.name}`,
                senderName: agentData.name,
                content: reportText,
                timestamp: Date.now()
            };
        });

        const newReports = await Promise.all(reportPromises);

        // Sort slightly by timestamp to ensure deterministic ordering (all happened simultaneously)
        newReports.sort((a, b) => a.timestamp - b.timestamp);

        sessionData.turnLog.push(...newReports);

        // Optional: Save personal memory block for the agents so they remember their actions
        agents.forEach((agent, idx) => {
            if (!agent.personalMemory) agent.personalMemory = [];
            agent.personalMemory.push(newReports[idx].content);
        });

        fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2));

        res.status(200).json({ message: 'Reports gathered successfully.', session: sessionData });
    } catch (err) {
        console.error("Agent Reporting Error:", err);
        res.status(500).json({ error: 'Failed to gather agent reports' });
    }
});

// End Turn processing (Stub)
app.post('/api/sessions/:id/end-turn', async (req, res) => {
    const sessionId = req.params.id;
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Session not found' });
    }

    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        let sessionData = JSON.parse(fileContent);

        // 1. Get previous turn context if it exists
        const previousTurnLog = sessionData.pastTurnLogs && sessionData.pastTurnLogs.length > 0
            ? sessionData.pastTurnLogs[sessionData.pastTurnLogs.length - 1]
            : null;

        // 2. Call Master LLM for Turn Resolution
        const resolution = await llmService.generateTurnResolution(
            sessionData.turnLog,
            sessionData.tables,
            sessionData.worldDetails,
            previousTurnLog
        );

        // 2. Apply dynamic JSON patches
        if (resolution.tablePatches && Array.isArray(resolution.tablePatches)) {
            resolution.tablePatches.forEach(patch => {
                const currentVal = _.get(sessionData.tables, patch.target);

                switch (patch.operation) {
                    case 'add':
                        if (Array.isArray(currentVal)) {
                            currentVal.push(patch.value);
                        } else if (typeof currentVal === 'number') {
                            _.set(sessionData.tables, patch.target, currentVal + Number(patch.value));
                        } else if (typeof currentVal === 'string' && !isNaN(Number(currentVal))) {
                            _.set(sessionData.tables, patch.target, (Number(currentVal) + Number(patch.value)).toString());
                        } else if (currentVal === undefined) {
                            _.set(sessionData.tables, patch.target, patch.value);
                        }
                        break;
                    case 'subtract':
                        if (typeof currentVal === 'number') {
                            _.set(sessionData.tables, patch.target, currentVal - Number(patch.value));
                        } else if (typeof currentVal === 'string' && !isNaN(Number(currentVal))) {
                            _.set(sessionData.tables, patch.target, (Number(currentVal) - Number(patch.value)).toString());
                        }
                        break;
                    case 'set':
                        _.set(sessionData.tables, patch.target, patch.value);
                        break;
                    case 'remove':
                        if (Array.isArray(currentVal)) {
                            _.set(sessionData.tables, patch.target, currentVal.filter(item => item !== (patch.key || patch.value)));
                        } else if (typeof currentVal === 'object' && currentVal !== null) {
                            delete currentVal[patch.key || patch.value];
                        }
                        break;
                }
            });
        }

        // 3. Advance Time and Turn
        const oldTurn = sessionData.worldData.turn;
        sessionData.worldData.turn += 1;
        sessionData.worldData.time += (resolution.timeAdvancementMinutes || 0);

        // 4. Push Activity Reports
        const reportRoom = sessionData.chatrooms.find(r => r.name === 'activity-report');
        if (reportRoom) {
            // Push overall reasoning
            reportRoom.messages.push({
                id: uuidv4(),
                senderId: 'master-action',
                senderName: 'Orchestrator Reasoning',
                content: `Turn ${oldTurn} Reasoning: ${resolution.reasoning || "No reasoning provided."}`,
                timestamp: Date.now()
            });

            // Push individual events
            if (resolution.activityReport && Array.isArray(resolution.activityReport)) {
                resolution.activityReport.forEach(msg => {
                    reportRoom.messages.push({
                        id: uuidv4(),
                        senderId: 'system',
                        senderName: 'Orchestrator Update',
                        content: msg,
                        timestamp: Date.now() + 1 // slight offset for chronological sort
                    });
                });
            }
        }

        // Ensure arrays exist before pushing
        if (!sessionData.pastTurnLogs) sessionData.pastTurnLogs = [];
        if (!sessionData.turnLog) sessionData.turnLog = [];

        // Archive the turn log WITH its LLM resolution
        sessionData.pastTurnLogs.push({
            turn: oldTurn,
            log: [...sessionData.turnLog],
            resolution: resolution
        });

        sessionData.turnLog = []; // Reset for next turn

        fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2));
        res.status(200).json({ success: true, session: sessionData });
    } catch (err) {
        console.error(`Failed to process end-turn for ${sessionId}:`, err);
        res.status(500).json({ error: 'Failed to process end turn' });
    }
});

app.listen(PORT, () => {
    console.log(`Adaptive Sim Backend running on http://localhost:${PORT}`);
});
