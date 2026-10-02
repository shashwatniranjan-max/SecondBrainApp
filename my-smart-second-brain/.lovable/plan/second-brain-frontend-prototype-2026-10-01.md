# Second Brain frontend prototype

## Goal

Build a polished, frontend-only personal knowledge workspace using realistic mock data and interactions. The app will feel demo-ready while keeping all data and interaction boundaries easy to replace with real APIs later.

## Experience

- Create a responsive app shell with a desktop sidebar, compact mobile navigation, contextual page header, profile controls, and the requested navigation destinations.
- Establish a clean light visual system: white and cool-gray surfaces, navy text, cobalt primary actions, restrained pale blue/lavender/mint accents, thin borders, subtle shadows, and compact rounded corners.
- Use a distinctive knowledge-network brand mark and clear document-type iconography rather than generic AI visuals.

## Pages and flows

- **Dashboard (`/`)**: welcome area, knowledge statistics, Add Knowledge and Ask My Brain actions, recent knowledge, recent questions, and Continue Learning.
- **Knowledge (`/knowledge`)**: searchable and sortable library with All/Notes/PDFs/Articles/URLs filters, realistic data, empty results, and links into item details.
- **Knowledge detail (`/knowledge/$knowledgeId`)**: title, type, tags, source, added date, rich mock content, related items, and Ask about this action.
- **Add Knowledge (`/add`)**: Upload Document, Paste Text, and Add URL modes; shared metadata fields; drag-and-drop/file input; mock validation and timed processing/success states.
- **Ask My Brain (`/ask`)**: premium mock conversation with the distributed-systems example, inline citations, source cards, related knowledge, suggested follow-ups, and a working composer that returns mock responses.
- **Settings (`/settings`)**: a focused prototype settings screen so sidebar navigation is complete, with mock preference toggles and knowledge defaults.

## Reusable structure

- Centralize typed entities behind a mock service layer whose asynchronous methods mirror future REST calls, so pages never import raw fixtures or embed data throughout the UI. The contract will expose `getKnowledge()`, `getKnowledgeById(id)`, `searchKnowledge(query)`, `addKnowledge(data)`, and `askBrain(question)`.
- Build shared Sidebar, Header, KnowledgeCard, SourceCard, Tag, Search, EmptyState, ProcessingState, and page-section components.
- Build the chat surface from focused, reusable React components for conversation, messages, prompt input, sources/citations, suggestions, and loading states, without AI/LLM-specific packages.
- Use the existing design-system Button and form controls for interactive elements, adding only the focused primitives required by this prototype.

## Interaction details

- Search, filters, and sorting update the displayed mock library immediately.
- Knowledge cards navigate to stable detail URLs.
- Add Knowledge switches input modes, accepts mock files/text/URLs, shows progress, and finishes with a success state.
- Suggested questions populate/submit the chat; sending a prompt appends a user message, shows a short thinking state, then returns a source-backed mock answer.
- Mobile layouts keep navigation, filters, cards, forms, and chat composer usable without overlap.
- Every data-driven screen represents loading, empty, error, and success states using shared state components; mock services can deliberately return each state for future API-ready testing.

## Technical details

- Keep the project’s existing React application setup and routing conventions rather than introducing or replacing frameworks; define route-specific metadata for every page.
- Use React state only; no Cloud, authentication, database, storage, server functions, or real AI calls.
- Define semantic Tailwind v4 tokens and restrained motion with reduced-motion support.
- Keep page components dependent only on the service interface and typed results; replacing the mock implementation with REST calls must require no page-component changes.
- Record the mock-data boundary and route/component architecture in `AGENTS.md`.
- Validate with the project checks and Playwright at desktop and mobile sizes, covering navigation, filtering, detail, add-processing, and chat submission.
