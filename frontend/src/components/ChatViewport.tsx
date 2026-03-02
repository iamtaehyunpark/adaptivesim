import { useEffect, useRef } from 'react';
import type { Chatroom } from '../types';
import './ChatViewport.css';

interface ChatViewportProps {
    room: Chatroom | null;
}

const ChatViewport = ({ room }: ChatViewportProps) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [room?.messages]);

    if (!room) {
        return (
            <div className="glass-panel chat-container empty-state">
                <div className="empty-state-content">
                    <h2>Welcome to the Simulation</h2>
                    <p>Select a text channel on the left to start observing or interacting.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel chat-container">
            <div className="chat-header">
                <h3><span className="hash">#</span> {room.name}</h3>
                <span className="participant-count">{room.participants.length} Participants</span>
            </div>

            <div className="messages-area">
                {room.messages.length === 0 ? (
                    <div className="chat-beginning-msg">
                        <h1>Welcome to #{room.name}!</h1>
                        <p>This is the start of the #{room.name} simulation history.</p>
                    </div>
                ) : (
                    room.messages.map((msg) => (
                        <div key={msg.id} className={`message-wrapper ${msg.senderId === 'system' ? 'system-msg' : ''} ${msg.senderId === 'master-action' ? 'action-msg' : ''}`}>
                            <div className="message-avatar">
                                {/* Placeholder avatar */}
                                {msg.senderName.charAt(0).toUpperCase()}
                            </div>
                            <div className="message-content">
                                <div className="message-meta">
                                    <span className="message-sender">{msg.senderName}</span>
                                    <span className="message-time">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="message-text">
                                    {msg.content}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                {/* Dummy div to scroll to bottom */}
                <div ref={bottomRef} />
            </div>
        </div>
    );
};

export default ChatViewport;
