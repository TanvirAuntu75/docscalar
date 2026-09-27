import json
import logging
import re
from typing import Any

import httpx

from backend import config

logger = logging.getLogger("canvas_agent")

# Supported tools in the canvas
AVAILABLE_TOOLS = {
    "merge-pdf": {"accepts": [".pdf"], "type": "multi"},
    "split-pdf": {"accepts": [".pdf"], "type": "single"},
    "compress-pdf": {"accepts": [".pdf"], "type": "single"},
    "rotate-pdf": {"accepts": [".pdf"], "type": "single"},
    "protect-pdf": {"accepts": [".pdf"], "type": "single"},
    "unlock-pdf": {"accepts": [".pdf"], "type": "single"},
    "ocr-pdf": {"accepts": [".pdf"], "type": "single"},
    "docx-to-pdf": {"accepts": [".docx", ".doc", ".odt"], "type": "single"},
    "excel-to-pdf": {"accepts": [".xlsx", ".xls", ".csv", ".ods"], "type": "single"},
    "powerpoint-to-pdf": {"accepts": [".pptx", ".ppt", ".odp"], "type": "single"},
    "pdf-to-word": {"accepts": [".pdf"], "type": "single"},
    "pdf-to-excel": {"accepts": [".pdf"], "type": "single"},
    "pdf-to-powerpoint": {"accepts": [".pdf"], "type": "single"},
    "image-converter": {"accepts": ["image/*"], "type": "single"},
    "image-to-pdf": {"accepts": ["image/*"], "type": "multi"},
    "image-compressor": {"accepts": ["image/*"], "type": "single"},
    "image-resizer": {"accepts": ["image/*"], "type": "single"},
    "qr-generator": {"accepts": [], "type": "utility"},
    "ai-translator": {"accepts": [".pdf", ".txt", ".docx"], "type": "single"},
    "unzip-file": {"accepts": [".zip"], "type": "single"},
    "sign-pdf": {"accepts": [".pdf"], "type": "single"},
    "add-watermark": {"accepts": [".pdf"], "type": "single"},
    "add-page-numbers": {"accepts": [".pdf"], "type": "single"},
    "remove-pages": {"accepts": [".pdf"], "type": "single"},
    "crop-pdf": {"accepts": [".pdf"], "type": "single"},
    "edit-pdf": {"accepts": [".pdf"], "type": "single"},
    "html-to-pdf": {"accepts": [".html"], "type": "single"},
    "text-to-pdf": {"accepts": [".txt", ".md"], "type": "single"},
    "redact-pdf": {"accepts": [".pdf"], "type": "single"},
    "compare-pdf": {"accepts": [".pdf"], "type": "multi"},
    "pdf-to-pdfa": {"accepts": [".pdf"], "type": "single"},
    "url-to-pdf": {"accepts": [], "type": "utility"},
    "pdf-to-image": {"accepts": [".pdf"], "type": "single"},
    "pdf-forms": {"accepts": [".pdf"], "type": "single"},
    "repair-pdf": {"accepts": [".pdf"], "type": "single"},
    "un-ocr-pdf": {"accepts": [".pdf"], "type": "single"},
    "extract-pages": {"accepts": [".pdf"], "type": "single"},
    "organize-pdf": {"accepts": [".pdf"], "type": "single"},
    "bates-numbering": {"accepts": [".pdf"], "type": "single"},
    "condition-router": {"accepts": [".pdf", ".docx", ".xlsx", ".png", ".jpg"], "type": "single"},
    "scan-to-pdf": {"accepts": [], "type": "utility"},
    "conversion-pipeline": {"accepts": [".pdf", ".docx", ".xlsx", ".pptx", ".png", ".jpg", ".txt"], "type": "multi"},
    "resume-builder": {"accepts": [], "type": "utility"},
    "document-viewer": {"accepts": [".pdf", ".docx", ".xlsx", ".txt"], "type": "single"},
}

IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"]

