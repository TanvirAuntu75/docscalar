import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Header from './components/Header'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import ErrorBoundary from './components/ErrorBoundary'
import BootstrapDownloader from './components/BootstrapDownloader'
import { BACKEND_URL } from './utils/api'
import AIChatBot from './components/AIChatBot'

const Home = lazy(() => import('./pages/Home'))
const PdfToImage = lazy(() => import('./pages/pdf/PdfToImage'))
const ImageToPdf = lazy(() => import('./pages/pdf/ImageToPdf'))
const MergePdf = lazy(() => import('./pages/pdf/MergePdf'))
const SplitPdf = lazy(() => import('./pages/pdf/SplitPdf'))
const CompressPdf = lazy(() => import('./pages/pdf/CompressPdf'))
const RotatePdf = lazy(() => import('./pages/pdf/RotatePdf'))
const ImageConverter = lazy(() => import('./pages/image/ImageConverter'))
const ImageCompressor = lazy(() => import('./pages/image/ImageCompressor'))
const ImageResizer = lazy(() => import('./pages/image/ImageResizer'))
const DocxToPdf = lazy(() => import('./pages/document/DocxToPdf'))
const TextToPdf = lazy(() => import('./pages/document/TextToPdf'))
const TranslatePdf = lazy(() => import('./pages/document/TranslatePdf'))
const AiSummarizer = lazy(() => import('./pages/document/AiSummarizer'))
const QrGenerator = lazy(() => import('./pages/utility/QrGenerator'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Login = lazy(() => import('./pages/Login'))
const SignUp = lazy(() => import('./pages/SignUp'))
const Pricing = lazy(() => import('./pages/Pricing'))

const ComingSoon = lazy(() => import('./pages/utility/ComingSoon'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const ProtectPdf = lazy(() => import('./pages/pdf/ProtectPdf'))
const UnlockPdf = lazy(() => import('./pages/pdf/UnlockPdf'))
const RemovePages = lazy(() => import('./pages/pdf/RemovePages'))
const ExtractPages = lazy(() => import('./pages/pdf/ExtractPages'))
const OrganizePdf = lazy(() => import('./pages/pdf/OrganizePdf'))
const AddWatermark = lazy(() => import('./pages/pdf/AddWatermark'))
const AddPageNumbers = lazy(() => import('./pages/pdf/AddPageNumbers'))
const SignPdf = lazy(() => import('./pages/pdf/SignPdf'))

const PowerpointToPdf = lazy(() => import('./pages/document/PowerpointToPdf'))
const ExcelToPdf = lazy(() => import('./pages/document/ExcelToPdf'))
const HtmlToPdf = lazy(() => import('./pages/document/HtmlToPdf'))
const PdfToWord = lazy(() => import('./pages/document/PdfToWord'))
const CropPdf = lazy(() => import('./pages/pdf/CropPdf'))
const PdfForms = lazy(() => import('./pages/pdf/PdfForms'))
const ScanToPdf = lazy(() => import('./pages/pdf/ScanToPdf'))
const ComparePdf = lazy(() => import('./pages/pdf/ComparePdf'))
const EditPdf = lazy(() => import('./pages/pdf/EditPdf'))
const RepairPdf = lazy(() => import('./pages/pdf/RepairPdf'))
const PdfToExcel = lazy(() => import('./pages/document/PdfToExcel'))
const PdfToPowerpoint = lazy(() => import('./pages/document/PdfToPowerpoint'))
const PdfToPdfa = lazy(() => import('./pages/document/PdfToPdfa'))
const RedactPdf = lazy(() => import('./pages/pdf/RedactPdf'))
const OcrPdf = lazy(() => import('./pages/pdf/OcrPdf'))
const UnOcrPdf = lazy(() => import('./pages/pdf/UnOcrPdf'))
const ConversionPipeline = lazy(() => import('./pages/utility/ConversionPipeline'))
const ResumeBuilder = lazy(() => import('./pages/utility/ResumeBuilder'))
const UrlToPdf = lazy(() => import('./pages/utility/UrlToPdf'))
const DocumentViewer = lazy(() => import('./pages/utility/DocumentViewer'))
import { TOOLS } from './utils/constants'
import Skeleton from './components/ui/Skeleton'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6 w-full max-w-[1200px] mx-auto min-h-[60vh] mt-8">
      {/* Title skeleton */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <Skeleton variant="text" className="w-3/4 max-w-md h-12" />
        <Skeleton variant="text" className="w-1/2 max-w-sm h-6" />
      </div>

      {/* Main content box skeleton */}
      <Skeleton className="w-full h-64 md:h-96" />

      {/* Details/Action area skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  )
}

export default function App() {
  const { isPro, isAuthenticated } = useAuth();
  const location = useLocation();
  const isCanvas = location.pathname === '/canvas';

  useEffect(() => {
    // Clear any temporary chunk load error flags upon successful boot/mount
    sessionStorage.removeItem('chunk_error_reload');
  }, []);
  const isWorkspace = location.pathname === '/workspace' || isCanvas;
  const isResumeBuilder = location.pathname === '/resume-builder';
  const hideFooter = isWorkspace || isResumeBuilder || location.pathname === '/document-viewer';
  const mainPadding = isCanvas ? 'pt-0' : (isPro ? 'pt-[72px]' : 'pt-[88px]');

  const [bootstrapChecked, setBootstrapChecked] = useState(false);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [backendStarting, setBackendStarting] = useState(false);

  useEffect(() => {
    const checkBootstrap = async () => {
      const IS_TAURI = typeof window.__TAURI__ !== 'undefined';
      const maxRetries = IS_TAURI ? 25 : 1; // In desktop, retry for up to 50s
      const retryDelay = 2000;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/bootstrap/status`);
          if (res.ok) {
            const data = await res.json();
            if (!data.installed) {
              setNeedsBootstrap(true);
            }
            setBootstrapChecked(true);
            return; // Success - exit the retry loop
          }
        } catch (err) {
          if (IS_TAURI && attempt === 0) {
            setBackendStarting(true); // Show "starting" message after first failure
          }
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }
      // After all retries, proceed anyway (web mode or backend failed silently)
      setBootstrapChecked(true);
    };
    checkBootstrap();
  }, []);


  if (!bootstrapChecked) {
    if (backendStarting) {
      return (
        <div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:'#090b0f',color:'white',flexDirection:'column',gap:'16px'}}>
          <div style={{width:'48px',height:'48px',border:'4px solid rgba(249,115,22,0.2)',borderTop:'4px solid #f97316',borderRadius:'50%',animation:'spin 1s linear infinite'}} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{color:'#f97316',fontWeight:600,fontSize:'16px',margin:0}}>Starting DocForge backend...</p>
          <p style={{color:'#64748b',fontSize:'13px',margin:0}}>This may take 10–20 seconds on first launch</p>
        </div>
      );
    }
    return <PageSkeleton />;
  }

  if (needsBootstrap) {
    return <BootstrapDownloader onComplete={() => setNeedsBootstrap(false)} />;
  }

  return (
    <>
      <div className="app-bg-mesh" />
      <ScrollToTop />
      {!isCanvas && <Header />}
      <main className={`main-content ${mainPadding}`}>
        <ErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/workspace" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />
              <Route path="/canvas" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />
              <Route path="/pdf-to-image" element={<PdfToImage />} />
            <Route path="/image-to-pdf" element={<ImageToPdf />} />
            <Route path="/merge-pdf" element={<MergePdf />} />
            <Route path="/split-pdf" element={<SplitPdf />} />
            <Route path="/compress-pdf" element={<CompressPdf />} />
            <Route path="/rotate-pdf" element={<RotatePdf />} />
            <Route path="/image-converter" element={<ImageConverter />} />
            <Route path="/image-compressor" element={<ImageCompressor />} />
            <Route path="/image-resizer" element={<ImageResizer />} />
            <Route path="/docx-to-pdf" element={<DocxToPdf />} />
            <Route path="/text-to-pdf" element={<TextToPdf />} />
            <Route path="/ai-translator" element={<TranslatePdf />} />
            <Route path="/ai-summarizer" element={<AiSummarizer />} />
            <Route path="/qr-generator" element={<QrGenerator />} />
            <Route path="/protect-pdf" element={<ProtectPdf />} />
            <Route path="/unlock-pdf" element={<UnlockPdf />} />
            <Route path="/remove-pages" element={<RemovePages />} />
            <Route path="/extract-pages" element={<ExtractPages />} />
            <Route path="/organize-pdf" element={<OrganizePdf />} />
            <Route path="/add-watermark" element={<AddWatermark />} />
            <Route path="/add-page-numbers" element={<AddPageNumbers />} />
            <Route path="/sign-pdf" element={<SignPdf />} />
            <Route path="/powerpoint-to-pdf" element={<PowerpointToPdf />} />
            <Route path="/excel-to-pdf" element={<ExcelToPdf />} />
            <Route path="/html-to-pdf" element={<HtmlToPdf />} />
            <Route path="/pdf-to-word" element={<PdfToWord />} />
            <Route path="/crop-pdf" element={<CropPdf />} />
            <Route path="/pdf-forms" element={<PdfForms />} />
            <Route path="/scan-to-pdf" element={<ScanToPdf />} />
            <Route path="/compare-pdf" element={<ComparePdf />} />
            <Route path="/edit-pdf" element={<EditPdf />} />
            <Route path="/repair-pdf" element={<RepairPdf />} />
            <Route path="/pdf-to-excel" element={<PdfToExcel />} />
            <Route path="/pdf-to-powerpoint" element={<PdfToPowerpoint />} />
            <Route path="/pdf-to-pdfa" element={<PdfToPdfa />} />
            <Route path="/redact-pdf" element={<RedactPdf />} />

            <Route path="/ocr-pdf" element={<OcrPdf />} />
            <Route path="/un-ocr-pdf" element={<UnOcrPdf />} />
            <Route path="/conversion-pipeline" element={<ConversionPipeline />} />
            <Route path="/resume-builder" element={<ResumeBuilder />} />
            <Route path="/url-to-pdf" element={<UrlToPdf />} />
            <Route path="/document-viewer" element={<DocumentViewer />} />
            <Route path="/coming-soon/:toolId" element={<ComingSoon />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            {TOOLS.filter(t => !t.implemented).map(t => (
              <Route key={t.id} path={t.path} element={<ComingSoon toolId={t.id} />} />
            ))}

            {/* Auth pages — only accessible when NOT logged in */}
            <Route path="/login" element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            } />
            <Route path="/signup" element={
              <PublicOnlyRoute>
                <SignUp />
              </PublicOnlyRoute>
            } />

            <Route path="/pricing" element={<Pricing />} />



              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      {!hideFooter && <Footer />}
      <AIChatBot />
    </>
  )
}
