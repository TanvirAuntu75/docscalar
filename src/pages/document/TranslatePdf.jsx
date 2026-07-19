import React from 'react';
import ToolPageLayout from '../../components/ToolPageLayout';
import SEOHead from '../../components/SEOHead';
import { Download, Cpu, Zap, ShieldCheck } from 'lucide-react';

export default function TranslatePdf() {
  return (
    <ToolPageLayout
      categoryTitle="PDF Intelligence" minTier="pro"
      title="AI Translator"
      description="Translate documents into target languages natively on your device"
    >
      <SEOHead 
        title="AI Translator | DocForge" 
        description="Translate documents securely Client Side using the DocForge desktop app." 
      />
      
      <div style={{
        maxWidth: '900px',
        margin: '4rem auto',
        padding: '2rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2.5rem',
        minHeight: '60vh',
        justifyContent: 'center'
      }}>
        
        {/* Icon Header */}
        <div style={{
          width: '96px',
          height: '96px',
          borderRadius: '24px',
          background: 'rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.05)',
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          <Cpu style={{ width: '48px', height: '48px', color: 'var(--color-text, #111)' }} />
        </div>
        
        {/* Typography block */}
        <div>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: '800',
            letterSpacing: '-0.04em',
            margin: '0 0 1rem 0',
            color: 'var(--color-text, #111)'
          }}>
            Unlock On Device AI Translation
          </h2>
          <p style={{
            fontSize: '1.125rem',
            lineHeight: '1.6',
            color: 'var(--color-text-secondary, #666)',
            maxWidth: '65ch',
            margin: '0 auto',
            textWrap: 'balance'
          }}>
            To guarantee 100% data privacy and maximum performance, our AI translation engine runs exclusively on your local hardware. Download the DocForge Desktop App to access this powerful feature.
          </p>
        </div>

        {/* Value Prop Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          width: '100%',
          marginTop: '1rem',
          maxWidth: '800px'
        }}>
          <div style={{ 
            textAlign: 'left', 
            padding: '2rem', 
            background: 'rgba(0, 0, 0, 0.02)', 
            borderRadius: '16px', 
            border: '1px solid rgba(0,0,0,0.06)' 
          }}>
            <Zap style={{ width: '28px', height: '28px', color: 'var(--color-text, #111)', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700', margin: '0 0 0.5rem 0', color: 'var(--color-text, #111)' }}>Zero Latency</h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary, #666)', margin: 0, lineHeight: '1.5' }}>Translates instantly using your local CPU/GPU without waiting on cloud server queues or bandwidth limitations.</p>
          </div>
          
          <div style={{ 
            textAlign: 'left', 
            padding: '2rem', 
            background: 'rgba(0, 0, 0, 0.02)', 
            borderRadius: '16px', 
            border: '1px solid rgba(0,0,0,0.06)' 
          }}>
            <ShieldCheck style={{ width: '28px', height: '28px', color: 'var(--color-text, #111)', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700', margin: '0 0 0.5rem 0', color: 'var(--color-text, #111)' }}>100% Private</h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary, #666)', margin: 0, lineHeight: '1.5' }}>Your sensitive documents never leave your device. No cloud uploads required, completely Local Compute capable.</p>
          </div>
        </div>

        {/* CTA Button */}
        <button 
          style={{
            marginTop: '2rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1.125rem 2.5rem',
            fontSize: '1rem',
            fontWeight: '700',
            color: '#fff',
            background: 'var(--color-text, #111)',
            border: 'none',
            borderRadius: '9999px',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.1)'
          }}
          onMouseOver={(e) => { 
            e.currentTarget.style.transform = 'translateY(-2px)'; 
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'; 
          }}
          onMouseOut={(e) => { 
            e.currentTarget.style.transform = 'translateY(0)'; 
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)'; 
          }}
          onClick={() => alert("Desktop app download started.")}
        >
          <Download style={{ width: '20px', height: '20px' }} />
          Download Desktop App
        </button>

      </div>
    </ToolPageLayout>
  );
}