# Synchronized Tool Synonyms for Heuristic Matching
SYNONYMS_REGISTRY = {
    "merge-pdf": ["merge", "combine", "join", "stitch", "bundle", "concatenate"],
    "split-pdf": ["split", "cut", "divide", "separate", "extract pages", "half"],
    "compress-pdf": ["compress", "shrink", "reduce size", "minimize"],
    "ocr-pdf": ["ocr", "recognize", "searchable", "read text", "extract text"],
    "rotate-pdf": ["rotate", "turn", "spin", "landscape", "portrait"],
    "protect-pdf": ["protect", "lock", "encrypt", "add password", "restrict"],
    "unlock-pdf": ["unlock", "decrypt", "remove password", "bypass lock"],
    "docx-to-pdf": ["word to pdf", "docx to pdf", "convert docx", "convert word"],
    "excel-to-pdf": ["excel to pdf", "xlsx to pdf", "csv to pdf", "sheet to pdf"],
    "powerpoint-to-pdf": [
        "powerpoint to pdf",
        "ppt to pdf",
        "pptx to pdf",
        "slides to pdf",
    ],
    "html-to-pdf": ["html to pdf", "html", "convert html", "web to pdf"],
    "pdf-to-word": [
        "pdf to word",
        "pdf to docx",
        "to word",
        "to docx",
        "convert pdf to word",
    ],
    "pdf-to-excel": [
        "pdf to excel",
        "pdf to sheet",
        "to excel",
        "to xlsx",
        "pdf to xlsx",
        "convert pdf to excel",
    ],
    "pdf-to-powerpoint": [
        "pdf to powerpoint",
        "pdf to ppt",
        "to powerpoint",
        "to ppt",
        "convert pdf to powerpoint",
    ],
    "image-converter": [
        "convert image format",
        "png to jpg",
        "jpeg to webp",
        "change format",
        "image format",
        "convert to png",
        "convert to jpg",
        "convert image",
        "convert them to png",
    ],
    "image-to-pdf": [
        "images to pdf",
        "photos to pdf",
        "pictures to pdf",
        "image to pdf",
        "jpg to pdf",
        "png to pdf",
    ],
    "image-compressor": ["compress image", "shrink image", "reduce image size"],
    "image-resizer": ["resize image", "scale image", "change dimensions"],
    "unzip-file": ["unzip", "extract zip", "decompress", "expand zip"],
    "add-watermark": ["watermark", "stamp", "add stamp"],
    "add-page-numbers": ["page number", "paginate", "add page numbers"],
    "remove-pages": ["remove page", "delete page", "exclude page"],
    "crop-pdf": ["crop"],
    "edit-pdf": ["edit"],
    "qr-generator": ["qr", "barcode", "generate qr"],
    "ai-translator": ["translate", "translate file", "language translation"],
    "text-to-pdf": ["text to pdf", "txt to pdf", "convert text"],
    "sign-pdf": ["sign", "signature", "sign document"],
    "redact-pdf": ["redact", "blackout", "hide sensitive info"],
    "compare-pdf": ["compare", "diff pdf", "compare documents"],
    "pdf-to-pdfa": ["pdf to pdfa", "archive pdf", "pdf/a"],
    "url-to-pdf": ["url to pdf", "convert website", "website to pdf"],
    "pdf-to-image": [
        "pdf to image",
        "pdf to images",
        "pdf to jpg",
        "pdf to png",
        "pdf to pictures",
        "pdf to photos",
        "extract images",
        "extract image",
        "extract images from pdf",
        "extract photos",
    ],
    "pdf-forms": ["fill form", "pdf form", "form fields"],
    "repair-pdf": ["repair", "fix pdf", "restore pdf"],
    "un-ocr-pdf": ["un-ocr", "unocr", "flatten", "rasterize", "make non-searchable", "remove text layer"],
    "extract-pages": ["extract page", "extract pages", "pull pages", "isolate pages"],
    "organize-pdf": ["organize", "reorder pages", "arrange pages", "rearrange"],
    "bates-numbering": ["bates numbering", "bates stamp", "legal stamp", "sequential number"],
    "condition-router": ["condition", "branch", "router", "filter document"],
    "scan-to-pdf": ["scan", "scanner", "camera to pdf"],
    "conversion-pipeline": ["pipeline", "batch convert", "multi convert"],
    "resume-builder": ["resume", "cv builder", "cv maker", "curriculum vitae"],
    "document-viewer": ["view pdf", "preview document", "read pdf"],
}


