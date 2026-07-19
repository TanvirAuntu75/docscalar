import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, ArrowRight, CornerDownLeft } from 'lucide-react';
import { embedQueryText, isClassifierWorkerReady } from '../utils/classifier';
import { TOOLS } from '../utils/constants';

export default function AIChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'bot',
      text: 'Hi there! I am your DocForge Assistant. Ask me anything about our PDF tools, privacy, or how to use the workspace. Everything I do runs 100% Local First on your device.',
      time: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState(null);
  const [isLoadingKB, setIsLoadingKB] = useState(false);
  const [showIndicator, setShowIndicator] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatWindowRef = useRef(null);
  const navigate = useNavigate();

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Auto focus input
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
        // Only close if we didn't click the toggle button
        const toggleBtn = document.getElementById('ai-chat-toggle-btn');
        if (toggleBtn && !toggleBtn.contains(e.target)) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Load the pre-compiled knowledge base JSON
  const loadKnowledgeBase = async () => {
    if (knowledgeBase || isLoadingKB) return;
    setIsLoadingKB(true);
    try {
      const res = await fetch('/models/website_knowledge.json');
      if (res.ok) {
        const data = await res.json();
        setKnowledgeBase(data);
        console.log(`[AIChatBot] Loaded knowledge base containing ${data.length} chunks.`);
      } else {
        console.error('[AIChatBot] Failed to load website_knowledge.json. Status:', res.status);
      }
    } catch (err) {
      console.error('[AIChatBot] Error loading website_knowledge.json:', err);
    } finally {
      setIsLoadingKB(false);
    }
  };

  // Vector similarity math
  const getDotProduct = (vecA, vecB) => {
    let dot = 0;
    const len = vecA.length;
    for (let i = 0; i < len; i++) {
      dot += vecA[i] * vecB[i];
    }
    return dot;
  };

  // Helper to parse basic markdown bold formatting safely in React
  const parseMarkdown = (text) => {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <strong key={index} className="font-semibold">{part.slice(1, -1)}</strong>;
      }
      return part;
    });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const userText = input.trim();
    setInput('');
    
    // Add user message
    const userMsgId = `user-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        type: 'user',
        text: userText,
        time: new Date()
      }
    ]);

    setIsThinking(true);
    const startThinkingTime = Date.now();

    const cleanLower = userText.toLowerCase().trim();

    // 1. Conversational greetings matching
    if (
      cleanLower === 'hi' || 
      cleanLower === 'hello' || 
      cleanLower === 'hey' || 
      cleanLower === 'yo' || 
      cleanLower === 'greetings' ||
      cleanLower.includes('who are you') ||
      cleanLower.includes('what is your name') ||
      cleanLower.includes('what are you') ||
      cleanLower.includes('who created you') ||
      cleanLower.includes('who made you') ||
      cleanLower.includes('what is docforge') ||
      cleanLower.includes('what is this site') ||
      cleanLower.includes('what is this app') ||
      cleanLower.includes('what is this website') ||
      cleanLower.includes('what can you do') ||
      cleanLower.includes('what do you do') ||
      cleanLower.includes('your features') ||
      cleanLower.includes('what features')
    ) {
      await new Promise(r => setTimeout(r, 400));
      let replyText = "Hello! I am DocForge's built-in On Device AI assistant. How can I help you today?";
      if (cleanLower.includes('who are you') || cleanLower.includes('what is your name') || cleanLower.includes('what are you')) {
        replyText = "I am DocForge's built-in On Device AI assistant, designed to help you navigate, answer questions about our services, and control your workflow completely Local Compute.";
      } else if (cleanLower.includes('what is docforge') || cleanLower.includes('what is this site') || cleanLower.includes('what is this app') || cleanLower.includes('what is this website')) {
        replyText = "DocForge is a powerful, 100% Local First, Privacy First PDF and document utility platform. All file transformations happen directly in your browser without uploading your files to any servers.";
      } else if (cleanLower.includes('what can you do') || cleanLower.includes('what do you do') || cleanLower.includes('features')) {
        replyText = "I can guide you to any page or tool, explain how our Privacy First processing works, answer questions about DocForge, and help you launch tools (like PDF compressor, CV builder, and OCR).";
      }
      setMessages(prev => [
        ...prev,
        {
          id: `bot-hello-${Date.now()}`,
          type: 'bot',
          text: replyText,
          time: new Date()
        }
      ]);
      setIsThinking(false);
      return;
    }

    // 2. Direct Help query matching
    if (cleanLower === 'help' || cleanLower === '?' || cleanLower === 'info' || cleanLower === 'how to use') {
      await new Promise(r => setTimeout(r, 450));
      setMessages(prev => [
        ...prev,
        {
          id: `bot-help-${Date.now()}`,
          type: 'bot',
          text: "Here are some things you can ask me:\n- *'How do I merge PDF files?'*\n- *'Is my data secure?'*\n- *'Can I use DocForge Client Side?'*\n- *'What are the pricing plans?'*\n\nOr simply type the name of any tool or page (e.g. *'pricing'*, *'compress'*, *'canvas'*) and I will take you there instantly!",
          time: new Date()
        }
      ]);
      setIsThinking(false);
      return;
    }

    // 3. Dynamic Keyword Direct Navigation Matching
    const toolNavs = TOOLS.map(t => {
      const aliases = [
        t.title.toLowerCase(),
        t.id.toLowerCase(),
        t.title.toLowerCase().replace(' pdf', ''),
        t.title.toLowerCase().replace(' to ', ' to '),
      ];

      // Add common synonyms and aliases for tools
      if (t.id === 'resume-builder') {
        aliases.push('cv', 'cv builder', 'cv-builder', 'resume', 'resume builder');
      } else if (t.id === 'ocr-pdf') {
        aliases.push('ocr', 'searchable', 'recognize text');
      } else if (t.id === 'image-converter') {
        aliases.push('images', 'convert image', 'convert images', 'png to jpg', 'jpg to png', 'webp');
      } else if (t.id === 'qr-generator') {
        aliases.push('qr', 'qr code', 'barcode');
      } else if (t.id === 'document-viewer') {
        aliases.push('viewer', 'view pdf', 'read pdf', 'pdf viewer');
      } else if (t.id === 'docx-to-pdf') {
        aliases.push('word', 'word to pdf', 'doc to pdf', 'docx to pdf');
      } else if (t.id === 'excel-to-pdf') {
        aliases.push('excel', 'excel to pdf', 'spreadsheet');
      } else if (t.id === 'powerpoint-to-pdf') {
        aliases.push('powerpoint', 'ppt', 'pptx', 'ppt to pdf');
      } else if (t.id === 'merge-pdf') {
        aliases.push('merge', 'combine', 'join', 'stitch');
      } else if (t.id === 'split-pdf') {
        aliases.push('split', 'divide', 'separate');
      } else if (t.id === 'compress-pdf') {
        aliases.push('compress', 'shrink', 'reduce size');
      } else if (t.id === 'rotate-pdf') {
        aliases.push('rotate', 'turn', 'flip');
      } else if (t.id === 'protect-pdf') {
        aliases.push('protect', 'lock', 'password');
      } else if (t.id === 'unlock-pdf') {
        aliases.push('unlock', 'decrypt', 'remove password');
      } else if (t.id === 'edit-pdf') {
        aliases.push('edit', 'modify', 'annotate');
      } else if (t.id === 'pdf-forms') {
        aliases.push('form', 'fill form', 'forms');
      }

      return {
        keywords: aliases.filter(Boolean),
        path: t.path,
        name: t.title
      };
    });

    const GENERAL_PAGES = [
      { keywords: ['pricing', 'price', 'plan', 'subscribe', 'cost', 'buy'], path: '/pricing', name: 'Pricing' },
      { keywords: ['canvas', 'stitch', 'workflow', 'pipeline', 'graph', 'board', 'grid'], path: '/canvas', name: 'Stitch Canvas' },
      { keywords: ['workspace', 'dashboard', 'home', 'main'], path: '/workspace', name: 'Workspace' },
      { keywords: ['login', 'sign in', 'signin', 'auth', 'account'], path: '/login', name: 'Login' },
      { keywords: ['signup', 'register', 'sign up', 'create account'], path: '/signup', name: 'Sign Up' },
      { keywords: ['privacy', 'policy', 'gdpr', 'security', 'secure', 'safe'], path: '/privacy', name: 'Privacy Policy' },
      { keywords: ['terms', 'tos', 'service', 'condition'], path: '/terms', name: 'Terms of Service' }
    ];

    const navMap = [...GENERAL_PAGES, ...toolNavs];

    const matchedNav = navMap.find(item => 
      item.keywords.some(kw => {
        if (kw.length <= 3) {
          const regex = new RegExp(`\\b${kw}\\b`, 'i');
          return regex.test(cleanLower);
        }
        return cleanLower.includes(kw);
      })
    );

    if (matchedNav) {
      await new Promise(r => setTimeout(r, 350));
      navigate(matchedNav.path);
      setMessages(prev => [
        ...prev,
        {
          id: `bot-nav-${Date.now()}`,
          type: 'bot',
          text: `Sure! Taking you to the **${matchedNav.name}** page.`,
          time: new Date()
        }
      ]);
      setIsThinking(false);
      return;
    }

    try {
      // 4. Get embedding for the user's query via the worker
      const queryVector = await embedQueryText(userText);
      
      if (!queryVector) {
        if (!isClassifierWorkerReady()) {
          throw new Error('WORKER_NOT_READY');
        }
        throw new Error('Inference worker returned null embedding vector.');
      }

      // Ensure KB is loaded
      if (!knowledgeBase) {
        await loadKnowledgeBase();
      }

      if (!knowledgeBase || knowledgeBase.length === 0) {
        throw new Error('Knowledge base is empty or could not be loaded.');
      }

      // 5. Perform cosine similarity against all chunks
      let bestMatch = null;
      let highestSim = -Infinity;

      for (const item of knowledgeBase) {
        const sim = getDotProduct(queryVector, item.vector);
        if (sim > highestSim) {
          highestSim = sim;
          bestMatch = item;
        }
      }

      console.log(`[AIChatBot] Best RAG match: "${bestMatch.text.split('\n')[0]}" with similarity ${highestSim.toFixed(4)}`);

      // 6. Formulate response based on similarity score
      const matchThreshold = 0.40; // Tuned threshold for all-MiniLM-L6-v2 cosine similarity
      
      let replyText = '';
      let toolId = null;

      if (highestSim >= matchThreshold && bestMatch) {
        replyText = bestMatch.text;
        if (bestMatch.source === 'Tool' && bestMatch.metadata?.id) {
          toolId = bestMatch.metadata.id;
        }
      } else {
        const fallbacks = [
          "As you wish! Just a heads up, I'm a document processing AI, so my expertise is mostly in PDFs, Local Compute tools, and privacy.",
          "I think that's a bit outside my domain! I specialize in DocForge's Client Side document tools and workflows. Need help with a PDF?",
          "I'm not quite sure what you mean. But if you have any files to merge, compress, or convert, I'm your bot!",
          "I don't know much about that! However, if you're looking to edit documents or use the Stitch Canvas, I can definitely guide you.",
          "Interesting! I'm mostly programmed to help you with our Privacy First document utilities, but I appreciate the chat!"
        ];
        replyText = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      }

      // Meet typing indicator pacing
      const elapsed = Date.now() - startThinkingTime;
      const minDuration = 600; // ms
      if (elapsed < minDuration) {
        await new Promise(r => setTimeout(r, minDuration - elapsed));
      }

      // Add response message
      setMessages(prev => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          type: 'bot',
          text: replyText,
          toolId: toolId,
          time: new Date()
        }
      ]);

    } catch (err) {
      console.error('[AIChatBot] Search error:', err);
      let errMsg = "I encountered a minor error connecting to the Client Side inference worker. All tools and operations remain fully active. Feel free to ask another question or drag files onto the canvas.";
      if (err.message === 'WORKER_NOT_READY') {
        errMsg = "DocForge's On Device AI model is currently warming up (this takes a few seconds on first run). Please wait a moment and try asking again, or use navigation terms like 'compress' or 'cv builder' to load them directly!";
      }
      
      setMessages(prev => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          type: 'bot',
          text: errMsg,
          time: new Date()
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleLaunchTool = (id) => {
    const tool = TOOLS.find(t => t.id === id);
    if (tool && tool.path) {
      setIsOpen(false);
      navigate(tool.path);
    }
  };

  return (
    <>
      {/* FLOATING ACTION TOGGLE BUTTON */}
      <motion.button
        id="ai-chat-toggle-btn"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center cursor-pointer shadow-lg z-[9999] transition-all hover:scale-105 active:scale-95"
        style={{
          background: 'var(--gradient-primary, linear-gradient(135deg, var(--color-primary), var(--color-secondary)))',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
        }}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ rotate: 12 }}
        title="Ask DocForge AI"
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
              <X className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* CHAT WINDOW PANEL */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={chatWindowRef}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed bottom-24 right-6 w-[360px] h-[500px] rounded-2xl flex flex-col z-[9998] overflow-hidden"
            style={{
              background: 'var(--bg-glass-strong, rgba(15, 23, 42, 0.95))',
              border: '1px solid var(--border-medium, rgba(255, 255, 255, 0.08))',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* Header */}
            <div 
              className="px-4 py-3.5 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--border-medium, rgba(255, 255, 255, 0.08))' }}
            >
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center animate-pulse"
                  style={{ background: 'rgba(var(--color-primary-rgb), 0.12)' }}
                >
                  <Sparkles className="w-4 h-4" style={{ color: 'var(--color-primary, #10b981)' }} />
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-tight text-[var(--text-primary)] m-0">DocForge AI Assistant</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] text-[var(--text-secondary)] font-medium uppercase tracking-wider">On Device AI Active</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)] active:scale-95 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 scrolling-touch custom-scrollbar">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] ${msg.type === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
                >
                  {/* Bubble text */}
                  <div
                    className="px-3.5 py-2.5 rounded-2xl text-[12.5px] leading-[1.45] break-words whitespace-pre-wrap shadow-sm"
                    style={{
                      background: msg.type === 'user' 
                        ? 'var(--color-primary, #10b981)' 
                        : 'var(--bg-tertiary)',
                      color: msg.type === 'user' ? 'var(--text-inverse, #fff)' : 'var(--text-primary)',
                      border: msg.type === 'user' 
                        ? '1px solid transparent' 
                        : '1px solid var(--border-medium, rgba(255, 255, 255, 0.08))',
                      borderTopRightRadius: msg.type === 'user' ? '4px' : '16px',
                      borderTopLeftRadius: msg.type === 'user' ? '16px' : '4px',
                    }}
                  >
                    {parseMarkdown(msg.text)}
                    
                    {/* Launch Tool Action Button */}
                    {msg.toolId && (
                      <button
                        onClick={() => handleLaunchTool(msg.toolId)}
                        className="mt-3.5 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold tracking-tight cursor-pointer transition-all active:scale-95 border"
                        style={{
                          background: 'var(--color-primary, #10b981)',
                          color: 'var(--text-inverse, #fff)',
                          borderColor: 'var(--border-medium, rgba(255, 255, 255, 0.08))'
                        }}
                      >
                        Launch {TOOLS.find(t => t.id === msg.toolId)?.title || 'Tool'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  <span className="text-[9px] text-[var(--text-tertiary)] mt-1 px-1">
                    {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}

              {/* Typing indicator */}
              {isThinking && (
                <div className="flex flex-col self-start items-start max-w-[85%]">
                  <div
                    className="px-4 py-3 rounded-2xl flex items-center gap-1.5 shadow-sm"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-medium, rgba(255, 255, 255, 0.08))',
                      borderTopLeftRadius: '4px'
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-tertiary)', animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-tertiary)', animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-tertiary)', animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar Footer */}
            <form 
              onSubmit={handleSendMessage}
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
                placeholder="Ask On Device AI..."
                disabled={isThinking}
                className="flex-1 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isThinking || !input.trim()}
                className="p-2.5 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 border disabled:opacity-30"
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
