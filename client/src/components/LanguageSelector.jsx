import { useEffect, useState } from 'react';
import { getSupportedIndianLanguages } from '../utils/speechUtils';

const LanguageSelector = ({ selectedLanguage, onLanguageChange }) => {
  const [languages, setLanguages] = useState([]);

  useEffect(() => {
    const loadLanguages = async () => {
      const supportedLangs = getSupportedIndianLanguages();
      setLanguages(supportedLangs);
      
      if (!supportedLangs.some(lang => lang.code.startsWith(selectedLanguage))) {
        onLanguageChange(supportedLangs[0]?.code.split('-')[0] || 'en');
      }
    };
    
    loadLanguages();
  }, [selectedLanguage, onLanguageChange]);

  return (
    <div className="text-center">
      <label htmlFor="language" className="mr-2 text-gray-700">Language:</label>
      <select
        id="language"
        value={selectedLanguage}
        onChange={(e) => onLanguageChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code.split('-')[0]}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;