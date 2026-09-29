/**
 * Utilities for formatting math, markdown, code extraction and speech
 */

export interface ParsedBlock {
  type: 'text' | 'code' | 'math' | 'steps' | 'heading' | 'quote' | 'table';
  content: string;
  language?: string;
  metadata?: any;
}

// Extract code blocks from markdown
export function extractCodeBlocks(markdown: string): { code: string; language: string }[] {
  const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: { code: string; language: string }[] = [];
  let match;
  while ((match = codeRegex.exec(markdown)) !== null) {
    blocks.push({
      language: match[1]?.toLowerCase() || 'text',
      code: match[2].trim(),
    });
  }
  return blocks;
}

// Detect if a code block can be executed/previewed in sandbox (HTML, SVG, JS canvas, React-like)
export function isExecutableCode(language?: string, code?: string): boolean {
  if (!code) return false;
  const lang = (language || '').toLowerCase();
  if (['html', 'htm', 'svg', 'javascript', 'js', 'jsx', 'tsx'].includes(lang)) return true;
  if (code.includes('<!DOCTYPE html>') || code.includes('<html') || code.includes('<svg') || code.includes('<div')) {
    return true;
  }
  return false;
}

// Generate self-contained HTML for running in an iframe sandbox
export function wrapCodeForSandbox(code: string, language?: string): string {
  const lang = (language || '').toLowerCase();

  // If already full HTML document
  if (code.includes('<!DOCTYPE html>') || (code.includes('<html') && code.includes('</html>'))) {
    return code;
  }

  // If SVG
  if (lang === 'svg' || (code.trim().startsWith('<svg') && code.trim().endsWith('</svg>'))) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 24px; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; }
    svg { max-width: 100%; height: auto; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.3)); }
  </style>
</head>
<body>
  ${code}
</body>
</html>`;
  }

  // If JavaScript logic / canvas
  if (lang === 'js' || lang === 'javascript') {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; }
    #output { background: #1e293b; padding: 16px; border-radius: 8px; font-family: monospace; white-space: pre-wrap; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="max-w-2xl mx-auto">
    <h3 class="text-sm font-semibold text-cyan-400 tracking-wide uppercase">JS Execution Output:</h3>
    <div id="output">Running...</div>
    <div id="app" class="mt-4"></div>
  </div>
  <script>
    const outputEl = document.getElementById('output');
    const logs = [];
    const origLog = console.log;
    console.log = function(...args) {
      logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
      outputEl.textContent = logs.join('\\n');
      origLog.apply(console, args);
    };
    try {
      ${code}
      if (logs.length === 0 && !document.getElementById('app').hasChildNodes()) {
        outputEl.textContent = 'Execution finished successfully (No console output).';
      }
    } catch (err) {
      outputEl.textContent = 'Error: ' + err.message;
      outputEl.style.color = '#ef4444';
    }
  </script>
</body>
</html>`;
  }

  // General HTML snippet with Tailwind CSS
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #0b0f19; color: #f8fafc; padding: 20px; }
  </style>
</head>
<body class="min-h-screen">
  ${code}
</body>
</html>`;
}

// Read text aloud using Web Speech API
export function speakText(text: string, onEnd?: () => void): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    alert('Таны хөтөч дуут унших функцийг дэмжихгүй байна.');
    return () => {};
  }

  window.speechSynthesis.cancel();

  // Strip code blocks and markdown symbols for natural reading
  const cleanText = text
    .replace(/```[\s\S]*?```/g, 'Кодын хэсэг.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[#*_~>]/g, '')
    .slice(0, 3000); // keep reasonable limit

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Prefer Mongolian or general natural voice if available
  const voices = window.speechSynthesis.getVoices();
  const mnVoice = voices.find(v => v.lang.includes('mn') || v.lang.includes('mon'));
  if (mnVoice) {
    utterance.voice = mnVoice;
  }

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  window.speechSynthesis.speak(utterance);

  return () => {
    window.speechSynthesis.cancel();
  };
}
