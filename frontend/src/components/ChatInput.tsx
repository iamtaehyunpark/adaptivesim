import React, { useState } from 'react';
import { Send } from 'lucide-react';
import './ChatInput.css';

interface ChatInputProps {
    onSendMessage: (content: string, isActionMode: boolean, senderName?: string) => void;
    onTriggerAIReply?: (agentName: string) => void;
    disabled?: boolean;
    isGeneratingReply?: boolean;
    agentsList?: string[];
    roomParticipants?: string[];
}


const ChatInput: React.FC<ChatInputProps> = ({
    onSendMessage,
    onTriggerAIReply,
    disabled = false,
    isGeneratingReply = false,
    agentsList = [],
    roomParticipants = []
}) => {
    const [input, setInput] = useState('');
    const [isActionMode, setIsActionMode] = useState(false);
    const [selectedPersona, setSelectedPersona] = useState<string>('');
    const [showAIReplyMenu, setShowAIReplyMenu] = useState(false);

    // Default to the first agent if available
    React.useEffect(() => {
        if (agentsList.length > 0 && !selectedPersona) {
            setSelectedPersona(agentsList[0]);
        }
    }, [agentsList, selectedPersona]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !disabled) {
            onSendMessage(input, isActionMode, isActionMode ? undefined : selectedPersona);
            setInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className={`chat-input-wrapper glass-panel ${isActionMode ? 'action-mode-active' : ''}`}>
            {/* Visual Indicator of Mode */}
            <div className="mode-toggle-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                    <button
                        className={`mode-btn ${!isActionMode ? 'active' : ''}`}
                        onClick={() => setIsActionMode(false)}
                        type="button"
                    >
                        Persona Mode
                    </button>
                    {!isActionMode && agentsList.length > 0 && (
                        <select
                            value={selectedPersona}
                            onChange={(e) => setSelectedPersona(e.target.value)}
                            className="persona-selector"
                            style={{
                                background: 'rgba(15, 23, 42, 0.5)',
                                border: '1px solid var(--glass-border)',
                                color: 'white',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '0.8rem'
                            }}
                        >
                            {agentsList.map(agentName => (
                                <option key={agentName} value={agentName}>Speaking as: {agentName}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    {/* AI Reply Menu Trigger */}
                    {!isActionMode && roomParticipants.length > 0 && (
                        <div style={{ position: 'relative' }}>
                            <button
                                type="button"
                                className="mode-btn action-style"
                                style={{ background: 'rgba(124, 58, 237, 0.2)', border: '1px solid rgba(124, 58, 237, 0.4)' }}
                                onClick={() => setShowAIReplyMenu(!showAIReplyMenu)}
                                disabled={isGeneratingReply}
                            >
                                {isGeneratingReply ? 'Generating...' : '✨ Invoke AI Reply'}
                            </button>
                            {showAIReplyMenu && (
                                <div className="ai-reply-menu" style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    right: '0',
                                    marginBottom: '8px',
                                    background: 'var(--glass-bg)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '8px',
                                    padding: '8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    minWidth: '150px',
                                    zIndex: 10
                                }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '4px 8px' }}>Select an Agent to reply:</div>
                                    {roomParticipants.map(participant => (
                                        <button
                                            key={participant}
                                            type="button"
                                            className="btn-secondary small"
                                            style={{ textAlign: 'left', border: 'none', background: 'rgba(255,255,255,0.05)' }}
                                            onClick={() => {
                                                setShowAIReplyMenu(false);
                                                if (onTriggerAIReply) onTriggerAIReply(participant);
                                            }}
                                        >
                                            {participant}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        className={`mode-btn action-style ${isActionMode ? 'active' : ''}`}
                        onClick={() => setIsActionMode(true)}
                        type="button"
                    >
                        Action Mode
                    </button>
                </div>
            </div>

            <form className="chat-form" onSubmit={handleSubmit}>
                <textarea
                    className="chat-textarea"
                    placeholder={isActionMode ? "Execute world action or update state..." : "Message AdaptiveSim..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                />
                <button
                    type="submit"
                    className={`send-btn ${input.trim() && !disabled ? 'active' : ''}`}
                    disabled={!input.trim() || disabled}
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
};

export default ChatInput;
