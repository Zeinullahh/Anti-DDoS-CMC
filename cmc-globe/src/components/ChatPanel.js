import React, { useState, useEffect, useRef } from 'react';

const ChatPanel = ({ isOpen, onClose, currentGlobalSettings, onSettingsSave }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const messagesEndRef = useRef(null);
  const panelRef = useRef(null);

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

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const apiChatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          history: [...messages, userMessage],
          currentSettings: currentGlobalSettings,
        }),
      });

      if (!apiChatResponse.ok) {
        let errorDetail = `AI Chat API request failed with status ${apiChatResponse.status}`;
        const responseText = await apiChatResponse.text();
        console.error("Raw error response from /api/chat:", responseText);
        try {
          const errorData = JSON.parse(responseText);
          errorDetail = errorData.error || errorDetail;
        } catch (e) {
          errorDetail = responseText || errorDetail;
        }
        throw new Error(errorDetail);
      }

      const chatData = await apiChatResponse.json();
      const botResponseText = chatData.reply;
      let conversationalText = botResponseText;
      
      // --- FIX FOR JSON EXTRACTION ---
      // Regex to find a JSON object within a string, potentially surrounded by text and markdown.
      const jsonRegex = /```json\s*([\s\S]*?)\s*```|({[\s\S]*})/;
      const match = botResponseText.match(jsonRegex);

      if (match) {
        // Extract the JSON part (either from the markdown block or a standalone object)
        const jsonString = match[1] || match[2];
        // The conversational part is the text before the JSON block.
        conversationalText = botResponseText.substring(0, match.index).trim();
        if (conversationalText === "") {
            conversationalText = "Okay, I've applied the setting."; // Default confirmation
        }

        try {
          const structuredAction = JSON.parse(jsonString);
          if (structuredAction.action === 'apply_setting' && structuredAction.settingKey) {
            const { settingKey, subKey, value, values } = structuredAction;
            
            const payloadForUpdateApi = { settingKey, subKey, value, values };
            
            console.log("Chatbot: Attempting to POST to /api/update-setting with payload:", payloadForUpdateApi);
            const updateSettingResponse = await fetch('/api/update-setting', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payloadForUpdateApi),
            });

            if (!updateSettingResponse.ok) {
              const updateErrorData = await updateSettingResponse.json();
              conversationalText = `I tried to update the setting, but the server responded with an error: ${updateErrorData.message || 'Unknown error'}`;
              console.error("Error from /api/update-setting:", updateErrorData);
            } else {
              const newSettings = JSON.parse(JSON.stringify(currentGlobalSettings));
              if (values && typeof values === 'object') {
                if (!newSettings[settingKey]) newSettings[settingKey] = {};
                Object.keys(values).forEach(sKey => { newSettings[settingKey][sKey] = values[sKey]; });
              } else if (value !== undefined) {
                if (subKey) {
                  if (!newSettings[settingKey]) newSettings[settingKey] = {};
                  newSettings[settingKey][subKey] = value;
                } else {
                  newSettings[settingKey] = value;
                }
              }
              onSettingsSave(newSettings);
              console.log(`Chatbot successfully triggered setting update for: ${settingKey}`);
            }
          }
        } catch (e) {
          console.error("Chatbot: Failed to parse or process the extracted JSON.", e);
          conversationalText = "I tried to process that, but the data format was incorrect.";
        }
      }
      // --- END OF FIX ---

      const botMessage = { id: Date.now() + 1, text: conversationalText, sender: 'bot' };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error("Error in sendMessage:", error);
      const errorMessageText = error.message || "Sorry, an error occurred.";
      const errorMessage = { id: Date.now() + 1, text: errorMessageText, sender: 'bot' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

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

  return (
    <div
      ref={panelRef}
      className={`${panelBaseClasses} ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
    >
      <div className="p-3 border-b border-white/10 flex justify-between items-center">
        <h3 className="text-md font-semibold text-white">AI Settings Assistant</h3>
        <button onClick={onClose} className="text-gray-300 hover:text-white">&times;</button>
      </div>

      <div className="flex-grow p-3 space-y-3 overflow-y-auto">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] p-2.5 rounded-xl text-sm ${msg.sender === 'user' ? 'bg-black text-white rounded-br-none' : 'bg-black text-white rounded-bl-none'}`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

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
      </div>
    </div>
  );
};

export default ChatPanel;
