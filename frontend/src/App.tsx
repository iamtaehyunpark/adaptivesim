import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import WelcomeScreen from './components/WelcomeScreen';
import Dashboard from './components/Dashboard';
import type { SessionData } from './types';

const API_BASE = 'http://localhost:3001/api';

function App() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionData[]>([]);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions`);
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleCreateSession = async (payload: { worldName: string; backgroundSettings: string; tables: Record<string, any>; agents: any[] }) => {
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const newSession = await res.json();
      setSessions(prev => [...prev, newSession]);
      navigate(`/session/${newSession.id}`);
    } catch (err) {
      console.error("Failed to create session", err);
    }
  };

  const handleSelectSession = (session: SessionData) => {
    navigate(`/session/${session.id}`);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <WelcomeScreen
            sessions={sessions}
            onSelectSession={handleSelectSession}
            onCreateSession={handleCreateSession}
          />
        }
      />
      <Route path="/session/:id" element={<Dashboard />} />
    </Routes>
  );
}

export default App;
