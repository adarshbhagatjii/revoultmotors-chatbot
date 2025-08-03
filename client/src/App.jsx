import { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import ChatTranscript from './components/ChatTranscript';
import Controls from './components/Controls';
import LanguageSelector from './components/LanguageSelector';
import HindiInstructions from './components/HindiInstructions';
import { speakWithLanguage, isSpeechRecognitionSupported, isSpeechSynthesisSupported } from './utils/speechUtils';

function App() {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('Click microphone to start');
  const [isListening, setIsListening] = useState(false);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [speechSupported, setSpeechSupported] = useState(true);
  const websocket = useRef(null);
  const responseAudio = useRef(null);
  const transcriptRef = useRef(null);

  // Initialize speech synthesis voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };
    
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Check speech API support
  useEffect(() => {
    setSpeechSupported(
      isSpeechRecognitionSupported() && 
      isSpeechSynthesisSupported()
    );
  }, []);

  // WebSocket connection
  const initWebSocket = useCallback(() => {
   const wsUrl = `ws://localhost:3000/ws`;
    
    websocket.current = new WebSocket(wsUrl);
    
    websocket.current.onopen = () => {
      console.log('WebSocket connected');
      setStatus('Ready to chat');
      websocket.current.send(JSON.stringify({ type: 'start_chat' }));
    };
    
    websocket.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'response') {
        handleAIResponse(data.text);
      } else if (data.type === 'error') {
        setStatus(`Error: ${data.message}`);
      }
    };
    
    websocket.current.onclose = () => {
      console.log('WebSocket disconnected');
      setStatus('Connection lost. Reconnecting...');
      setTimeout(initWebSocket, 3000);
    };
    
    websocket.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('Connection error. Reconnecting...');
      websocket.current.close();
    };
  }, []);

  useEffect(() => {
    initWebSocket();
    responseAudio.current = new Audio();
    
    return () => {
      if (websocket.current) {
        websocket.current.close();
      }
    };
  }, [initWebSocket]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  const handleUserMessage = (message) => {
    if (!message.trim()) return;
    
    setMessages(prev => [...prev, { text: message, sender: 'user' }]);
    
    if (isAIResponding) {
      interruptAIResponse();
    }
    
    if (websocket.current?.readyState === WebSocket.OPEN) {
      websocket.current.send(JSON.stringify({ 
        type: 'message', 
        text: message 
      }));
    }
    
    setStatus('Processing your request...');
  };

  const handleAIResponse = async (text) => {
    setIsAIResponding(true);
    setStatus('Assistant is responding...');
    
    setMessages(prev => [...prev, { text, sender: 'ai' }]);
    
    try {
      const audioBlob = await speakWithLanguage(text, `${selectedLanguage}-IN`);
      if (!isAIResponding) return;
      
      const audioUrl = URL.createObjectURL(audioBlob);
      responseAudio.current.src = audioUrl;
      responseAudio.current.play();
      
      responseAudio.current.onended = () => {
        setIsAIResponding(false);
        setStatus('Ready for your next question');
      };
    } catch (error) {
      console.error('Speech synthesis error:', error);
      setIsAIResponding(false);
      setStatus('Error generating voice response');
      
      // Fallback to English
      if (selectedLanguage !== 'en') {
        try {
          const englishBlob = await speakWithLanguage(text, 'en-IN');
          const englishUrl = URL.createObjectURL(englishBlob);
          responseAudio.current.src = englishUrl;
          responseAudio.current.play();
        } catch (e) {
          console.error('English fallback failed:', e);
        }
      }
    }
  };

  const interruptAIResponse = () => {
    setIsAIResponding(false);
    if (responseAudio.current) {
      responseAudio.current.pause();
      responseAudio.current.currentTime = 0;
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    if (!isSpeechRecognitionSupported()) {
      setStatus('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = `${selectedLanguage}-IN`;
    
    recognition.onstart = () => {
      setIsListening(true);
      setStatus('Listening...');
    };
    
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      
      if (event.results[0].isFinal) {
        handleUserMessage(transcript);
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setStatus(`Error: ${event.error}`);
      stopListening();
    };
    
    recognition.onend = () => {
      if (isListening) {
        recognition.start();
      }
    };
    
    recognition.start();
  };

  const stopListening = () => {
    setIsListening(false);
    setStatus('Ready for your next question');
  };

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
  };

  const replayLastResponse = () => {
    const lastAiMessage = [...messages].reverse().find(m => m.sender === 'ai');
    if (lastAiMessage) {
      handleAIResponse(lastAiMessage.text);
    }
  };

  if (!speechSupported) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Browser Not Supported</h2>
          <p className="mb-4">
            Your browser doesn't support the required speech features. 
            Please use Chrome or Edge for the best experience.
          </p>
          <p>
            Make sure you have microphone permissions enabled and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-3xl">
        <Header />
        
        {selectedLanguage === 'hi' && !availableVoices.some(v => v.lang.includes('hi')) && (
          <HindiInstructions />
        )}
        
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <ChatTranscript messages={messages} ref={transcriptRef} />
          
          <Controls 
            isListening={isListening}
            toggleListening={toggleListening}
            status={status}
            onReplay={replayLastResponse}
          />
        </div>
        
        <LanguageSelector 
          selectedLanguage={selectedLanguage}
          onLanguageChange={handleLanguageChange}
        />
        
        <audio ref={responseAudio} hidden />
      </div>
    </div>
  );
}

export default App;