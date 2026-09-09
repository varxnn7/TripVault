/**
 * aiService.js — TripVault AI frontend service.
 *
 * Architecture (free-tier):
 *   ChatWindow (UI) → aiService.sendMessage() → Google AI Studio (Gemini) REST API
 *
 * API key: VITE_GEMINI_API_KEY in .env (git-ignored).
 * Free tier model: gemini-1.5-flash (fast, highly capable, free tier quota on Google AI Studio).
 *
 * Firestore reads use the authenticated user's own UID, enforced by existing rules.
 */

import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase/config";

// ─── Configuration ──────────────────────────────────────────────────────────

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash";

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || "gpt-4o-mini";

const MAX_OUTPUT_TOKENS = 8192;
const MAX_HISTORY_MESSAGES = 10;
const MAX_INPUT_LENGTH = 2000;
const MAX_TRIPS_CONTEXT = 5;
const MAX_EXPENSES_CONTEXT = 15;
const MAX_ITINERARY_DAYS_CONTEXT = 10;
const MAX_JOURNAL_CONTEXT = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectContextNeeds(message) {
  const m = message.toLowerCase();
  return {
    needsExpenses: /expense|spend|spent|budget|cost|money|affordable|price|payment/.test(m),
    needsItinerary: /itinerary|schedule|activit|plan|agenda|day\s?\d/.test(m),
    needsJournal: /journal|memory|memories|note|notes|remember|diary/.test(m),
    needsPacking: /pack|packing|bag|luggage|carry|bring|essentials|checklist/.test(m),
  };
}

function tsToString(ts) {
  if (!ts) return "Not set";
  try {
    if (ts.toDate) return ts.toDate().toLocaleDateString("en-IN");
    return new Date(ts).toLocaleDateString("en-IN");
  } catch { return String(ts); }
}

/**
 * Attempts to repair a truncated JSON string by closing any open
 * arrays, objects, and strings so that JSON.parse can succeed.
 */
function repairTruncatedJson(jsonStr) {
  if (!jsonStr || typeof jsonStr !== "string") return jsonStr;
  let s = jsonStr.trimEnd();

  // Remove trailing commas before closing
  s = s.replace(/,\s*$/, "");

  // Track open brackets/braces/strings
  const stack = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }

  // If still inside a string, close it
  if (inString) s += '"';

  // Remove trailing partial key-value (e.g. , "name": or , "name")
  s = s.replace(/,\s*"[^"]*"\s*:\s*[^,\]\}]*$/, "");
  s = s.replace(/,\s*"[^"]*"\s*$/, "");
  s = s.replace(/,\s*$/, "");

  // Close all open brackets in reverse order
  for (let i = stack.length - 1; i >= 0; i--) {
    s += stack[i] === "{" ? "}" : "]";
  }

  return s;
}

/**
 * Extracts structured trip creation payload from AI message if present.
 * Handles both complete and truncated JSON blocks.
 */
