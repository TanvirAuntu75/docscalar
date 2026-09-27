import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, execSync } from 'child_process';
import chokidar from 'chokidar';
import parser from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const REPO_MAP_PATH = path.join(ROOT_DIR, '.agents', 'repo_map.md');

// Store active child processes for graceful exit on Windows
const activeSubprocesses = new Set();

function cleanSubprocesses() {
  for (const proc of activeSubprocesses) {
    try {
      proc.kill(); // Cross-platform termination (TerminateProcess on Windows)
    } catch (e) {}
  }
  activeSubprocesses.clear();
}

process.on('exit', cleanSubprocesses);
process.on('SIGINT', () => { cleanSubprocesses(); process.exit(0); });
process.on('SIGTERM', () => { cleanSubprocesses(); process.exit(0); });

// Global symbol store: relativePath -> FileIndex
const indexMap = new Map();

// Helper: Run Git command safely
function runGitCommand(cmd) {
  try {
    return execSync(`git --no-optional-locks ${cmd}`, {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 5000
    }).trim();
  } catch (err) {
    return '';
  }
}

// Extract JSDoc or leading single-line comment for a Babel node
function extractLeadingDoc(node) {
  if (node.leadingComments && node.leadingComments.length > 0) {
    const lastComment = node.leadingComments[node.leadingComments.length - 1];
    const val = lastComment.value.replace(/\*+|\/+/g, '').trim();
    if (val) {
      return val.split('\n')[0].trim();
    }
  }
  return '';
}

// Filter imports to emphasize local project connections over standard npm built-ins
function filterLocalImports(imports) {
  const local = imports.filter(i => i.startsWith('.') || i.startsWith('/') || i.startsWith('backend') || i.startsWith('src'));
  if (local.length > 0) return local.slice(0, 5);
  return imports.slice(0, 3); // Fallback to first 3 if all external
}

// Parse JS/JSX using Babel AST
function parseJsFile(filePath, relPath) {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });

    const imports = [];
    const symbols = [];
    const exportsList = [];

    traverse(ast, {
      // Imports
      ImportDeclaration(p) {
        if (p.node.source && p.node.source.value) {
          imports.push(p.node.source.value);
        }
      },

      // Export Default / Named
      ExportDefaultDeclaration(p) {
        let name = 'default';
        if (p.node.declaration) {
          if (p.node.declaration.id && p.node.declaration.id.name) {
            name = p.node.declaration.id.name;
          } else if (p.node.declaration.name) {
            name = p.node.declaration.name;
          }
        }
        exportsList.push(`default (${name})`);
      },

      ExportNamedDeclaration(p) {
        if (p.node.declaration) {
          if (p.node.declaration.declarations) {
            p.node.declaration.declarations.forEach(d => {
              if (d.id && d.id.name) exportsList.push(d.id.name);
            });
          } else if (p.node.declaration.id && p.node.declaration.id.name) {
            exportsList.push(p.node.declaration.id.name);
          }
        } else if (p.node.specifiers) {
          p.node.specifiers.forEach(s => {
            if (s.exported && s.exported.name) exportsList.push(s.exported.name);
          });
        }
      },

      // Top-level Functions / Components / Hooks ONLY
      FunctionDeclaration(p) {
        if (p.scope.block.type === 'Program') {
          const name = p.node.id ? p.node.id.name : 'anonymous';
          const args = p.node.params.map(paramToString);
          const calls = extractCalls(p);
          const isComponent = /^[A-Z]/.test(name);
          const isHook = /^use[A-Z]/.test(name);
          const docstring = extractLeadingDoc(p.parent.type === 'ExportNamedDeclaration' || p.parent.type === 'ExportDefaultDeclaration' ? p.parent : p.node);

          symbols.push({
            name,
            type: isComponent ? 'component' : isHook ? 'hook' : 'function',
            line: p.node.loc ? p.node.loc.start.line : 1,
            endLine: p.node.loc ? p.node.loc.end.line : 1,
            args,
            docstring,
            calls
          });
        }
      },

      // Top-level Arrow Functions / Declarations ONLY
      VariableDeclarator(p) {
        if (p.scope.block.type === 'Program') {
          if (p.node.init && (p.node.init.type === 'ArrowFunctionExpression' || p.node.init.type === 'FunctionExpression')) {
            const name = p.node.id.name;
            if (name) {
              const args = p.node.init.params.map(paramToString);
              const calls = extractCalls(p);
              const isComponent = /^[A-Z]/.test(name);
              const isHook = /^use[A-Z]/.test(name);
              const parentDecl = p.parentPath ? p.parentPath.parentPath : null;
              const docNode = (parentDecl && (parentDecl.node.type === 'ExportNamedDeclaration' || parentDecl.node.type === 'ExportDefaultDeclaration')) ? parentDecl.node : (p.parentPath ? p.parentPath.node : p.node);
              const docstring = extractLeadingDoc(docNode);

              symbols.push({
                name,
                type: isComponent ? 'component' : isHook ? 'hook' : 'function',
                line: p.node.loc ? p.node.loc.start.line : 1,
                endLine: p.node.loc ? p.node.loc.end.line : 1,
                args,
                docstring,
                calls
              });
            }
          }
        }
      }
    });

    return {
      relPath,
      imports: filterLocalImports(Array.from(new Set(imports))),
      symbols,
      exports: Array.from(new Set(exportsList))
    };
  } catch (err) {
    return { relPath, imports: [], symbols: [], exports: [], error: err.message };
  }
}

