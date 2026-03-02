export interface Message {
    id: string;
    senderId: string; // 'system', 'user', or agent ID
    senderName: string;
    content: string;
    timestamp: number;
}

export interface Chatroom {
    id: string;
    name: string;
    participants: string[]; // Array of agent IDs
    messages: Message[];
}

export interface SessionData {
    id: string;
    worldDetails: {
        worldName: string;
        backgroundSettings: string;
        campaignGoal?: string;
        agentsList: any[];
    };
    agents: Record<string, any>;
    worldData: {
        time: number;
        turn: number;
        [key: string]: any;
    };
    tables: Record<string, any>;
    chatrooms: Chatroom[];
    turnLog: Message[]; // Chronological log of current turn events
    pastTurnLogs: any[]; // Historical LLM resolutions
}