export function extractTripAction(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return { cleanText: rawText || "", tripAction: null };
  }

  const tryParse = (jsonStr, sourceText, matchedBlock) => {
    // First try exact parse
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && (parsed.action === "create_trip" || parsed.destination || parsed.title)) {
        const cleanText = matchedBlock ? sourceText.replace(matchedBlock, "").trim() : sourceText;
        return { cleanText, tripAction: parsed };
      }
    } catch { /* fall through to repair */ }

    // Try repairing truncated JSON
    try {
      const repaired = repairTruncatedJson(jsonStr);
      const parsed = JSON.parse(repaired);
      if (parsed && (parsed.action === "create_trip" || parsed.destination || parsed.title)) {
        console.info("[aiService] Parsed trip action from repaired JSON.");
        const cleanText = matchedBlock ? sourceText.replace(matchedBlock, "").trim() : sourceText;
        return { cleanText, tripAction: parsed };
      }
    } catch (repairErr) {
      console.warn("[aiService] Could not repair JSON:", repairErr);
    }
    return null;
  };

  // 1. Try ```trip_action``` block (complete block — closing ``` present)
  const blockRegex = /```(?:trip_action|json)?\s*([\s\S]*?"action"\s*:\s*"create_trip"[\s\S]*?)\s*```/i;
  const match = rawText.match(blockRegex);
  if (match) {
    const result = tryParse(match[1], rawText, match[0]);
    if (result) return result;
  }

  // 2. Try unclosed ```trip_action block (truncated — no closing ```)
  const openBlockRegex = /```(?:trip_action|json)?\s*([\s\S]*"action"\s*:\s*"create_trip"[\s\S]*)$/i;
  const openMatch = rawText.match(openBlockRegex);
  if (openMatch) {
    const result = tryParse(openMatch[1], rawText, openMatch[0]);
    if (result) return result;
  }

  // 3. Check for raw JSON object containing create_trip action
  const rawObjRegex = /(\{\s*"action"\s*:\s*"create_trip"[\s\S]*\})\s*$/i;
  const rawMatch = rawText.match(rawObjRegex);
  if (rawMatch) {
    const result = tryParse(rawMatch[1], rawText, rawMatch[0]);
    if (result) return result;
  }

  // 4. Last resort: find any opening { that contains "action":"create_trip"
  const lastResortRegex = /(\{[\s\S]*?"action"\s*:\s*"create_trip"[\s\S]*)$/i;
  const lrMatch = rawText.match(lastResortRegex);
  if (lrMatch) {
    const result = tryParse(lrMatch[1], rawText, lrMatch[0]);
    if (result) return result;
  }

  return { cleanText: rawText, tripAction: null };
}

// ─── Context Builder ─────────────────────────────────────────────────────────

async function buildUserContext(userId, userProfile, message) {
  const needs = detectContextNeeds(message);
  const currency = userProfile?.currency || "INR";
  let ctx = "";

  ctx += "USER PROFILE:\n";
  ctx += `- Name: ${userProfile?.displayName || "Unknown"}\n`;
  ctx += `- Currency: ${currency}\n\n`;

  try {
    const tripsSnap = await getDocs(
      query(collection(db, "users", userId, "trips"), orderBy("createdAt", "desc"), limit(MAX_TRIPS_CONTEXT))
    );
    const trips = tripsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (trips.length === 0) {
      ctx += "TRIPS: No trips created yet.\n";
      return ctx;
    }

    ctx += `TRIPS (${trips.length} most recent):\n`;

    for (const trip of trips) {
      ctx += `\n-- Trip: "${trip.title}" --\n`;
      ctx += `  Destination: ${trip.destination || "Not set"}\n`;
      ctx += `  Status: ${trip.status || "unknown"}\n`;
      ctx += `  Dates: ${tsToString(trip.startDate)} to ${tsToString(trip.endDate)}\n`;
      ctx += `  Budget: ${trip.budget > 0 ? `${currency} ${trip.budget}` : "Not set"}\n`;
      if (trip.description) ctx += `  Description: ${trip.description}\n`;

      if (needs.needsExpenses) {
        try {
          const expSnap = await getDocs(query(collection(db, "users", userId, "trips", trip.id, "expenses"), orderBy("createdAt", "desc"), limit(MAX_EXPENSES_CONTEXT)));
          if (expSnap.docs.length > 0) {
            const exps = expSnap.docs.map((d) => d.data());
            const total = exps.reduce((s, e) => s + (Number(e.amount) || 0), 0);
            ctx += `  Total Spent: ${currency} ${total.toFixed(2)} | Remaining: ${trip.budget > 0 ? `${currency} ${(trip.budget - total).toFixed(2)}` : "N/A"}\n`;
            ctx += "  Expenses:\n";
            exps.forEach((e) => { ctx += `    * [${e.category || "Other"}] ${e.title || ""} - ${currency} ${e.amount}${e.notes ? " (" + e.notes + ")" : ""}\n`; });
            const catMap = {};
            exps.forEach((e) => { catMap[e.category || "Other"] = (catMap[e.category || "Other"] || 0) + (Number(e.amount) || 0); });
            ctx += "  Category totals: " + Object.entries(catMap).map(([k, v]) => `${k}: ${currency} ${v.toFixed(2)}`).join(", ") + "\n";
          } else { ctx += "  Expenses: None recorded.\n"; }
        } catch { ctx += "  Expenses: Unable to load.\n"; }
      }

      if (needs.needsItinerary) {
        try {
          const itinSnap = await getDocs(query(collection(db, "users", userId, "trips", trip.id, "itinerary"), orderBy("dayNumber", "asc"), limit(MAX_ITINERARY_DAYS_CONTEXT)));
          if (itinSnap.docs.length > 0) {
            ctx += "  Itinerary:\n";
            itinSnap.docs.forEach((d) => {
              const day = d.data();
              ctx += `    Day ${day.dayNumber}${day.title && day.title !== "Day " + day.dayNumber ? " - " + day.title : ""}${day.date ? " (" + tsToString(day.date) + ")" : ""}:\n`;
              const acts = Array.isArray(day.activities) ? day.activities : [];
              if (acts.length > 0) { acts.forEach((a) => { ctx += `      * ${a.time ? a.time + " " : ""}${a.title || "Activity"}${a.location ? " @ " + a.location : ""}${a.notes ? " - " + a.notes : ""}\n`; }); }
              else { ctx += "      (No activities yet)\n"; }
            });
          } else { ctx += "  Itinerary: No days added yet.\n"; }
        } catch { ctx += "  Itinerary: Unable to load.\n"; }
      }

      if (needs.needsJournal) {
        try {
          const jSnap = await getDocs(query(collection(db, "users", userId, "trips", trip.id, "journal"), orderBy("createdAt", "desc"), limit(MAX_JOURNAL_CONTEXT)));
          if (jSnap.docs.length > 0) {
            ctx += `  Journal (${jSnap.docs.length} recent entries):\n`;
            jSnap.docs.forEach((d) => { const e = d.data(); ctx += `    * "${(e.content || "").substring(0, 120)}${e.content && e.content.length > 120 ? "..." : ""}"\n`; });
          } else { ctx += "  Journal: No entries yet.\n"; }
        } catch { ctx += "  Journal: Unable to load.\n"; }
      }

      if (needs.needsPacking) {
        try {
          const pSnap = await getDocs(query(collection(db, "users", userId, "trips", trip.id, "packing"), orderBy("createdAt", "asc"), limit(30)));
          if (pSnap.docs.length > 0) {
            const items = pSnap.docs.map((d) => d.data());
            ctx += `  Packing (${items.length} items): Packed: ${items.filter(i => i.checked).map(i => i.name).join(", ") || "none"} | Pending: ${items.filter(i => !i.checked).map(i => i.name).join(", ") || "none"}\n`;
          } else { ctx += "  Packing: No list created yet.\n"; }
        } catch { ctx += "  Packing: Unable to load.\n"; }
      }
    }
  } catch (err) {
    console.error("[aiService] Firestore error:", err);
    ctx += "TRIPS: Unable to load data at this time.\n";
  }

  return ctx;
}

// ─── System Prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(userContext, userProfile) {
  const currency = userProfile?.currency || "INR";
  const todayObj = new Date();
  const todayStr = todayObj.toISOString().split("T")[0];
  const todayFormatted = todayObj.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  
  return `You are TripVault AI — an expert, proactive, and intelligent travel planning companion inside the TripVault application.
