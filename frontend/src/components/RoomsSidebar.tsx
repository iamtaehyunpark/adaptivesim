import type { SessionData } from '../types';
import './RoomsSidebar.css';

interface RoomsSidebarProps {
    sessionData: SessionData;
    activeChatroomId: string | null;
    onSelectRoom: (roomId: string) => void;
    onCreateRoomClick: () => void;
    onManageAgentsClick: () => void;
    onEndTurn: () => void;
    isReportingPhase: boolean;
}

const RoomsSidebar = ({ sessionData, activeChatroomId, onSelectRoom, onCreateRoomClick, onManageAgentsClick, onEndTurn, isReportingPhase }: RoomsSidebarProps) => {
    const agentsList = Object.values(sessionData.agents || {});

    return (
        <div className="glass-panel sidebar-container">
            <div className="sidebar-header">
                <h3>{sessionData.worldDetails.worldName}</h3>
                <span className="server-status"></span>
            </div>

            <div className="channels-container">
                <div className="channels-header">
                    <h4>TEXT CHANNELS</h4>
                    <button className="add-room-btn" onClick={onCreateRoomClick} title="Create Channel">
                        +
                    </button>
                </div>

                <ul className="channel-list">
                    {sessionData.chatrooms && sessionData.chatrooms.length > 0 ? (
                        sessionData.chatrooms.map((room) => (
                            <li
                                key={room.id}
                                className={`channel-item ${activeChatroomId === room.id ? 'active' : ''}`}
                                onClick={() => onSelectRoom(room.id)}
                            >
                                <span className="hash">#</span> {room.name}
                            </li>
                        ))
                    ) : (
                        <div className="no-channels-msg">
                            No channels exist yet. Create one to begin.
                        </div>
                    )}
                </ul>
            </div>            <div className="agents-container" style={{ marginTop: '20px' }}>
                <div className="channels-header">
                    <h4>CAST & ACTORS</h4>
                    <button className="add-room-btn" onClick={onManageAgentsClick} title="Manage Agents">
                        ⚙️
                    </button>
                </div>
                <ul className="channel-list">
                    {agentsList.length > 0 ? (
                        agentsList.map((agent: any) => (
                            <li key={agent.name} className="channel-item agent-item" style={{ cursor: 'default' }}>
                                <span className="hash">👤</span> {agent.name}
                                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{agent.role}</span>
                            </li>
                        ))
                    ) : (
                        <div className="no-channels-msg">No agents present.</div>
                    )}
                </ul>
            </div>

            <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <button
                    className="end-turn-btn"
                    onClick={onEndTurn}
                    disabled={isReportingPhase}
                >
                    {isReportingPhase ? 'Gathering Reports...' : `✦ Initiate Turn End (${sessionData.worldData.turn})`}
                </button>
            </div>
        </div >
    );
};

export default RoomsSidebar;
