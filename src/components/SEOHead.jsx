import { useEffect } from 'react'

export default function SEOHead({ title, description }) {
  useEffect(() => {
    document.title = title ? `${title} | DocForge` : 'DocForge — Free Online PDF, Image & Document Tools'
    const meta = document.querySelector('meta[name="description"]')
    if (meta && description) meta.setAttribute('content', description)
  }, [title, description])
  return null
}
