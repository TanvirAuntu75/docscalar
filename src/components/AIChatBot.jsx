import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, ArrowRight, CornerDownLeft, Compass, RotateCcw, FileText, Layers, ShieldCheck, Zap } from 'lucide-react';
import { embedQueryText, isClassifierWorkerReady } from '../utils/classifier';
import { performHybridSearch } from '../utils/hybridSearch';
import { TOOLS, CATEGORIES } from '../utils/constants';

export default function AIChatBot() {
  const location = useLocation();
  const navigate = useNavigate();
  const isCanvas = location.pathname === '/canvas' || location.pathname === '/workspace';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'bot',
      text: 'Hi there! I am your **DocForge Copilot**. Ask me anything about our 44+ PDF & document tools, Studio Canvas DAG workflows, or 100% client-side privacy. Everything runs entirely in your browser.',
      time: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState(null);
  const [isLoadingKB, setIsLoadingKB] = useState(false);
  const [lastActiveContext, setLastActiveContext] = useState(null); // Multi-turn memory
  const [dockSide, setDockSide] = useState(() => {
    try {
      return localStorage.getItem('docforge_ai_dock_side') || 'bottom-right';
    } catch {
      return 'bottom-right';
    }
  });
  const [isDraggingBtn, setIsDraggingBtn] = useState(false);
  const dragStartTimeRef = useRef(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatWindowRef = useRef(null);

  // Dynamic context-aware quick action starter chips based on active URL route
  const contextualChips = useMemo(() => {
    const p = location.pathname;
    if (p.includes('merge')) {
      return ['How do I reorder files?', 'Can I merge multiple formats?', 'Incremental merge speed'];
    }
    if (p.includes('compress')) {
      return ['Lossless vs Lossy mode?', 'How much size reduction?', 'Batch compression limits'];
    }
    if (p.includes('canvas') || p.includes('workspace')) {
      return ['How to connect cables?', 'What are Workflow Recipes?', 'Condition Router rules', 'Share flow via URL'];
    }
    if (p.includes('resume')) {
      return ['Which template for devs?', 'ATS optimization tips', 'Export print A4 PDF'];
    }
    if (p.includes('redact')) {
      return ['How does Auto PII work?', 'Luhn Credit Card scanner', 'Sanitize PDF metadata'];
    }
    if (p.includes('ocr')) {
      return ['How does OCR work?', 'Supported languages?', 'What is Un-OCR flattening?'];
    }
    if (p.includes('protect') || p.includes('unlock')) {
      return ['4-layer auto-bypass unlock', 'X.509 digital certificates', 'Supported encryptions'];
    }
    if (p.includes('compare')) {
      return ['Pixel heatmap vs text diff', 'Swipe divider mode', 'Export diff report'];
    }
    return ['100% Local Privacy guarantee', 'What are the file size limits?', 'How to use Stitch Canvas', 'Show all 44 tools'];
  }, [location.pathname]);

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 100);
      loadKnowledgeBase();
    }
  }, [isOpen, messages, isThinking]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close on clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && chatWindowRef.current && !chatWindowRef.current.contains(e.target)) {
        const toggleBtn = document.getElementById('ai-chat-toggle-btn');
        if (toggleBtn && !toggleBtn.contains(e.target)) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const loadKnowledgeBase = async () => {
    if (knowledgeBase || isLoadingKB) return;
    try {
      setIsLoadingKB(true);
      const res = await fetch('/models/website_knowledge.json');
      if (res.ok) {
        const data = await res.json();
        setKnowledgeBase(data);
      }
    } catch (err) {
      console.error('[AIChatBot] Error loading website_knowledge.json:', err);
    } finally {
      setIsLoadingKB(false);
    }
  };

  // Helper to parse basic markdown bold formatting safely in React
  const parseMarkdown = (text) => {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-[var(--text-primary)]">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <strong key={index} className="font-semibold text-[var(--color-primary)]">{part.slice(1, -1)}</strong>;
      }
      return part;
    });
  };

  const handleSendMessage = async (textToSend = null) => {
    const rawText = (typeof textToSend === 'string' ? textToSend : input).trim();
    if (!rawText || isThinking) return;

    setInput('');
    const userMsgId = `user-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        type: 'user',
        text: rawText,
        time: new Date()
      }
    ]);

    setIsThinking(true);
    const startThinkingTime = Date.now();
    const cleanLower = rawText.toLowerCase().trim();

    // 1. Direct Greetings / Self-Intro matching
    if (
      cleanLower === 'hi' || cleanLower === 'hello' || cleanLower === 'hey' || cleanLower === 'yo' || cleanLower === 'greetings' ||
      cleanLower.includes('who are you') || cleanLower.includes('what is your name') || cleanLower.includes('what are you') ||
      cleanLower.includes('what is docforge') || cleanLower.includes('what is this site') || cleanLower.includes('what can you do')
    ) {
      await new Promise(r => setTimeout(r, 250));
      let replyText = "Hello! I am **DocForge's On-Device AI Copilot**. How can I help you streamline your document workflows today?";
      if (cleanLower.includes('who are you') || cleanLower.includes('what is your name') || cleanLower.includes('what are you')) {
        replyText = "I am DocForge's built-in **100% Client-Side AI Copilot**. I possess complete technical knowledge of all 44+ tools, canvas DAG pipelines, privacy architecture, and document operations.";
      } else if (cleanLower.includes('what is docforge') || cleanLower.includes('what is this site')) {
        replyText = "DocForge is a privacy-first, 100% local-compute document operating system. All PDF transformations, conversions, OCR, and visual DAG pipelines execute directly in your browser using WebAssembly and Web Workers—zero cloud uploads.";
      }
      setMessages(prev => [
        ...prev,
        { id: `bot-hello-${Date.now()}`, type: 'bot', text: replyText, time: new Date() }
      ]);
      setIsThinking(false);
      return;
    }

    // 2. All 44 Tools Catalog Query Check
    const isAllToolsQuery = /\b(all (44|40\+|45\+|the)?\s*tools|what tools|list tools|all features|show all tools|every tool|tell me about (all|the) tools|overview of tools|all available tools)\b/i.test(cleanLower);

    if (isAllToolsQuery) {
      await new Promise(r => setTimeout(r, 200));
      const catalogReply = "DocForge includes **44 document tools and visual studios** designed for 100% private, client-side processing:\n\n" +
        "• **Organize & Structure**: Merge PDF, Split PDF, Remove Pages, Extract Pages, Organize Pages, Scan to PDF.\n" +
        "• **Convert & Transform**: Word/Docx to PDF, Excel to PDF, PowerPoint to PDF, HTML to PDF, Image to PDF, Text to PDF, PDF to Word, PDF to Excel, PDF to PowerPoint, PDF to Image, PDF to PDF/A.\n" +
        "• **Optimize & Quality**: Compress PDF (Lossless & Lossy), Repair PDF, OCR Text Recognition, Un-OCR Page Flattening.\n" +
        "• **Edit & Annotate**: Edit PDF, Fill Forms (AcroForms), Crop PDF, Rotate PDF, Add Page Numbers, Add Watermark, Bates Numbering.\n" +
        "• **Security & Compliance**: Sign PDF (Vector & X.509 Digital), Protect PDF (256-bit AES), Unlock PDF, Redact PDF (PII & Metadata Sanitizer).\n" +
        "• **Advanced Studios & Utilities**: Stitch Canvas (Visual DAG Pipeline Builder), Compare PDF (4 Diff Modes), AI Summarizer, AI Translator, Resume Builder (17 ATS Templates), Image Tools (Converter, Compressor, Resizer), QR Code Generator, and Unzip Archive.\n\n" +
        "Which specific tool or workflow would you like to know more about?";

      setMessages(prev => [
        ...prev,
        {
          id: `bot-catalog-${Date.now()}`,
          type: 'bot',
          text: catalogReply,
          time: new Date()
        }
      ]);
      setIsThinking(false);
      return;
    }

    // 3. Direct Navigation check for "take me to...", "go to...", "open...", or direct tool names
    const navPrefixRegex = /^(take me to( the)?|go to( the)?|open( the)?|navigate to( the)?|bring me to( the)?|switch to( the)?|show me( the)?|launch( the)?|redirect to( the)?)\s+/i;
    const strippedNav = cleanLower.replace(navPrefixRegex, '').trim();

    // Check general pages
    if (strippedNav === 'pricing' || strippedNav === 'plans') {
      await new Promise(r => setTimeout(r, 200));
      navigate('/pricing');
      setMessages(prev => [
        ...prev,
        { id: `bot-nav-${Date.now()}`, type: 'bot', text: 'Taking you to the **Pricing & Plans** page.', action: { type: 'tool', id: 'pricing', title: 'Pricing & Plans', path: '/pricing' }, time: new Date() }
      ]);
      setIsThinking(false);
      return;
    }
    if (strippedNav === 'workspace' || strippedNav === 'canvas' || strippedNav === 'studio') {
      await new Promise(r => setTimeout(r, 200));
      navigate('/workspace');
      setMessages(prev => [
        ...prev,
        { id: `bot-nav-${Date.now()}`, type: 'bot', text: 'Opening the visual **Stitch Canvas Workspace**.', action: { type: 'tool', id: 'canvas', title: 'Canvas Workspace', path: '/workspace' }, time: new Date() }
      ]);
      setIsThinking(false);
      return;
    }

    // Check tool matches
    const matchedTool = TOOLS.find(t => {
      const titleClean = t.title.toLowerCase();
      const idClean = t.id.toLowerCase();
      
      if (cleanLower === titleClean || cleanLower === idClean || strippedNav === titleClean || strippedNav === idClean) return true;
      
      // Alias shortcuts
      if (strippedNav === 'document view' || strippedNav === 'document viewer' || strippedNav === 'doc view' || strippedNav === 'pdf viewer' || strippedNav === 'viewer') {
        return t.id === 'document-viewer';
      }
      if (strippedNav === 'resume' || strippedNav === 'cv' || strippedNav === 'resume builder' || strippedNav === 'cv builder') {
        return t.id === 'resume-builder';
      }
      if (strippedNav === 'ai summarizer' || strippedNav === 'summarizer' || strippedNav === 'summary') {
        return t.id === 'ai-summarizer';
      }

      if (strippedNav.length >= 3 && (titleClean.startsWith(strippedNav) || idClean.startsWith(strippedNav))) return true;
      return false;
    });

    if (matchedTool && (navPrefixRegex.test(cleanLower) || cleanLower.split(' ').length <= 2)) {
      await new Promise(r => setTimeout(r, 200));
      navigate(matchedTool.path);
      setLastActiveContext(matchedTool.id);
      setMessages(prev => [
        ...prev,
        {
          id: `bot-nav-${Date.now()}`,
          type: 'bot',
          text: `Taking you directly to the **${matchedTool.title}** workspace.`,
          action: { type: 'tool', id: matchedTool.id, title: matchedTool.title, path: matchedTool.path },
          time: new Date()
        }
      ]);
      setIsThinking(false);
      return;
    }

    try {
      // 4. Negation & Reversal Intent Check
      const hasNegation = /\b(not|no|don't|dont|never|stop|prevent|avoid|without)\b/i.test(cleanLower);

      // 5. Ambiguity / Category Disambiguation Pre-Check
      if (cleanLower.includes('change page') || cleanLower.includes('modify page') || cleanLower.includes('page tools') || cleanLower === 'pages' || cleanLower === 'edit pages') {
        setMessages(prev => [
          ...prev,
          {
            id: `bot-disambig-${Date.now()}`,
            type: 'bot',
            text: "DocForge provides several ways to manipulate document pages. Choose the specific action you'd like to perform:",
            action: {
              chips: [
                { title: 'Rotate Pages', path: '/rotate-pdf', icon: '🔄' },
                { title: 'Reorder in Grid', path: '/organize-pdf', icon: '🗂️' },
                { title: 'Crop Margins', path: '/crop-pdf', icon: '✂️' },
                { title: 'Delete Blank Pages', path: '/remove-pages', icon: '🗑️' },
                { title: 'Extract Page Range', path: '/extract-pages', icon: '📑' }
              ]
            },
            time: new Date()
          }
        ]);
        setIsThinking(false);
        return;
      }

      // 6. Multi-Tool Workflow / Pipeline Intent Check
      const pipelineKeywords = (cleanLower.match(/\b(merge|compress|ocr|convert|word|excel|sign|redact|split|watermark|lock|protect)\b/g) || []);
      const isSequential = /\b(and then|then|after that|and also|pipeline|workflow|combine and|merge and|convert and|redact and)\b/i.test(cleanLower);
      
      if (isSequential && pipelineKeywords.length >= 2) {
        setMessages(prev => [
          ...prev,
          {
            id: `bot-pipeline-${Date.now()}`,
            type: 'bot',
            text: `You can chain **${pipelineKeywords.map(k => k.toUpperCase()).join(' ➔ ')}** together into a single automated pipeline on the **Stitch Canvas**. Connect operators with interactive cables for zero-upload local execution.`,
            action: {
              type: 'canvas',
              path: '/workspace',
              title: 'Build Workflow on Stitch Canvas',
              category: 'Pipeline'
            },
            time: new Date()
          }
        ]);
        setIsThinking(false);
        return;
      }

      // 7. Multi-turn context resolution
      let enrichedQuery = rawText;
      if (lastActiveContext && (cleanLower.startsWith('how') || cleanLower.startsWith('is it') || cleanLower.startsWith('what are') || cleanLower.includes('this tool') || cleanLower.includes('formats') || cleanLower.includes('limit'))) {
        enrichedQuery = `${lastActiveContext} ${rawText}`;
      }

      // 8. Client-Side Hybrid Search (BM25 + 384-dim MiniLM Vector RRF)
      let queryVector = null;
      try {
        queryVector = await embedQueryText(enrichedQuery);
      } catch {
        // Fallback gracefully to BM25 if worker is warming up
      }

      // Ensure KB is loaded
      let kb = knowledgeBase;
      if (!kb) {
        const res = await fetch('/models/website_knowledge.json');
        if (res.ok) {
          kb = await res.json();
          setKnowledgeBase(kb);
        }
      }

      const results = performHybridSearch({
        query: enrichedQuery,
        queryVector,
        knowledgeBase: kb || [],
        topK: 3,
        currentPath: location.pathname
      });

      let replyText = '';
      let actionData = null;

      if (results && results.length > 0 && results[0].rrfScore > 0.015) {
        const topMatch = results[0].item;
        replyText = topMatch.text;

        // Clean out raw metadata leaks
        replyText = replyText.replace(/\n?(Keywords|Aliases & Keywords):\s*.*$/gim, '').trim();

        // If query has negative intent or is purely informational, don't blindly launch destructive tools
        const isInformational = /\b(what is|how does|why|tell me about|explain|describe|can i|is it|what are)\b/i.test(cleanLower);

        if (!hasNegation && !isInformational) {
          if (topMatch.source === 'Tool' && topMatch.metadata?.id) {
            const toolObj = TOOLS.find(t => t.id === topMatch.metadata.id);
            if (toolObj) {
              setLastActiveContext(toolObj.id);
              actionData = {
                type: 'tool',
                id: toolObj.id,
                title: toolObj.title,
                path: toolObj.path,
                category: topMatch.metadata.category || 'Tool',
                tier: toolObj.minTier || 'guest'
              };
            }
          } else if (topMatch.source === 'Resume Template' && topMatch.metadata?.templateName) {
            actionData = {
              type: 'resume',
              templateName: topMatch.metadata.templateName,
              role: topMatch.metadata.role,
              path: '/resume-builder'
            };
          }
        }
      } else {
        // Out-of-Domain Safety Filter
        replyText = "I specialize in DocForge's client-side document processing, PDF transformations, and visual workflow tools. What task can I assist you with?";
        actionData = {
          chips: [
            { title: 'Merge PDFs', path: '/merge-pdf', icon: '📑' },
            { title: 'Compress PDF', path: '/compress-pdf', icon: '⚡' },
            { title: 'OCR Searchable PDF', path: '/ocr-pdf', icon: '🔍' },
            { title: 'Resume Builder', path: '/resume-builder', icon: '📄' },
            { title: 'Stitch Canvas', path: '/workspace', icon: '🎨' }
          ]
        };
      }

      // Smooth typing indicator pacing
      const elapsed = Date.now() - startThinkingTime;
      const minDuration = 350;
      if (elapsed < minDuration) {
        await new Promise(r => setTimeout(r, minDuration - elapsed));
      }

      setMessages(prev => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          type: 'bot',
          text: replyText,
          action: actionData,
          time: new Date()
        }
      ]);
    } catch (err) {
      console.error('[AIChatBot] Error in hybrid search:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          type: 'bot',
          text: "I am ready to help! All client-side tools and canvas operations are running locally on your device.",
          time: new Date()
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleActionClick = (action) => {
    if (!action) return;
    setIsOpen(false);
    if (action.path) {
      navigate(action.path);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        type: 'bot',
        text: 'Chat history cleared. What document workflow or tool can I help you with next?',
        time: new Date()
      }
    ]);
    setLastActiveContext(null);
  };

  // Window dimensions tracking for precision responsive docking
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const buttonSize = isCanvas ? 44 : 56;
  const padding = 20;
  const topNavOffset = 58;

  // Compute docked coordinates (Strict Edge/Corner Snapping)
  const getCoordinatesForDock = (dock) => {
    const maxX = Math.max(padding, windowSize.width - buttonSize - padding);
    const maxY = Math.max(topNavOffset, windowSize.height - buttonSize - padding);
    const midY = Math.max(topNavOffset, (windowSize.height - buttonSize) / 2);

    switch (dock) {
      case 'top-left':
        return { x: padding, y: topNavOffset };
      case 'top-right':
        return { x: maxX, y: topNavOffset };
      case 'left-middle':
        return { x: padding, y: midY };
      case 'right-middle':
        return { x: maxX, y: midY };
      case 'bottom-left':
        return { x: padding, y: maxY };
      case 'bottom-right':
      default:
        return { x: maxX, y: maxY };
    }
  };

  const handleDragStart = () => {
    setIsDraggingBtn(true);
    dragStartTimeRef.current = Date.now();
  };

  const handleDragEnd = (event, info) => {
    setIsDraggingBtn(false);
    const dropX = info.point.x;
    const dropY = info.point.y;
    const isLeft = dropX < windowSize.width / 2;

    // Detect Top / Middle / Bottom sector
    let vPos = 'bottom';
    if (dropY < windowSize.height * 0.35) {
      vPos = 'top';
    } else if (dropY > windowSize.height * 0.65) {
      vPos = 'bottom';
    } else {
      vPos = 'middle';
    }

    let nextDock = 'bottom-right';
    if (isLeft) {
      if (vPos === 'top') nextDock = 'top-left';
      else if (vPos === 'middle') nextDock = 'left-middle';
      else nextDock = 'bottom-left';
    } else {
      if (vPos === 'top') nextDock = 'top-right';
      else if (vPos === 'middle') nextDock = 'right-middle';
      else nextDock = 'bottom-right';
    }

    setDockSide(nextDock);
    try {
      localStorage.setItem('docforge_ai_dock_side', nextDock);
    } catch (e) {}
  };

  // Compute chat panel coordinates relative to docked position
  const getChatWindowStyle = () => {
    const panelWidth = Math.min(380, windowSize.width - 32);
    const panelHeight = Math.min(540, windowSize.height - 100);
    const isLeft = dockSide.includes('left');
    const isTop = dockSide.includes('top');
    const isMiddle = dockSide.includes('middle');

    let targetLeft = isLeft ? padding : windowSize.width - panelWidth - padding;
    let targetTop = isTop 
      ? topNavOffset + buttonSize + 12 
      : isMiddle 
        ? Math.max(topNavOffset, (windowSize.height - panelHeight) / 2)
        : Math.max(topNavOffset, windowSize.height - panelHeight - buttonSize - 16);

    return {
      position: 'fixed',
      left: `${targetLeft}px`,
      top: `${targetTop}px`,
      width: `${panelWidth}px`,
      height: `${panelHeight}px`,
      background: 'var(--bg-glass-strong, rgba(15, 23, 42, 0.96))',
      border: '1px solid var(--border-medium, rgba(255, 255, 255, 0.12))',
      backdropFilter: 'blur(24px)',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45)',
      zIndex: 9998
    };
  };

  return (
    <>
      {/* FLOATING ACTION TOGGLE BUTTON - DRAGGABLE & SNAPS STRICTLY TO SIDES */}
      <motion.button
        id="ai-chat-toggle-btn"
        drag
        dragConstraints={{
          left: padding,
          right: Math.max(padding, windowSize.width - buttonSize - padding),
          top: topNavOffset,
          bottom: Math.max(topNavOffset, windowSize.height - buttonSize - padding)
        }}
        dragMomentum={false}
        dragElastic={0.1}
        animate={getCoordinatesForDock(dockSide)}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className="fixed top-0 left-0 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-xl z-[9999] hover:scale-105 active:scale-95 select-none"
        style={{
          width: `${buttonSize}px`,
          height: `${buttonSize}px`,
          background: 'var(--gradient-primary, linear-gradient(135deg, var(--color-primary), var(--color-secondary)))',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: isDraggingBtn ? '0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 3px var(--color-primary)' : '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
        }}
        onClick={() => {
          if (!isDraggingBtn) {
            setIsOpen(!isOpen);
          }
        }}
        whileHover={{ rotate: 10 }}
        title="Drag to any edge/corner | Click to ask DocForge Copilot"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <X className={`${isCanvas ? 'w-5 h-5' : 'w-6 h-6'} text-white`} />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Sparkles className={`${isCanvas ? 'w-5 h-5' : 'w-6 h-6'} text-white`} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* CHAT WINDOW PANEL */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={chatWindowRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 240 }}
            className="rounded-2xl flex flex-col overflow-hidden"
            style={getChatWindowStyle()}
          >
            {/* Header */}
            <div 
              className="px-4 py-3.5 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--border-medium, rgba(255, 255, 255, 0.08))' }}
            >
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center animate-pulse"
                  style={{ background: 'rgba(var(--color-primary-rgb), 0.15)' }}
                >
                  <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-tight text-[var(--text-primary)] m-0">DocForge Copilot</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] text-[var(--text-secondary)] font-semibold uppercase tracking-wider">100% Client-Side Engine</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleResetChat}
                  title="Clear conversation"
                  className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)] active:scale-95 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)] active:scale-95 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Context Starter Chips Bar */}
            <div 
              className="px-3 py-2 border-b flex items-center gap-1.5 overflow-x-auto scrolling-touch custom-scrollbar"
              style={{ 
                background: 'rgba(0, 0, 0, 0.15)',
                borderColor: 'var(--border-medium, rgba(255, 255, 255, 0.05))'
              }}
            >
              <Compass className="w-3 h-3 text-[var(--color-primary)] flex-shrink-0 ml-1" />
              {contextualChips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(chip)}
                  className="flex-shrink-0 text-[10.5px] px-2.5 py-1 rounded-full border transition-all hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
                  style={{
                    background: 'var(--bg-card, rgba(255, 255, 255, 0.04))',
                    borderColor: 'var(--border-subtle, rgba(255, 255, 255, 0.08))',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 scrolling-touch custom-scrollbar">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[88%] ${msg.type === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
                >
                  {/* Bubble text */}
                  <div
                    className="px-3.5 py-2.5 rounded-2xl text-[12px] leading-[1.5] break-words whitespace-pre-wrap shadow-sm"
                    style={{
                      background: msg.type === 'user' 
                        ? 'var(--color-primary, #10b981)' 
                        : 'var(--bg-tertiary, rgba(30, 41, 59, 0.7))',
                      color: msg.type === 'user' ? 'var(--text-inverse, #fff)' : 'var(--text-primary)',
                      border: msg.type === 'user' 
                        ? '1px solid transparent' 
                        : '1px solid var(--border-medium, rgba(255, 255, 255, 0.08))',
                      borderTopRightRadius: msg.type === 'user' ? '4px' : '16px',
                      borderTopLeftRadius: msg.type === 'user' ? '16px' : '4px',
                    }}
                  >
                    {parseMarkdown(msg.text)}

                    {/* Rich Action Card */}
                    {msg.action && (msg.action.title || msg.action.templateName) && (
                      <div 
                        className="mt-3 p-2.5 rounded-xl border flex flex-col gap-2 transition-all"
                        style={{
                          background: 'rgba(0, 0, 0, 0.25)',
                          borderColor: 'rgba(var(--color-primary-rgb), 0.3)'
                        }}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[var(--color-primary)] flex items-center gap-1">
                            {msg.action.type === 'tool' && <FileText className="w-3 h-3" />}
                            {msg.action.type === 'canvas' && <Layers className="w-3 h-3" />}
                            {msg.action.type === 'resume' && <Sparkles className="w-3 h-3" />}
                            {msg.action.title || msg.action.templateName || 'Workspace'}
                          </span>
                          {msg.action.tier && (
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold bg-white/10 text-[var(--text-secondary)]">
                              {msg.action.tier}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleActionClick(msg.action)}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[11px] font-bold tracking-tight cursor-pointer transition-all hover:brightness-110 active:scale-95"
                          style={{
                            background: 'var(--color-primary, #10b981)',
                            color: 'var(--text-inverse, #fff)'
                          }}
                        >
                          Launch {msg.action.title || msg.action.templateName || 'Workspace'}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Interactive Disambiguation / Suggestion Chips */}
                    {msg.action?.chips && msg.action.chips.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {msg.action.chips.map((chip, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              if (chip.path) {
                                setIsOpen(false);
                                navigate(chip.path);
                              } else if (chip.query) {
                                handleSendMessage(chip.query);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                            style={{
                              background: 'rgba(var(--color-primary-rgb), 0.12)',
                              borderColor: 'rgba(var(--color-primary-rgb), 0.3)',
                              color: 'var(--color-primary)'
                            }}
                          >
                            {chip.icon && <span>{chip.icon}</span>}
                            <span>{chip.title}</span>
                            <ArrowRight className="w-2.5 h-2.5 opacity-70" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  <span className="text-[9px] text-[var(--text-tertiary)] mt-1 px-1">
                    {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}

              {/* Thinking Indicator */}
              {isThinking && (
                <div className="flex flex-col self-start items-start max-w-[85%]">
                  <div
                    className="px-4 py-3 rounded-2xl flex items-center gap-1.5 shadow-sm"
                    style={{
                      background: 'var(--bg-tertiary, rgba(30, 41, 59, 0.7))',
                      border: '1px solid var(--border-medium, rgba(255, 255, 255, 0.08))',
                      borderTopLeftRadius: '4px'
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-[var(--color-primary)]" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-[var(--color-primary)]" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-[var(--color-primary)]" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar Footer */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="p-3 border-t flex items-center gap-2"
              style={{ 
                borderColor: 'var(--border-medium, rgba(255, 255, 255, 0.08))',
                background: 'var(--bg-secondary)'
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask DocForge Copilot..."
                disabled={isThinking}
                className="flex-1 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isThinking || !input.trim()}
                className="p-2 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 border disabled:opacity-30"
                style={{
                  background: 'var(--bg-input, var(--bg-tertiary))',
                  borderColor: 'var(--border-medium, rgba(255, 255, 255, 0.08))',
                  color: input.trim() ? 'var(--color-primary, #10b981)' : 'var(--text-tertiary)'
                }}
                title="Send Message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
