import sys
import ast
import json
import os

def parse_python_file(filepath):
    if not os.path.exists(filepath):
        return {"imports": [], "symbols": [], "exports": []}
        
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            code = f.read()
        tree = ast.parse(code, filename=filepath)
    except Exception as e:
        return {"error": str(e), "imports": [], "symbols": [], "exports": []}

    imports = []
    symbols = []
    exports = []

    for node in ast.iter_child_nodes(tree):
        # Imports
        if isinstance(node, ast.Import):
            for n in node.names:
                imports.append(n.name)
        elif isinstance(node, ast.ImportFrom):
            mod = node.module or ""
            names = [f"{mod}.{n.name}" if mod else n.name for n in node.names]
            imports.extend(names)

        # Top-level Functions
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            args = [a.arg for a in node.args.args]
            doc = ast.get_docstring(node) or ""
            first_line_doc = doc.split("\n")[0].strip() if doc else ""
            calls = []
            for subnode in ast.walk(node):
                if isinstance(subnode, ast.Call):
                    if isinstance(subnode.func, ast.Name):
                        calls.append(subnode.func.id)
                    elif isinstance(subnode.func, ast.Attribute):
                        calls.append(subnode.func.attr)
            calls = list(dict.fromkeys(calls))[:6] # Unique top 6

            symbols.append({
                "name": node.name,
                "type": "async_function" if isinstance(node, ast.AsyncFunctionDef) else "function",
                "line": node.lineno,
                "endLine": getattr(node, "end_lineno", node.lineno),
                "args": args,
                "docstring": first_line_doc,
                "calls": calls
            })
            exports.append(node.name)

        # Top-level Classes
        elif isinstance(node, ast.ClassDef):
            doc = ast.get_docstring(node) or ""
            first_line_doc = doc.split("\n")[0].strip() if doc else ""
            methods = []
            for item in node.body:
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    methods.append(item.name)

            symbols.append({
                "name": node.name,
                "type": "class",
                "line": node.lineno,
                "endLine": getattr(node, "end_lineno", node.lineno),
                "args": [],
                "docstring": first_line_doc,
                "calls": methods[:6]
            })
            exports.append(node.name)

    return {
        "filepath": filepath,
        "imports": list(dict.fromkeys(imports)),
        "symbols": symbols,
        "exports": list(dict.fromkeys(exports))
    }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        filepath = sys.argv[1]
        result = parse_python_file(filepath)
        print(json.dumps(result, ensure_ascii=False))
    else:
        print(json.dumps({"error": "No file path provided"}))
