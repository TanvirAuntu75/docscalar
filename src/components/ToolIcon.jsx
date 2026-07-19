import React from 'react';
import { FileText, Wrench } from 'lucide-react';
import { toolIconsMap, getToolThemeClasses } from '../utils/iconMap';

export default React.memo(function ToolIcon({ id, size = 48, className = "" }) {
  const theme = getToolThemeClasses(id);
  const IconComponent = toolIconsMap[id] || (id?.includes('pdf') ? FileText : Wrench);

  return (
    <div 
      style={{ width: size, height: size }}
      className={`rounded-xl flex items-center justify-center flex-shrink-0 select-none transition-all duration-300 ${theme.bg} ${theme.border} ${className}`}
    >
      <IconComponent 
        style={{ width: size * 0.5, height: size * 0.5 }}
        className={`transition-transform duration-300 group-hover:scale-110 ${theme.text}`} 
      />
    </div>
  );
});
