import axios from "axios";
import { aiService } from "../main";

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggestions?: AiSuggestion[];
  suggestedNextSteps?: string[];
}

export interface AiSuggestion {
  itemName: string;
  restaurantName: string;
  price: number;
  description: string;
  reason: string;
}

export interface AiSuggestionResponse {
  message: string;
  suggestions?: AiSuggestion[];
}

export interface AiHelpResponse {
  message: string;
  suggestedNextSteps?: string[];
}

const authorizationHeader = {
  Authorization: `Bearer ${localStorage.getItem("token")}`,
};

export const getAiSuggestion = async (
  query: string,
  conversationHistory?: AiMessage[]
): Promise<AiSuggestionResponse> => {
  try {
    const { data } = await axios.post(
      `${aiService}/api/ai/suggest`,
      {
        query,
        conversationHistory: conversationHistory || [],
      },
      {
        headers: authorizationHeader,
      }
    );
    return data;
  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
};

export const getOrderAssistance = async (
  query: string,
  conversationHistory?: AiMessage[]
): Promise<AiHelpResponse> => {
  try {
    const { data } = await axios.post(
      `${aiService}/api/ai/help-order`,
      {
        query,
        conversationHistory: conversationHistory || [],
      },
      {
        headers: authorizationHeader,
      }
    );
    return data;
  } catch (error) {
    console.error("AI Order Assistance Error:", error);
    throw error;
  }
};
