const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.currentChat = null;
  }

  async startChat(systemInstruction) {
    const model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash-latest",
      systemInstruction: systemInstruction
    });
    
    this.currentChat = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 500,
      },
    });
    
    return this.currentChat;
  }

  async sendMessage(message) {
    if (!this.currentChat) {
      throw new Error('Chat session not started');
    }

    const result = await this.currentChat.sendMessage(message);
    const response = await result.response;
    return response.text();
  }
}

module.exports = GeminiService;