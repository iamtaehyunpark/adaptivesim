import React, { useState } from 'react';
import type { SessionData } from '../types';
import SessionCreateModal from './SessionCreateModal';
import './WelcomeScreen.css';

interface WelcomeScreenProps {
    sessions: SessionData[];
    onSelectSession: (session: SessionData) => void;
    onCreateSession: (payload: { worldName: string; backgroundSettings: string; tables: Record<string, any>; agents: any[] }) => Promise<void>;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
    sessions,
    onSelectSession,
    onCreateSession
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="welcome-container">
            <div className="welcome-glass-panel">
                <header className="welcome-header">
                    <div className="logo-pulse"></div>
                    <h1>Adaptive Sim</h1>
                    <p className="subtitle">Multi-Agent Simulation Environment</p>
                </header>

                <div className="sessions-list-container">
                    <h3>Available Worlds</h3>
                    {sessions.length === 0 ? (
                        <div className="no-sessions">
                            <p>No active sessions found.</p>
                        </div>
                    ) : (
                        <div className="sessions-grid">
                            {sessions.map(session => (
                                <div
                                    key={session.id}
                                    className="session-card"
                                    onClick={() => onSelectSession(session)}
                                >
                                    <div className="session-card-header">
                                        <h4>{session.worldDetails.worldName}</h4>
                                        <span className="session-status">Turn {session.worldData.turn}</span>
                                    </div>
                                    <div className="session-card-body">
                                        <p className="session-id">ID: <span>{session.id.substring(0, 8)}...</span></p>
                                        <p className="session-agents">{Object.keys(session.agents || {}).length} Agents Active</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="welcome-actions">
                    <button className="create-big-btn" onClick={() => setIsModalOpen(true)}>
                        <span className="plus-icon">+</span> Initialize New World
                    </button>
                </div>
            </div>

            {isModalOpen && (
                <SessionCreateModal
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={async (payload) => {
                        await onCreateSession(payload);
                        setIsModalOpen(false);
                    }}
                />
            )}
        </div>
    );
};

export default WelcomeScreen;
