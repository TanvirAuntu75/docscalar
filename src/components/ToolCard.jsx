import React from 'react';
import { useNavigate } from 'react-router-dom';
import ToolIcon from './ToolIcon';

// ⚡ Bolt: Wrapped ToolCard in React.memo to prevent unnecessary re-renders when parent state (like search input) changes.
export default React.memo(function ToolCard({ tool }) {
  const navigate = useNavigate();

  return (
    <div
      className="bg-white dark:bg-[#1a1a1c] border border-[#e4e4e7] dark:border-[#2a2a2c] rounded-2xl p-6 flex flex-col gap-4 hover:border-primary/45 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent transition-all duration-200 cursor-pointer group relative overflow-hidden text-left shadow-sm dark:shadow-none tool-card"
      data-tool-card={tool.id}
      onClick={() => navigate(tool.path)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(tool.path);
        }
      }}
      id={`tool-${tool.id}`}
      aria-labelledby={`tool-${tool.id}-title`}
      aria-describedby={`tool-${tool.id}-desc`}
    >
      <div className="flex justify-between items-start z-10">
        <div className="w-14 h-14 flex items-center justify-center select-none">
          <ToolIcon id={tool.id} size={52} />
        </div>
      </div>

      <div className="z-10 mt-auto">
        <h3 id={`tool-${tool.id}-title`} className="text-[17px] font-bold text-gray-800 dark:text-gray-100 mb-1 group-hover:text-primary transition-colors">
          {tool.title}
        </h3>
        <p id={`tool-${tool.id}-desc`} className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
          {tool.description}
        </p>
      </div>
    </div>
  );
});


