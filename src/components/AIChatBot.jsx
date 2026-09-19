import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, X, Send, ArrowRight, CornerDownLeft, Compass, RotateCcw, FileText, Layers, ShieldCheck, Zap, ArrowLeftRight,
  CloudSun, DollarSign, BookOpen, Globe, Clock, Smile, Lightbulb, MapPin, ExternalLink
} from 'lucide-react';
import { embedQueryText, isClassifierWorkerReady } from '../utils/classifier';
import { performHybridSearch } from '../utils/hybridSearch';
import { TOOLS, CATEGORIES } from '../utils/constants';
import {
  classifyDailyIntent,
  getLiveWeather,
  getCurrencyConversion,
  getWordDefinition,
  getWikiSummary,
  getWorldTime,
  getRandomJoke,
  getDailyAdvice,
  getCountryInfo
} from '../utils/dailyLifeApis';

export default function AIChatBot() {
  const location = useLocation();
  const navigate = useNavigate();
  const isCanvas = location.pathname === '/canvas' || location.pathname === '/workspace';
  const isStudio = isCanvas || 
    location.pathname.startsWith('/edit-pdf') || 
    location.pathname.startsWith('/crop-pdf') || 
    location.pathname.startsWith('/document-viewer') || 
    location.pathname.startsWith('/redact-pdf') || 
    location.pathname.startsWith('/repair-pdf') || 
    location.pathname.startsWith('/pdf-forms') || 
    (typeof document !== 'undefined' && document.body?.classList?.contains('studio-mode-active'));

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'bot',
      text: 'Hi there! I am your **DocScalar Copilot**.\n\nI can help you navigate our 44+ PDF and document tools, automate multi-step pipelines on **Stitch Canvas**, or explain how our 100% client-side WebAssembly architecture keeps your files completely private.',
      time: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState(null);
  const [isLoadingKB, setIsLoadingKB] = useState(false);
  const [lastActiveContext, setLastActiveContext] = useState(null); // Multi-turn memory
  const [activeJoke, setActiveJoke] = useState(null); // Interactive joke setup/punchline memory
  const [dockSide, setDockSide] = useState(() => {
    try {
      return localStorage.getItem('docscalar_ai_dock_side') || 'bottom-right';
    } catch {
      return 'bottom-right';
    }
  });
  const [isDraggingBtn, setIsDraggingBtn] = useState(false);
  const dragStartTimeRef = useRef(0);
  const lastDragPointRef = useRef(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatWindowRef = useRef(null);

  // Auto-adjust chat input height up to 120px with invisible scroller
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const scrollH = inputRef.current.scrollHeight;
      inputRef.current.style.height = `${Math.min(scrollH, 120)}px`;
    }
  }, [input]);

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
      return ['How does OCR work?', 'Supported languages?', 'What is Un OCR flattening?'];
    }
    if (p.includes('protect') || p.includes('unlock')) {
      return ['Direct password removal', 'Digital certificates', 'Supported encryptions'];
    }
    if (p.includes('compare')) {
      return ['Pixel heatmap vs text diff', 'Swipe divider mode', 'Export diff report'];
    }
    return [
      '100% Local Privacy guarantee',
      '☀️ Tokyo Weather',
      '💱 100 USD to EUR',
      '📖 Define serendipity',
      '🌍 Time in London',
      '😄 Tell me a joke',
      'What are the file size limits?',
      'Show all 44 tools'
    ];
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

  // Helper to parse inline markdown formatting (bold-italic, bold, code, italic)
  const parseInlineFormatting = (str) => {
    if (!str) return '';
    const tokens = str.split(/(\*\*\*.*?\*\*\*|\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
    return tokens.map((token, idx) => {
      if (token.startsWith('***') && token.endsWith('***')) {
        return <strong key={idx} className="font-bold italic text-[var(--text-primary)]">{token.slice(3, -3)}</strong>;
      }
      if (token.startsWith('**') && token.endsWith('**')) {
        return <strong key={idx} className="font-bold text-[var(--text-primary)]">{token.slice(2, -2)}</strong>;
      }
      if (token.startsWith('`') && token.endsWith('`')) {
        return (
          <code key={idx} className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-black/5 dark:bg-white/10 text-[var(--color-primary)]">
            {token.slice(1, -1)}
          </code>
        );
      }
      if (token.startsWith('*') && token.endsWith('*')) {
        return <em key={idx} className="italic text-[var(--text-secondary)]">{token.slice(1, -1)}</em>;
      }
      return token;
    });
  };

  // Render rich structured message with headings, steps, and bullet lists
  const renderFormattedMessage = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    const elements = [];
    let currentList = [];
    let currentNumberedList = [];

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className="my-1.5 space-y-1 pl-1">
            {currentList.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-[12px] leading-relaxed text-[var(--text-primary)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 flex-shrink-0" />
                <span className="flex-1">{parseInlineFormatting(item)}</span>
              </li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    const flushNumberedList = () => {
      if (currentNumberedList.length > 0) {
        elements.push(
          <ol key={`ol-${elements.length}`} className="my-1.5 space-y-1.5 pl-0.5">
            {currentNumberedList.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-[12px] leading-relaxed text-[var(--text-primary)]">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-bold text-[10px] flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>
                <span className="flex-1">{parseInlineFormatting(item)}</span>
              </li>
            ))}
          </ol>
        );
        currentNumberedList = [];
      }
    };

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushList();
        flushNumberedList();
        return;
      }

      // Heading ###
      if (trimmed.startsWith('### ')) {
        flushList();
        flushNumberedList();
        elements.push(
          <div key={`h-${lineIdx}`} className="font-bold text-[13px] text-[var(--text-primary)] mt-1 mb-1 tracking-tight">
            {parseInlineFormatting(trimmed.replace(/^###\s*/, ''))}
          </div>
        );
        return;
      }

      // Bullet points (•, -, *)
      if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || (trimmed.startsWith('* ') && !trimmed.startsWith('**'))) {
        flushNumberedList();
        currentList.push(trimmed.replace(/^[•\-\*]\s*/, ''));
        return;
      }

      // Numbered items 1. 2. 3.
      const numMatch = trimmed.match(/^(\d+)\.\s*(.*)$/);
      if (numMatch) {
        flushList();
        currentNumberedList.push(numMatch[2]);
        return;
      }

      // Regular line
      flushList();
      flushNumberedList();
      elements.push(
        <p key={`p-${lineIdx}`} className="text-[12px] leading-relaxed text-[var(--text-primary)] my-1">
          {parseInlineFormatting(trimmed)}
        </p>
      );
    });

    flushList();
    flushNumberedList();

    return elements;
  };

  // Convert raw knowledge base entries into articulate, conversational responses
  const synthesizeCopilotResponse = (rawQuery, topMatch, kb) => {
    if (!topMatch) {
      return {
        text: "I specialize in DocScalar's 100% private, on-device document processing and visual workflow tools. How can I assist you with your PDFs or documents today?",
        action: {
          chips: [
            { title: 'Merge PDFs', path: '/merge-pdf', icon: 'call_merge' },
            { title: 'Compress PDF', path: '/compress-pdf', icon: 'compress' },
            { title: 'OCR Searchable PDF', path: '/ocr-pdf', icon: 'search' },
            { title: 'Resume Builder', path: '/resume-builder', icon: 'description' },
            { title: 'Stitch Canvas', path: '/workspace', icon: 'palette' }
          ]
        }
      };
    }

    const queryLower = rawQuery.toLowerCase().trim();
    const rawText = topMatch.text || '';

    // 1. Tool match synthesis
    if (topMatch.source === 'Tool' || rawText.includes('Tool:')) {
      const titleMatch = rawText.match(/Tool:\s*([^\n]+)/i);
      const catMatch = rawText.match(/Category:\s*([^\n]+)/i);
      const idMatch = rawText.match(/ID:\s*([^\n]+)/i);
      const pathMatch = rawText.match(/Path:\s*([^\n]+)/i);
      const descMatch = rawText.match(/Description:\s*([^\n]+)/i);
      const formatsMatch = rawText.match(/Accepted Formats:\s*([^\n]+)/i);

      const toolId = topMatch.metadata?.id || idMatch?.[1]?.trim() || '';
      const toolObj = TOOLS.find(t => t.id === toolId) || {};
      const title = toolObj.title || topMatch.metadata?.title || titleMatch?.[1]?.trim() || 'Document Tool';
      const path = toolObj.path || topMatch.metadata?.path || pathMatch?.[1]?.trim() || `/${toolId}`;
      const desc = toolObj.description || topMatch.metadata?.description || descMatch?.[1]?.trim() || 'Process documents with 100% client-side privacy.';
      const formats = formatsMatch?.[1]?.trim() || '.pdf';

      let actionInstruction = "Configure your preferences and preview the output in real time.";
      const lowerId = toolId.toLowerCase();
      if (lowerId.includes('merge') || lowerId.includes('organize')) {
        actionInstruction = "Reorder page cards or documents into your preferred sequence.";
      } else if (lowerId.includes('compress')) {
        actionInstruction = "Select your target compression ratio (Extreme, Recommended, or High Quality).";
      } else if (lowerId.includes('ocr')) {
        actionInstruction = "Select the document language to generate a high-accuracy searchable text layer.";
      } else if (lowerId.includes('redact')) {
        actionInstruction = "Highlight text to black out or apply automated credit card and SSN regex rules.";
      } else if (lowerId.includes('sign')) {
        actionInstruction = "Draw your vector signature or place an official X.509 digital certificate.";
      } else if (lowerId.includes('convert') || lowerId.includes('to-pdf') || lowerId.includes('pdf-to')) {
        actionInstruction = "Verify formatting, page dimensions, and DPI resolution before converting.";
      } else if (lowerId.includes('split') || lowerId.includes('extract') || lowerId.includes('remove')) {
        actionInstruction = "Specify the exact page numbers or ranges to isolate.";
      } else if (lowerId.includes('protect') || lowerId.includes('unlock')) {
        actionInstruction = "Set a secure 256-bit AES encryption password or unlock protected permissions.";
      }

      const synthesizedText = 
        `### **${title}**\n\n` +
        `${desc}\n\n` +
        `**How to use:**\n` +
        `1. **Upload**: Select or drop your files (${formats}) into the workspace.\n` +
        `2. **Customize**: ${actionInstruction}\n` +
        `3. **Export**: Click **Process** to download your output instantly.\n\n` +
        `🔒 **100% Client-Side Privacy**: Runs locally in your browser via WebAssembly. Zero bytes are uploaded to any cloud server.`;

      return {
        text: synthesizedText,
        action: {
          type: 'tool',
          id: toolId,
          title: title,
          path: path,
          category: topMatch.metadata?.category || catMatch?.[1]?.trim() || 'PDF Tool',
          tier: toolObj.minTier || 'guest',
          description: desc
        }
      };
    }

    // 2. FAQ match synthesis
    if (topMatch.source === 'FAQ' || rawText.includes('Question:') || rawText.includes('Answer:')) {
      const answerMatch = rawText.match(/Answer:\s*([\s\S]+)$/i);
      let pureAnswer = answerMatch ? answerMatch[1].trim() : rawText;
      pureAnswer = pureAnswer.replace(/^(Question|Answer):\s*/gim, '').trim();

      if (queryLower.includes('privacy') || queryLower.includes('upload') || queryLower.includes('safe') || queryLower.includes('security') || queryLower.includes('server')) {
        pureAnswer = 
          `### **100% Client-Side Privacy Architecture**\n\n` +
          `**Zero Server Uploads**: ${pureAnswer}\n\n` +
          `• **Local Compute**: All conversions, OCR, and PDF transformations execute strictly on your device via WebAssembly and Web Workers.\n` +
          `• **Air-Gapped Operation**: DocScalar functions even if your device is completely disconnected from the internet.\n` +
          `• **Zero Telemetry**: We never track, inspect, or retain your documents or sensitive data.`;
      }

      return {
        text: pureAnswer,
        action: null
      };
    }

    // 3. Resume Template match synthesis
    if (topMatch.source === 'Resume Template' || rawText.includes('Template:')) {
      const tplName = topMatch.metadata?.templateName || 'Harvard Classic';
      const role = topMatch.metadata?.role || 'Professional';
      const desc = topMatch.metadata?.description || 'ATS-compliant resume template designed for maximum readability.';

      const synthesizedText = 
        `### **${tplName} (Resume Template)**\n\n` +
        `${desc}\n\n` +
        `• **Target Career Field**: ${role}\n` +
        `• **ATS Compliance**: 100% ATS Verified with single-column scanline compatibility.\n` +
        `• **Features**: Live on-canvas direct editing, dynamic pagination, and high-fidelity PDF/DOCX export.\n\n` +
        `You can preview and customize this template in the **Resume Studio** below:`;

      return {
        text: synthesizedText,
        action: {
          type: 'resume',
          templateName: tplName,
          path: '/resume-builder',
          title: tplName,
          description: desc
        }
      };
    }

    // 4. Clean fallback stripping raw metadata keys
    let cleaned = rawText
      .replace(/\n?(Keywords|Aliases & Keywords|Accepted Formats|Batch Support|Tier|How to use):\s*.*$/gim, '')
      .replace(/^(Tool|Category|ID|Path|Description|Question|Answer):\s*/gim, '')
      .trim();

    return {
      text: cleaned || "I am here to assist with any DocScalar tool or document operation.",
      action: null
    };
  };

  const handleSendMessage = async (textToSend = null) => {
    const rawText = (typeof textToSend === 'string' ? textToSend : input).trim();
    if (!rawText || isThinking) return;

    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
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
      cleanLower.includes('what is docscalar') || cleanLower.includes('what is this site') || cleanLower.includes('what can you do')
    ) {
      await new Promise(r => setTimeout(r, 250));
      let replyText = "Hello! I am **DocScalar's On Device AI Copilot**. How can I assist with your document workflows today?";
      if (cleanLower.includes('who are you') || cleanLower.includes('what is your name') || cleanLower.includes('what are you')) {
        replyText = "I am DocScalar's built in **100% Client Side AI Copilot**. I possess complete technical knowledge of all 44+ tools, canvas DAG pipelines, privacy architecture, and document operations.";
      } else if (cleanLower.includes('what is docscalar') || cleanLower.includes('what is this site')) {
        replyText = "DocScalar is a privacy first, 100% local compute document operating system. All PDF transformations, conversions, OCR, and visual DAG pipelines execute directly in your browser using WebAssembly and Web Workers—zero cloud uploads.";
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
      const catalogReply = "DocScalar includes **44 document tools and visual studios** designed for 100% private, client side processing:\n\n" +
        "• **Organize & Structure**: Merge PDF, Split PDF, Remove Pages, Extract Pages, Organize Pages, Scan to PDF.\n" +
        "• **Convert & Transform**: Word/Docx to PDF, Excel to PDF, PowerPoint to PDF, HTML to PDF, Image to PDF, Text to PDF, PDF to Word, PDF to Excel, PDF to PowerPoint, PDF to Image, PDF to PDF/A.\n" +
        "• **Optimize & Quality**: Compress PDF (Lossless & Lossy), Repair PDF, OCR Text Recognition, Un OCR Page Flattening.\n" +
        "• **Edit & Annotate**: Edit PDF, Fill Forms (AcroForms), Crop PDF, Rotate PDF, Add Page Numbers, Add Watermark, Bates Numbering.\n" +
        "• **Security & Compliance**: Sign PDF (Vector & X.509 Digital), Protect PDF (256-bit AES), Unlock PDF, Redact PDF (PII & Metadata Sanitizer).\n" +
        "• **Advanced Studios & Utilities**: Stitch Canvas (Visual DAG Pipeline Builder), Compare PDF (4 Diff Modes), AI Summarizer, AI Translator, Resume Builder (89 ATS Verified Templates), Image Tools (Converter, Compressor, Resizer), QR Code Generator, and Unzip Archive.\n\n" +
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

    const cleanNormalized = cleanLower.replace(/[?!.,;:]/g, '').trim();

    // 2.3 Active Joke Follow-Up Check (Interactive Punchline, Follow-up Questions & Reactions)
    if (activeJoke) {
      const isPunchlinePrompt = 
        cleanNormalized === 'when' || 
        cleanNormalized === 'why' || 
        cleanNormalized === 'what' || 
        cleanNormalized === 'who' || 
        cleanNormalized === 'how' || 
        cleanNormalized === 'tell me' || 
        cleanNormalized === 'say it' || 
        cleanNormalized === 'punchline' || 
        cleanNormalized === 'reveal punchline' || 
        cleanNormalized === 'reveal' || 
        cleanNormalized === 'answer' || 
        cleanNormalized === 'idk' || 
        cleanNormalized === "i don't know" || 
        cleanNormalized === 'dont know' ||
        cleanNormalized === 'what is it';

      if (isPunchlinePrompt) {
        await new Promise(r => setTimeout(r, 200));
        const wasRevealed = activeJoke.revealed;
        setActiveJoke(prev => prev ? { ...prev, revealed: true } : null);
        
        const punchlineReply = wasRevealed
          ? `Haha, like I said: **${activeJoke.punchline}** 😄`
          : `**${activeJoke.punchline}** 😄`;

        setMessages(prev => [
          ...prev,
          {
            id: `bot-joke-punchline-${Date.now()}`,
            type: 'bot',
            text: punchlineReply,
            action: {
              chips: [
                { title: '😄 Another Joke', query: 'tell me a joke' },
                { title: '💡 Daily Advice', query: 'give me some advice' }
              ]
            },
            time: new Date()
          }
        ]);
        setIsThinking(false);
        return;
      }

      // Check for laughter reactions (e.g. "haha", "lol", "lmao", "good one", etc.)
      const isLaughter = /^(ha(ha)+|he(he)+|lol|lmao|rofl|funny|good one|nice one|nice|😂|😆|classic|haha!|great one)$/i.test(cleanNormalized);
      if (isLaughter) {
        await new Promise(r => setTimeout(r, 200));
        setMessages(prev => [
          ...prev,
          {
            id: `bot-joke-laugh-${Date.now()}`,
            type: 'bot',
            text: `Glad that gave you a smile! 😄`,
            action: {
              chips: [
                { title: '😄 Another Joke', query: 'tell me a joke' }
              ]
            },
            time: new Date()
          }
        ]);
        setIsThinking(false);
        return;
      }

      // If user says "another", "one more", "more"
      if (cleanNormalized === 'another' || cleanNormalized === 'another one' || cleanNormalized === 'one more' || cleanNormalized === 'more') {
        const nextJoke = await getRandomJoke();
        if (nextJoke?.setup && nextJoke?.punchline) {
          setActiveJoke({
            setup: nextJoke.setup,
            punchline: nextJoke.punchline,
            revealed: false
          });
          setMessages(prev => [
            ...prev,
            {
              id: `bot-joke-${Date.now()}`,
              type: 'bot',
              text: `**${nextJoke.setup}**`,
              action: {
                chips: [
                  { title: 'Reveal Punchline 🎭', query: 'reveal punchline' },
                  { title: '😄 Tell me another', query: 'tell me a joke' }
                ]
              },
              time: new Date()
            }
          ]);
          setIsThinking(false);
          return;
        }
      }
    }

    // 2.4 Polite Conversational Pleasantries & Standalone Clarifications
    if (['thanks', 'thank you', 'thx', 'ty', 'appreciate it', 'thank u'].includes(cleanNormalized)) {
      await new Promise(r => setTimeout(r, 200));
      setMessages(prev => [
        ...prev,
        {
          id: `bot-thanks-${Date.now()}`,
          type: 'bot',
          text: `You're very welcome! Feel free to ask if you need help with any of our 44+ PDF and document tools, or want to build a workflow on Stitch Canvas.`,
          time: new Date()
        }
      ]);
      setIsThinking(false);
      return;
    }

    if (['ok', 'okay', 'cool', 'got it', 'sure', 'alright', 'sounds good'].includes(cleanNormalized)) {
      await new Promise(r => setTimeout(r, 150));
      setMessages(prev => [
        ...prev,
        {
          id: `bot-ack-${Date.now()}`,
          type: 'bot',
          text: `Sounds good! Whenever you're ready, let me know what document operation or workflow you'd like to run.`,
          time: new Date()
        }
      ]);
      setIsThinking(false);
      return;
    }

    // Standalone single interrogatives without context (e.g. user types "when", "why", "who", "how")
    if (['when', 'why', 'who', 'how', 'where'].includes(cleanNormalized)) {
      await new Promise(r => setTimeout(r, 200));
      setMessages(prev => [
        ...prev,
        {
          id: `bot-clarify-${Date.now()}`,
          type: 'bot',
          text: `Could you clarify what you're asking about? I can guide you through any of our 44+ PDF tools, explain how our on-device privacy works, or answer questions!`,
          action: {
            chips: [
              { title: 'Show All Tools', query: 'show all tools' },
              { title: '☀️ Tokyo Weather', query: 'weather in Tokyo' },
              { title: '😄 Tell me a joke', query: 'tell me a joke' }
            ]
          },
          time: new Date()
        }
      ]);
      setIsThinking(false);
      return;
    }

    // 2.5 Daily Life Public APIs Check (Keyless & 100% Free)
    const dailyIntent = classifyDailyIntent(cleanLower);
    if (dailyIntent) {
      await new Promise(r => setTimeout(r, 200));
      let dailyResult = null;

      try {
        if (dailyIntent.type === 'weather') {
          dailyResult = await getLiveWeather(dailyIntent.params.city);
        } else if (dailyIntent.type === 'currency') {
          dailyResult = await getCurrencyConversion(dailyIntent.params.amount, dailyIntent.params.from, dailyIntent.params.to);
        } else if (dailyIntent.type === 'dictionary') {
          dailyResult = await getWordDefinition(dailyIntent.params.word);
        } else if (dailyIntent.type === 'time') {
          dailyResult = getWorldTime(dailyIntent.params.location);
        } else if (dailyIntent.type === 'joke') {
          const jokeData = await getRandomJoke();
          if (jokeData?.setup && jokeData?.punchline) {
            setActiveJoke({
              setup: jokeData.setup,
              punchline: jokeData.punchline,
              revealed: false
            });
            dailyResult = {
              success: true,
              title: 'Daily Joke',
              text: `**${jokeData.setup}**`,
              action: {
                chips: [
                  { title: 'Reveal Punchline 🎭', query: 'reveal punchline' },
                  { title: '😄 Tell me another', query: 'tell me a joke' }
                ]
              }
            };
          } else {
            dailyResult = jokeData;
          }
        } else if (dailyIntent.type === 'advice') {
          dailyResult = await getDailyAdvice();
        } else if (dailyIntent.type === 'country') {
          dailyResult = await getCountryInfo(dailyIntent.params.country);
        } else if (dailyIntent.type === 'wiki') {
          dailyResult = await getWikiSummary(dailyIntent.params.topic);
        }
      } catch (err) {
        console.warn('[AIChatBot] Daily API fetch warning:', err);
      }

      if (dailyResult) {
        setMessages(prev => [
          ...prev,
          {
            id: `bot-daily-${Date.now()}`,
            type: 'bot',
            text: dailyResult.text,
            action: dailyResult.action,
            time: new Date()
          }
        ]);
        setIsThinking(false);
        return;
      }
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
            text: "DocScalar provides several ways to manipulate document pages. Choose the specific action you'd like to perform:",
            action: {
              chips: [
                { title: 'Rotate Pages', path: '/rotate-pdf', icon: 'rotate_right' },
                { title: 'Reorder in Grid', path: '/organize-pdf', icon: 'dashboard_customize' },
                { title: 'Crop Margins', path: '/crop-pdf', icon: 'crop' },
                { title: 'Delete Blank Pages', path: '/remove-pages', icon: 'delete' },
                { title: 'Extract Page Range', path: '/extract-pages', icon: 'file_copy' }
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
            text: `You can chain **${pipelineKeywords.map(k => k.toUpperCase()).join(' → ')}** together into a single automated pipeline on the **Stitch Canvas**. Connect operators with interactive cables for zero upload local execution.`,
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
        const synthesized = synthesizeCopilotResponse(rawText, topMatch, kb);
        replyText = synthesized.text;
        actionData = synthesized.action;

        // If query has negative intent, suppress action cards
        if (hasNegation) {
          actionData = null;
        } else if (actionData?.id) {
          setLastActiveContext(actionData.id);
        }
      } else {
        const synthesized = synthesizeCopilotResponse(rawText, null, kb);
        replyText = synthesized.text;
        actionData = synthesized.action;
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
          text: "I am ready to help! All client side tools and canvas operations are running locally on your device.",
          time: new Date()
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleActionClick = (action) => {
    if (!action) return;
    if (action.url) {
      window.open(action.url, '_blank', 'noopener,noreferrer');
      return;
    }
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
    setActiveJoke(null);
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

  const buttonSize = isCanvas ? 44 : 52;
  const padding = 16;
  const topNavOffset = 58;
  const studioSidebarWidth = windowSize.width >= 1280 ? 380 : (windowSize.width >= 1024 ? 340 : 320);

  // Compute docked coordinates (Strict Edge/Corner Snapping when closed; Outside Side-Middle when open)
  const getCoordinatesForDock = (dock, openState = isOpen) => {
    const isLeft = dock.includes('left');
    const isTop = dock.includes('top');
    const isMiddle = dock.includes('middle');

    // In studio mode (e.g. Edit PDF, Crop PDF, Document Viewer), the right sidebar is 380px wide on desktop (340px on laptop, 320px on tablet).
    // If docking on the right edge, shift maxX clear of the right sidebar so it never occludes primary Save/Export action buttons!
    const maxX = Math.max(
      padding,
      windowSize.width - (isStudio ? (studioSidebarWidth + buttonSize + 16) : (buttonSize + padding))
    );
    const maxY = Math.max(topNavOffset + 10, windowSize.height - buttonSize - padding);
    const midY = Math.max(topNavOffset + 10, (windowSize.height - buttonSize) / 2);

    if (!openState) {
      switch (dock) {
        case 'top-left':
          return { x: padding, y: topNavOffset + 10 };
        case 'top-right':
          return { x: maxX, y: topNavOffset + 10 };
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
    }

    // When open: Place strictly on the OUTSIDE SIDE-MIDDLE of the chatbox
    const panelWidth = Math.min(385, windowSize.width - buttonSize - 36);
    const panelHeight = Math.min(560, windowSize.height - topNavOffset - 24);

    const chatboxLeft = isLeft 
      ? padding 
      : Math.max(padding, windowSize.width - (isStudio ? (studioSidebarWidth + panelWidth + 16) : (panelWidth + padding)));
    const chatboxTop = isTop 
      ? topNavOffset + 10 
      : isMiddle 
        ? Math.max(topNavOffset + 10, (windowSize.height - panelHeight) / 2)
        : Math.max(topNavOffset + 10, windowSize.height - panelHeight - padding);

    // Exact vertical center of the chatbox
    const buttonY = chatboxTop + (panelHeight - buttonSize) / 2;

    let buttonX;
    if (isLeft) {
      // Chatbox is on the left; button sits outside on the RIGHT side of chatbox
      buttonX = chatboxLeft + panelWidth + 12;
    } else {
      // Chatbox is on the right; button sits outside on the LEFT side of chatbox
      buttonX = chatboxLeft - buttonSize - 12;
    }

    // Boundary clamp: ensure button is never off-screen
    const safeButtonX = Math.max(8, Math.min(windowSize.width - buttonSize - 8, buttonX));

    return { x: safeButtonX, y: buttonY };
  };

  const handleDragStart = () => {
    setIsDraggingBtn(true);
    dragStartTimeRef.current = Date.now();
  };

  const handleDragEnd = (event, info) => {
    setIsDraggingBtn(false);
    lastDragPointRef.current = { x: info.point.x, y: info.point.y };

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
      localStorage.setItem('docscalar_ai_dock_side', nextDock);
    } catch (e) {}
  };

  const handleToggleOpen = () => {
    if (isDraggingBtn) return;

    if (!isOpen) {
      // If opening, automatically snap to the nearest screen edge if icon was near screen middle
      if (lastDragPointRef.current) {
        const isLeft = lastDragPointRef.current.x < windowSize.width / 2;
        const vPos = lastDragPointRef.current.y < windowSize.height * 0.35 
          ? 'top' 
          : lastDragPointRef.current.y > windowSize.height * 0.65 
            ? 'bottom' 
            : 'middle';
        const targetSide = isLeft 
          ? (vPos === 'middle' ? 'left-middle' : vPos === 'top' ? 'top-left' : 'bottom-left')
          : (vPos === 'middle' ? 'right-middle' : vPos === 'top' ? 'top-right' : 'bottom-right');
        setDockSide(targetSide);
        try {
          localStorage.setItem('docscalar_ai_dock_side', targetSide);
        } catch (e) {}
      } else {
        const isCloserToLeft = dockSide.includes('left');
        if (!isCloserToLeft && !dockSide.includes('right')) {
          setDockSide('right-middle');
        }
      }
    }

    setIsOpen(prev => !prev);
  };

  const handleToggleDockSide = () => {
    const nextDock = dockSide.includes('left') 
      ? dockSide.replace('left', 'right') 
      : dockSide.replace('right', 'left');
    setDockSide(nextDock);
    try {
      localStorage.setItem('docscalar_ai_dock_side', nextDock);
    } catch (e) {}
  };

  // Compute chat panel coordinates relative to docked position
  const getChatWindowStyle = () => {
    const panelWidth = Math.min(385, windowSize.width - buttonSize - 36);
    const panelHeight = Math.min(560, windowSize.height - topNavOffset - 24);
    const isLeft = dockSide.includes('left');
    const isTop = dockSide.includes('top');
    const isMiddle = dockSide.includes('middle');

    const targetLeft = isLeft 
      ? padding 
      : Math.max(padding, windowSize.width - (isStudio ? (studioSidebarWidth + panelWidth + 16) : (panelWidth + padding)));
    const targetTop = isTop 
      ? topNavOffset + 10 
      : isMiddle 
        ? Math.max(topNavOffset + 10, (windowSize.height - panelHeight) / 2)
        : Math.max(topNavOffset + 10, windowSize.height - panelHeight - padding);

    return {
      position: 'fixed',
      left: `${targetLeft}px`,
      top: `${targetTop}px`,
      width: `${panelWidth}px`,
      height: `${panelHeight}px`,
      background: 'var(--bg-glass-strong, rgba(255, 255, 255, 0.96))',
      border: '1px solid var(--border-medium, #cbd5e1)',
      backdropFilter: 'blur(24px)',
      boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
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
          right: Math.max(padding, windowSize.width - (isStudio ? (studioSidebarWidth + buttonSize + 16) : (buttonSize + padding))),
          top: topNavOffset,
          bottom: Math.max(topNavOffset, windowSize.height - buttonSize - padding)
        }}
        dragMomentum={false}
        dragElastic={0.1}
        animate={getCoordinatesForDock(dockSide, isOpen)}
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
        onClick={handleToggleOpen}
        whileHover={{ rotate: 8 }}
        title={isOpen ? "Close DocScalar Copilot (Esc)" : "Ask DocScalar Copilot"}
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
              style={{ 
                borderColor: 'var(--border-subtle, rgba(0, 0, 0, 0.08))',
                background: 'var(--bg-secondary, #ffffff)'
              }}
            >
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center animate-pulse"
                  style={{ background: 'rgba(var(--color-primary-rgb, 37, 99, 235), 0.15)' }}
                >
                  <Sparkles className="w-4 h-4 text-[var(--color-primary, #2563eb)]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-tight text-[var(--text-primary)] m-0">DocScalar Copilot</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] text-[var(--text-secondary)] font-semibold uppercase tracking-wider">100% Client-Side Engine</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleToggleDockSide}
                  title={dockSide.includes('left') ? "Dock to right side" : "Dock to left side"}
                  className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)] active:scale-95 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetChat}
                  title="Clear conversation"
                  className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)] active:scale-95 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  title="Close Copilot"
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
                background: 'var(--bg-tertiary, #f8fafc)',
                borderColor: 'var(--border-subtle, rgba(0, 0, 0, 0.06))'
              }}
            >
              <Compass className="w-3 h-3 text-[var(--color-primary, #2563eb)] flex-shrink-0 ml-1" />
              {contextualChips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(chip)}
                  className="flex-shrink-0 text-[10.5px] px-2.5 py-1 rounded-full border transition-all hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap font-medium"
                  style={{
                    background: 'var(--bg-card, #ffffff)',
                    borderColor: 'var(--border-medium, #cbd5e1)',
                    color: 'var(--text-secondary, #475569)',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
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
                    className="px-3.5 py-2.5 rounded-2xl text-[12px] leading-[1.55] break-words whitespace-pre-wrap shadow-sm"
                    style={{
                      background: msg.type === 'user' 
                        ? 'var(--gradient-primary, linear-gradient(135deg, var(--color-primary, #2563eb), #1d4ed8))' 
                        : 'var(--bg-card, #ffffff)',
                      color: msg.type === 'user' ? '#ffffff' : 'var(--text-primary, #0f172a)',
                      border: msg.type === 'user' 
                        ? '1px solid transparent' 
                        : '1px solid var(--border-subtle, #e2e8f0)',
                      boxShadow: msg.type === 'user'
                        ? '0 2px 8px rgba(37, 99, 235, 0.25)'
                        : '0 2px 8px rgba(0, 0, 0, 0.04)',
                      borderTopRightRadius: msg.type === 'user' ? '4px' : '16px',
                      borderTopLeftRadius: msg.type === 'user' ? '16px' : '4px',
                    }}
                  >
                    {renderFormattedMessage(msg.text)}

                    {/* Rich Action Card - Only rendered when an actionable tool route or external article exists */}
                    {msg.action && (msg.action.path || msg.action.url) && (msg.action.title || msg.action.templateName) && (
                      <div 
                        className="mt-3 p-3 rounded-xl border flex flex-col gap-2 transition-all shadow-sm"
                        style={{
                          background: 'var(--bg-tertiary, #f8fafc)',
                          borderColor: 'var(--border-medium, #cbd5e1)'
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center bg-[var(--color-primary, #2563eb)]/15 text-[var(--color-primary, #2563eb)]">
                              {msg.action.type === 'tool' && <FileText className="w-3 h-3" />}
                              {msg.action.type === 'canvas' && <Layers className="w-3 h-3" />}
                              {msg.action.type === 'resume' && <Sparkles className="w-3 h-3" />}
                              {msg.action.type === 'wiki' && <Globe className="w-3 h-3" />}
                              {msg.action.type === 'country' && <MapPin className="w-3 h-3" />}
                            </div>
                            <span className="font-bold text-[12px] text-[var(--text-primary, #0f172a)]">
                              {msg.action.title || msg.action.templateName}
                            </span>
                          </div>
                          {(msg.action.category || msg.action.type) && (
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full font-bold bg-[var(--bg-card, #ffffff)] text-[var(--text-secondary, #475569)] border border-[var(--border-subtle, #e2e8f0)]">
                              {msg.action.category || (msg.action.type === 'wiki' ? 'Wikipedia' : msg.action.type === 'country' ? 'Geography' : 'Tool')}
                            </span>
                          )}
                        </div>

                        {msg.action.description && (
                          <p className="text-[11px] text-[var(--text-secondary, #475569)] line-clamp-2 m-0 leading-normal">
                            {msg.action.description}
                          </p>
                        )}

                        <button
                          onClick={() => handleActionClick(msg.action)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[11px] font-bold tracking-tight cursor-pointer transition-all hover:brightness-105 active:scale-95 shadow-sm text-white mt-1"
                          style={{
                            background: 'var(--gradient-primary, linear-gradient(135deg, var(--color-primary, #2563eb), #1d4ed8))'
                          }}
                        >
                          <span>{msg.action.url ? 'Read on Wikipedia' : `Open ${msg.action.title || msg.action.templateName || 'Workspace'}`}</span>
                          {msg.action.url ? <ExternalLink className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
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
                              background: 'rgba(var(--color-primary-rgb, 37, 99, 235), 0.08)',
                              borderColor: 'rgba(var(--color-primary-rgb, 37, 99, 235), 0.25)',
                              color: 'var(--color-primary, #2563eb)'
                            }}
                          >
                            {chip.icon && <span className="material-symbols-outlined text-[13px]">{chip.icon}</span>}
                            <span>{chip.title}</span>
                            <ArrowRight className="w-2.5 h-2.5 opacity-70" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  <span className="text-[9px] text-[var(--text-tertiary, #94a3b8)] mt-1 px-1">
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
                      background: 'var(--bg-card, #ffffff)',
                      border: '1px solid var(--border-subtle, #e2e8f0)',
                      borderTopLeftRadius: '4px'
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-[var(--color-primary, #2563eb)]" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-[var(--color-primary, #2563eb)]" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-[var(--color-primary, #2563eb)]" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar Footer */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="p-2.5 sm:p-3 border-t flex items-end gap-2"
              style={{ 
                borderColor: 'var(--border-subtle, rgba(0, 0, 0, 0.08))',
                background: 'var(--bg-secondary, #ffffff)'
              }}
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask DocScalar Copilot..."
                disabled={isThinking}
                className="flex-1 bg-[var(--bg-input, #f8fafc)] border border-[var(--border-medium, #cbd5e1)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary, #0f172a)] placeholder-[var(--text-tertiary, #94a3b8)] focus:outline-none focus:border-[var(--color-primary, #2563eb)] disabled:opacity-50 transition-colors resize-none overflow-y-auto no-scrollbar max-h-[120px] min-h-[36px] whitespace-pre-wrap break-words leading-relaxed"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              />
              <button
                type="submit"
                disabled={isThinking || !input.trim()}
                className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 border disabled:opacity-30 mb-0.5 shrink-0"
                style={{
                  background: input.trim() 
                    ? 'var(--gradient-primary, linear-gradient(135deg, var(--color-primary, #2563eb), #1d4ed8))' 
                    : 'var(--bg-tertiary, #f1f5f9)',
                  borderColor: input.trim() ? 'transparent' : 'var(--border-subtle, #e2e8f0)',
                  color: input.trim() ? '#ffffff' : 'var(--text-tertiary, #94a3b8)',
                  boxShadow: input.trim() ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none'
                }}
                title="Send Message (Enter)"
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
