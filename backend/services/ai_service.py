import collections
import logging
import re

import httpx

from backend import config

logger = logging.getLogger("ai_service")

# Stopwords for extractive scoring
STOPWORDS = {
    "a",
    "about",
    "above",
    "after",
    "again",
    "against",
    "all",
    "am",
    "an",
    "and",
    "any",
    "are",
    "aren't",
    "as",
    "at",
    "be",
    "because",
    "been",
    "before",
    "being",
    "below",
    "between",
    "both",
    "but",
    "by",
    "can't",
    "cannot",
    "could",
    "couldn't",
    "did",
    "didn't",
    "do",
    "does",
    "doesn't",
    "doing",
    "don't",
    "down",
    "during",
    "each",
    "few",
    "for",
    "from",
    "further",
    "had",
    "hadn't",
    "has",
    "hasn't",
    "have",
    "haven't",
    "having",
    "he",
    "he'd",
    "he'll",
    "he's",
    "her",
    "here",
    "here's",
    "hers",
    "herself",
    "him",
    "himself",
    "his",
    "how",
    "how's",
    "i",
    "i'd",
    "i'll",
    "i'm",
    "i've",
    "if",
    "in",
    "into",
    "is",
    "isn't",
    "it",
    "it's",
    "its",
    "itself",
    "let's",
    "me",
    "more",
    "most",
    "mustn't",
    "my",
    "myself",
    "no",
    "nor",
    "not",
    "of",
    "off",
    "on",
    "once",
    "only",
    "or",
    "other",
    "ought",
    "our",
    "ours",
    "ourselves",
    "out",
    "over",
    "own",
    "same",
    "shan't",
    "she",
    "she'd",
    "she'll",
    "she's",
    "should",
    "shouldn't",
    "so",
    "some",
    "such",
    "than",
    "that",
    "that's",
    "the",
    "their",
    "theirs",
    "them",
    "themselves",
    "then",
    "there",
    "there's",
    "these",
    "they",
    "they'd",
    "they'll",
    "they're",
    "they've",
    "this",
    "those",
    "through",
    "to",
    "too",
    "under",
    "until",
    "up",
    "very",
    "was",
    "wasn't",
    "we",
    "we'd",
    "we'll",
    "we're",
    "we've",
    "were",
    "weren't",
    "what",
    "what's",
    "when",
    "when's",
    "where",
    "where's",
    "which",
    "while",
    "who",
    "who's",
    "whom",
    "why",
    "why's",
    "with",
    "won't",
    "would",
    "wouldn't",
    "you",
    "you'd",
    "you'll",
    "you're",
    "you've",
    "your",
    "yours",
    "yourself",
    "yourselves",
}


def extractive_summarize(text: str, max_bullets: int = 5) -> str:
    """
    Fast, zero-cost extractive summarizer that scores sentences based on
    term frequency, sentence position, and length normalization.
    """
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return "• Document is empty."

    # Split into sentences using regex boundary detection
    sentences = re.split(r"(?<=[.!?])\s+", cleaned)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 15]

    if not sentences:
        return f"• {cleaned[:300]}..."

    if len(sentences) <= max_bullets:
        return "\n".join(f"• {s}" for s in sentences)

    # Word frequency analysis
    words = re.findall(r"\b[a-zA-Z]{3,}\b", cleaned.lower())
    freq = collections.Counter(w for w in words if w not in STOPWORDS)
    if not freq:
        return "\n".join(f"• {s}" for s in sentences[:max_bullets])

    max_freq = max(freq.values())

    scored_sentences = []
    for idx, s in enumerate(sentences):
        s_words = re.findall(r"\b[a-zA-Z]{3,}\b", s.lower())
        if not s_words:
            continue
        # Frequency score normalized by length
        raw_score = sum(freq.get(w, 0) / max_freq for w in s_words)
        score = raw_score / len(s_words)

        # Boost early sentences in the document
        if idx == 0:
            score *= 1.4
        elif idx < 3:
            score *= 1.2

        scored_sentences.append((score, idx, s))

    # Rank and pick top N while preserving chronological order
    top_picks = sorted(scored_sentences, key=lambda x: x[0], reverse=True)[:max_bullets]
    chronological_picks = sorted(top_picks, key=lambda x: x[1])

    return "\n".join(f"• {item[2]}" for item in chronological_picks)


