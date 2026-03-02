import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { SessionData, Chatroom } from '../types';
import './SessionCreateModal.css'; // Recursively reusing some modal styles we built

interface CreateChatroomModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionData: SessionData;
    onCreate: (newRoom: Chatroom) => void;
}

const CreateChatroomModal = ({ isOpen, onClose, sessionData, onCreate }: CreateChatroomModalProps) => {
    const [roomName, setRoomName] = useState('');
    const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());

    if (!isOpen) return null;

    const agents = sessionData.worldDetails.agentsList || [];

    const handleToggleAgent = (agentName: string) => {
        const newSet = new Set(selectedAgents);
        if (newSet.has(agentName)) {
            newSet.delete(agentName);
        } else {
            newSet.add(agentName);
        }
        setSelectedAgents(newSet);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!roomName.trim()) return;

        const newRoom: Chatroom = {
            id: uuidv4(),
            name: roomName.toLowerCase().replace(/\s+/g, '-'), // enforce discord-style names
            participants: Array.from(selectedAgents),
            messages: []
        };

        onCreate(newRoom);
        setRoomName('');
        setSelectedAgents(new Set());
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="glass-panel modal-content">
                <h2>Create Channel</h2>
                <form onSubmit={handleSubmit} className="creation-form">

                    <div className="form-group">
                        <label>Channel Name</label>
                        <input
                            type="text"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            placeholder="e.g. general-tavern"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Add Agents to Channel</label>
                        {agents.length === 0 ? (
                            <p className="helper-text" style={{ fontStyle: 'italic', marginBottom: '8px' }}>
                                No agents exist in the simulation yet. You can add them later.
                            </p>
                        ) : (
                            <div className="agent-checkboxes" style={{ maxHeight: '150px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '8px' }}>
                                {agents.map((agentName: string) => (
                                    <label key={agentName} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedAgents.has(agentName)}
                                            onChange={() => handleToggleAgent(agentName)}
                                        />
                                        <span>{agentName}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="modal-actions" style={{ marginTop: '24px' }}>
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={!roomName.trim()}>Create Channel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateChatroomModal;
