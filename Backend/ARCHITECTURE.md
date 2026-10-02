# Second Brain Backend Architecture - V1

## Frontend Context Analysis
Based on `my-smart-second-brain/src/types/knowledge.ts` and `src/services/knowledge-service.ts`, the frontend expects:

1. **KnowledgeItem**
   - Fields: `id`, `title`, `description`, `type`, `tags`, `dateAdded`, `source`, `readingTime`, `progress`, `content`, `keyIdeas`, `accent`.
   - `type` is one of: `"Note" | "PDF" | "Article" | "URL"`.
   - `accent` is a UI specific field (`"blue" | "lavender" | "mint"`), which we can either generate on the frontend or persist as part of the backend. For now, we can persist it in the Knowledge model to match exactly.

2. **AddKnowledgeInput**
   - Fields: `title`, `description`, `tags`, `mode` (`"upload" | "text" | "url"`), `content`.

3. **BrainAnswer & BrainSource**
   - Used for Ask My Brain feature.
   - `BrainAnswer`: `id`, `question`, `answer`, `sources`, `relatedKnowledgeIds`, `suggestedQuestions`.
   - `BrainSource`: `knowledgeId`, `title`, `excerpt`, `relevance`.

## Backend Entities (Mongoose Models)

1. **User**
   - `_id`: ObjectId
   - `name`: String
   - `email`: String (Unique)
   - `passwordHash`: String
   - `settings`: Object (e.g., UI preferences)
   - `createdAt`, `updatedAt`: Dates

2. **Knowledge**
   - `_id`: ObjectId
   - `userId`: ObjectId (Ref to User)
   - `title`: String
   - `description`: String
   - `type`: String (Enum: Note, PDF, Article, URL)
   - `tags`: [String]
   - `dateAdded` / `createdAt`: Date
   - `source`: Object `{ kind: String, url: String, originalName: String }`
   - `readingTime`: Number
   - `progress`: Number
   - `content`: [String]
   - `keyIdeas`: [String]
   - `accent`: String (Optional, for frontend color mapping)
   - `createdAt`, `updatedAt`: Dates

3. **BrainQuery**
   - `_id`: ObjectId
   - `userId`: ObjectId (Ref to User)
   - `question`: String
   - `answer`: String
   - `sources`: Array of `{ knowledgeId: ObjectId, title: String, excerpt: String, relevance: Number }`
   - `relatedKnowledgeIds`: [ObjectId]
   - `suggestedQuestions`: [String]
   - `createdAt`: Date

4. **ShareLink**
   - `_id`: ObjectId
   - `userId`: ObjectId (Ref to User)
   - `token`: String (Secure randomly generated)
   - `enabled`: Boolean
   - `expiresAt`: Date
   - `createdAt`: Date

## API Endpoints

### Auth
- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/signin` - Authenticate and return JWT
- `GET /api/auth/me` - Get current authenticated user

### Knowledge (Protected by JWT)
- `GET /api/knowledge` - Get all knowledge items for user
- `GET /api/knowledge/search?q=...` - Search knowledge items by text
- `POST /api/knowledge` - Add new knowledge
- `GET /api/knowledge/:id` - Get specific knowledge item
- `DELETE /api/knowledge/:id` - Delete knowledge item

### Ask My Brain (Protected by JWT)
- `POST /api/ask` - Ask a question. V1 uses basic text search; structured to plug in vector search/LLM later.

### Share Links
- `POST /api/share` - Create a new share link (Protected)
- `GET /api/share` - View share links (Protected)
- `PATCH /api/share/:id` - Enable/disable a share link (Protected)
- `GET /api/share/public/:token` - View read-only public knowledge library (Public)

## Request/Response Flow
1. **Client** makes an HTTP request with `Authorization: Bearer <token>`.
2. **Middleware** (`requireAuth`) intercepts the request, verifies the JWT, and attaches `userId` to `req.user`.
3. **Controller** extracts inputs, delegates to **Service** for business logic.
4. **Service** interacts with **Mongoose Models** to fetch/update data, ensuring the query includes `userId: req.user.id` to prevent unauthorized cross-user access.
5. **Controller** sends a formatted JSON response (`{ success: true, data: ... }` or `{ success: false, message: ... }`).