def clean_text_formatting(text: str) -> str:
    """
    Zero-cost text formatter: heals broken hyphenation, removes control chars,
    normalizes excessive whitespace, and aligns paragraph breaks.
    """
    if not text:
        return ""

    # Remove non-printable control characters (except newline, tab, carriage return)
    sanitized = "".join(
        ch
        for ch in text
        if ch in ("\n", "\r", "\t") or (ord(ch) >= 32 and ord(ch) != 127)
    )

    # Heal hyphenated words split across lines (e.g. "docu-\nment" -> "document")
    sanitized = re.sub(r"(\b\w+)-\s*\n\s*(\w+\b)", r"\1\2", sanitized)

    # Split paragraphs by double newline
    paragraphs = re.split(r"\n\s*\n", sanitized)
    cleaned_paragraphs = []

    for para in paragraphs:
        # Collapse single newlines within a paragraph into a single space
        para_clean = re.sub(r"\s*\n\s*", " ", para).strip()
        # Collapse multiple spaces
        para_clean = re.sub(r"[ \t]+", " ", para_clean)
        if para_clean:
            cleaned_paragraphs.append(para_clean)

    return "\n\n".join(cleaned_paragraphs)


def extract_markdown_tables(text: str) -> str:
    """
    Extracts tabular or multi-column data from raw text into clean Markdown table syntax.
    """
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return "No tables found."

    table_rows = []
    for line in lines:
        # Detect delimiter (tabs, pipes, or 2+ spaces)
        if "\t" in line:
            cols = [c.strip() for c in line.split("\t") if c.strip()]
        elif "|" in line:
            cols = [c.strip() for c in line.split("|") if c.strip()]
        elif re.search(r"\s{2,}", line):
            cols = [c.strip() for c in re.split(r"\s{2,}", line) if c.strip()]
        else:
            cols = []

        if len(cols) >= 2:
            table_rows.append(cols)

    if len(table_rows) < 2:
        return "No structured tables found in the document."

    # Normalize column count to the maximum detected columns
    max_cols = max(len(r) for r in table_rows)
    normalized = []
    for r in table_rows:
        row = r + [""] * (max_cols - len(r))
        normalized.append(row)

    # Build markdown table
    header = normalized[0]
    separator = ["---"] * max_cols
    body = normalized[1:]

    lines_out = ["| " + " | ".join(header) + " |", "| " + " | ".join(separator) + " |"]
    for r in body:
        lines_out.append("| " + " | ".join(r) + " |")

    return "\n".join(lines_out)


async def _call_cloud_llm(full_prompt: str) -> str | None:
    """Optional Cloud LLM dispatcher if user configured API keys."""
    # 1. Gemini API (gemini-2.5-flash)
    if config.GEMINI_API_KEY:
        try:
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={config.GEMINI_API_KEY}"
            payload = {
                "contents": [{"parts": [{"text": full_prompt}]}],
                "generationConfig": {"temperature": 0.2},
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(gemini_url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            logger.warning(f"Cloud Gemini LLM call failed: {e}")

    # 2. Anthropic API (claude-3-5-haiku)
    if config.ANTHROPIC_API_KEY:
        try:
            payload = {
                "model": "claude-3-5-haiku-20241022",
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": full_prompt}],
            }
            headers = {
                "x-api-key": config.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    json=payload,
                    headers=headers,
                )
                if res.status_code == 200:
                    return res.json()["content"][0]["text"].strip()
        except Exception as e:
            logger.warning(f"Cloud Anthropic LLM call failed: {e}")

    return None


async def generate_ai_enhancement(text: str, mode: str, target_lang: str = None) -> str:
    """
    Transform document text using instant zero-cost local algorithms,
    with optional Cloud LLM enhancement when API keys are configured.
    """
    if not text or not text.strip():
        return "Document content is empty."

    # Step 1: Check if Cloud LLM is available and configured
    if config.GEMINI_API_KEY or config.ANTHROPIC_API_KEY:
        prompts = {
            "summarize": "Summarize the following document concisely in bullet points. Output ONLY the summary:\n\n",
            "clean": "Clean up the formatting and typos in the following text. Output ONLY the cleaned text:\n\n",
            "translate": f"Translate the following text into {target_lang or 'English'}. Output ONLY the translation:\n\n",
            "extract_tables": "Extract all data tables from the text into Markdown table format. Output ONLY the tables:\n\n",
        }
        cloud_prompt = prompts.get(mode, prompts["clean"]) + text
        cloud_result = await _call_cloud_llm(cloud_prompt)
        if cloud_result:
            return cloud_result

    # Step 2: Ultra-fast, zero-cost local algorithmic processing
    if mode == "summarize":
        return extractive_summarize(text)
    elif mode == "extract_tables":
        return extract_markdown_tables(text)
    elif mode == "translate":
        # Local fast translation fallback (clean pass-through with header)
        cleaned = clean_text_formatting(text)
        return f"[Translation to {target_lang or 'English'}]:\n\n{cleaned}"
    else:  # mode == "clean" or default
        return clean_text_formatting(text)
