import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Header from './components/Header'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import { BACKEND_URL } from './utils/api'
import AIChatBot from './components/AIChatBot'

// Resilient dynamic importer that auto-reloads once if a Vite HMR or browser chunk cache error occurs
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.removeItem('page-has-been-force-refreshed');
      return component;
    } catch (error) {
      if (!pageHasBeenForceRefreshed) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        if ('serviceWorker' in navigator) {
          try {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (let reg of regs) await reg.unregister();
          } catch {}
        }
        window.location.reload();
        return { default: () => null };
      }
      throw error;
    }
  });

const Home = lazyWithRetry(() => import('./pages/Home'))
const PdfToImage = lazyWithRetry(() => import('./pages/pdf/PdfToImage'))
const ImageToPdf = lazyWithRetry(() => import('./pages/pdf/ImageToPdf'))
const MergePdf = lazyWithRetry(() => import('./pages/pdf/MergePdf'))
const SplitPdf = lazyWithRetry(() => import('./pages/pdf/SplitPdf'))
const CompressPdf = lazyWithRetry(() => import('./pages/pdf/CompressPdf'))
const RotatePdf = lazyWithRetry(() => import('./pages/pdf/RotatePdf'))
const ImageConverter = lazyWithRetry(() => import('./pages/image/ImageConverter'))
const ImageCompressor = lazyWithRetry(() => import('./pages/image/ImageCompressor'))
const ImageResizer = lazyWithRetry(() => import('./pages/image/ImageResizer'))
const DocxToPdf = lazyWithRetry(() => import('./pages/document/DocxToPdf'))
const TextToPdf = lazyWithRetry(() => import('./pages/document/TextToPdf'))
const TranslatePdf = lazyWithRetry(() => import('./pages/document/TranslatePdf'))
const AiSummarizer = lazyWithRetry(() => import('./pages/document/AiSummarizer'))
const QrGenerator = lazyWithRetry(() => import('./pages/utility/QrGenerator'))
const NotFound = lazyWithRetry(() => import('./pages/NotFound'))
const Login = lazyWithRetry(() => import('./pages/Login'))
const SignUp = lazyWithRetry(() => import('./pages/SignUp'))
const Pricing = lazyWithRetry(() => import('./pages/Pricing'))

const ComingSoon = lazyWithRetry(() => import('./pages/utility/ComingSoon'))
const Privacy = lazyWithRetry(() => import('./pages/Privacy'))
const Terms = lazyWithRetry(() => import('./pages/Terms'))
const ProtectPdf = lazyWithRetry(() => import('./pages/pdf/ProtectPdf'))
const UnlockPdf = lazyWithRetry(() => import('./pages/pdf/UnlockPdf'))
const RemovePages = lazyWithRetry(() => import('./pages/pdf/RemovePages'))
const ExtractPages = lazyWithRetry(() => import('./pages/pdf/ExtractPages'))
const OrganizePdf = lazyWithRetry(() => import('./pages/pdf/OrganizePdf'))
const AddWatermark = lazyWithRetry(() => import('./pages/pdf/AddWatermark'))
const AddPageNumbers = lazyWithRetry(() => import('./pages/pdf/AddPageNumbers'))
const SignPdf = lazyWithRetry(() => import('./pages/pdf/SignPdf'))

