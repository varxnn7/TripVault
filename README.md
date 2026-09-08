# TripVault 🧳

TripVault is a modern, responsive Progressive Web App (PWA) designed to be a comprehensive travel companion. It allows users to plan trips, manage day-by-day itineraries, track expenses with multi-currency support, and maintain a travel journal—all in one centralized, secure dashboard.

## 🚀 Technology Stack

This project is built as a **Serverless Single Page Application (SPA)** using modern web technologies:

* **Frontend Framework:** React 19 (using Functional Components & Hooks)
* **Build Tool:** Vite (chosen for fast Hot Module Replacement and optimized builds)
* **Routing:** React Router DOM v7 (for seamless client-side navigation)
* **Backend / Database:** Firebase (BaaS)
  * *Firebase Authentication:* Secure email/password login and sign-up.
  * *Cloud Firestore:* A NoSQL real-time document database to store all user and trip data.
* **Styling:** Vanilla CSS with a modern monochrome/glassmorphism aesthetic.
* **Icons:** `react-icons` (Ionicons `Io5`).

## 🎯 Core Features

1. **Authentication & Security:** Secure routes ensure only authenticated users can access the dashboard.
2. **Dashboard Hub:** A central hub showing all user trips (Planning, Ongoing, Completed) with quick summaries.
3. **Trip Management (CRUD):** Users can Create, Read, Update, and Delete trips. Each trip tracks destination, dates, budget, and real-time status.
4. **Day-by-Day Itinerary:** Plan specific activities for specific days of a trip.
5. **Expense Tracking:** Log expenses against a central budget in your preferred currency (set in user profile).
6. **Travel Journaling:** Write memories, notes, or tips associated with a specific trip.

## 🏗️ Database Architecture (Firestore)

TripVault uses a NoSQL hierarchical structure to ensure user data privacy and fast queries:

```text
users (Collection)
 └── {userId} (Document) -> Stores profile config (name, currency)
      └── trips (Sub-collection)
           └── {tripId} (Document) -> Stores trip details (destination, budget, etc.)
                ├── itinerary (Sub-collection) -> Day activities
                ├── expenses (Sub-collection) -> Individual costs
                └── journal (Sub-collection) -> Diary entries
```

**Why this structure?** It silos user trips securely under their ID, simplifying security rules and data fetching. Note: cascade deletions (deleting sub-collections before the parent trip) are handled manually in `firestore.js`.

## 🔄 System Architecture & Process Flow

1. **Global State Management:** Uses React Context API (`AuthContext`, `ToastContext`) to avoid prop drilling and provide global user state and notifications.
2. **Protected Routing:** Routes like `/dashboard` and `/trip/:id` are protected; unauthorized users are redirected to the Landing or Login page.
3. **Real-time Data Sync:** Uses Firebase's `onSnapshot` listener instead of static fetches. This ensures the UI instantly updates whenever data (like a new expense) is added, making the app highly reactive.

## 🔮 Future Scope

* **Offline Mode:** Leveraging PWA service workers and Firestore's offline caching.
* **Collaborative Trips:** Allowing multiple users to join and edit the same trip.
* **Map Integration:** Visualizing the itinerary using Google Maps or Mapbox APIs.

## 🤖 AI Travel Assistant

TripVault includes an AI-powered chatbot (TripVault AI) that helps users with travel planning, expense analysis, itinerary suggestions, and more — all personalized using the user's actual TripVault data.

### What it does

- **Travel planning** — destination ideas, packing lists, itinerary suggestions
- **Data-aware answers** — reads your trips, expenses, and itinerary from Firestore to give personalized responses
- **Expense analysis** — summarizes spending, budget usage, and category breakdowns
- **Conversation memory** — maintains context across messages within a session

### Architecture

```
React Chatbot UI (AIChatbot / ChatWindow)
        ↓
aiService.js (frontend service layer)
        ↓ reads user data from Firestore (authenticated user only)
        ↓ builds system prompt with user context
OpenAI REST API (gpt-4o-mini)
        ↓
AI Response → rendered in ChatWindow
```

> **Note:** The API key lives in `.env` (git-ignored). For a production deployment, consider moving the API call behind a server-side proxy or Firebase Cloud Function (requires Blaze plan) to fully hide the key from the browser bundle.

### Files added

| File | Purpose |
|---|---|
| `src/services/aiService.js` | Reads Firestore context, builds system prompt, calls OpenAI |
| `src/components/AIChatbot/AIChatbot.jsx` | Floating button + open/close controller |
| `src/components/AIChatbot/ChatWindow.jsx` | Chat panel with message state management |
| `src/components/AIChatbot/ChatMessage.jsx` | Individual message bubble with markdown formatting |
| `src/components/AIChatbot/ChatInput.jsx` | Textarea + send button (Enter to send, Shift+Enter for newline) |
| `src/components/AIChatbot/aiChatbot.css` | Dark glassmorphism styles matching TripVault design |

### Configuring the AI API key

TripVault AI uses **Google AI Studio (Gemini)** by default, which includes a generous **Free Tier**:

1. Open `.env` in the project root
2. Set your Google AI Studio API key:
   ```
   VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```
3. Get your free key at [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
4. Restart the dev server (`npm run dev`)

> **Model:** Defaults to `gemini-1.5-flash` (fast, free tier, highly capable). You can customize it using `VITE_GEMINI_MODEL=gemini-1.5-flash`.
> **OpenAI Support:** TripVault AI also supports OpenAI as a fallback if `VITE_OPENAI_API_KEY` is provided instead.

---

## 🏗️ Database Architecture (Firestore)

TripVault uses a NoSQL hierarchical structure to ensure user data privacy and fast queries:

```text
users (Collection)
 └── {userId} (Document) -> Stores profile config (name, currency)
      └── trips (Sub-collection)
           └── {tripId} (Document) -> Stores trip details (destination, budget, etc.)
                ├── itinerary (Sub-collection) -> Day activities
                ├── expenses (Sub-collection) -> Individual costs
                ├── journal (Sub-collection)  -> Diary entries
                └── packing (Sub-collection)  -> Packing list items
```

**Why this structure?** It silos user trips securely under their ID, simplifying security rules and data fetching. Note: cascade deletions (deleting sub-collections before the parent trip) are handled manually in `firestore.js`.

## 🔄 System Architecture & Process Flow

1. **Global State Management:** Uses React Context API (`AuthContext`, `ToastContext`) to avoid prop drilling and provide global user state and notifications.
2. **Protected Routing:** Routes like `/dashboard` and `/trip/:id` are protected; unauthorized users are redirected to the Landing or Login page.
3. **Real-time Data Sync:** Uses Firebase's `onSnapshot` listener instead of static fetches. This ensures the UI instantly updates whenever data (like a new expense) is added, making the app highly reactive.

## 🔮 Future Scope

* **Offline Mode:** Leveraging PWA service workers and Firestore's offline caching.
* **Collaborative Trips:** Allowing multiple users to join and edit the same trip.
* **AI Actions:** Letting TripVault AI directly create expenses, itinerary items, or trips via structured function calls.
* **Persistent AI History:** Storing conversation history in Firestore for continuity across sessions.
* **Secure AI Backend:** Moving the OpenAI call to a Firebase Cloud Function (requires Blaze plan) so the API key never appears in the browser bundle.

## 🛠️ Running Locally

1. Clone the repository
2. Run `npm install` to install dependencies
3. Copy `.env.example` to `.env` and fill in your Firebase credentials and OpenAI API key
4. Run `npm run dev` to start the local Vite server