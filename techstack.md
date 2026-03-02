# Technology Stack

## Frontend
*   **Framework**: React (via Vite)
*   **Language**: TypeScript
*   **Styling**: Vanilla CSS (CSS Variables, Grid, Flexbox, Glassmorphism, Dark Mode)
*   **Icons**: *(TBD, likely Lucide React if needed)*

## Backend
*   **Framework**: Node.js with Express.js
*   **Storage**: Native File System (`fs`) for JSON-based simulation worlds.
*   **Libraries**: `cors` for API communication, `uuid` for unique session identities.

## Rationale
Vite provides an extremely fast development server and optimized build process. React is ideal for building dynamic, stateful UIs like a multi-agent dashboard with a chat input and JSON visualizer. TypeScript ensures type safety, which is crucial when dealing with complex JSON structures from LLMs. Vanilla CSS is used to achieve maximum customization for the required high-quality dark mode and glassmorphism aesthetic without being constrained by a utility-first framework.