def get_levenshtein_distance(s1: str, s2: str) -> int:
    if len(s1) < len(s2):
        return get_levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def get_word_similarity(w1: str, w2: str) -> float:
    dist = get_levenshtein_distance(w1, w2)
    max_len = max(len(w1), len(w2))
    return 1.0 - (dist / max_len) if max_len > 0 else 1.0


def stem_word(word: str) -> str:
    w = word.lower().strip()
    w = w.removesuffix("ing")
    w = w.removesuffix("ed")
    if w.endswith("ies"):
        w = w[:-3] + "y"
    elif w.endswith("s") and not w.endswith("ss"):
        w = w[:-1]
    w = w.removesuffix("ment")
    return w


def get_action_id_from_text(text: str) -> str:
    text = text.lower().strip()
    user_words = text.split()
    stemmed_user_words = [stem_word(w) for w in user_words]

    def has(pattern: str) -> bool:
        escaped = re.escape(pattern)
        return bool(re.search(r"\b" + escaped + r"\b", text))

    def has_any(*patterns: str) -> bool:
        return any(has(p) for p in patterns)

    # High-priority explicit conversions (PDF to other formats)
    if has_any("pdf to word", "to word", "to docx", "pdf to doc"):
        return "pdf-to-word"
    if has_any("pdf to excel", "to excel", "to sheet", "to csv", "pdf to sheet"):
        return "pdf-to-excel"
    if has_any("pdf to powerpoint", "to powerpoint", "to ppt", "pdf to ppt"):
        return "pdf-to-powerpoint"
    if re.search(
        r"\b(?:each\s+(?:of\s+the\s+)?|all\s+(?:the\s+)?)?(?:images?|photos?|pictures?|pngs?|jpe?gs?)\s+(?:in)?to\s+(?:separate\s+|individual\s+)?pdf\b",
        text,
    ) or has_any(
        "images to pdf",
        "photos to pdf",
        "pictures to pdf",
        "image to pdf",
        "jpg to pdf",
        "png to pdf",
        "jpeg to pdf",
    ):
        return "image-to-pdf"

    # Check multi-word synonym matching (fuzzy)
    def matches_synonym_fuzzy(synonym: str) -> bool:
        syn_words = synonym.lower().split()
        for syn_w in syn_words:
            stemmed_syn_w = stem_word(syn_w)
            matched = False
            for user_w in stemmed_user_words:
                if (
                    user_w == stemmed_syn_w
                    or get_word_similarity(user_w, stemmed_syn_w) >= 0.7
                ):
                    matched = True
                    break
            if not matched:
                return False
        return True

    # Standard matches based on synonyms with word boundary and fuzzy checks
    for action_id, synonyms in SYNONYMS_REGISTRY.items():
        for syn in synonyms:
            if has(syn) or matches_synonym_fuzzy(syn):
                return action_id

    # Fallbacks
    if has_any("word", "doc", "docx"):
        return "docx-to-pdf"
    if has_any("excel", "xlsx", "xls", "csv"):
        return "excel-to-pdf"
    if has_any("powerpoint", "ppt", "pptx"):
        return "powerpoint-to-pdf"
    if has_any(
        "html to pdf", "convert html to pdf", "web to pdf", "convert web to pdf", "html"
    ):
        return "html-to-pdf"

    return ""


