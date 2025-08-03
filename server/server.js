require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const WebSocket = require('ws');

const app = express();
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST']
}));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY in .env file');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// System instruction for Revolt Motors
const SYSTEM_INSTRUCTION = `
You are the official voice assistant for Revolt Motors, an Indian electric vehicle manufacturer. 
Your role is to assist customers with information about Revolt Motors products, services, dealerships, 
and electric vehicles in general. 

Key points to remember:
- Only answer questions related to Revolt Motors and electric vehicles
- For unrelated questions, politely decline to answer and guide back to Revolt topics
- Keep responses concise and conversational
- Provide accurate technical specifications when asked
- Mention dealership locations and contact info when relevant
- Current models: RV400, RV300
- Battery options, range, charging times are important details
- Pricing starts at ₹1.03 lakh (ex-showroom)

Always respond in the same language as the user's question.
`;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// WebSocket server
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  let chat = null;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'start_chat') {
        const model = genAI.getGenerativeModel({ 
          model: "gemini-1.5-flash-latest",
          systemInstruction: SYSTEM_INSTRUCTION
        });
        
        chat = model.startChat({
          history: [],
          generationConfig: {
            maxOutputTokens: 500,
          },
        });
        
        ws.send(JSON.stringify({ type: 'chat_started' }));
      }
      
      if (data.type === 'message' && chat) {
        const result = await chat.sendMessage(data.text);
        const response = await result.response;
        const text = response.text();
        
        ws.send(JSON.stringify({ 
          type: 'response', 
          text: text,
          isFinal: true
        }));
      }
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Error processing request'
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});