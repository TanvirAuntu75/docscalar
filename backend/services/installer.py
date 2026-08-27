def get_install_status():
    """Returns the current installation status."""
    return {
        "status": "completed",
        "percent": 100,
        "speed_mb": 0.0,
        "error": None,
        "step": "Ready",
    }


def start_install_dependencies():
    """No-op: all heavy models download on-demand via HuggingFace CDN."""
    return True


def verify_dependencies_installed():
    """
    Returns True unconditionally. Heavy AI models (Xenova/m2m100_418M,
    Xenova/all-MiniLM-L6-v2) download on-demand via the browser's Web Worker
    using HuggingFace CDN. LibreOffice and OCR ONNX models are bundled in
    the PyInstaller sidecar or expected to be pre-installed on the host.
    """
    return True
