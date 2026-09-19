import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Lightweight, zero-dependency dynamic head manager
 * Ensures Google, Bing, Open Graph, and Twitter bots see rich metadata on every route.
 */
export default function SEOHead({
  title,
  description,
  keywords,
  canonical,
  schema
}) {
  const location = useLocation();
  const currentUrl = `https://docscalar.app${location.pathname}`;
  const effectiveCanonical = canonical || currentUrl;

  useEffect(() => {
    // 1. Update Document Title
    if (title) {
      document.title = title;
    }

    // Helper to create or update meta tags
    const setMetaTag = (attrName, attrVal, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attrName}="${attrVal}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // 2. Standard Meta Tags
    setMetaTag('name', 'description', description);
    if (keywords) setMetaTag('name', 'keywords', keywords);

    // 3. Canonical Link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', effectiveCanonical);

    // 4. Open Graph Meta Tags
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', effectiveCanonical);
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:site_name', 'DocScalar');

    // 5. Twitter Card Meta Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);

    // 6. Schema.org JSON-LD Script Injection
    let schemaScript = document.getElementById('docscalar-dynamic-schema');
    if (schema) {
      if (!schemaScript) {
        schemaScript = document.createElement('script');
        schemaScript.id = 'docscalar-dynamic-schema';
        schemaScript.type = 'application/ld+json';
        document.head.appendChild(schemaScript);
      }
      schemaScript.textContent = JSON.stringify(schema);
    } else if (schemaScript) {
      schemaScript.remove();
    }

    return () => {
      // Optional cleanup on route change
    };
  }, [title, description, keywords, effectiveCanonical, schema]);

  return null;
}
