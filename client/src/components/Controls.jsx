import { FaMicrophone, FaVolumeUp } from 'react-icons/fa';

const Controls = ({ isListening, toggleListening, status, onReplay }) => {
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex space-x-4">
        <button
          onClick={toggleListening}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl transition-all ${
            isListening 
              ? 'bg-red-600 animate-pulse' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
        >
          <FaMicrophone />
        </button>
        
        <button
          onClick={onReplay}
          className="w-16 h-16 rounded-full flex items-center justify-center bg-green-600 text-white text-2xl hover:bg-green-700 transition-all"
          aria-label="Replay last response"
        >
          <FaVolumeUp />
        </button>
      </div>
      
      <div className="text-sm text-gray-600">{status}</div>
    </div>
  );
};

export default Controls;