function paramToString(param) {
  if (param.type === 'Identifier') return param.name;
  if (param.type === 'ObjectPattern') return '{...}';
  if (param.type === 'ArrayPattern') return '[...]';
  if (param.type === 'RestElement') return '...' + (param.argument ? param.argument.name : 'args');
  if (param.type === 'AssignmentPattern') return (param.left ? param.left.name : 'arg') + '=def';
  return 'arg';
}

function extractCalls(path) {
  const calls = new Set();
  path.traverse({
    CallExpression(cp) {
      if (cp.node.callee.type === 'Identifier') {
        calls.add(cp.node.callee.name);
      } else if (cp.node.callee.type === 'MemberExpression' && cp.node.callee.property && cp.node.callee.property.name) {
        calls.add(cp.node.callee.property.name);
      }
    },
    JSXOpeningElement(jp) {
      if (jp.node.name && jp.node.name.type === 'JSXIdentifier' && /^[A-Z]/.test(jp.node.name.name)) {
        calls.add(jp.node.name.name);
      }
    }
  });
  return Array.from(calls).slice(0, 5);
}

// Parse Python using Python AST script
function parsePythonFileAsync(filePath, relPath) {
  return new Promise((resolve) => {
    const pyScriptPath = path.join(ROOT_DIR, 'scripts', 'parse_python.py');
    const child = exec(`python "${pyScriptPath}" "${filePath}"`, { cwd: ROOT_DIR, timeout: 5000 }, (err, stdout) => {
      activeSubprocesses.delete(child);
      if (err || !stdout) {
        resolve({ relPath, imports: [], symbols: [], exports: [] });
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        const rawImports = parsed.imports || [];
        const formattedImports = rawImports.map(i => {
          if (typeof i === 'string') return i;
          if (i.module) return i.module;
          if (i.names) return i.names.join(', ');
          return null;
        }).filter(Boolean);

        resolve({
          relPath,
          imports: filterLocalImports(Array.from(new Set(formattedImports))),
          symbols: parsed.symbols || [],
          exports: Array.from(new Set(parsed.exports || []))
        });
      } catch (e) {
        resolve({ relPath, imports: [], symbols: [], exports: [] });
      }
    });
    activeSubprocesses.add(child);
  });
}

