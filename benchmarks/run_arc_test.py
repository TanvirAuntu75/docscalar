#!/usr/bin/env python3
"""
ARC-AGI Benchmark Runner & Visualizer for Antigravity
Tests Abstraction and Reasoning Corpus tasks with real-time visual grids,
peak RAM tracking (via tracemalloc), cell-by-cell accuracy, and execution benchmarks.
"""

import os
import sys
import json
import time
import argparse
import tracemalloc
from pathlib import Path

# Fix Windows console UTF-8 encoding
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ANSI Color codes for 10 ARC colors (0-9)
# 0: Black, 1: Blue, 2: Red, 3: Green, 4: Yellow,
# 5: Grey, 6: Magenta/Pink, 7: Orange, 8: Teal/Cyan, 9: Maroon/Brown
COLOR_NAMES = {
    0: ("Black", "\033[40m  \033[0m"),
    1: ("Blue", "\033[44m  \033[0m"),
    2: ("Red", "\033[41m  \033[0m"),
    3: ("Green", "\033[42m  \033[0m"),
    4: ("Yellow", "\033[43m  \033[0m"),
    5: ("Grey", "\033[47m\033[30m░░\033[0m"),
    6: ("Magenta", "\033[45m  \033[0m"),
    7: ("Orange", "\033[48;5;208m  \033[0m"),
    8: ("Cyan/Teal", "\033[46m  \033[0m"),
    9: ("Maroon", "\033[48;5;88m  \033[0m"),
}

UNICODE_BLOCKS = {
    0: "⬛", 1: "🟦", 2: "🟥", 3: "🟩", 4: "🟨",
    5: "⬜", 6: "🟪", 7: "🟧", 8: "🩵", 9: "🟫",
}

def render_grid(grid, use_unicode=True):
    """Render a 2D integer matrix as a visual grid."""
    lines = []
    h = len(grid)
    w = len(grid[0]) if h > 0 else 0
    border = "+" + "--" * w + "+"
    lines.append(f"  {border} ({h}x{w})")
    for row in grid:
        if use_unicode:
            row_str = "".join(UNICODE_BLOCKS.get(val, "❓") for val in row)
            lines.append(f"  |{row_str}|")
        else:
            row_str = "".join(COLOR_NAMES.get(val, ("?", "??"))[1] for val in row)
            lines.append(f"  |{row_str}|")
    lines.append(f"  {border}")
    return "\n".join(lines)

def load_task(task_id, data_dir=None):
    """Find and load a task JSON from training or evaluation set."""
    if data_dir is None:
        script_dir = Path(__file__).parent
        data_dir = script_dir / "ARC-AGI" / "data"

    # Search in training then evaluation
    for subset in ["training", "evaluation"]:
        p = data_dir / subset / f"{task_id}.json"
        if p.exists():
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f), subset, str(p)
    return None, None, None

def evaluate_prediction(pred_grid, true_grid):
    """Calculates cell-by-cell accuracy and exact match."""
    if len(pred_grid) != len(true_grid):
        return False, 0.0, f"Height mismatch: predicted {len(pred_grid)}, expected {len(true_grid)}"
    if any(len(p_row) != len(t_row) for p_row, t_row in zip(pred_grid, true_grid)):
        return False, 0.0, "Width mismatch in one or more rows"

    total_cells = sum(len(row) for row in true_grid)
    matched_cells = sum(
        sum(1 for p, t in zip(p_row, t_row) if p == t)
        for p_row, t_row in zip(pred_grid, true_grid)
    )
    accuracy = (matched_cells / total_cells) * 100.0 if total_cells > 0 else 0.0
    exact_match = (matched_cells == total_cells)
    return exact_match, accuracy, f"{matched_cells}/{total_cells} cells match ({accuracy:.1f}%)"

def solve_007bbfb7(input_grid):
    """
    Solver for Task 007bbfb7 (2D Kronecker Product / Fractal Tiling):
    Each cell in the input grid is replaced by either:
    - the entire input grid (if cell == 7 / foreground)
    - a block of 0s of size (H x W) (if cell == 0 / background)
    """
    h, w = len(input_grid), len(input_grid[0])
    out_h, out_w = h * h, w * w
    out = [[0 for _ in range(out_w)] for _ in range(out_h)]

    for r in range(h):
        for c in range(w):
            if input_grid[r][c] != 0:
                for pr in range(h):
                    for pc in range(w):
                        out[r * h + pr][c * w + pc] = input_grid[pr][pc]
    return out

