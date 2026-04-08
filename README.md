# AdaptiveSimulation

A multi-agent simulation framework that orchestrates complex scenarios through strictly separated agent dynamics with controlled information access. By strategically blocking information channels between agents, AdaptiveSimulation enhances collaborative competency and prevents model convergence.

## 🎯 Vision

AdaptiveSimulation enables you to simulate almost any real-world situation where multiple autonomous agents must work together while maintaining information asymmetry. The framework's core innovation is its **information blocking mechanism** — each agent operates with limited visibility into the system, forcing them to develop specialized expertise and foster genuine collaboration rather than convergence.

## ✨ Key Features

- **Multi-Agent Architecture**: Orchestrate multiple independent agents with separate control flows
- **Information Blocking**: Strategically control what information each agent can access, creating realistic constraints
- **Collaborative Learning**: Force agents to develop complementary skills rather than converging to the same behavior
- **Real-Time Dashboard**: Monitor agent states, communications, and simulation progress through an intuitive web interface
- **Flexible Scenario Design**: Define custom simulation worlds in JSON format
- **Session Management**: Track unique simulation instances with auto-generated session IDs

## 🏗️ Architecture

### Core Design Principle

The framework enforces strict separation between:
- **Agent Logic**: Independent decision-making engines
- **Orchestration Layer**: Centralized control and information flow management
- **Visibility Constraints**: Fine-grained access control to limit agent perception

This ensures agents develop adaptive strategies based on incomplete information, mirroring real-world problem-solving environments.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 with Vite
- **Language**: TypeScript
- **Styling**: Vanilla CSS (CSS Variables, Glassmorphism, Dark Mode)
- **Editor**: Monaco Editor for scenario configuration
- **Visualization**: React JSON View for state inspection
- **Navigation**: React Router for multi-view UI
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js
- **Server**: Express.js
- **AI Models**: Google GenAI SDK (for agent reasoning)
- **Storage**: File System (JSON-based simulation worlds)
- **Utilities**: UUID for session management, Lodash for data transformation

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Google GenAI API key (for agent models)

### Installation

```bash
# Clone the repository
git clone https://github.com/iamtaehyunpark/adaptivesim.git
cd adaptivesim

# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