// Format markdown string safely escaping table pipes and HTML
function cleanMd(str) {
  if (!str) return '';
  return str.replace(/\|/g, '&#124;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, ' ');
}

// Write the complete repo_map.md file
function writeRepoMap() {
  let md = `# DocForge Codebase Live Map & Symbol Index\n\n`;
  md += `> Automatically updated by \`scripts/watch_repo.js\` on file saves. Read this map first to locate files and line numbers, then use \`view_file(StartLine, EndLine)\` for targeted reads.\n\n`;

  md += `## 1. Directory Symbol Index\n\n`;

  const sortedFiles = Array.from(indexMap.keys()).sort();

  for (const relPath of sortedFiles) {
    const data = indexMap.get(relPath);
    if (!data) continue;

    // Skip empty files or files with zero symbols and zero exports
    if ((!data.symbols || data.symbols.length === 0) && (!data.exports || data.exports.length === 0)) {
      continue;
    }

    md += `### \`${relPath}\`\n`;

    if (data.imports && data.imports.length > 0) {
      const impStr = data.imports.map(i => `\`${cleanMd(i)}\``).join(', ');
      md += `- **Key Imports:** ${impStr}\n`;
    }

    if (data.exports && data.exports.length > 0) {
      md += `- **Exports:** ${data.exports.map(e => `\`${cleanMd(e)}\``).join(', ')}\n`;
    }

    if (data.symbols && data.symbols.length > 0) {
      md += `| Symbol | Type | Lines | Args | Description | Key Calls |\n`;
      md += `|---|---|---|---|---|---|\n`;
      for (const s of data.symbols) {
        let argsStr = s.args ? `(${s.args.join(', ')})` : '()';
        if (argsStr.length > 35) argsStr = argsStr.slice(0, 32) + '...)';
        const docStr = s.docstring ? cleanMd(s.docstring.length > 50 ? s.docstring.slice(0, 47) + '...' : s.docstring) : '-';
        const callsStr = s.calls && s.calls.length > 0 ? s.calls.map(c => `\`${cleanMd(c)}\``).join(', ') : '-';
        md += `| \`${cleanMd(s.name)}\` | ${s.type} | L${s.line}-${s.endLine} | \`${cleanMd(argsStr)}\` | ${docStr} | ${callsStr} |\n`;
      }
    }
    md += `\n`;
  }

  // Add Recent Changes Section
  md += `---\n\n## 2. Recent Changes & Workspace State\n\n`;

  const status = runGitCommand('status -s');
  if (status) {
    md += `### Uncommitted File Status\n\`\`\`\n${status}\n\`\`\`\n\n`;
  } else {
    md += `*Working tree clean (no uncommitted changes).*\n\n`;
  }

  const log = runGitCommand('log -n 10 --format="%h | %cr | %s"');
  if (log) {
    const safeLog = log.split('\n').map(line => cleanMd(line)).join('\n');
    md += `### Recent 10 Commits\n\`\`\`\n${safeLog}\n\`\`\`\n`;
  }

  const repoDir = path.dirname(REPO_MAP_PATH);
  if (!fs.existsSync(repoDir)) {
    fs.mkdirSync(repoDir, { recursive: true });
  }
  fs.writeFileSync(REPO_MAP_PATH, md, 'utf8');
  console.log(`[repo-watcher] Updated ${REPO_MAP_PATH} (${sortedFiles.length} files indexed, size: ${(fs.statSync(REPO_MAP_PATH).size / 1024).toFixed(1)} KB)`);
}

// Initial full build
async function buildFullIndex() {
  console.log('[repo-watcher] Building initial codebase index...');
  
  const scanDirs = ['src', 'backend', 'scripts', 'public/workers'];
  const filesToProcess = [];

  function collectFiles(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.git', '.venv', 'dist', 'build', 'public/models'].includes(entry.name)) continue;
        collectFiles(fullPath);
      } else if (entry.isFile()) {
        if (/\.(jsx?|tsx?|py)$/.test(entry.name)) {
          filesToProcess.push(fullPath);
        }
      }
    }
  }

  for (const sd of scanDirs) {
    collectFiles(path.join(ROOT_DIR, sd));
  }

  for (const fp of filesToProcess) {
    const relPath = path.relative(ROOT_DIR, fp).replace(/\\/g, '/');
    if (fp.endsWith('.py')) {
      const parsed = await parsePythonFileAsync(fp, relPath);
      indexMap.set(relPath, parsed);
    } else {
      const parsed = parseJsFile(fp, relPath);
      indexMap.set(relPath, parsed);
    }
  }

  writeRepoMap();
}

// Main execution
const isOnce = process.argv.includes('--once');

buildFullIndex().then(() => {
  if (isOnce) {
    console.log('[repo-watcher] Initial indexing complete (--once mode). Exiting.');
    process.exit(0);
  }

  console.log('[repo-watcher] Starting continuous file watcher...');

  const watcher = chokidar.watch([
    path.join(ROOT_DIR, 'src/**/*.{js,jsx}'),
    path.join(ROOT_DIR, 'public/workers/**/*.js'),
    path.join(ROOT_DIR, 'backend/**/*.py')
  ], {
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/.venv/**',
      '**/dist/**',
      '**/build/**',
      '**/repo_map.md'
    ],
    persistent: true,
    ignoreInitial: true,
    usePolling: false,
    awaitWriteFinish: {
      stabilityThreshold: 150,
      pollInterval: 50
    }
  });

  let debounceTimer = null;
  let processingQueue = Promise.resolve();

  watcher.on('all', (event, filePath) => {
    processingQueue = processingQueue.then(async () => {
      const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
      console.log(`[repo-watcher] Event '${event}' on ${relPath}`);

      if (event === 'unlink') {
        indexMap.delete(relPath);
      } else if (event === 'add' || event === 'change') {
        if (filePath.endsWith('.py')) {
          const parsed = await parsePythonFileAsync(filePath, relPath);
          indexMap.set(relPath, parsed);
        } else {
          const parsed = parseJsFile(filePath, relPath);
          indexMap.set(relPath, parsed);
        }
      }

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        writeRepoMap();
      }, 200);
    });
  });
});
