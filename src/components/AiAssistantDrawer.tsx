import { useState, useEffect, useRef } from "react";
import { FiX, FiSend } from "react-icons/fi";
import { BiLoader } from "react-icons/bi";
import {
  getAiSuggestion,
  getOrderAssistance,
  type AiMessage,
} from "../utils/aiService";
import toast from "react-hot-toast";

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const AiAssistantDrawer = ({ isOpen, onClose }: AiAssistantDrawerProps) => {
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hey! 👋 I'm your AI Food Assistant. I can help you discover dishes, recommend restaurants, or guide you through your order.",
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    const userMessage: AiMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const lowerQuery = input.toLowerCase();
      const isSuggestionQuery =
        lowerQuery.includes("suggest") ||
        lowerQuery.includes("recommend") ||
        lowerQuery.includes("what should") ||
        lowerQuery.includes("what do you") ||
        lowerQuery.includes("hungry") ||
        lowerQuery.includes("mood");

      const conversationHistory = [...messages, userMessage];

      let response;
      if (isSuggestionQuery) {
        response = await getAiSuggestion(input, conversationHistory);
      } else {
        response = await getOrderAssistance(input, conversationHistory);
      }

      const assistantMessage: AiMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.message,
        suggestions: (response as any).suggestions,
        suggestedNextSteps: (response as any).suggestedNextSteps,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to get AI response. Please try again.");
      const errorMessage: AiMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Sorry, I encountered an error. Could you please try again or rephrase your question?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col rounded-l-2xl">
        <div className="border-b bg-gradient-to-r from-[#373ae2] to-[#5b5cff] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">AI Food Assistant</h2>
            <p className="text-sm opacity-90">Your personal food guide for tasty orders.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            aria-label="Close"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs px-4 py-3 rounded-lg ${
                  message.role === "user"
                    ? "bg-[#373ae2] text-white rounded-br-none"
                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>

                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-3 space-y-3 text-left">
                    <p className="text-sm font-semibold text-gray-700">Suggestions:</p>
                    <div className="space-y-2">
                      {message.suggestions.map((suggestion) => (
                        <div
                          key={`${suggestion.itemName}-${suggestion.restaurantName}`}
                          className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                        >
                          <p className="text-sm font-semibold text-gray-900">{suggestion.itemName}</p>
                          <p className="text-xs text-gray-500">{suggestion.restaurantName} • ${suggestion.price.toFixed(2)}</p>
                          <p className="text-xs text-gray-600 mt-1">{suggestion.description}</p>
                          <p className="text-xs text-gray-500 mt-1">Reason: {suggestion.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {message.suggestedNextSteps && message.suggestedNextSteps.length > 0 && (
                  <div className="mt-3 text-left">
                    <p className="text-sm font-semibold text-gray-700">Next steps:</p>
                    <ul className="mt-2 list-disc list-inside text-xs text-gray-600">
                      {message.suggestedNextSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p
                  className={`text-xs mt-2 ${
                    message.role === "user" ? "text-blue-100" : "text-gray-500"
                  }`}
                >
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 px-4 py-3 rounded-lg rounded-bl-none">
                <div className="flex items-center gap-2">
                  <BiLoader className="animate-spin text-[#373ae2]" />
                  <p className="text-sm text-gray-600">Thinking...</p>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSendMessage}
          className="border-t bg-white px-4 py-4 flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about food..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#373ae2] focus:border-transparent text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2 bg-[#373ae2] text-white rounded-lg hover:bg-[#2928c0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <FiSend size={20} />
          </button>
        </form>
      </div>
    </>
  );
};

export default AiAssistantDrawer;