const PowerpointToPdf = lazyWithRetry(() => import('./pages/document/PowerpointToPdf'))
const ExcelToPdf = lazyWithRetry(() => import('./pages/document/ExcelToPdf'))
const HtmlToPdf = lazyWithRetry(() => import('./pages/document/HtmlToPdf'))
const PdfToWord = lazyWithRetry(() => import('./pages/document/PdfToWord'))
const CropPdf = lazyWithRetry(() => import('./pages/pdf/CropPdf'))
const PdfForms = lazyWithRetry(() => import('./pages/pdf/PdfForms'))
const ScanToPdf = lazyWithRetry(() => import('./pages/pdf/ScanToPdf'))
const ComparePdf = lazyWithRetry(() => import('./pages/pdf/ComparePdf'))
const EditPdf = lazyWithRetry(() => import('./pages/pdf/EditPdf'))
const RepairPdf = lazyWithRetry(() => import('./pages/pdf/RepairPdf'))
const PdfToExcel = lazyWithRetry(() => import('./pages/document/PdfToExcel'))
const PdfToPowerpoint = lazyWithRetry(() => import('./pages/document/PdfToPowerpoint'))
const PdfToPdfa = lazyWithRetry(() => import('./pages/document/PdfToPdfa'))
const RedactPdf = lazyWithRetry(() => import('./pages/pdf/RedactPdf'))
const OcrPdf = lazyWithRetry(() => import('./pages/pdf/OcrPdf'))
const UnOcrPdf = lazyWithRetry(() => import('./pages/pdf/UnOcrPdf'))
const BatesNumbering = lazyWithRetry(() => import('./pages/pdf/BatesNumbering'))
const ConversionPipeline = lazyWithRetry(() => import('./pages/utility/ConversionPipeline'))
const ResumeBuilder = lazyWithRetry(() => import('./pages/utility/ResumeBuilder'))
const UrlToPdf = lazyWithRetry(() => import('./pages/utility/UrlToPdf'))
const UnzipFile = lazyWithRetry(() => import('./pages/utility/UnzipFile'))
const DocumentViewer = lazyWithRetry(() => import('./pages/utility/DocumentViewer'))
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

  // Smooth window reveal for Tauri desktop mode — prevents black/white screen flashes on launch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isTauri = typeof window.__TAURI__ !== 'undefined' || typeof window.__TAURI_INTERNALS__ !== 'undefined';
      if (isTauri) {
        import('@tauri-apps/api/webviewWindow').then(({ getCurrentWebviewWindow }) => {
          getCurrentWebviewWindow().show();
        }).catch(() => {});
      }
    }
  }, []);

  // Non-blocking backend health ping — silently retries in the background,
  // never blocks the UI. The app is fully usable while the backend starts.
  useEffect(() => {
    const IS_TAURI = typeof window.__TAURI__ !== 'undefined';
    const maxRetries = IS_TAURI ? 25 : 3;
    const retryDelay = 2000;
    let cancelled = false;

    const pingBackend = async () => {
      for (let attempt = 0; attempt < maxRetries && !cancelled; attempt++) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/bootstrap/status`);
          if (res.ok) {
            console.log('[DocForge] Backend connected.');
            return;
          }
        } catch {
          // Backend not ready yet — silent retry
        }
        if (attempt < maxRetries - 1 && !cancelled) {
          await new Promise(r => setTimeout(r, retryDelay));
        }
      }
      if (!cancelled) {
        console.warn('[DocForge] Backend unreachable after retries. Client-side tools still work.');
      }
    };
    pingBackend();
    return () => { cancelled = true; };
  }, []);

  const isWorkspace = location.pathname === '/workspace';
  const isResumeBuilder = location.pathname === '/resume-builder';
  const hideFooter = isWorkspace || isResumeBuilder || isCanvas;
  const mainPadding = isCanvas ? 'pt-0' : (isPro ? 'pt-[72px]' : 'pt-[88px]');



  return (
    <>
      <div className="app-bg-mesh" />
      <ScrollToTop />
      {!isCanvas && <Header />}
      <main className={`main-content ${mainPadding}`}>
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
            <Route path="/bates-numbering" element={<BatesNumbering />} />
            <Route path="/conversion-pipeline" element={<ConversionPipeline />} />
            <Route path="/resume-builder" element={<ResumeBuilder />} />
            <Route path="/url-to-pdf" element={<UrlToPdf />} />
            <Route path="/unzip-file" element={<UnzipFile />} />
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
      </main>
      {!hideFooter && <Footer />}
      <AIChatBot />
    </>
  )
}
