import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getToolById } from '../../utils/constants';
import SEOHead from '../../components/SEOHead';
import ToolIcon from '../../components/ToolIcon';

// Predefined planned technical stacks for each roadmap tool
const TECHNICAL_STACKS = {
  'remove-pages': {
    library: 'pdf-lib (Client Side)',
    desc: 'Uses HTML5 file slicing and pdf-lib page array deletions. Runs 100% in-browser with zero server uploads.',
    difficulty: 'Low',
    progress: 80,
  },
  'extract-pages': {
    library: 'pdf-lib (Client Side)',
    desc: 'Extracts selective page arrays into a new document stream. Runs 100% Client Side.',
    difficulty: 'Low',
    progress: 85,
  },
  'organize-pdf': {
    library: 'pdf-lib + pdf.js (Client Side)',
    desc: 'Interactive drag-and-drop page reordering workspace using Mozilla pdf.js page rendering and HTML5 canvas layers.',
    difficulty: 'Medium',
    progress: 60,
  },
  'scan-to-pdf': {
    library: 'WebRTC Camera API + jsPDF (Client Side)',
    desc: 'Accesses local video streams to capture paper documents, applies perspective cropping, and compiles images to PDF.',
    difficulty: 'Medium',
    progress: 40,
  },
  'repair-pdf': {
    library: 'Ghostscript / pdftocairo (Backend Subprocess)',
    desc: 'Restructures corrupted cross-reference tables (xref) and malformed headers inside damaged documents.',
    difficulty: 'High',
    progress: 30,
  },
  'ocr-pdf': {
    library: 'Tesseract.js (Client) / pytesseract (Backend)',
    desc: 'Recognizes text inside scanned images. Employs local WebAssembly engines for Client Side processing.',
    difficulty: 'High',
    progress: 50,
  },
  'powerpoint-to-pdf': {
    library: 'Headless LibreOffice (soffice Backend)',
    desc: 'Renders PowerPoint slides into perfect PDFs using headless Office compilers in a background queue.',
    difficulty: 'Low (Backend ready)',
    progress: 90,
  },
  'excel-to-pdf': {
    library: 'Headless LibreOffice (soffice Backend)',
    desc: 'Renders complex grid layouts and cell formatting into clean multi-page PDFs.',
    difficulty: 'Low (Backend ready)',
    progress: 90,
  },
  'html-to-pdf': {
    library: 'LibreOffice / WeasyPrint (Backend)',
    desc: 'Converts target HTML/CSS pages into standard-compliant print PDF documents.',
    difficulty: 'Medium',
    progress: 75,
  },
  'pdf-to-word': {
    library: 'pdf2docx Layout Reconstructor (Backend)',
    desc: 'Advanced layout parser that analyzes margins, text styles, and borders to recreate native paragraphs and tables in editable .docx format.',
    difficulty: 'High',
    progress: 45,
  },
  'pdf-to-powerpoint': {
    library: 'pdf2image + python-pptx (Backend)',
    desc: 'Extracts text areas, vectors, and layouts to build editable presentation slides.',
    difficulty: 'High',
    progress: 30,
  },
  'pdf-to-excel': {
    library: 'pdfplumber + openpyxl (Backend)',
    desc: 'Scans page coordinate grids to isolate table cells, exporting them directly into a structured Excel spreadsheet.',
    difficulty: 'High',
    progress: 40,
  },
  'pdf-to-pdfa': {
    library: 'LibreOffice / Ghostscript (Backend)',
    desc: 'Applies ISO 19005 archiving compliance standards to the output PDF structure.',
    difficulty: 'Medium',
    progress: 70,
  },
  'add-page-numbers': {
    library: 'pdf-lib (Client Side)',
    desc: 'Draws dynamic text overlays onto footer margins with options for font alignment and page offsets.',
    difficulty: 'Medium',
    progress: 55,
  },
  'add-watermark': {
    library: 'pdf-lib (Client Side)',
    desc: 'Stamps text or image files onto page graphics contexts using blending modes and custom opacity sliders.',
    difficulty: 'Medium',
    progress: 65,
  },
  'crop-pdf': {
    library: 'pdf-lib (Client Side)',
    desc: 'Re-defines mediaBox and cropBox properties of PDF pages to crop canvas margins locally.',
    difficulty: 'Medium',
    progress: 45,
  },
  'edit-pdf': {
    library: 'Canvas Annotator + pdf-lib (Client Side)',
    desc: 'Draws vector overlays, text callouts, shapes, and comments on top of PDF document pages.',
    difficulty: 'High',
    progress: 20,
  },
  'pdf-forms': {
    library: 'pdf-lib interactive forms (Client Side)',
    desc: 'Detects text inputs, check boxes, radio options, and lets users fill or flatten form fields locally.',
    difficulty: 'Medium',
    progress: 50,
  },
  'sign-pdf': {
    library: 'HTML Canvas Signature + pdf-lib (Client Side)',
    desc: 'Captures hand-drawn signatures, exports them as transparent images, and stamps them on pages.',
    difficulty: 'Medium',
    progress: 35,
  },
  'redact-pdf': {
    library: 'PyMuPDF (fitz) (Backend Engine)',
    desc: 'Locates exact characters or coordinates to completely strip text streams from files, avoiding simple black box overlays.',
    difficulty: 'High',
    progress: 25,
  },
  'compare-pdf': {
    library: 'pdfjs-dist + PixelMatch (Client Side)',
    desc: 'Renders revisions as side-by-side images and calculates pixel diffs to highlight modifications.',
    difficulty: 'High',
    progress: 15,
  },
};