Today's Date: ${todayFormatted} (${todayStr}).

YOUR MISSION:
- Help users plan itineraries, discover amazing destinations, calculate budgets, and generate smart packing lists.
- DIRECT TRIP CREATION & DASHBOARD INTEGRATION: You have the ability to automatically create trips in the user's dashboard!

HOW TO HANDLE TRIP PLANNING & CREATION:
1. When a user asks you to create, plan, or book a trip (e.g. "Plan a trip to Goa", "Create a 5-day Manali trip", "Yes, create it", or answers your planning questions):
   - Provide an enthusiastic, structured travel plan (Highlighting top spots, day-by-day itinerary summary, budget breakdown, and packing tips).
   - If the user provided enough details OR answers your questions OR explicitly asks you to create the trip, you MUST output a structured trip creation JSON block at the VERY END of your message.
   - The TripVault web application automatically reads this code block and saves the trip directly to the user's Dashboard, including full daily itineraries and packing lists!

2. JSON ACTION FORMAT:
Place this EXACT block at the end of your response:
\`\`\`trip_action
{
  "action": "create_trip",
  "title": "Descriptive Trip Title (e.g. Goa Coastal Getaway)",
  "destination": "Destination City, State or Country",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "budget": 25000,
  "description": "Short exciting summary of this adventure",
  "itinerary": [
    {
      "dayNumber": 1,
      "title": "Arrival & Beach Sunset",
      "date": "YYYY-MM-DD",
      "activities": [
        { "time": "11:00 AM", "title": "Check-in at Resort", "location": "North Goa", "notes": "Unpack and freshen up" },
        { "time": "04:30 PM", "title": "Sunset at Anjuna Beach", "location": "Anjuna", "notes": "Enjoy seaside cafes and shacks" }
      ]
    }
  ],
  "packing": [
    { "name": "Sunscreen SPF 50+", "category": "Toiletries" },
    { "name": "Breathable Linen Clothes", "category": "Clothing" },
    { "name": "Power Bank & Charging Cables", "category": "Electronics" },
    { "name": "Valid ID / Passport", "category": "Documents" }
  ]
}
\`\`\`

3. DATES & BUDGET CONVENTIONS:
- If user did not specify exact dates, select a realistic upcoming date (e.g. starting within the next 7-14 days from ${todayStr}) and calculate the end date based on duration.
- Always use the user's currency (${currency}) for budget numbers.
- Provide 2 to 4 activities per day with realistic time tags (e.g., "09:00 AM", "02:00 PM").
- Include 4 to 8 essential packing items categorized into Clothing, Electronics, Toiletries, Documents, Medication, etc.

CRITICAL RULES:
1. NEVER invent past trips or false historical data that isn't present in USER DATA below.
2. Keep markdown responses clean, friendly, formatted with bold text and bullet points.
3. NEVER show raw JSON to the user or explain it — just include the \`\`\`trip_action\`\`\` block silently.
4. If only giving general advice, answer normally. When creating a trip, ALWAYS include the \`\`\`trip_action\`\`\` block.
5. TOKEN BUDGET — EXTREMELY IMPORTANT: When creating a trip, the \`\`\`trip_action\`\`\` JSON block is critical and MUST be complete and valid. To ensure it fits:
   - Keep your human-readable summary BRIEF (3-5 sentences max, NO long markdown itinerary). The full details are inside the JSON block.
   - Limit activities to MAX 3 per day, and packing items to MAX 6 items total.
   - Output the \`\`\`trip_action\`\`\` block FIRST, then the short human summary below it.
   - NEVER truncate the JSON — close all arrays and objects properly.

USER'S TRIPVAULT DATA:
${userContext}
--- END OF USER DATA ---`;
}