def validate_planned_steps(steps: Any) -> list[dict[str, Any]]:
    """
    Validates and sanitizes plan steps generated by an LLM.
    Ensures actionId is an available tool and inputs are clean strings.
    """
    if not isinstance(steps, list):
        return []
    valid_steps = []
    for step in steps:
        if not isinstance(step, dict):
            continue
        action_id = step.get("actionId")
        if not action_id or action_id not in AVAILABLE_TOOLS:
            logger.warning(f"Discarding invalid actionId '{action_id}' in LLM plan")
            continue
        raw_inputs = step.get("inputs", [])
        if not isinstance(raw_inputs, list):
            raw_inputs = [raw_inputs] if raw_inputs else []
        valid_steps.append({
            "step_id": step.get("step_id", len(valid_steps)),
            "actionId": action_id,
            "inputs": [str(inp) for inp in raw_inputs if inp is not None],
        })
    return valid_steps


async def generate_llm_plan(
    query: str, files: list[str]
) -> tuple[bool, list[dict[str, Any]]]:
    """
    Attempts to get a structured execution plan from the local LLM.
    """
    tools_list = ", ".join(AVAILABLE_TOOLS.keys())
    system_prompt = (
        "You are a workflow planner. You are given a user request and a list of files on a canvas.\n"
        f"Available tool IDs: {tools_list}\n"
        f"Available files: {json.dumps(files)}\n\n"
        "Note: 'unzip-file' is a special tool that takes a ZIP archive and extracts its files on the canvas.\n"
        "IMPORTANT: You MUST insert an 'unzip-file' step whenever a tool that outputs a ZIP (like 'split-pdf' or 'pdf-to-image') needs to connect to a downstream tool that expects individual files (like 'pdf-to-word', 'compress-pdf', etc.).\n"
        "Generate a step-by-step pipeline. For intermediate outputs, refer to them as 'output:S' where S is the step index (e.g. 'output:0').\n"
        "IMPORTANT: When the user refers to 'the pdf' or 'the document' and there are files generated as outputs from previous operations (e.g., 'merged_document.pdf' or containing '_output' / '_summary' or at the end of the file list), you MUST prioritize using the latest/recently generated output files as inputs rather than starting with the original input files.\n"
        "Return ONLY a JSON object of this format. Do not include markdown code block syntax, conversational preamble, or explanations:\n"
        "{\n"
        '  "steps": [\n'
        '    { "step_id": 0, "actionId": "tool-id", "inputs": ["filename"] },\n'
        '    { "step_id": 1, "actionId": "tool-id", "inputs": ["output:0"] }\n'
        "  ]\n"
        "}"
    )

    # Try Gemini API (State-of-the-art cloud LLM agent)
    if config.GEMINI_API_KEY:
        try:
            gemini_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
            payload = {
                "contents": [
                    {"parts": [{"text": f"{system_prompt}\n\nUser request: {query}"}]}
                ],
                "generationConfig": {"responseMimeType": "application/json"},
            }
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(10.0, connect=2.0)
            ) as client:
                res = await client.post(
                    gemini_url,
                    json=payload,
                    headers={
                        "Content-Type": "application/json",
                        "x-goog-api-key": config.GEMINI_API_KEY,
                    },
                )
                if res.status_code == 200:
                    res_data = res.json()
                    text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                    data = json.loads(text.strip())
                    if "steps" in data:
                        valid_steps = validate_planned_steps(data["steps"])
                        if valid_steps:
                            return True, valid_steps
        except Exception as e:
            logger.error(f"Gemini API planning error: {e!s}")

    # Try Anthropic Claude (Alternative cloud LLM agent)
    if config.ANTHROPIC_API_KEY:
        try:
            payload = {
                "model": "claude-3-5-haiku-20241022",
                "max_tokens": 1024,
                "system": system_prompt,
                "messages": [{"role": "user", "content": query}],
            }
            headers = {
                "x-api-key": config.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            }
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(10.0, connect=2.0)
            ) as client:
                res = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    json=payload,
                    headers=headers,
                )
                if res.status_code == 200:
                    text = res.json()["content"][0]["text"]
                    # Clean up any potential markdown fences
                    text = re.sub(r"```json\s*", "", text)
                    text = re.sub(r"```\s*$", "", text).strip()
                    data = json.loads(text)
                    if "steps" in data:
                        valid_steps = validate_planned_steps(data["steps"])
                        if valid_steps:
                            return True, valid_steps
        except Exception as e:
            logger.error(f"Anthropic Claude API planning error: {e!s}")

    return False, []


