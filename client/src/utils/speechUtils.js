/**
 * Speech Utilities for Revolt Motors Voice Assistant
 * Handles speech recognition, synthesis, and language management
 */

// Speech Recognition Support
export const isSpeechRecognitionSupported = () => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

// Speech Synthesis Support
export const isSpeechSynthesisSupported = () => {
  return 'speechSynthesis' in window;
};

/**
 * Get the best available voice for a specific language
 * @param {string} langCode - Language code (e.g., 'hi-IN')
 * @returns {SpeechSynthesisVoice|null}
 */
export const getBestVoiceForLanguage = (langCode) => {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  
  // Try exact match first (e.g., 'hi-IN')
  const exactMatch = voices.find(v => v.lang === langCode);
  if (exactMatch) return exactMatch;
  
  // Try language prefix match (e.g., 'hi')
  const langPrefix = langCode.split('-')[0];
  const prefixMatch = voices.find(v => v.lang.startsWith(langPrefix));
  if (prefixMatch) return prefixMatch;
  
  // Try any voice containing language code
  const containsMatch = voices.find(v => v.lang.includes(langPrefix));
  if (containsMatch) return containsMatch;
  
  // Fallback to default voice or first available
  return voices.find(v => v.default) || voices[0];
};

/**
 * Convert text to speech in specified language
 * @param {string} text - Text to convert to speech
 * @param {string} langCode - Language code (e.g., 'hi-IN')
 * @returns {Promise<Blob>} Audio blob
 */
export const speakWithLanguage = (text, langCode) => {
  return new Promise((resolve, reject) => {
    if (!isSpeechSynthesisSupported()) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    const handleVoicesLoaded = () => {
      const voice = getBestVoiceForLanguage(langCode);
      if (!voice) {
        reject(new Error(`No voice available for ${langCode}`));
        return;
      }
      synthesizeWithVoice(text, voice, resolve, reject);
    };

    // Check if voices are already loaded
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      handleVoicesLoaded();
    } else {
      // Wait for voices to load
      window.speechSynthesis.onvoiceschanged = handleVoicesLoaded;
      window.speechSynthesis.getVoices(); // Triggers loading
    }
  });
};

/**
 * Internal function to handle speech synthesis with audio capture
 */
const synthesizeWithVoice = (text, voice, resolve, reject) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.9;  // Slightly slower for clarity
  utterance.pitch = 1.0; // Normal pitch

  if (!window.MediaRecorder) {
    reject(new Error('Audio capture not supported'));
    return;
  }

  const audioChunks = [];
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const destination = audioContext.createMediaStreamDestination();
  const mediaRecorder = new MediaRecorder(destination.stream);

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.onstop = () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    resolve(audioBlob);
  };

  utterance.onend = () => mediaRecorder.stop();
  utterance.onerror = (event) => reject(new Error(`Speech error: ${event.error}`));

  mediaRecorder.start();
  speechSynthesis.speak(utterance);
};

/**
 * Get list of supported Indian languages with available voices
 * @returns {Array<{code: string, name: string}>}
 */
export const getSupportedIndianLanguages = () => {
  const indianLanguages = [
    { code: 'hi-IN', name: 'Hindi' },
    { code: 'en-IN', name: 'English' },
    { code: 'mr-IN', name: 'Marathi' },
    { code: 'ta-IN', name: 'Tamil' },
    { code: 'te-IN', name: 'Telugu' },
    { code: 'kn-IN', name: 'Kannada' },
    { code: 'bn-IN', name: 'Bengali' },
    { code: 'gu-IN', name: 'Gujarati' },
    { code: 'pa-IN', name: 'Punjabi' },
    { code: 'ml-IN', name: 'Malayalam' }
  ];

  const voices = window.speechSynthesis.getVoices();
  return indianLanguages.filter(lang => {
    const langPrefix = lang.code.split('-')[0];
    return voices.some(voice => voice.lang.includes(langPrefix));
  });
};

/**
 * Play audio blob
 * @param {Blob} audioBlob - Audio blob to play
 * @returns {Promise<void>}
 */
export const playAudio = (audioBlob) => {
  return new Promise((resolve) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };
    
    audio.play().catch(error => {
      console.error('Playback failed:', error);
      resolve();
    });
  });
};

/**
 * Initialize speech recognition
 * @param {string} language - Language code (e.g., 'hi-IN')
 * @param {function} onResult - Callback for recognition results
 * @param {function} onError - Callback for errors
 * @returns {object} Speech recognition instance
 */
export const initSpeechRecognition = (language, onResult, onError) => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = language;

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0])
      .map(result => result.transcript)
      .join('');

    if (event.results[0].isFinal) {
      onResult(transcript);
    }
  };

  recognition.onerror = (event) => {
    onError(event.error);
  };

  return recognition;
};