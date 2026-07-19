import { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { extractStudioCommand } from '../../utils/canvasBrain';

export default function StudioNLPBar({ toolId, onCommand }) {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Suggestions per toolId
  const suggestions = {
    'organize-pdf': [
      "Move page 1 to end",
      "Delete page 2",
      "Rotate page 3 clockwise"
    ],
    'redact-pdf': [
      "Redact all emails",
      "Redact all phone numbers",
      "Redact 'Confidential'"
    ],
    'sign-pdf': [
      "Place signature at bottom right",
      "Apply to all pages"
    ],
    'compare-pdf': [
      "Go to page 3",
      "Show only differences"
    ]
  }[toolId] || ["Explain how to use this tool"];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsThinking(true);
    setTimeout(() => {
      const delta = extractStudioCommand(toolId, input);
      onCommand(delta);
      setInput('');
      setIsThinking(false);
    }, 450);
  };

  const handleSuggestionClick = (sug) => {
    setInput(sug);
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto gap-2">
      <form onSubmit={handleSubmit} className="relative w-full">
        <div className={`relative flex items-center bg-slate-50 border rounded-full px-4 py-2.5 transition-all duration-300 ${
          isThinking 
            ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)] ring-1 ring-orange-500' 
            : 'border-orange-200/80 hover:border-orange-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary'
        }`}>
          <Sparkles className={`w-5 h-5 mr-3 transition-colors ${isThinking ? 'text-orange-500 animate-pulse' : 'text-slate-400'}`} />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isThinking ? "Processing command..." : "Type NLP command (e.g. 'move page 2 to end')..."}
            disabled={isThinking}
            className="flex-1 bg-transparent border-none text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-0"
          />
          <button
            type="submit"
            disabled={isThinking || !input.trim()}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-primary hover:bg-primary-hover text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
      <div className="flex flex-wrap gap-2 px-2">
        {suggestions.map((sug, i) => (
          <button
            key={i}
            onClick={() => handleSuggestionClick(sug)}
            className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100/80 hover:bg-orange-50 hover:text-orange-600 border border-slate-200/60 rounded-full px-3 py-1 cursor-pointer transition-colors"
          >
            {sug}
          </button>
        ))}
      </div>
    </div>
  );
}