def generate_heuristic_plan(
    query: str, files: list[str] | None = None
) -> list[dict[str, Any]]:
    """
    Fallback rule-based heuristic planner that acts like an agent.
    """
    if files is None:
        files = []
    # Verbs denoting tool transitions
    verbs = [
        "merge",
        "combine",
        "join",
        "stitch",
        "split",
        "cut",
        "divide",
        "compress",
        "shrink",
        "reduce",
        "rotate",
        "turn",
        "spin",
        "protect",
        "lock",
        "encrypt",
        "unlock",
        "decrypt",
        "ocr",
        "recognize",
        "sign",
        "watermark",
        "stamp",
        "paginate",
        "remove",
        "delete",
        "crop",
        "edit",
        "qr",
        "convert",
        "translate",
        "unzip",
        "unarchive",
        "decompress",
        "expand",
    ]
    # Split query by sequential clauses, splitting on 'and' only when followed by a transition verb or distributive keyword
    pattern = (
        r"\b(?:and\s+then|then|after\s+that|next)\b|\band\b(?=\s*(?:"
        + "|".join(verbs)
        + r"|each|every|individually|separately))"
    )
    clauses = re.split(pattern, query, flags=re.IGNORECASE)
    clauses = [c.strip() for c in clauses if c.strip()]

    steps = []
    # Active pool maintains files and intermediate step outputs
    # Structure: (name_or_ref, extension, source_step_id_or_none)
    active_pool = []
    for f in files:
        from pathlib import Path

        ext = Path(f).suffix.lower()
        active_pool.append((f, ext, None))

    next_step_id = 0
    for clause in clauses:
        action_id = get_action_id_from_text(clause)
        if not action_id:
            continue

        tool_config = AVAILABLE_TOOLS.get(action_id)
        if not tool_config:
            continue

        # Check if we need to auto-inject an unzip step
        accepts = tool_config["accepts"]
        is_target_image = "image/*" in accepts
        is_target_pdf = ".pdf" in accepts
        is_target_office = any(
            x in accepts
            for x in [".docx", ".doc", ".xlsx", ".xls", ".csv", ".pptx", ".ppt"]
        )

        if ".zip" not in accepts and (
            is_target_pdf or is_target_image or is_target_office
        ):
            zip_item = None
            for item in reversed(active_pool):
                name, ext, src_id = item
                if ext == ".zip":
                    zip_item = item
                    break

            if zip_item:
                zip_name, zip_ext, zip_src_id = zip_item
                zip_ref = f"output:{zip_src_id}" if zip_src_id is not None else zip_name

                steps.append(
                    {
                        "step_id": next_step_id,
                        "actionId": "unzip-file",
                        "inputs": [zip_ref],
                    }
                )
                active_pool.remove(zip_item)

                injected_ext = ".pdf"
                if is_target_image:
                    injected_ext = ".png"
                elif ".docx" in accepts:
                    injected_ext = ".docx"
                elif ".xlsx" in accepts:
                    injected_ext = ".xlsx"
                elif ".pptx" in accepts:
                    injected_ext = ".pptx"

                active_pool.append(
                    (f"output:{next_step_id}", injected_ext, next_step_id)
                )
                next_step_id += 1

        step_inputs = []

        # Check if distributive execution is requested
        is_distributive = bool(
            re.search(
                r"\b(?:each|separately|individually|one\s+by\s+one|separate\s+pdf|individual\s+pdf)\b",
                clause,
                re.IGNORECASE,
            )
            or re.search(
                r"\b(?:each|separately|individually|one\s+by\s+one|separate\s+pdf|individual\s+pdf)\b",
                query,
                re.IGNORECASE,
            )
        )

        # Heuristic matching of inputs from the active pool based on tool type and file formats
        if tool_config["type"] == "multi":
            # Multi-input tools like merge-pdf or image-to-pdf take all matching inputs
            accepts = tool_config["accepts"]
            matched_pool_items = []

            for item in active_pool:
                name, ext, src_id = item
                is_match = False
                if "image/*" in accepts:
                    is_match = ext in IMAGE_EXTENSIONS
                else:
                    is_match = ext in accepts

                if is_match:
                    matched_pool_items.append(item)

            # Remove matched items from active pool so they don't get matched again in this level
            for item in matched_pool_items:
                active_pool.remove(item)

            if is_distributive and len(matched_pool_items) > 1:
                # Distributive execution: generate 1-to-1 operations for each matching input
                out_ext = ".pdf"
                if action_id == "split-pdf":
                    out_ext = ".zip"
                elif action_id == "pdf-to-image":
                    out_ext = ".png"
                elif action_id == "pdf-to-word":
                    out_ext = ".docx"
                elif action_id == "pdf-to-excel":
                    out_ext = ".xlsx"
                elif action_id == "pdf-to-powerpoint":
                    out_ext = ".pptx"
                elif action_id == "image-converter":
                    out_ext = ".png"
                elif action_id == "unzip-file":
                    out_ext = ".pdf"

                for item in matched_pool_items:
                    name, ext, src_id = item
                    ref = f"output:{src_id}" if src_id is not None else name
                    steps.append(
                        {
                            "step_id": next_step_id,
                            "actionId": action_id,
                            "inputs": [ref],
                        }
                    )
                    active_pool.append((f"output:{next_step_id}", out_ext, next_step_id))
                    next_step_id += 1
                continue
            else:
                for item in matched_pool_items:
                    name, ext, src_id = item
                    ref = f"output:{src_id}" if src_id is not None else name
                    step_inputs.append(ref)

        elif tool_config["type"] == "single":
            # Single input tools match the first compatible file in active pool
            accepts = tool_config["accepts"]
            matched_item = None

            for item in reversed(active_pool):
                name, ext, src_id = item
                is_match = False
                if "image/*" in accepts:
                    is_match = ext in IMAGE_EXTENSIONS
                else:
                    is_match = ext in accepts

                if is_match:
                    ref = f"output:{src_id}" if src_id is not None else name
                    step_inputs.append(ref)
                    matched_item = item
                    break

            if matched_item:
                active_pool.remove(matched_item)

        # Append step
        if step_inputs or tool_config["type"] == "utility":
            steps.append(
                {"step_id": next_step_id, "actionId": action_id, "inputs": step_inputs}
            )

            # Predict the output format of this step and push back to active pool
            out_ext = ".pdf"  # Default output of most conversions is PDF
            if action_id == "split-pdf":
                out_ext = ".zip"
            elif action_id == "pdf-to-image":
                out_ext = ".png"
            elif action_id == "pdf-to-word":
                out_ext = ".docx"
            elif action_id == "pdf-to-excel":
                out_ext = ".xlsx"
            elif action_id == "pdf-to-powerpoint":
                out_ext = ".pptx"
            elif action_id == "image-converter":
                out_ext = ".png"
            elif action_id == "unzip-file":
                out_ext = ".pdf"

            active_pool.append((f"output:{next_step_id}", out_ext, next_step_id))
            next_step_id += 1

    return steps


# Alias synthesize_workflow_graph to generate_heuristic_plan for canonical workflow synthesis
synthesize_workflow_graph = generate_heuristic_plan
