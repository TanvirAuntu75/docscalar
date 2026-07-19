import ToolPageLayout from '../../components/ToolPageLayout';
import SEOHead from '../../components/SEOHead';
import AdPlaceholder from '../../components/AdPlaceholder';
import { useNavigate } from 'react-router-dom';

export default function AiSummarizer() {
  const navigate = useNavigate();

  return (
    <ToolPageLayout
      categoryTitle="PDF Intelligence" minTier="pro"
      title="AI Summarizer"
      description="Extract key highlights, structure summaries, and bulleted insights from your files natively using local AI"
      files={[]}
      onFileSwitch={() => {}}>
      <SEOHead 
        title="AI PDF Summarizer Online Free: Summarize Documents — DocForge" 
        description="Summarize PDF and Word documents natively using local Gemma-3-4B. Extract key insights, bullet points, and summaries Client Side."
      />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: '2rem',
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '16px',
        maxWidth: '600px',
        margin: '2rem auto'
      }} className="animate-[fadeIn_0.25s_ease-out]">
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          color: 'var(--color-primary)'
        }}>
          <span className="material-symbols-outlined text-[36px]">hourglass_empty</span>
        </div>

        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '0.75rem'
        }}>
          AI Summarizer Coming Soon!
        </h2>

        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
          maxWidth: '460px',
          marginBottom: '2rem'
        }}>
          We are currently polishing the local summarization engines to ensure high quality outline generation and flat memory footprints.
          In the meantime, our <strong>AI Translator</strong> is fully functional and ready to translate your files locally on your GPU!
        </p>

        <button 
          onClick={() => navigate('/translate-pdf')}
          className="btn-theme-primary"
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '0.8rem',
            cursor: 'pointer',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span className="material-symbols-outlined text-[16px]">translate</span>
          <span>Try AI Translator Now</span>
        </button>
      </div>

      <AdPlaceholder format="leaderboard" />
    </ToolPageLayout>
  );
}
