import { forwardRef } from 'react';

const ChatTranscript = forwardRef(({ messages }, ref) => {
  return (
    <div 
      ref={ref}
      className="min-h-48 max-h-64 overflow-y-auto p-4 border border-gray-200 rounded-lg bg-gray-50 mb-6"
    >
      {messages.map((message, index) => (
        <div 
          key={index} 
          className={`mb-3 px-4 py-2 rounded-2xl max-w-[80%] ${
            message.sender === 'user' 
              ? 'ml-auto bg-blue-600 text-white rounded-br-none' 
              : 'mr-auto bg-gray-200 text-gray-800 rounded-bl-none'
          }`}
        >
          {message.text}
        </div>
      ))}
    </div>
  );
});

ChatTranscript.displayName = 'ChatTranscript';

export default ChatTranscript;