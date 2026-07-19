const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'pages', 'Home.jsx');
let content = fs.readFileSync(file, 'utf8');

const target = `  const [canvasDetecting, setCanvasDetecting] = useState(false);`;

const replacement = `  const [canvasDetecting, setCanvasDetecting] = useState(false);

  // Missing states recovered from refactor
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [workspaceFiles, setWorkspaceFiles] = useState([]);
  const [batchQueue, setBatchQueue] = useState([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [activeBatchIndex, setActiveBatchIndex] = useState(0);
  const [batchProgress, setBatchProgress] = useState(0);`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content, 'utf8');
