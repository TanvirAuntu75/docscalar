import { Link } from 'react-router-dom';
import { getToolById, CATEGORIES } from '../utils/constants';

export default function Breadcrumb({ toolId }) {
  const tool = getToolById(toolId);
  
  if (!tool) return null;

  const category = CATEGORIES.find(c => c.id === tool.category);
  const categoryTitle = category ? category.title : 'Tools';
  
  return (
    <div className="breadcrumb flex items-center gap-2 text-[13px] text-on-surface-variant/80 mb-6 select-none w-full animate-in fade-in slide-in-from-top-2 duration-300">
      <Link to="/" className="breadcrumb-item hover:text-primary transition-colors flex items-center gap-1 font-medium">
        <span className="material-symbols-outlined text-[16px]">home</span>
        Home
      </Link>
      <span className="material-symbols-outlined text-[14px] opacity-40">chevron_right</span>
      <span className="breadcrumb-item font-medium cursor-default">
        {categoryTitle}
      </span>
      <span className="material-symbols-outlined text-[14px] opacity-40">chevron_right</span>
      <span className="breadcrumb-item font-semibold text-primary">
        {tool.title}
      </span>
    </div>
  );
}
