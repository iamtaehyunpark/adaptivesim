import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import RoomsSidebar from './RoomsSidebar';
import ChatViewport from './ChatViewport';
import ChatInput from './ChatInput';
import JsonVisualizer from './JsonVisualizer';
import CreateChatroomModal from './CreateChatroomModal';
import ManageAgentsModal from './ManageAgentsModal';
import type { SessionData, Chatroom, Message } from '../types';

const API_BASE = 'http://localhost:3001/api';

const Dashboard = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeSession, setActiveSession] = useState<SessionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeChatroomId, setActiveChatroomId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isManageAgentsModalOpen, setIsManageAgentsModalOpen] = useState(false);
    const [isReportingPhase, setIsReportingPhase] = useState(false);
    const [isGeneratingReply, setIsGeneratingReply] = useState(false);

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const res = await fetch(`${API_BASE}/sessions/${id}`);
                if (!res.ok) {
                    throw new Error('Session not found');
                }
                const data = await res.json();
                setActiveSession(data);
            } catch (err) {
                console.error("Failed to fetch session", err);
                navigate('/'); // Redirect to home if session not found
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchSession();
        }
    }, [id, navigate]);

    // Backend Sync Generic Function
    const saveSessionData = async (updatedData: SessionData) => {
        try {
            const res = await fetch(`${API_BASE}/sessions/${updatedData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            if (!res.ok) throw new Error('Failed to sync state to backend');
            setActiveSession(updatedData);
        } catch (err) {
            console.error("Sync Error:", err);
            // In a production app, we would add toast notifications for generic errors
        }
    };

    const handleCreateRoom = async (newRoom: Chatroom) => {
        if (!activeSession) return;
        const updatedData = {
            ...activeSession,
            chatrooms: [...(activeSession.chatrooms || []), newRoom] // Ensure array exists
        };
        await saveSessionData(updatedData);
        setActiveChatroomId(newRoom.id);
    };

    const handleSaveAgents = async (updatedAgents: any[]) => {
        if (!activeSession) return;

        const agentsMap: Record<string, any> = {};
        const agentsList: string[] = [];
        updatedAgents.forEach(a => {
            agentsMap[a.name] = a;
            agentsList.push(a.name);
        });

        const updatedData = {
            ...activeSession,
            agents: agentsMap,
            worldDetails: {
                ...activeSession.worldDetails,
                agentsList
            }
        };
        await saveSessionData(updatedData);
        setIsManageAgentsModalOpen(false);
    };

    const handleSendMessage = async (content: string, isActionMode: boolean, passedSenderName?: string) => {
        if (!activeSession || !activeChatroomId) return;

        const newMessage: Message = {
            id: uuidv4(),
            senderId: isActionMode ? 'master-action' : (passedSenderName ? `agent-${passedSenderName}` : 'user'),
            senderName: isActionMode ? 'System Action' : (passedSenderName || 'Master User'),
            content,
            timestamp: Date.now()
        };

        const updatedChatrooms = activeSession.chatrooms.map(room => {
            if (room.id === activeChatroomId) {
                return { ...room, messages: [...room.messages, newMessage] };
            }
            return room;
        });

        const updatedData = {
            ...activeSession,
            chatrooms: updatedChatrooms,
            turnLog: [...(activeSession.turnLog || []), newMessage] // Add message to the real-time turn log
        };
        await saveSessionData(updatedData);
    };

    const handleEndTurn = async () => {
        if (!activeSession) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/sessions/${activeSession.id}/end-turn`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error('Failed to run end-turn procedure');
            const data = await res.json();
            setActiveSession(data.session);
        } catch (err) {
            console.error("End Turn Error:", err);
        } finally {
            setLoading(false);
            setIsReportingPhase(false);
        }
    };

    const handleInitiateTurnEnd = async () => {
        if (!activeSession) return;
        setIsReportingPhase(true);
        try {
            const res = await fetch(`${API_BASE}/sessions/${activeSession.id}/request-reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error('Failed to request reports');
            const data = await res.json();
            setActiveSession(data.session);
            // After reports are collected, trigger the actual resolution
            await handleEndTurn();
        } catch (err) {
            console.error("Initiate Turn Error:", err);
            setIsReportingPhase(false);
        }
    };

    const handleTriggerAIReply = async (agentName: string) => {
        if (!activeSession || !activeChatroomId) return;

        setIsGeneratingReply(true);
        try {
            const res = await fetch(`${API_BASE}/sessions/${activeSession.id}/chatrooms/${activeChatroomId}/generate-reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentName })
            });
            if (!res.ok) throw new Error('Failed to generate AI reply');
            const data = await res.json();
            setActiveSession(data.session);
        } catch (err) {
            console.error("AI Reply Error:", err);
        } finally {
            setIsGeneratingReply(false);
        }
    };

    if (loading || !activeSession) {
        return <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading Interface...</div>;
    }

    const activeChatroom = activeSession.chatrooms?.find(r => r.id === activeChatroomId) || null;

    return (
        <div className="app-container">
            <aside className="sidebar-area">
                <RoomsSidebar
                    sessionData={activeSession}
                    activeChatroomId={activeChatroomId}
                    onSelectRoom={setActiveChatroomId}
                    onCreateRoomClick={() => setIsCreateModalOpen(true)}
                    onManageAgentsClick={() => setIsManageAgentsModalOpen(true)}
                    onEndTurn={handleInitiateTurnEnd}
                    isReportingPhase={isReportingPhase}
                />
            </aside>

            <main className="center-area">
                <ChatViewport room={activeChatroom} />
                <div className="bottom-area" style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px' }}>
                    <ChatInput
                        onSendMessage={handleSendMessage}
                        onTriggerAIReply={handleTriggerAIReply}
                        disabled={!activeChatroom}
                        isGeneratingReply={isGeneratingReply}
                        agentsList={activeSession.worldDetails.agentsList || []}
                        roomParticipants={activeChatroom ? activeChatroom.participants : []}
                    />
                </div>
            </main>

            <aside className="right-area">
                <JsonVisualizer
                    sessionData={activeSession}
                    onSaveState={saveSessionData}
                />
            </aside>

            <CreateChatroomModal
                isOpen={isCreateModalOpen}
                sessionData={activeSession}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateRoom}
            />

            {isManageAgentsModalOpen && (
                <ManageAgentsModal
                    agentsData={activeSession.agents}
                    onClose={() => setIsManageAgentsModalOpen(false)}
                    onSave={handleSaveAgents}
                />
            )}
        </div>
    );
};

export default Dashboard;
