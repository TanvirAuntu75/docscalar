from backend.services.canvas_agent import generate_heuristic_plan


def test_pipeline_multi_image_wiring():
    """
    Asserts that canvas pipelines bridging pdf-to-image or multi-image generators
    properly map inputs/outputs without single-file reference truncation.
    """
    # Test 1: Image extraction followed by image conversion
    steps = generate_heuristic_plan(
        "extract images from pdf and convert them to png", ["doc.pdf"]
    )
    assert isinstance(steps, list)
    tools = [s.get("actionId") for s in steps]
    assert "pdf-to-image" in tools

    # Test 2: Multi-step pipeline routing
    steps2 = generate_heuristic_plan("compress pdf then convert to word", ["doc.pdf"])
    assert isinstance(steps2, list)
    tools2 = [s.get("actionId") for s in steps2]
    assert "compress-pdf" in tools2
    assert "pdf-to-word" in tools2
    # Verify proper dependency ordering
    idx_compress = tools2.index("compress-pdf")
    idx_word = tools2.index("pdf-to-word")
    assert idx_compress < idx_word


def test_pipeline_step_injection_structure():
    """
    Asserts all generated pipeline steps contain strictly required structural fields.
    """
    steps = generate_heuristic_plan("split pdf then compress", ["doc.pdf"])
    assert isinstance(steps, list)
    for step in steps:
        assert "step_id" in step
        assert "actionId" in step
        assert "inputs" in step
        assert isinstance(step["inputs"], (list, dict))
