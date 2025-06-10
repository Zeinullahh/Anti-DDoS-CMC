import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { settingTemplates } from "../../utils/chatSettingsHelper";

dotenv.config({ path: '../../.env.local' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

let model;
// Using a recent, generally available model. Update if you have access to a specific preview model.
const modelName = "gemini-2.5-flash-preview-04-17"; 

if (GEMINI_API_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const geminiGenerationConfig = {
      temperature: 0.2, // Lower temperature for more predictable, structured output
      topP: 1,
      topK: 1,
      maxOutputTokens: 2048,
    };
    model = genAI.getGenerativeModel({ model: modelName, generationConfig: geminiGenerationConfig }); 
    console.log(`Initialized Gemini model: ${modelName}`);
  } catch (error) {
    console.error(`Failed to initialize GoogleGenerativeAI in API route with model ${modelName}:`, error);
  }
} else {
  console.warn("GEMINI_API_KEY environment variable is not set. Chat API will not function.");
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

  if (!message || !currentSettings) {
    return res.status(400).json({ error: 'Message and currentSettings are required' });
  }

  let settingsContext = `You are a helpful assistant for configuring application settings.
Your primary goal is to identify if the user wants to change a setting, gather all necessary values, and then respond with a specific JSON object to apply the change.

Here are the available settings you can modify:
${settingTemplates.map(t => `- ${t.description}`).join('\n')}

Here are the current values:
${JSON.stringify(currentSettings, null, 2)}

INTERACTION FLOW:
1. If the user's request is unclear or missing values (e.g., they say "change timeouts" but not which one or to what value), ask clarifying questions based on the setting description.
2. If the user provides all necessary values to change a setting, respond with a conversational confirmation (e.g., "Okay, I will update the request timeout settings.") followed by the required JSON object on a new line.
3. **IMPORTANT RULE:** If you are applying a setting, your response MUST contain the JSON object. The JSON object should be the LAST part of your response.
4. The JSON format MUST be one of the following:
   - For single values: {"action": "apply_setting", "settingKey": "key", "subKey": "subKey", "value": "newValue"}
   - For multiple values in a group: {"action": "apply_setting", "settingKey": "key", "values": {"subKey1": "val1", "subKey2": "val2"}}
   - For simple toggles: {"action": "apply_setting", "settingKey": "key", "value": true}
5. If the user is just chatting and not asking to change a setting, respond conversationally without any JSON.
`;

  const chatHistoryForPrompt = history.map(h => ({
    role: h.sender === 'user' ? 'user' : 'model',
    parts: [{ text: h.text }]
  }));

  try {
    const chat = model.startChat({ history: chatHistoryForPrompt });
    const fullPrompt = `${settingsContext}\n\nUser's current message: "${message}"`;
    
    const result = await chat.sendMessage(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    res.status(200).json({ reply: text });

  } catch (error) {
    console.error('Error calling Gemini API:', error.message);
    res.status(500).json({ error: 'Failed to get response from AI. Check server logs for details.' });
  }
}
