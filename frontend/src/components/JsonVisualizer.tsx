import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import './JsonVisualizer.css';
import type { SessionData } from '../types';

interface JsonVisualizerProps {
    sessionData: SessionData | null;
    onSaveState?: (updatedData: SessionData) => Promise<void>;
}

const JsonVisualizer: React.FC<JsonVisualizerProps> = ({ sessionData, onSaveState }) => {
    const [editorValue, setEditorValue] = useState<string>('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState(false);

    // Update internal editor value if sessionData changes externally and we don't have unsaved edits
    useEffect(() => {
        if (sessionData && !hasUnsavedChanges) {
            setEditorValue(JSON.stringify(sessionData, null, 2));
        }
    }, [sessionData, hasUnsavedChanges]);

    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            setEditorValue(value);
            setHasUnsavedChanges(true);
        }
    };

    const handleSave = async () => {
        if (!onSaveState) return;
        setIsSaving(true);
        try {
            const parsedData = JSON.parse(editorValue);
            await onSaveState(parsedData);
            setHasUnsavedChanges(false);
        } catch (e) {
            alert("Invalid JSON format. Please fix syntax errors before saving.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscard = () => {
        if (sessionData) {
            setEditorValue(JSON.stringify(sessionData, null, 2));
            setHasUnsavedChanges(false);
        }
    };

    return (
        <div className="json-visualizer glass-panel">
            <div className="panel-header">
                <h3>State Inspector</h3>
                <div className="json-actions">
                    {hasUnsavedChanges && (
                        <>
                            <button className="discard-btn" onClick={handleDiscard} disabled={isSaving}>Discard</button>
                            <button className="save-btn" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? "Saving..." : "Save State"}
                            </button>
                        </>
                    )}
                </div>
            </div>
            <div className="json-content">
                {sessionData ? (
                    <Editor
                        height="100%"
                        language="json"
                        theme="vs-dark"
                        value={editorValue}
                        onChange={handleEditorChange}
                        options={{
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            folding: true,
                            formatOnType: true,
                            readOnly: !onSaveState,
                            padding: { top: 16 }
                        }}
                    />
                ) : (
                    <pre style={{ color: 'var(--text-secondary)' }}>
                        {"// No world initialized."}
                    </pre>
                )}
            </div>
        </div>
    );
};

export default JsonVisualizer;
