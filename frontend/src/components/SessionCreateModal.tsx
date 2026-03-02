import React, { useState } from 'react';
import './SessionCreateModal.css';

export interface AgentInput {
    id: string;
    name: string;
    role: string;
    publicDescription: string;
    privateMotivations: string;
    accessibleTables: string;
}

interface SessionCreateModalProps {
    onClose: () => void;
    onSubmit: (payload: { worldName: string; backgroundSettings: string; tables: Record<string, any>; agents: any[] }) => Promise<void>;
}

const SessionCreateModal: React.FC<SessionCreateModalProps> = ({ onClose, onSubmit }) => {
    const [worldName, setWorldName] = useState('');
    const [backgroundSettings, setBackgroundSettings] = useState('');
    const [tablesJson, setTablesJson] = useState('{\n  \n}');
    // Default User Agent
    const [agents, setAgents] = useState<AgentInput[]>([{
        id: crypto.randomUUID(),
        name: 'The Wanderer',
        role: 'Player Character',
        publicDescription: 'A mysterious stranger.',
        privateMotivations: 'To explore the world.',
        accessibleTables: 'inventory, knownLocations'
    }]);
    const [jsonError, setJsonError] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

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
        setJsonError('');

        let parsedTables = {};
        try {
            parsedTables = JSON.parse(tablesJson);
        } catch (err) {
            setJsonError('Invalid JSON format for tables.');
            return;
        }

        if (!worldName.trim()) return;
        if (agents.length === 0) {
            setJsonError('At least one agent (Player) is required.');
            return;
        }

        // Format agents for backend
        const formattedAgents = agents.map(a => ({
            name: a.name || 'Unnamed Agent',
            role: a.role,
            publicDescription: a.publicDescription,
            privateMotivations: a.privateMotivations,
            accessibleTables: a.accessibleTables.split(',').map(s => s.trim()).filter(Boolean),
            personalMemory: []
        }));

        setIsGenerating(true);
        try {
            await onSubmit({
                worldName,
                backgroundSettings,
                tables: parsedTables,
                agents: formattedAgents
            });
        } catch (err) {
            console.error("Submission failed", err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Initialize New World</h2>
                <form onSubmit={handleSubmit} className="session-form">
                    <div className="form-group">
                        <label htmlFor="worldName">World Name <span className="required">*</span></label>
                        <input
                            type="text"
                            id="worldName"
                            value={worldName}
                            onChange={(e) => setWorldName(e.target.value)}
                            placeholder="e.g., Cyberpunk City"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="backgroundSettings">Background Setting</label>
                        <textarea
                            id="backgroundSettings"
                            value={backgroundSettings}
                            onChange={(e) => setBackgroundSettings(e.target.value)}
                            placeholder="Describe the world, constraints, and tone..."
                            rows={4}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="tablesJson">Initial Tables (JSON format)</label>
                        <textarea
                            id="tablesJson"
                            value={tablesJson}
                            onChange={(e) => {
                                setTablesJson(e.target.value);
                                setJsonError('');
                            }}
                            className="json-editor"
                            rows={6}
                        />
                        {jsonError && <p className="error-message">{jsonError}</p>}
                    </div>

                    <div className="agents-section">
                        <div className="agents-header">
                            <h3>Initial Cast (Agents & Persona)</h3>
                            <button type="button" onClick={handleAddAgent} className="btn-secondary small">+ Add Agent</button>
                        </div>
                        <p className="hint">Define the initial actors in the world. Include your own User persona here!</p>

                        <div className="agents-list">
                            {agents.map((agent, idx) => (
                                <div key={agent.id} className="agent-card">
                                    <div className="agent-card-header">
                                        <h4>Agent {idx + 1}</h4>
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
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={isGenerating}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={!worldName.trim() || !!jsonError || isGenerating}>
                            {isGenerating ? 'Generating World... (This may take a moment)' : 'Launch Simulation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SessionCreateModal;