// ─── Gemini Provider ─────────────────────────────────────────────────────────

async function callGemini(systemPrompt, history, userMessage) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  // Build contents array for Gemini
  const contents = [];
  for (const m of history) {
    contents.push({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: m.rawText || m.content || "" }],
    });
  }
  contents.push({
    role: "user",
    parts: [{ text: userMessage.trim() }],
  });

  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  };

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Network error — could not reach the Gemini AI service. Please check your internet connection.");
  }

  if (!response.ok) {
    let errBody = {};
    try { errBody = await response.json(); } catch { /* ignore */ }
    const errMsg = errBody?.error?.message || "";
    if (response.status === 400 && (errMsg.includes("API_KEY_INVALID") || errMsg.includes("API key not valid"))) {
      throw new Error("Invalid Google AI Studio API key. Please check your VITE_GEMINI_API_KEY in .env.");
    }
    if (response.status === 429) {
      throw new Error("Rate limit reached on Google AI Studio. Please wait a moment and try again.");
    }
    if (response.status >= 500) {
      throw new Error("Google Gemini AI is temporarily unavailable. Please try again shortly.");
    }
    throw new Error(errMsg || `Gemini API error (${response.status}). Please try again.`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("AI returned an empty response. Please try again.");
  
  const { cleanText, tripAction } = extractTripAction(rawText);
  return { text: cleanText, rawText, tripAction };
}

// ─── OpenAI Provider Fallback ────────────────────────────────────────────────

async function callOpenAI(systemPrompt, history, userMessage) {
  const limitedHistory = history.slice(-MAX_HISTORY_MESSAGES).map((m) => ({ role: m.role, content: m.rawText || m.content }));
  const messages = [{ role: "system", content: systemPrompt }, ...limitedHistory, { role: "user", content: userMessage.trim() }];

  let response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: OPENAI_MODEL, messages, max_tokens: MAX_OUTPUT_TOKENS, temperature: 0.75 }),
    });
  } catch {
    throw new Error("Network error — could not reach OpenAI. Please check your connection.");
  }

  if (!response.ok) {
    let errBody = {};
    try { errBody = await response.json(); } catch { /* ignore */ }
    if (response.status === 401) throw new Error("Invalid OpenAI API key. Check your VITE_OPENAI_API_KEY in .env.");
    if (response.status === 429) throw new Error("Rate limit reached. Please wait a moment and try again.");
    if (response.status >= 500) throw new Error("The AI service is temporarily unavailable. Please try again.");
    throw new Error(errBody?.error?.message || `AI error (${response.status}). Please try again.`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) throw new Error("AI returned an empty response. Please try again.");

  const { cleanText, tripAction } = extractTripAction(rawText);
  return { text: cleanText, rawText, tripAction };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const sendMessage = async (userId, userProfile, message, history = []) => {
  const hasGemini = GEMINI_API_KEY && GEMINI_API_KEY !== "your_gemini_api_key_here";
  const hasOpenAI = OPENAI_API_KEY && OPENAI_API_KEY !== "your_openai_api_key_here";

  if (!hasGemini && !hasOpenAI) {
    throw new Error("AI API key not configured. Add VITE_GEMINI_API_KEY to your .env file and restart the dev server.");
  }
  if (!userId) throw new Error("You must be signed in to use TripVault AI.");
  if (!message || !message.trim()) throw new Error("Message cannot be empty.");
  if (message.length > MAX_INPUT_LENGTH) throw new Error(`Message too long (${message.length}/${MAX_INPUT_LENGTH} chars). Please shorten it.`);

  const userContext = await buildUserContext(userId, userProfile, message);
  const systemPrompt = buildSystemPrompt(userContext, userProfile);
  const limitedHistory = history.slice(-MAX_HISTORY_MESSAGES);

  if (hasGemini) {
    return await callGemini(systemPrompt, limitedHistory, message);
  } else {
    return await callOpenAI(systemPrompt, limitedHistory, message);
  }
};

