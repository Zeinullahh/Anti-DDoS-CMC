import { GoogleGenerativeAI } from '@google/generative-ai';
import { settingTemplates } from '../../utils/chatSettingsHelper'; // Adjust path as needed

// Ensure the API key is loaded from environment variables on the server
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let genAI;
let model;

if (GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-pro" });
  } catch (error) {
    console.error("Failed to initialize GoogleGenerativeAI in API route:", error);
  }
} else {
  console.warn("GEMINI_API_KEY environment variable is not set. Chat API will not function.");
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!model) {
    return res.status(500).json({ error: 'Gemini AI model not initialized. Check API key.' });
  }

  const { message, history = [], currentSettings } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  if (!currentSettings) {
    return res.status(400).json({ error: 'Current settings are required for context' });
  }

  // Construct a detailed context for Gemini
  let settingsContext = "You are an assistant helping a user configure application settings. Here are the available settings and their current values. Your goal is to understand if the user wants to change any of these settings. If they do, identify which setting and guide them to provide the necessary values based on the descriptions. Do not make up settings.\n\n";
  
  settingsContext += "Current Application Settings Values:\n";
  settingsContext += `${JSON.stringify(currentSettings, null, 2)}\n\n`;

  settingsContext += "Available settings descriptions that you can help modify:\n";
  settingTemplates.forEach(template => {
    settingsContext += `- ${template.description}\n`; // Key for AI to understand what it can do
  });
  
  settingsContext += `\nBased on this, and the user's query, determine if they want to modify a setting.
If they want to modify a setting, identify which one (e.g., by its description or common terms like 'connection rate limit').
Then, ask clarifying questions to get all necessary parameters for that setting as defined in its description.
For example, if they say 'I want to change connection limits', you might respond: 'Okay, I can help with connection rate limiting. What would you like to set the zone size to (e.g., "10m") and what is the maximum number of connections per IP (e.g., 10)?'
If the user's query is not about changing one of these settings, respond conversationally.
If the user provides new values for a setting, confirm the change. For example: 'Okay, I will set connection rate limit zone size to 20m and max connections to 15.'
Then, output a structured JSON object for the frontend to parse if a setting change is confirmed and all values are gathered.
The JSON should be like: {"action": "apply_setting", "settingKey": "mainSettingKey", "subKey": "optionalSubKey", "value": "newValue"} or for complex objects: {"action": "apply_setting", "settingKey": "mainSettingKey", "values": {"subKey1": "val1", "subKey2": "val2"}}
For boolean toggles, if user says 'enable cache', respond with JSON: {"action": "apply_setting", "settingKey": "cacheOptimizationEnabled", "value": true}
If just asking questions or general chat, do not output the JSON structure.
`;

  // Simple history formatting (can be more sophisticated)
  const chatHistoryForPrompt = history.map(h => ({
    role: h.sender === 'user' ? 'user' : 'model',
    parts: [{ text: h.text }]
  }));

  try {
    const chat = model.startChat({
        history: chatHistoryForPrompt,
        generationConfig: {
            maxOutputTokens: 1000, // Adjust as needed
        },
    });

    const fullPrompt = `${settingsContext}\n\nUser's current message: "${message}"`;
    // console.log("Full prompt to Gemini:", fullPrompt); // For debugging on server

    const result = await chat.sendMessage(fullPrompt);
    const response = await result.response;
    const text = response.text();

    // console.log("Gemini response text:", text); // For debugging on server
    res.status(200).json({ reply: text });

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
}
