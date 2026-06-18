import { Link } from 'react-router-dom';
import { getToolById, getToolsByCategory } from '../utils/constants';
import ToolIcon from './ToolIcon';

export default function RelatedTools({ currentToolId }) {
  const currentTool = getToolById(currentToolId);
  
  if (!currentTool) return null;

  // Get tools from the same category, excluding the current one
  let relatedTools = getToolsByCategory(currentTool.category)
    .filter(t => t.id !== currentToolId && t.implemented)
    .slice(0, 3); // Take up to 3

  // If there are less than 3, we could potentially fetch from other categories,
  // but keeping it simple for now and just showing whatever is in the same category.

  if (relatedTools.length === 0) return null;

  return (
    <div className="related-tools mt-16 pt-10 border-t border-outline-variant/30 w-full animate-in fade-in duration-500">
      <h3 className="font-h3 text-[20px] font-bold text-on-background mb-6 text-center">
        You might also need
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {relatedTools.map(tool => (
          <Link
            key={tool.id}
            to={tool.path}
            className="flex flex-col items-center text-center p-6 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/30 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 group"
          >
            <div className="w-12 h-12 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
              <ToolIcon id={tool.id} size={40} />
            </div>
            <h4 className="font-bold text-on-background text-[15px] mb-2 group-hover:text-primary transition-colors">
              {tool.title}
            </h4>
            <p className="text-[13px] text-on-surface-variant leading-relaxed">
              {tool.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
