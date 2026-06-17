import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Header from './components/Header'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import ErrorBoundary from './components/ErrorBoundary'

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
const SmartConvert = lazy(() => import('./pages/document/SmartConvert'))
const QrGenerator = lazy(() => import('./pages/utility/QrGenerator'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Login = lazy(() => import('./pages/Login'))
const SignUp = lazy(() => import('./pages/SignUp'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
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
const FileUploadZoneDemo = lazy(() => import('./components/FileUploadZoneDemo'))
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
  const { isPro } = useAuth();
  const mainPadding = isPro ? 'pt-[72px]' : 'pt-[88px]';

  return (
    <>
      <div className="app-bg-mesh" />
      <ScrollToTop />
      <Header />
      <main className={`main-content ${mainPadding}`}>
        <ErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/" element={<Home />} />
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
            <Route path="/smart-convert" element={<SmartConvert />} />
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
            <Route path="/upload-demo" element={<FileUploadZoneDemo />} />
            <Route path="/ocr-pdf" element={<OcrPdf />} />
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

            {/* Dashboard — Accessible to all logged-in users */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </>
  )
}
