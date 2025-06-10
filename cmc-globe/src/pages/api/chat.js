import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { settingTemplates } from "../../utils/chatSettingsHelper"; // Adjust path as needed

dotenv.config({ path: '../../.env.local' }); // Assuming .env.local is in cmc-globe directory

// Ensure the API key is loaded from environment variables on the server
// The example used API_KEY, but your .env.local uses GEMINI_API_KEY. Sticking to GEMINI_API_KEY.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

let genAI;
let model;
const modelName = "gemini-2.5-flash-preview-04-17"; // Using the model name you requested

if (GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // Using the model name you requested
    // Adding generationConfig similar to the example, though it can also be passed to startChat/sendMessage
    const geminiGenerationConfig = {
      temperature: 0.7, // Adjusted from 0.9 for potentially more factual settings responses
      topP: 1,
      topK: 1, // Default is often higher, 1 means only the top token is considered
      maxOutputTokens: 2048, // Adjusted from 4096, ensure it's appropriate
    };
    model = genAI.getGenerativeModel({ model: modelName, generationConfig: geminiGenerationConfig }); 
    console.log(`Initialized Gemini model: ${modelName}`);
  } catch (error) {
    console.error(`Failed to initialize GoogleGenerativeAI in API route with model ${modelName}:`, error);
  }
} else {
  console.warn("GEMINI_API_KEY environment variable is not set (checked via process.env). Chat API will not function.");
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!model) {
    console.error("Gemini model is not initialized in handler. API_KEY found:", !!GEMINI_API_KEY);
    return res.status(500).json({ error: 'Gemini AI model not initialized. Check API key and server logs.' });
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
    // The example uses generateContent directly, not startChat. Let's align for simplicity.
    // const chat = model.startChat({
    //     history: chatHistoryForPrompt, // History might need different format for generateContent
    // });

    const fullPrompt = `${settingsContext}\n\nUser's current message: "${message}"\n\nChat History:\n${chatHistoryForPrompt.map(h => `${h.role}: ${h.parts[0].text}`).join('\n')}`;
    
    // For debugging, log the prompt being sent to Gemini
    // console.log("Full prompt to Gemini:", fullPrompt); 

    // Using generateContent as per the example structure
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    // For debugging, log the raw response text from Gemini
    // console.log("Gemini response text:", text); 
    res.status(200).json({ reply: text });

  } catch (error) {
    console.error('Error calling Gemini API:', error.message); // Log the error message
    // console.error('Full Gemini API error object:', error); // Optionally log the full error object
    res.status(500).json({ error: 'Failed to get response from AI. Check server logs for details.' });
  }
}
