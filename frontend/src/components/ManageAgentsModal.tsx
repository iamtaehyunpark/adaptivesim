import React, { useState } from 'react';
import './SessionCreateModal.css'; // Reusing form styles for consistency

interface AgentInput {
    id: string; // Used internally for list management
    name: string;
    role: string;
    publicDescription: string;
    privateMotivations: string;
    accessibleTables: string;
}

interface ManageAgentsModalProps {
    agentsData: Record<string, any>; // From sessionData.agents
    onClose: () => void;
    onSave: (agents: any[]) => Promise<void>;
}

const ManageAgentsModal: React.FC<ManageAgentsModalProps> = ({ agentsData, onClose, onSave }) => {
    // Map existing SessionData object to array for UI
    const initialAgents = Object.values(agentsData || {}).map((agent: any) => ({
        id: crypto.randomUUID(),
        name: agent.name || '',
        role: agent.role || '',
        publicDescription: agent.publicDescription || '',
        privateMotivations: agent.privateMotivations || '',
        accessibleTables: (agent.accessibleTables || []).join(', ')
    }));

    const [agents, setAgents] = useState<AgentInput[]>(initialAgents);
    const [isSaving, setIsSaving] = useState(false);

    const handleAddAgent = () => {
        setAgents([...agents, {
            id: crypto.randomUUID(),
            name: '',
            role: '',
            publicDescription: '',
            privateMotivations: '',
            accessibleTables: ''
        }]);
    };

    const handleRemoveAgent = (id: string) => {
        setAgents(agents.filter(a => a.id !== id));
    };

    const handleUpdateAgent = (id: string, field: keyof AgentInput, value: string) => {
        setAgents(agents.map(a => a.id === id ? { ...a, [field]: value } : a));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const formattedAgents = agents.map(a => ({
            name: a.name || 'Unnamed Agent',
            role: a.role,
            publicDescription: a.publicDescription,
            privateMotivations: a.privateMotivations,
            accessibleTables: a.accessibleTables.split(',').map(s => s.trim()).filter(Boolean),
            personalMemory: agentsData[a.name]?.personalMemory || [] // preserve memory if editing
        }));

        setIsSaving(true);
        try {
            await onSave(formattedAgents);
            onClose();
        } catch (err) {
            console.error("Failed to save agents", err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                <h2>Manage World Actors</h2>
                <form onSubmit={handleSubmit} className="session-form">

                    <div className="agents-section" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
                        <div className="agents-header">
                            <h3>Current Cast List</h3>
                            <button type="button" onClick={handleAddAgent} className="btn-secondary small">+ Add Member</button>
                        </div>
                        <p className="hint">Modify existings actors or inject new ones mid-session.</p>

                        <div className="agents-list">
                            {agents.map((agent, idx) => (
                                <div key={agent.id} className="agent-card">
                                    <div className="agent-card-header">
                                        <h4>{agent.name || `New Agent ${idx + 1}`}</h4>
                                        <button type="button" onClick={() => handleRemoveAgent(agent.id)} className="btn-danger small">Remove</button>
                                    </div>
                                    <div className="agent-grid">
                                        <input type="text" placeholder="Name" value={agent.name} onChange={e => handleUpdateAgent(agent.id, 'name', e.target.value)} required />
                                        <input type="text" placeholder="Role (e.g. Shopkeeper)" value={agent.role} onChange={e => handleUpdateAgent(agent.id, 'role', e.target.value)} required />
                                        <input type="text" placeholder="Public Description" value={agent.publicDescription} onChange={e => handleUpdateAgent(agent.id, 'publicDescription', e.target.value)} />
                                        <input type="text" placeholder="Private Motivations" value={agent.privateMotivations} onChange={e => handleUpdateAgent(agent.id, 'privateMotivations', e.target.value)} />
                                        <input type="text" placeholder="Accessible Tables (comma separated e.g. inventory, locations)" value={agent.accessibleTables} onChange={e => handleUpdateAgent(agent.id, 'accessibleTables', e.target.value)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={agents.length === 0 || isSaving}>
                            {isSaving ? 'Saving Roster...' : 'Save Roster'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ManageAgentsModal;
