# My Smart Second Brain

Build a polished SaaS web application called "Second Brain".

Second Brain is an AI-powered personal knowledge and learning system where users can save notes, PDFs, articles, URLs and other learning material, organize their knowledge, search it, and ask an AI assistant questions about their own knowledge.

IMPORTANT:
This is the FRONTEND/PRODUCT UI prototype first.
Do NOT build the backend, database, authentication, RAG pipeline, embeddings, vector database, or real AI integration yet.

Use realistic mock data and mock interactions so the application feels functional.

Design direction:

- Modern AI/SaaS product
- Clean light theme
- White and very light gray backgrounds
- Dark navy typography
- Cobalt/royal blue as the primary accent
- Subtle pale blue, lavender and mint surfaces
- Thin borders
- Rounded cards
- Subtle shadows
- Excellent spacing and typography
- Minimal, premium and professional
- Avoid excessive gradients
- Avoid overly colorful dashboard designs
- Desktop-first but responsive
- The UI should look like a serious product that could be demoed at a hackathon

Create these main pages:

1. DASHBOARD

- Sidebar navigation
- Top header
- Welcome section
- Knowledge statistics
- Recent knowledge
- Recently asked questions
- Quick action buttons:
  "Add Knowledge"
  "Ask My Brain"
- A small section showing "Continue Learning"

2. KNOWLEDGE LIBRARY

- Search bar at the top
- Filter tabs:
  All
  Notes
  PDFs
  Articles
  URLs
- Sort control
- Knowledge cards/list
- Each item should show:
  title
  short description
  type
  tags
  date added
- Include realistic mock knowledge items

3. ADD KNOWLEDGE
   Create a polished input interface with three options:

- Upload Document
- Paste Text
- Add URL

Include:

- Title
- Description
- Tags
- Main content/input area
- Add Knowledge button

Show a realistic processing state for uploaded content.

4. ASK MY BRAIN
   Create a premium AI chat interface.

The user should be able to ask questions about their personal knowledge.

Include:

- Conversation area
- User question
- AI response
- "Sources" section under AI responses
- Source cards showing which saved knowledge was used
- "Related Knowledge" section
- Suggested questions

Example question:
"What did I learn about distributed systems?"

Example response should be based on mock knowledge and clearly show citations/sources.

5. KNOWLEDGE DETAIL
   Create a detailed knowledge page with:

- Title
- Type
- Tags
- Source
- Content
- Date added
- Related knowledge
- "Ask about this" button

Navigation:
Dashboard
Knowledge
Add Knowledge
Ask My Brain
Settings

Create reusable components for:

- Sidebar
- Header
- Knowledge Card
- Source Card
- Tag
- Search
- Empty State
- Loading/Processing State
- AI Message
- User Message

Use mock data only for now.

Keep the code clean, componentized and easy to connect to a real backend later.

Do not hardcode the UI in a way that makes future API integration difficult.

The backend/API will be built separately later.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bf07edd3-ea21-4dd7-9796-af1dca6b1b93).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