export default function ComingSoon({ toolId: propToolId }) {
  const { toolId: paramToolId } = useParams();
  const toolId = propToolId || paramToolId;
  const navigate = useNavigate();
  const [tool, setTool] = useState(null);
  const [voteCount, setVoteCount] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [notified, setNotified] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const t = getToolById(toolId);
    if (!t) {
      navigate('/404');
      return;
    }
    setTool(t);

    // Initialize local vote counts and status
    const votedState = localStorage.getItem(`voted_${toolId}`);
    if (votedState) {
      setHasVoted(true);
    }
    
    // Simulate current roadmap votes (seeded based on tool ID length)
    const baseVotes = (toolId.length * 37) % 150 + 24;
    setVoteCount(votedState ? baseVotes + 1 : baseVotes);
  }, [toolId, navigate]);

  const handleVote = () => {
    if (hasVoted) return;
    localStorage.setItem(`voted_${toolId}`, 'true');
    setHasVoted(true);
    setVoteCount(prev => prev + 1);
  };

  const handleNotifySubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setNotified(true);
    setEmail('');
  };

  if (!tool) return null;

  const stackInfo = TECHNICAL_STACKS[tool.id] || {
    library: 'DocForge Core Engine',
    desc: 'Currently in active research and planning by the core DocForge team.',
    difficulty: 'Medium',
    progress: 10
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 text-left relative z-10 animate-[fadeIn_0.22s_ease-out]">
      <SEOHead
        title={`${tool.title} (Coming Soon) | DocForge`}
        description={`Roadmap details and technical architecture plan for the ${tool.title} tool in DocForge.`}
      />

      {/* Back to Home Link */}
      <Link 
        to="/" 
        className="inline-flex items-center gap-1 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors mb-8"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back to Directory
      </Link>

      {/* Main Glassmorphic Panel */}
      <div className="bg-surface-container border border-outline-variant rounded-2xl p-8 md:p-12 shadow-sm flex flex-col gap-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-outline-variant group">
          <div className="flex gap-4 items-center">
            <div className="w-14 h-14 flex items-center justify-center select-none">
              <ToolIcon id={tool.id} size={52} />
            </div>
            <div>
              <span className="bg-primary/10 border border-primary/20 text-primary font-label-mono text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                Roadmap Feature
              </span>
              <h1 className="font-h2 text-h2 text-on-background mt-1 leading-none">{tool.title}</h1>
              <p className="font-body-md text-sm text-on-surface-variant mt-1.5">{tool.description}</p>
            </div>
          </div>

          {/* Voting Box */}
          <div className="flex flex-col items-end sm:self-center">
            <button
              onClick={handleVote}
              className={`font-button text-xs px-5 py-3 rounded-lg flex items-center gap-1.5 transition-all shadow-sm ${
                hasVoted
                  ? 'bg-primary text-white cursor-default'
                  : 'bg-surface-container-high border border-outline-variant hover:border-primary text-on-background hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] fill">thumb_up</span>
              {hasVoted ? 'Voted' : 'Vote for this Tool'}
            </button>
            <p className="text-[11px] text-on-surface-variant mt-2 font-medium">
              🔥 Currently supported by <span className="font-semibold text-on-background">{voteCount}</span> developers
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Stack & Details */}
          <div className="md:col-span-2 flex flex-col gap-6">
            <div>
              <h3 className="font-h3 text-base font-semibold text-on-background mb-2">Planned Architecture</h3>
              <div className="p-4 bg-surface-container-low border border-outline-variant rounded-xl flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant font-semibold">Engine Library:</span>
                  <span className="font-mono text-primary font-bold">{stackInfo.library}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant font-semibold">Implementation Difficulty:</span>
                  <span className={`font-semibold ${
                    stackInfo.difficulty === 'Low' ? 'text-primary' : stackInfo.difficulty === 'Medium' ? 'text-[#e5a823]' : 'text-error'
                  }`}>{stackInfo.difficulty}</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed mt-2 pt-2 border-t border-outline-variant/30">
                  {stackInfo.desc}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-h3 text-base font-semibold text-on-background mb-2">Technical Implementation Progress</h3>
              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-on-surface-variant">Specification & Design: Completed</span>
                  <span className="text-primary">{stackInfo.progress}%</span>
                </div>
                <div className="w-full h-2.5 bg-surface rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-1000 ease-out" 
                    style={{ width: `${stackInfo.progress}%` }} 
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Development is scheduled based on active community votes. Once the priority threshold is met, this tool goes into live deployment.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar Info/Alert */}
          <div className="flex flex-col gap-6">
            
            {/* Notification Box */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex flex-col gap-4">
              <div>
                <h4 className="font-semibold text-sm text-on-background flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">notifications</span>
                  Get Notified
                </h4>
                <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                  Enter your email to receive an instant update as soon as this tool is live.
                </p>
              </div>
              
              {notified ? (
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-center text-xs text-primary font-semibold">
                  ✓ Success! We'll notify you.
                </div>
              ) : (
                <form onSubmit={handleNotifySubmit} className="flex flex-col gap-2">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg text-xs focus:outline-none focus:border-primary text-on-background"
                  />
                  <button
                    type="submit"
                    className="w-full font-button text-xs bg-primary-container text-on-primary-container py-2.5 rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-sm"
                  >
                    Subscribe to Live Release
                  </button>
                </form>
              )}
            </div>

            {/* Privacy Strip */}
            <div className="p-4 bg-surface-container-low border border-outline-variant rounded-xl flex items-center gap-3 select-none">
              <span className="material-symbols-outlined text-primary text-[20px] fill">shield</span>
              <span className="font-body-sm text-[11px] text-on-surface-variant leading-tight">
                Our strict **Privacy First** guidelines apply to all roadmap items. Files never leak.
              </span>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