def solve_00d62c1b(input_grid):
    """
    Solver for Task 00d62c1b (Enclosed Hole Filling):
    Find all background (0) cells enclosed by green (3) boundaries,
    and fill them with yellow (4).
    """
    h, w = len(input_grid), len(input_grid[0])
    # Pad grid with 0 to reliably flood-fill from exterior
    padded = [[0] * (w + 2) for _ in range(h + 2)]
    for r in range(h):
        for c in range(w):
            padded[r + 1][c + 1] = input_grid[r][c]

    # BFS flood fill from outside (0, 0)
    visited = [[False] * (w + 2) for _ in range(h + 2)]
    queue = [(0, 0)]
    visited[0][0] = True

    while queue:
        cr, cc = queue.pop(0)
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = cr + dr, cc + dc
            if 0 <= nr < h + 2 and 0 <= nc < w + 2:
                if not visited[nr][nc] and padded[nr][nc] == 0:
                    visited[nr][nc] = True
                    queue.append((nr, nc))

    # Any 0 in original grid that was NOT visited is enclosed -> change to 4 (yellow)
    out = [row[:] for row in input_grid]
    for r in range(h):
        for c in range(w):
            if input_grid[r][c] == 0 and not visited[r + 1][c + 1]:
                out[r][c] = 4
    return out

def main():
    parser = argparse.ArgumentParser(description="ARC-AGI Benchmark Test Runner")
    parser.add_argument("--task", default="007bbfb7", help="Task ID (e.g. 007bbfb7, 00d62c1b, 017c7c7b)")
    parser.add_argument("--solve", action="store_true", help="Run the test with the solver and verify exact match")
    args = parser.parse_args()

    tracemalloc.start()
    t_start = time.perf_counter()

    task, subset, path = load_task(args.task)
    if not task:
        print(f"[-] Error: Task '{args.task}' not found in training or evaluation directories.")
        sys.exit(1)

    print("=" * 70)
    print(f"  ARC-AGI BENCHMARK RUNNER - TASK {args.task}")
    print(f"  Subset: {subset.upper()} | Path: {path}")
    print("=" * 70)

    train_pairs = task.get("train", [])
    test_pairs = task.get("test", [])

    print(f"\n[+] Task Summary:")
    print(f"    - Training Demonstrations: {len(train_pairs)}")
    print(f"    - Test Challenges:        {len(test_pairs)}")

    # Show first training example
    print("\n--- Training Example 1: ---")
    print("Input:")
    print(render_grid(train_pairs[0]["input"]))
    print("Output:")
    print(render_grid(train_pairs[0]["output"]))

    # Show test input
    print("\n--- Test Challenge (To be solved): ---")
    test_in = test_pairs[0]["input"]
    test_out = test_pairs[0]["output"]
    print("Test Input:")
    print(render_grid(test_in))

    if args.solve:
        print("\n--- Executing Solver Transformation ---")
        if args.task == "007bbfb7":
            pred_out = solve_007bbfb7(test_in)
        elif args.task == "00d62c1b":
            pred_out = solve_00d62c1b(test_in)
        else:
            print(f"[-] No solver registered for task {args.task}. Expected output is ground truth.")
            pred_out = None

        if pred_out is not None:
            print("Predicted Output:")
            print(render_grid(pred_out))
            print("Ground Truth Output:")
            print(render_grid(test_out))

            exact, acc, detail = evaluate_prediction(pred_out, test_out)
            status = "PASSED (100% Exact Match)" if exact else "FAILED"
            print(f"\n[Result] Verdict: {status}")
            print(f"[Result] Accuracy: {detail}")
    else:
        print("Expected Ground Truth Output:")
        print(render_grid(test_out))

    t_end = time.perf_counter()
    current_mem, peak_mem = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    print("\n" + "=" * 70)
    print("  RESOURCE USAGE METRICS:")
    print(f"  • Execution Time:  {(t_end - t_start) * 1000:.2f} ms")
    print(f"  • Peak RAM Usage:   {peak_mem / 1024:.2f} KB ({peak_mem / (1024*1024):.4f} MB)")
    print(f"  • JSON Data Size:   {os.path.getsize(path) / 1024:.2f} KB")
    print(f"  • Estimated Tokens: ~{len(json.dumps(task)) // 4} tokens for prompt")
    print("=" * 70)

if __name__ == "__main__":
    main()
