import React, { useState, useEffect, useRef } from 'react';
// Removed direct import of GoogleGenerativeAI

// ChatPanel now receives currentGlobalSettings and onSettingsSave from UIFrame
const ChatPanel = ({ isOpen, onClose, currentGlobalSettings, onSettingsSave }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const messagesEndRef = useRef(null);
  const panelRef = useRef(null);

  // No direct AI model initialization here anymore

  useEffect(() => {
    if (isOpen) {
      setMessages([{ id: Date.now(), text: "Hello! How can I help you with the globe settings today?", sender: 'bot' }]);
      const timer = setTimeout(() => setShowContent(true), 10);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const parseAndApplySetting = (settingKey, subKey, valueStr) => {
    let parsedValue = valueStr;
    const settingGroup = currentGlobalSettings[settingKey];
    let type = 'text'; // Default type

    if (settingGroup && subKey && typeof settingGroup[subKey] === 'number') {
      type = 'number';
    } else if (settingGroup && subKey && typeof settingGroup[subKey] === 'boolean') {
      type = 'checkbox';
    } else if (typeof currentGlobalSettings[settingKey] === 'boolean' && !subKey) {
       type = 'checkbox';
    } else if (typeof currentGlobalSettings[settingKey] === 'number' && !subKey) {
       type = 'number';
    }


    if (type === 'number') {
      parsedValue = Number(valueStr);
      if (isNaN(parsedValue)) {
        return { success: false, error: `Invalid number format for ${valueStr}` };
      }
    } else if (type === 'checkbox') {
      if (valueStr.toLowerCase() === 'true' || valueStr === '1' || valueStr.toLowerCase() === 'enable' || valueStr.toLowerCase() === 'enabled') {
        parsedValue = true;
      } else if (valueStr.toLowerCase() === 'false' || valueStr === '0' || valueStr.toLowerCase() === 'disable' || valueStr.toLowerCase() === 'disabled') {
        parsedValue = false;
      } else {
        return { success: false, error: `Invalid boolean value: ${valueStr}. Use true/false.` };
      }
    }
    
    // Create a deep copy of current settings to modify
    const newSettings = JSON.parse(JSON.stringify(currentGlobalSettings));

    if (subKey) {
        if (!newSettings[settingKey]) newSettings[settingKey] = {};
        newSettings[settingKey][subKey] = parsedValue;
    } else {
        // Corrected: use settingKey for top-level properties
        newSettings[settingKey] = parsedValue;
    }
    onSettingsSave(newSettings);
    return { success: true, settingKey, subKey, parsedValue };
  };


  const sendMessage = async () => {
    if (!input.trim()) return;
    // Removed direct !model check, backend /api/chat handles initialization errors.

    const userMessage = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const apiResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          history: messages, // Send current chat history for context
          currentSettings: currentGlobalSettings, // Send current settings for context
        }),
      });

      if (!apiResponse.ok) {
        let errorDetail = `API request failed with status ${apiResponse.status}`;
        const responseText = await apiResponse.text(); // Read body as text ONCE
        console.error("Raw error response from /api/chat:", responseText);
        try {
            const errorData = JSON.parse(responseText); // Try to parse the text as JSON
            errorDetail = errorData.error || errorDetail;
        } catch (e) {
            // If parsing text as JSON fails, use the text itself (it might be HTML)
            errorDetail = responseText || errorDetail;
        }
        throw new Error(errorDetail);
      }

      // If response is OK, proceed to parse as JSON
      const data = await apiResponse.json();
      let botResponseText = data.reply; // This is the text from Gemini

      // Attempt to parse the response for a structured action
      // The backend API was prompted to return JSON like:
      // {"action": "apply_setting", "settingKey": "mainKey", "subKey": "optionalSubKey", "value": "newValue"}
      // or {"action": "apply_setting", "settingKey": "mainKey", "values": {"subKey1": "val1", ...}}
      try {
        const structuredAction = JSON.parse(botResponseText);
        if (structuredAction.action === 'apply_setting' && structuredAction.settingKey) {
          const { settingKey, subKey, value, values } = structuredAction;
          
          // Create a deep copy of current settings to modify
          const newSettings = JSON.parse(JSON.stringify(currentGlobalSettings));
          let changeApplied = false;

          if (values && typeof values === 'object') { // For complex objects like requestRateLimit
            if (!newSettings[settingKey]) newSettings[settingKey] = {};
            Object.keys(values).forEach(sKey => {
              newSettings[settingKey][sKey] = values[sKey];
            });
            changeApplied = true;
          } else if (value !== undefined) { // For single value or top-level boolean
            if (subKey) {
              if (!newSettings[settingKey]) newSettings[settingKey] = {};
              newSettings[settingKey][subKey] = value;
            } else {
              newSettings[settingKey] = value;
            }
            changeApplied = true;
          }

          if (changeApplied) {
            onSettingsSave(newSettings); // Call the save function from UIFrame
            // The bot's textual response might already be a confirmation.
            // If not, or if we want a more generic one:
            // botResponseText = `Okay, I've updated the settings for '${settingKey}'.`;
            console.log(`Chatbot applied setting: ${settingKey}`, newSettings[settingKey]);
          } else {
            // Gemini might have returned the JSON structure but with insufficient data
            // Or it's a conversational response that happens to be valid JSON but not an action
            // Keep botResponseText as is.
          }
        }
        // If parsing fails or it's not an apply_setting action, botResponseText remains Gemini's natural language reply.
      } catch (e) {
        // Not a JSON for setting change, or malformed JSON. Treat as natural language response.
        // console.log("Reply from AI was not a structured setting action:", e);
      }

      const botMessage = { id: Date.now() + 1, text: botResponseText, sender: 'bot' };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error("Error sending message via /api/chat:", error);
      const errorMessageText = error.message || "Sorry, I couldn't connect to the AI. Please try again.";
      const errorMessage = { id: Date.now() + 1, text: errorMessageText, sender: 'bot' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Glassmorphism style for chat panel
  const panelBaseClasses = `
    fixed bottom-20 right-5 z-50 
    w-[360px] h-[520px] 
    bg-white/5 backdrop-blur-xl 
    rounded-xl 
    border border-white/10
    shadow-2xl 
    flex flex-col overflow-hidden
    transition-all duration-300 ease-in-out
  `;
  // Note: The glassmorphism often relies on a background to blur.
  // Ensure the parent container or body has some visual content.

  return (
    <div
      ref={panelRef}
      className={`${panelBaseClasses} ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
    >
      {/* Header */}
      <div className="p-3 border-b border-white/10 flex justify-between items-center">
        <h3 className="text-md font-semibold text-white">AI Settings Assistant</h3>
        <button onClick={onClose} className="text-gray-300 hover:text-white">&times;</button>
      </div>

      {/* Messages Area */}
      <div className="flex-grow p-3 space-y-3 overflow-y-auto">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`
                max-w-[75%] p-2.5 rounded-xl text-sm
                ${msg.sender === 'user' 
                  ? 'bg-black text-white rounded-br-none' // User message: black bg, white text
                  : 'bg-black text-white rounded-bl-none' // Bot message: black bg, white text
                }
              `}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
            placeholder="Ask to change settings..."
            className="flex-grow p-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white focus:ring-purple-500 focus:border-purple-500 placeholder-gray-500"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading}
            className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
        {/* Removed the dark-yellow warning message */}
      </div>
    </div>
  );
};

export default ChatPanel;
