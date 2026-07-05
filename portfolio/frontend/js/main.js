"use strict";
/* ============================================================
   Vatsal Vala — Brutalist Portfolio · main.js
   Data, FX engine (lerped scroll + velocity), loader v2,
   blend cursor, magnetic elements, text scramble, reveals,
   section rail, IST clock, draggable cards, project modal.
   Chat lives in chat.js (uses window.VV helpers).
   ============================================================ */
(function () {

  // ---------------------------------------------------------------- DATA
  var projects = [
    { idx: "01", tag: "RAG", slug: "rag-platform", shot: "Project Visual", img: "assets/proj-rag-platform.png", name: "RAG Platform", desc: "Multi-chatbot platform — upload PDFs, docs & URLs to build per-bot knowledge bases. GPT-4o grounded on Pinecone retrieval + reranking.",
      long: "A production multi-chatbot RAG platform where each user turns their own PDFs, documents and crawled URLs into a per-bot knowledge base — then chats with answers grounded in that context instead of guesswork. Every bot is fully isolated: source content is crawled with BeautifulSoup/Requests, OCR'd to clean markdown with Docling, recursively chunked, and embedded with all-MiniLM-L6-v2 into Pinecone, where a top-3 rerank keeps only the most relevant passages before they ever reach the model. GPT-4o then answers strictly from retrieved context, with prompting tuned to cite what it knows and refuse what it doesn't — so every response stays faithful to that user's own documents rather than the model's training data.",
      points: [
        "Ingests PDFs, docs & URLs — crawled via BeautifulSoup/Requests and OCR'd to markdown with Docling.",
        "Retrieval chain: Recursive Character chunking → all-MiniLM-L6-v2 embeddings in Pinecone → rerank to the top-3 chunks.",
        "GPT-4o with optimized prompting answers strictly from retrieved context.",
      ],
      tech: ["Python","FastAPI","Pinecone","all-MiniLM-L6-v2","GPT-4o","Docling","BeautifulSoup"] },
    { idx: "02", tag: "LLM", slug: "medical-transcribe", shot: "Project Visual", img: "assets/proj-medical-transcribe.png", name: "Medical Transcribe", desc: "Two-stage LLM pipeline auto-builds structured medical forms via fuzzy (RapidFuzz) + semantic (FAISS) search. ~15s, 60% fewer tokens.",
      long: "An AI medical-transcription system that turns raw records into structured forms automatically — re-architected from a single heavy LLM call into a lean two-stage pipeline that is both faster and dramatically cheaper to run. The first stage extracts medical terms and their permutations; the second maps them onto the correct form fields through a combination of fuzzy matching (RapidFuzz) and semantic search (FAISS), so misspellings and clinical synonyms still land in the right place. The redesign cut end-to-end form generation to ~15 seconds and reduced token usage 60% (25k → 10k per run) without sacrificing accuracy.",
      points: [
        "Two-stage LLM flow extracts medical terms and permutations for matching.",
        "Fuzzy search (RapidFuzz) + semantic search (FAISS) map extracted terms to the right form fields.",
        "Cut end-to-end form generation to ~15s and reduced token usage 60% (25k → 10k).",
      ],
      tech: ["Python","LLM","RapidFuzz","FAISS","FastAPI"] },
    { idx: "03", tag: "DL", slug: "signassistive", shot: "Project Visual", img: "assets/proj-signassistive.png", name: "SignAssistive", desc: "Real-time Indian Sign Language translator — a 1D CNN reads 47 gestures from MediaPipe hand landmarks at 92% accuracy. Runs fully client-side in TensorFlow.js — the webcam never leaves the device.",
      long: "A real-time Indian Sign Language recognizer that classifies 47 gestures — 23 letters, 10 digits and 14 common words like HELP, WATER and THANK YOU — entirely in the browser, with no backend and no data ever leaving the device. MediaPipe extracts 21 hand landmarks (63 features) from the webcam, and a lightweight 1D CNN classifies them fast enough for live translation while staying robust to changes in lighting and background. The Keras model was ported to TensorFlow.js by rebuilding the architecture and re-implementing the Python landmark-normalization step line-for-line in JavaScript for exact input parity, and the whole static frontend ships to GitHub Pages through a GitHub Actions CI/CD pipeline — reaching 92% test accuracy.",
      points: [
        "MediaPipe extracts 21 hand landmarks (63 features); a lightweight 1D CNN (Conv1D → MaxPooling → Dense + dropout, softmax) classifies them — fast and robust to lighting & background.",
        "Keras model ported to TensorFlow.js by rebuilding the architecture and re-implementing the Python landmark normalization line-for-line in JS for input parity.",
        "Fully client-side inference via getUserMedia + MediaPipe Tasks — the webcam feed never leaves the device (privacy by design).",
        "Static frontend auto-deployed to GitHub Pages via a GitHub Actions CI/CD workflow; 92% test accuracy.",
      ],
      tech: ["Python","TensorFlow/Keras","TensorFlow.js","MediaPipe","OpenCV","scikit-learn","FastAPI","GitHub Actions"],
      demo: "https://vala412.github.io/SignAssistive/translate.html",
      link: "https://github.com/Vala412/SignAssistive" },
    { idx: "04", tag: "ML", slug: "logsense", shot: "Project Visual", img: "assets/proj-logsense.png", name: "LogSense", desc: "Hybrid log-classification pipeline — Regex + Sentence Transformers + Logistic Regression, with an LLM fallback for ambiguous logs.",
      long: "A hybrid log-classification pipeline that routes each log line to the cheapest method that can confidently label it, escalating only when necessary. Well-structured, known patterns are caught instantly by regex; everything else is classified from embeddings using Sentence Transformers with a Logistic Regression head; and only genuinely ambiguous or previously unseen logs fall through to an LLM. The result is a tiered system that keeps cost and latency low on the common case while still handling the long tail of messy, unfamiliar logs intelligently.",
      points: [
        "Regex handles known, well-structured patterns instantly.",
        "Sentence Transformers + Logistic Regression classify the rest from embeddings.",
        "An LLM fallback resolves ambiguous or previously unseen logs.",
      ],
      tech: ["Python","Regex","Sentence Transformers","Logistic Regression","LLM"] },
    { idx: "05", tag: "RAG", slug: "dhanvantari", shot: "Project Visual", img: "assets/proj-dhanvantari.png", name: "Dhanvantari", desc: "Full-stack RAG health assistant grounded in 15+ classical Ayurvedic texts — cites the source book per answer. Includes a Prakruti (Vata/Pitta/Kapha) analyzer.",
      long: "A full-stack RAG web app that answers Ayurvedic health questions by grounding an LLM in 15+ classical texts — Charaka Samhita, the Ayurvedic Pharmacopoeia of India, Dr. Vasant Lad's works and more — citing the originating book per answer instead of hallucinating. Offline, the corpus is ingested with PyPDFLoader, chunked (500 chars / 50 overlap), embedded with all-MiniLM-L6-v2 and stored in FAISS; online, a LangChain RetrievalQA chain feeds the top-k passages and a custom system prompt to Mistral-7B-Instruct, which streams answers with source citations and session-based memory across follow-ups. Model choice was metric-driven — Mistral-7B, Zephyr-7B, Gemma-7B and GPT-3.5 were benchmarked with RAGAS and Mistral-7B won on faithfulness (0.86) — and a Prakruti analyzer profiles Vata/Pitta/Kapha constitution for personalized guidance. A Grand Finalist project at the SSIP New India Vibrant Hackathon.",
      points: [
        "Offline ingestion: Ayurvedic PDFs (PyPDFLoader) → 500-char chunks (50 overlap) → all-MiniLM-L6-v2 embeddings stored in a FAISS vector store.",
        "Online query: top-k retrieval + a custom system prompt through a LangChain RetrievalQA chain, answered by Mistral-7B-Instruct with streamed source citations.",
        "Session-based conversational memory keeps context across follow-ups; prompt engineering forces precautions/exceptions for every remedy.",
        "Prakruti Analyzer questionnaire profiles body constitution (Vata / Pitta / Kapha) for personalized guidance.",
        "Metric-driven model choice: benchmarked Mistral-7B, Zephyr-7B, Gemma-7B & GPT-3.5 with RAGAS — picked Mistral-7B for top faithfulness (0.86).",
      ],
      tech: ["Python","LangChain","Chainlit","Mistral-7B","FAISS","HuggingFace","RAGAS","React","TypeScript","Vite","Tailwind CSS","Recoil","Socket.IO"],
      link: "https://github.com/Vala412/Dhanvantari" },
    { idx: "06", tag: "RAG", slug: "equitynews", shot: "Project Visual", img: "assets/proj-equitynews.png", name: "EquityNews.AI", desc: "News research tool — paste article URLs, ask questions, get grounded answers with citations to the sources. A classic FAISS + LangChain RAG pipeline.",
      long: "An AI research assistant for news: paste in article URLs (e.g. equity/stock-market news), ask questions in plain language, and get answers grounded in the actual articles with citations back to each source — verifiable, not a generic LLM guess. It loads up to three URLs with UnstructuredURLLoader, splits them into ~1000-char chunks, embeds them with 384-dim all-MiniLM-L6-v2 and indexes them in a FAISS store persisted to disk; at query time it retrieves the closest chunks and answers through a RetrievalQAWithSourcesChain powered by Flan-T5-large, returning the source URLs alongside the answer. It's cost-conscious by design — built entirely on free, self-hostable HuggingFace models instead of paid APIs — and wrapped in a pure-Python Streamlit UI.",
      points: [
        "Ingestion: loads up to 3 URLs (UnstructuredURLLoader) → ~1000-char chunks → 384-dim all-MiniLM-L6-v2 embeddings indexed in FAISS and persisted to disk.",
        "Query: embeds the question, retrieves the closest chunks via FAISS similarity search, and answers with Flan-T5-large through a RetrievalQAWithSourcesChain — returning the source URLs.",
        "Cost-conscious by design: open-source HuggingFace models (free, self-hostable) instead of paid OpenAI APIs.",
        "Full interactive UI in pure Python with Streamlit; API keys loaded securely via python-dotenv.",
      ],
      tech: ["Python","LangChain","Streamlit","HuggingFace","FAISS","Sentence-Transformers","Flan-T5","RAG"],
      link: "https://github.com/Vala412/EquityNews.AI" },
  ];

  var path = [
    { years: "2022—26", title: "Bachelor of Engineering — AI & Data Science", meta: "GEC Rajkot · CPI 8.05 / CGPA 8.29" },
    { years: "2020—22", title: "Higher Secondary — XII", meta: "Shri Swaminarayan High School, Bhavnagar · 61.38%" },
    { years: "2019—20", title: "Secondary — X", meta: "Smt. V R Patel School, Gadhada · 79.5%" },
    { years: "AWARD", title: "SSIP Hackathon — Grand Finalist", meta: "ATS · Rajkot Municipal Corp" },
    { years: "AWARD", title: "Hack the Mountains", meta: "Dhanvantari — Ayurvedic AI Bot" },
  ];
  var socials = [
    { label: "GitHub", url: "https://github.com/Vala412/" },
    { label: "LinkedIn", url: "https://www.linkedin.com/in/vatsal-vala" },
    { label: "Email", url: "mailto:vatsalvala46@gmail.com" },
  ];
  var skillGroups = [
    { idx: "S1", title: "GenAI & LLMs", items: ["RAG","Prompt Engineering","Fine-tuning","LLM Integration (GPT-4o, Llama)","LangChain","LlamaIndex","LangGraph","LangFuse","Semantic & Fuzzy Search","Chunking Strategies","Token & Cost Optimization"] },
    { idx: "S2", title: "Vector DBs & Embeddings", items: ["Pinecone","FAISS","Qdrant","text-embedding-3-large","Cohere embed-v4","BAAI BGE-M3","all-MiniLM-L6-v2","all-mpnet-base-v2"] },
    { idx: "S3", title: "Reranking & OCR", items: ["bge-reranker-v2","ms-marco-MiniLM-L-6-v2","bge-reranker-v2-m3","pinecone-rerank-v0","Docling","Tesseract","PaddleOCR","EasyOCR"] },
    { idx: "S4", title: "AI & Machine Learning", items: ["Supervised & Unsupervised","Model Evaluation","Feature Engineering","Hyperparameter Tuning","NLP","Sentence Transformers","Deep Learning"] },
    { idx: "S5", title: "Languages & Web", items: ["Python","SQL","Java","HTML","CSS","Bootstrap","JavaScript","Django","FastAPI"] },
    { idx: "S6", title: "Data Science & Tools", items: ["NumPy","Pandas","Matplotlib","Seaborn","TensorFlow","OpenCV","Scikit-learn","Jupyter","GitHub","Google Colab","VS Code"] },
  ];

  var email = ["vatsalvala46", "gmail.com"].join("@");
  var mailtoEmail = "mailto:" + email;

  // color morph stops: {p, bg:[r,g,b], fg:[r,g,b]}
  var stops = [
    { p: 0.00, bg: [11,11,11],   fg: [242,241,234] },
    { p: 0.15, bg: [11,11,11],   fg: [242,241,234] },
    { p: 0.26, bg: [242,241,234],fg: [11,11,11] },
    { p: 0.50, bg: [242,241,234],fg: [11,11,11] },
    { p: 0.58, bg: [197,248,42], fg: [11,11,11] },
    { p: 0.70, bg: [197,248,42], fg: [11,11,11] },
    { p: 0.78, bg: [11,11,11],   fg: [242,241,234] },
    { p: 1.00, bg: [11,11,11],   fg: [242,241,234] },
  ];

  // ---------------------------------------------------------------- HELPERS
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function mixColor(p) {
    var s = stops, i = 0;
    while (i < s.length - 1 && p > s[i + 1].p) i++;
    var a = s[i], b = s[Math.min(i + 1, s.length - 1)];
    var span = (b.p - a.p) || 1, t = clamp((p - a.p) / span, 0, 1);
    var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    return {
      bg: [0, 1, 2].map(function (k) { return Math.round(lerp(a.bg[k], b.bg[k], e)); }),
      fg: [0, 1, 2].map(function (k) { return Math.round(lerp(a.fg[k], b.fg[k], e)); }),
    };
  }

  var FX = {};
  FX.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------- TEXT SCRAMBLE
  var GLYPHS = "!<>-_\\/[]{}—=+*^?#01△★·";
  function scramble(node, finalText, dur, done) {
    if (FX.reduced) { node.textContent = finalText; if (done) done(); return; }
    var t0 = performance.now();
    var len = finalText.length;
    node._scrambling = true;
    (function tick(now) {
      var p = clamp((now - t0) / dur, 0, 1);
      var settled = Math.floor(p * len);
      var out = "";
      for (var i = 0; i < len; i++) {
        var ch = finalText[i];
        if (i < settled || ch === " ") out += ch;
        else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      node.textContent = out;
      if (p < 1) requestAnimationFrame(tick);
      else { node.textContent = finalText; node._scrambling = false; if (done) done(); }
    })(t0);
  }
  function bindScrambleHover(ctx) {
    $all("[data-scramble]", ctx).forEach(function (n) {
      if (n._sbound) return; n._sbound = true;
      var orig = n.textContent;
      n.addEventListener("mouseenter", function () {
        if (!n._scrambling) scramble(n, orig, 420);
      });
    });
  }

  // ---------------------------------------------------------------- RENDER STATIC LISTS
  function buildCards() {
    var stage = $("[data-stage]");
    projects.forEach(function (p) {
      var card = el("article", {
        "data-card": "", "data-hover": "open",
        style: "position:absolute;left:0;top:0;width:340px;background:rgb(var(--fg));color:rgb(var(--bg));border:2px solid rgb(var(--bg));padding:26px;cursor:grab;user-select:none;touch-action:none;box-shadow:0 30px 60px rgba(0,0,0,.35);will-change:transform"
      });
      var media = p.img
        ? '<div style="aspect-ratio:4/3;margin:18px 0;overflow:hidden;border:1.5px solid rgba(11,11,11,.3)"><img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" loading="lazy" style="display:block;width:100%;height:100%;object-fit:cover;object-position:center"></div>'
        : '<div style="aspect-ratio:4/3;margin:18px 0;background-image:repeating-linear-gradient(135deg,rgba(11,11,11,.16) 0 1px,transparent 1px 20px);border:1.5px dashed rgba(11,11,11,.4);display:grid;place-items:center;font-family:\'JetBrains Mono\';font-size:10px;letter-spacing:0.16em;text-transform:uppercase;opacity:.7">' + esc(p.shot) + '</div>';
      card.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:baseline;font-family:\'JetBrains Mono\';font-size:12px;letter-spacing:0.14em;text-transform:uppercase">' + esc(p.idx) + '<span style="color:var(--acid);background:rgb(var(--bg));padding:3px 8px;font-weight:500">' + esc(p.tag) + '</span></div>' +
        media +
        '<h3 style="font-family:\'Archivo\';font-weight:900;font-size:34px;line-height:0.9;letter-spacing:-0.03em;text-transform:uppercase">' + esc(p.name) + '</h3>' +
        '<p style="font-family:\'JetBrains Mono\';font-size:12px;line-height:1.55;text-transform:uppercase;margin-top:12px;opacity:.75">' + esc(p.desc) + '</p>';
      stage.appendChild(card);
    });
  }

  function buildSkills() {
    var host = $("[data-skill-list]");
    skillGroups.forEach(function (g) {
      var row = el("div", { "data-reveal": "", "class": "skill-row",
        style: "display:grid;grid-template-columns:300px 1fr;gap:30px;align-items:start;padding:34px 0;border-top:1px solid rgba(var(--fg),.22)" });
      var chips = g.items.map(function (it) {
        return '<span data-hover="skill" data-hover-style="background:var(--acid);color:#0b0b0b;border-color:var(--acid)" style="font-family:\'JetBrains Mono\';font-size:12px;letter-spacing:0.02em;text-transform:uppercase;padding:9px 14px;border:1.5px solid rgba(var(--fg),.45);transition:background .25s,color .25s,border-color .25s">' + esc(it) + '</span>';
      }).join("");
      row.innerHTML =
        '<div style="display:flex;flex-direction:column;gap:8px"><span style="font-family:\'JetBrains Mono\';font-size:11px;letter-spacing:0.14em;color:var(--acid)">' + esc(g.idx) + '</span>' +
        '<h3 style="font-family:\'Archivo\';font-weight:900;font-size:clamp(22px,2.4vw,34px);line-height:0.95;letter-spacing:-0.02em;text-transform:uppercase">' + esc(g.title) + '</h3></div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:10px;align-content:flex-start">' + chips + '</div>';
      host.appendChild(row);
    });
  }

  function buildPath() {
    var host = $("[data-path-list]");
    path.forEach(function (row) {
      var r = el("div", { "data-reveal": "", "class": "path-row",
        style: "display:grid;grid-template-columns:120px 1fr auto;gap:30px;align-items:baseline;padding:30px 0;border-top:1px solid rgba(var(--fg),.25)" });
      r.innerHTML =
        '<span style="font-family:\'JetBrains Mono\';font-size:13px;color:var(--acid);letter-spacing:0.08em">' + esc(row.years) + '</span>' +
        '<span style="font-family:\'Archivo\';font-weight:800;font-size:clamp(20px,3vw,40px);line-height:1;letter-spacing:-0.02em;text-transform:uppercase">' + esc(row.title) + '</span>' +
        '<span style="font-family:\'JetBrains Mono\';font-size:12px;text-transform:uppercase;letter-spacing:0.1em;opacity:.6;text-align:right">' + esc(row.meta) + '</span>';
      host.appendChild(r);
    });
  }

  function buildContact() {
    var link = $("[data-email-link]");
    link.setAttribute("href", mailtoEmail);
    link.textContent = email;
    var host = $("[data-socials]");
    socials.forEach(function (s) {
      var a = el("a", { href: s.url, "data-hover": "visit", "data-magnet": "",
        style: "font-family:'JetBrains Mono';font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#0b0b0b;text-decoration:none;font-weight:500" });
      if (s.url.indexOf("mailto:") !== 0) { a.target = "_blank"; a.rel = "noopener"; }
      a.textContent = s.label + " ↗";
      host.appendChild(a);
    });
  }

  // ---------------------------------------------------------------- MODAL
  function openDetail(i) {
    FX.detailOpen = true;
    var p = projects[i] || projects[0];
    $("[data-modal-idx]").textContent = p.idx;
    $("[data-modal-tag]").textContent = p.tag;
    $("[data-modal-name]").textContent = p.name;
    $("[data-modal-long]").textContent = p.long;
    var media = $("[data-modal-media]");
    media.innerHTML = p.img
      ? '<div style="margin:24px 0;overflow:hidden;border:1.5px solid rgba(242,241,234,.18)"><img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" style="display:block;width:100%;height:auto"></div>'
      : '<div style="aspect-ratio:16/6.5;margin:24px 0;background-image:repeating-linear-gradient(135deg,rgba(197,248,42,.16) 0 1px,transparent 1px 22px);border:1.5px dashed rgba(242,241,234,.28);display:grid;place-items:center;font-family:\'JetBrains Mono\';font-size:10px;letter-spacing:0.16em;text-transform:uppercase;opacity:.55">' + esc(p.shot) + '</div>';
    $("[data-modal-points]").innerHTML = (p.points || []).map(function (pt) {
      return '<li style="display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:start"><span style="color:#c5f82a;font-family:\'Archivo\';font-weight:900;font-size:16px;line-height:1.35">★</span><span style="font-family:\'JetBrains Mono\';font-size:13px;line-height:1.6;text-transform:uppercase;letter-spacing:0.02em">' + esc(pt) + '</span></li>';
    }).join("");
    $("[data-modal-tech]").innerHTML = (p.tech || []).map(function (t) {
      return '<span style="font-family:\'JetBrains Mono\';font-size:11px;letter-spacing:0.04em;text-transform:uppercase;padding:8px 12px;border:1.5px solid rgba(242,241,234,.3)">' + esc(t) + '</span>';
    }).join("");
    var links = [];
    if (p.demo) {
      links.push('<a href="' + esc(p.demo) + '" target="_blank" rel="noopener" data-hover="demo" style="display:inline-flex;align-items:center;gap:10px;background:#c5f82a;color:#0b0b0b;font-family:\'Archivo\';font-weight:900;font-size:14px;letter-spacing:0.02em;text-transform:uppercase;padding:15px 22px;text-decoration:none;box-shadow:5px 5px 0 rgba(242,241,234,.22)">Live Demo ↗</a>');
    }
    if (p.link) {
      var ghStyle = p.demo
        ? 'display:inline-flex;align-items:center;gap:10px;background:transparent;color:#f2f1ea;border:2px solid #c5f82a;font-family:\'Archivo\';font-weight:900;font-size:14px;letter-spacing:0.02em;text-transform:uppercase;padding:13px 20px;text-decoration:none'
        : 'display:inline-flex;align-items:center;gap:10px;background:#c5f82a;color:#0b0b0b;font-family:\'Archivo\';font-weight:900;font-size:14px;letter-spacing:0.02em;text-transform:uppercase;padding:15px 22px;text-decoration:none;box-shadow:5px 5px 0 rgba(242,241,234,.22)';
      links.push('<a href="' + esc(p.link) + '" target="_blank" rel="noopener" data-hover="visit" style="' + ghStyle + '">View on GitHub ↗</a>');
    }
    $("[data-modal-link]").innerHTML = links.length
      ? '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:30px">' + links.join("") + "</div>"
      : "";
    bindHover($("[data-modal-link]"));
    if (FX.bindCursorHover) FX.bindCursorHover(document);
    reflectModal();
    document.title = p.name + " — Vatsal Vala";
    document.body.style.overflow = "hidden";
  }
  function closeDetail() {
    FX.detailOpen = false;
    reflectModal();
    document.title = "Vatsal Vala — AI / ML Engineer";
    document.body.style.overflow = "";
  }
  function reflectModal() {
    var m = $("[data-modal]"), card = $("[data-modal-card]");
    if (!m) return;
    if (FX.detailOpen) {
      m.style.opacity = "1"; m.style.pointerEvents = "auto";
      if (card) { card.style.transform = "translateY(0)"; card.scrollTop = 0; }
    } else {
      m.style.opacity = "0"; m.style.pointerEvents = "none";
      if (card) { card.style.transform = "translateY(24px)"; }
    }
  }

  // ---------------------------------------------------------------- ACTIONS (main-owned)
  var ACTIONS = { scrollDown: scrollDown, closeDetail: closeProject };
  function bindActions() {
    $all("[data-action]").forEach(function (n) {
      var fn = ACTIONS[n.getAttribute("data-action")];
      if (fn && !n._abound) { n._abound = true; n.addEventListener("click", fn); }
    });
  }

  // hover/focus inline-style swaps (replaces the design's style-hover / style-focus)
  function bindHover(ctx) {
    $all("[data-hover-style]", ctx).forEach(function (n) {
      if (n._hbound) return; n._hbound = true;
      var add = n.getAttribute("data-hover-style");
      var base = n.getAttribute("style") || "";
      n.addEventListener("mouseenter", function () { n.setAttribute("style", base + ";" + add); });
      n.addEventListener("mouseleave", function () { n.setAttribute("style", base); });
    });
    $all("[data-focus-style]", ctx).forEach(function (n) {
      if (n._fbound) return; n._fbound = true;
      var add = n.getAttribute("data-focus-style");
      var base = n.getAttribute("style") || "";
      n.addEventListener("focus", function () { n.setAttribute("style", base + ";" + add); });
      n.addEventListener("blur", function () { n.setAttribute("style", base); });
    });
  }


  // ---------------------------------------------------------------- NAV WIPE TRANSITIONS
  // Play the column-wipe; run `atCover` at the moment the screen is fully covered.
  function playWipe(atCover) {
    var wipe = $("[data-wipe]");
    if (!wipe || FX.reduced || FX._wiping) { if (atCover) atCover(); return; }
    FX._wiping = true;
    var cols = $all(".wipe-col", wipe);
    cols.forEach(function (c, i) { c.style.transitionDelay = (i * 0.055) + "s"; });
    wipe.classList.add("active");
    requestAnimationFrame(function () { wipe.classList.add("covering"); });
    setTimeout(function () {
      if (atCover) atCover();
      wipe.classList.remove("covering");
      wipe.classList.add("leaving");
      setTimeout(function () {
        wipe.classList.remove("active", "leaving");
        cols.forEach(function (c) { c.style.transitionDelay = ""; });
        FX._wiping = false;
      }, 720);
    }, 700);
  }
  function wipeTo(target) {
    var el = $(target);
    if (!el) return;
    playWipe(function () {
      var y = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, y);
      FX.sy = y; FX.vel = 0;
      try { applyFx(); } catch (e) {}
    });
  }

  // ---------------------------------------------------------------- ROUTER (project pages)
  // Each project card navigates to /work/<slug> as a real URL (History API),
  // rendered as a full-screen page. Deep-links and the browser Back button work.
  var didInAppNav = false;
  function slugToIndex(slug) {
    for (var i = 0; i < projects.length; i++) { if (projects[i].slug === slug) return i; }
    return -1;
  }
  function routeSlug() {
    var m = location.pathname.match(/^\/work\/([A-Za-z0-9_-]+)\/?$/);
    return m ? m[1] : null;
  }
  // Reflect the current URL into the view (no transition).
  function syncRoute() {
    var slug = routeSlug();
    var i = slug ? slugToIndex(slug) : -1;
    if (i >= 0) openDetail(i);
    else closeDetail();
  }
  // Push a new URL and animate the swap through the column wipe.
  function navigateTo(path) {
    if (location.pathname === path) return;
    didInAppNav = true;
    history.pushState({}, "", path);
    playWipe(syncRoute);
  }
  function openProject(idx) { navigateTo("/work/" + projects[idx].slug); }
  function closeProject() {
    if (!routeSlug()) { closeDetail(); return; }
    if (didInAppNav) { history.back(); }       // popstate → playWipe(syncRoute)
    else { navigateTo("/"); }
  }

  function scrollDown() {
    var header = $("#top");
    var target = header ? header.offsetHeight : window.innerHeight;
    var start = window.scrollY, dist = target - start, dur = 850, t0 = performance.now();
    var ease = function (t) { return 1 - Math.pow(1 - t, 3); };
    var step = function (now) {
      var p = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, start + dist * ease(p));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---------------------------------------------------------------- REVEALS (split masks + fade-ups)
  function setupReveals() {
    // split section labels into masked words
    $all("[data-split]").forEach(function (node) {
      // wrap each direct child span's text in a mask (or the node itself if it has no children)
      var targets = node.children.length ? $all(":scope > span", node) : [node];
      targets.forEach(function (t, i) {
        var txt = t.innerHTML;
        t.innerHTML = '<span class="split-mask"><span class="split-inner" style="transition-delay:' + (i * 0.09) + 's">' + txt + "</span></span>";
      });
    });
    if (!("IntersectionObserver" in window)) {
      $all("[data-split] .split-mask").forEach(function (m) { m.classList.add("revealed"); });
      $all("[data-reveal]").forEach(function (n) { n.classList.add("revealed"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var n = en.target;
        if (n.hasAttribute("data-split")) {
          $all(".split-mask", n).forEach(function (m) { m.classList.add("revealed"); });
        } else {
          n.classList.add("revealed");
        }
        io.unobserve(n);
      });
    }, { threshold: 0.18 });
    $all("[data-split],[data-reveal]").forEach(function (n) { io.observe(n); });
  }

  // ---------------------------------------------------------------- FX ENGINE
  function rectProg(node) {
    var r = node.getBoundingClientRect();
    return clamp((FX.vh - r.top) / (FX.vh + r.height), 0, 1);
  }
  function applyFx() {
    var root = FX.root;
    var y = FX.sy; // lerped (inertia) scroll value
    var docH = Math.max(1, document.documentElement.scrollHeight - FX.vh);
    var gp = clamp(y / docH, 0, 1);

    var c = mixColor(gp);
    root.style.setProperty("--bg", c.bg.join(","));
    root.style.setProperty("--fg", c.fg.join(","));

    var vSkew = FX.reduced ? 0 : clamp(FX.vel * 0.45, -14, 14);

    if (!FX.reduced) {
      FX.parallax.forEach(function (n) {
        var sp = parseFloat(n.getAttribute("data-speed")) || 0;
        n.style.transform = "translateY(" + (y * sp) + "px)";
      });
    }
    if (FX.heroText) {
      var hp = clamp(y / FX.vh, 0, 1);
      FX.heroText.style.transform = "scale(" + (1 - hp * 0.12) + ") translateY(" + (y * 0.25) + "px)";
      FX.heroText.style.opacity = String(1 - hp * 0.9);
    }
    if (FX.grid && !FX.reduced) {
      var mx = (FX.mouse.x / innerWidth - 0.5), my = (FX.mouse.y / innerHeight - 0.5);
      FX.grid.style.transform = "perspective(700px) rotateX(" + (my * 8) + "deg) rotateY(" + (-mx * 8) + "deg) scale(1.1)";
    }
    // grid glow follows the cursor while the hero is on screen
    if (FX.gridGlow) {
      var heroVisible = y < FX.vh * 1.4 && !FX.isTouch && !FX.reduced;
      FX.gridGlow.style.opacity = heroVisible ? "1" : "0";
      if (heroVisible) {
        var gr = FX.grid.getBoundingClientRect();
        FX.gridGlow.style.setProperty("--gx", ((FX.cpos.x - gr.left) / gr.width * 100) + "%");
        FX.gridGlow.style.setProperty("--gy", ((FX.cpos.y - gr.top) / gr.height * 100) + "%");
      }
    }
    if (FX.hscroll) {
      var p = rectProg(FX.hscroll.parentElement);
      var mxn = (FX.mouse.x / innerWidth - 0.5);
      FX.hscroll.style.transform = "translateX(" + (-p * 46 + 10 - mxn * 8) + "vw) skewX(" + vSkew + "deg)";
    }
    FX.scrubs.forEach(function (n) {
      var p = rectProg(n);
      var to = parseInt(n.getAttribute("data-to"), 10) || 0;
      var suf = n.getAttribute("data-suffix") || "";
      n.textContent = Math.round(to * clamp(p * 1.4, 0, 1)) + suf;
    });
    if (FX.warp && !FX.reduced) {
      var pw = rectProg(FX.warp);
      FX.wls.forEach(function (l, i) {
        var phase = (i / (FX.wls.length - 1)) * Math.PI;
        var bend = Math.sin(phase + pw * Math.PI * 1.2);
        l.style.transform = "translateY(" + (bend * 70 - 20) + "px) rotate(" + (bend * 7) + "deg) scaleY(" + (1 + Math.abs(bend) * 0.18) + ")";
      });
    }
    FX.mrows.forEach(function (n) {
      var dir = parseFloat(n.getAttribute("data-dir")) || 1;
      var p = rectProg(n.closest("section"));
      n.style.transform = "translateX(" + (dir * (p * 40 - 20)) + "vw) skewX(" + (vSkew * dir) + "deg)";
    });
    if (FX.skew && !FX.reduced) {
      var ps = rectProg(FX.skew.closest("section"));
      FX.skew.style.transform = "skewY(" + ((ps - 0.5) * -6) + "deg)";
    }
    if (FX.circleSec && FX.circle) {
      var r = FX.circleSec.getBoundingClientRect();
      var total = FX.circleSec.offsetHeight - FX.vh;
      var local = clamp((-r.top) / Math.max(1, total), 0, 1);
      var rad = clamp((local - 0.04) / 0.5, 0, 1) * 150;
      FX.circle.style.clipPath = "circle(" + rad + "% at 50% 50%)";
      // spinning text ring: idles slowly, speeds/reverses with scroll velocity
      if (FX.ring && !FX.reduced && r.top < FX.vh && r.bottom > 0) {
        FX.ringA = (FX.ringA || 0) + 0.12 + clamp(FX.vel * 0.06, -1.4, 1.4);
        FX.ring.style.transform = "translate(-50%,-50%) rotate(" + FX.ringA.toFixed(2) + "deg)";
      }
    }
    updateRail();
  }

  // ---------------------------------------------------------------- SECTION RAIL
  function updateRail() {
    if (!FX.railLinks || !FX.railLinks.length) return;
    var current = null;
    FX.railSections.forEach(function (sec) {
      var r = sec.getBoundingClientRect();
      if (r.top <= FX.vh * 0.5) current = sec.id;
    });
    if (current === FX._railCur) return;
    FX._railCur = current;
    FX.railLinks.forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-rail-link") === current);
    });
  }

  // ---------------------------------------------------------------- IST CLOCK
  function startClock() {
    var nodes = $all("[data-clock]");
    if (!nodes.length) return;
    var fmt;
    try {
      fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch (e) { return; }
    function tick() {
      var t = fmt.format(new Date()) + " IST";
      nodes.forEach(function (n) { n.textContent = t; });
    }
    tick();
    setInterval(tick, 1000);
  }

  // ---------------------------------------------------------------- MAGNETIC ELEMENTS
  function applyMagnets() {
    if (FX.isTouch || FX.reduced) return;
    var R = 90, PULL = 0.32;
    FX.magnets.forEach(function (n) {
      var r = n.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = FX.mouse.x - cx, dy = FX.mouse.y - cy;
      var d = Math.hypot(dx, dy);
      var tx = 0, ty = 0;
      if (d < R + Math.max(r.width, r.height) / 2) { tx = dx * PULL; ty = dy * PULL; }
      n._mx = lerp(n._mx || 0, tx, 0.18);
      n._my = lerp(n._my || 0, ty, 0.18);
      if (Math.abs(n._mx) > 0.05 || Math.abs(n._my) > 0.05) {
        n.style.transform = "translate(" + n._mx.toFixed(2) + "px," + n._my.toFixed(2) + "px)";
      } else if (n.style.transform) {
        n.style.transform = "";
      }
    });
  }

  // ---------------------------------------------------------------- CARDS (drag pile)
  function setupCards() {
    FX.cards = $all("[data-card]");
    FX.stage = $("[data-stage]");
    if (!FX.stage) return;
    FX.zTop = 10;
    layoutCards();
    FX.cards.forEach(function (c, i) {
      c.style.opacity = "0";
      c.style.transition = "opacity .6s ease";
      bindDrag(c, i);
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        FX.cards.forEach(function (c, i) { c.style.transitionDelay = (i * 0.08 + 0.2) + "s"; c.style.opacity = "1"; });
      });
    });
  }
  function layoutCards() {
    if (!FX.stage || !FX.cards) return;
    var sw = FX.stage.clientWidth || 1000;
    var cw = FX.cards[0] ? FX.cards[0].offsetWidth : 320;
    var ch = FX.cards[0] ? FX.cards[0].offsetHeight : 460;
    var small = sw < 560;
    var n = FX.cards.length;
    var usable = Math.max(0, sw - cw);
    var stepX = n > 1 ? usable / (n - 1) : 0;
    var stepY = small ? Math.min(70, ch * 0.18) : 46;
    var maxRot = small ? 2 : 4;
    FX.cards.forEach(function (c, i) {
      if (c._dragged) return;
      var baseX = small ? (usable / 2) : Math.min(usable, 20 + i * stepX * 0.78);
      var baseY = 16 + i * stepY;
      var rot = (i % 2 === 0 ? -1 : 1) * (maxRot - i * (maxRot / Math.max(1, n)) * 0.4);
      c._x = baseX; c._y = baseY; c._rot = rot;
      c.style.transform = "translate(" + baseX + "px," + baseY + "px) rotate(" + rot + "deg)";
      c.style.zIndex = String(i + 1);
    });
    var lastY = 16 + (n - 1) * stepY;
    FX.stage.style.height = (lastY + ch + 24) + "px";
  }
  function bindDrag(c, idx) {
    var sx, sy, ox, oy, drag = false, moved = false;
    function down(e) {
      drag = true; moved = false; c.style.cursor = "grabbing"; c.style.transition = "none";
      FX.zTop++; c.style.zIndex = String(FX.zTop);
      var pt = e.touches ? e.touches[0] : e;
      sx = pt.clientX; sy = pt.clientY; ox = c._x; oy = c._y;
      e.preventDefault();
      window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
      window.addEventListener("touchmove", move, { passive: false }); window.addEventListener("touchend", up);
    }
    function move(e) {
      if (!drag) return;
      var pt = e.touches ? e.touches[0] : e;
      var dx = pt.clientX - sx, dy = pt.clientY - sy;
      if (!moved && Math.hypot(dx, dy) > 6) { moved = true; c._dragged = true; }
      c._x = ox + dx; c._y = oy + dy;
      c.style.transform = "translate(" + c._x + "px," + c._y + "px) rotate(" + c._rot + "deg)";
      if (e.cancelable) e.preventDefault();
    }
    function up() {
      drag = false; c.style.cursor = "grab";
      window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move); window.removeEventListener("touchend", up);
      if (!moved) openProject(idx);
    }
    c.addEventListener("mousedown", down);
    c.addEventListener("touchstart", down, { passive: false });
  }

  // ---------------------------------------------------------------- LOADER v2
  var LOAD_WORDS = ["Loading", "Chunking", "Embedding", "Retrieving", "Reranking", "Generating"];
  function finishLoad(loader) {
    if (FX._loaded) return; FX._loaded = true;
    clearInterval(FX.wordIv);
    var word = $("[data-loader-word]");
    if (word) scramble(word, "Ready", 350);
    setTimeout(function () {
      if (loader) loader.classList.add("is-done");
      document.body.style.overflow = "";
      // VV monogram draw-in (stroked V draws, solid V fills, pixel pops)
      $all(".vv-mark").forEach(function (m) { m.classList.add("drawn"); });
      // hero title scramble-in as the columns clear
      $all("[data-scramble-in]").forEach(function (n, i) {
        var txt = n.textContent;
        setTimeout(function () { scramble(n, txt, 900); }, 250 + i * 180);
      });
      setTimeout(function () { if (loader) loader.style.display = "none"; }, 1400);
    }, 420);
  }
  function startLoader() {
    document.body.style.overflow = "hidden";
    var counter = $("[data-counter]"), bar = $("[data-loader-bar]"), loader = $("[data-loader]");
    var word = $("[data-loader-word]");
    if (FX.reduced) {
      if (counter) counter.textContent = "100";
      if (bar) bar.style.width = "100%";
      finishLoad(loader);
      return;
    }
    var n = 0;
    FX.loadIv = setInterval(function () {
      n += Math.max(1, Math.round((100 - n) * 0.08)) + (Math.random() * 3 | 0);
      if (n >= 100) { n = 100; clearInterval(FX.loadIv); finishLoad(loader); }
      if (counter) counter.textContent = String(n).padStart(2, "0");
      if (bar) bar.style.width = n + "%";
    }, 45);
    var wi = 0;
    FX.wordIv = setInterval(function () {
      wi = (wi + 1) % LOAD_WORDS.length;
      if (word && !FX._loaded) scramble(word, LOAD_WORDS[wi], 380);
    }, 620);
    setTimeout(function () { clearInterval(FX.loadIv); finishLoad(loader); }, 5000);
  }

  // ---------------------------------------------------------------- MOUNT
  function mount() {
    FX.root = $("[data-root]");
    FX.vh = window.innerHeight;
    FX.mouse = { x: innerWidth / 2, y: innerHeight / 2 };
    FX.cpos = { x: FX.mouse.x, y: FX.mouse.y };
    FX.pmouse = { x: FX.mouse.x, y: FX.mouse.y };
    FX.isTouch = window.matchMedia("(pointer:coarse)").matches;
    FX.sy = window.scrollY || 0;
    FX.vel = 0;

    // dynamic content
    buildCards(); buildSkills(); buildPath(); buildContact();
    bindActions(); bindHover(document); bindScrambleHover(document);
    setupReveals();
    startClock();

    startLoader();

    // cursor
    var cur = $("[data-cursor]"), circle = $("[data-cursor-circle]"), label = $("[data-cursor-label]");
    if (!FX.isTouch) {
      document.body.style.cursor = "none";
      $all("a,button,[data-card]").forEach(function (e) { e.style.cursor = "none"; });
    }
    window.addEventListener("mousemove", function (e) { FX.mouse.x = e.clientX; FX.mouse.y = e.clientY; }, { passive: true });
    window.addEventListener("keydown", function (e) { if (e.key === "Escape" && FX.detailOpen) closeDetail(); });

    var hIn = function (e) {
      var t = e.currentTarget.getAttribute("data-hover");
      if (circle) { circle.style.width = "84px"; circle.style.height = "84px"; }
      if (label) { label.textContent = t; label.style.opacity = "1"; }
    };
    var hOut = function () {
      if (circle) { circle.style.width = "22px"; circle.style.height = "22px"; }
      if (label) { label.style.opacity = "0"; label.textContent = ""; }
    };
    function bindCursorHover(ctx) {
      $all("[data-hover]", ctx).forEach(function (e) {
        if (e._chbound) return; e._chbound = true;
        e.addEventListener("mouseenter", hIn); e.addEventListener("mouseleave", hOut);
      });
    }
    FX.bindCursorHover = bindCursorHover;
    bindCursorHover(document);

    // gather fx els
    FX.parallax = $all("[data-parallax]");
    FX.heroText = $("[data-hero-text]");
    FX.grid = $("[data-grid]");
    FX.gridGlow = $("[data-grid-glow]");
    FX.hscroll = $("[data-hscroll]");
    FX.scrubs = $all("[data-scrub]");
    FX.warp = $("[data-warp]");
    FX.wls = $all("[data-wl]");
    FX.mrows = $all("[data-mrow]");
    FX.skew = $("[data-skew]");
    FX.circleSec = $("#contact");
    FX.circle = $("[data-circle]");
    FX.ring = $("[data-ring]");
    FX.heroPin = $("[data-hero-pin]");
    FX.magnets = $all("[data-magnet]");
    FX.railLinks = $all("[data-rail-link]");
    FX.railSections = ["about", "experience", "work", "skills", "education", "contact"]
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);

    // hero grid click pulse (shockwave rings through the grid)
    if (FX.heroPin) {
      FX.heroPin.addEventListener("click", function (e) {
        if (FX.reduced) return;
        if (e.target.closest && e.target.closest("a,button")) return;
        var r = FX.heroPin.getBoundingClientRect();
        ["", "grid-pulse--o"].forEach(function (extra) {
          var d = document.createElement("div");
          d.className = extra ? "grid-pulse " + extra : "grid-pulse";
          d.style.left = (e.clientX - r.left) + "px";
          d.style.top = (e.clientY - r.top) + "px";
          FX.heroPin.appendChild(d);
          setTimeout(function () { d.remove(); }, 1400);
        });
      });
    }

    // in-page anchors (nav, rail, VV marks) go through the column wipe
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var href = a.getAttribute("href");
      if (!href || href.length < 2) return;
      e.preventDefault();
      wipeTo(href);
    });

    setupCards();
    // cards, socials & modal-link were added after first cursor bind — rebind
    bindCursorHover(document);
    FX.magnets = $all("[data-magnet]");

    // routing: Back/Forward buttons animate through the wipe; honor deep-links
    window.addEventListener("popstate", function () { playWipe(syncRoute); });
    syncRoute();  // if loaded directly on /work/<slug>, show that project now

    window.addEventListener("resize", function () {
      FX.vh = window.innerHeight;
      try { layoutCards(); } catch (e) {}
    }, { passive: true });

    // main loop: lerped scroll (inertia for FX), velocity, cursor, magnets
    var loop = function () {
      var target = window.scrollY || window.pageYOffset || 0;
      var prev = FX.sy;
      FX.sy = FX.reduced ? target : lerp(FX.sy, target, 0.12);
      if (Math.abs(FX.sy - target) < 0.3) FX.sy = target;
      FX.vel = lerp(FX.vel, FX.sy - prev, 0.2);

      // cursor: velocity squash & stretch
      var pdx = FX.mouse.x - FX.cpos.x, pdy = FX.mouse.y - FX.cpos.y;
      FX.cpos.x = lerp(FX.cpos.x, FX.mouse.x, 0.2);
      FX.cpos.y = lerp(FX.cpos.y, FX.mouse.y, 0.2);
      if (cur) {
        var sp = Math.min(1, Math.hypot(pdx, pdy) / 120);
        var ang = Math.atan2(pdy, pdx) * 180 / Math.PI;
        var stretch = FX.reduced ? "" : " rotate(" + ang.toFixed(1) + "deg) scale(" + (1 + sp * 0.35).toFixed(3) + "," + (1 - sp * 0.22).toFixed(3) + ") rotate(" + (-ang).toFixed(1) + "deg)";
        cur.style.transform = "translate(" + FX.cpos.x + "px," + FX.cpos.y + "px) translate(-50%,-50%)" + stretch;
      }
      applyMagnets();
      try { applyFx(); } catch (err) { if (!FX._fxErr) { FX._fxErr = 1; console.error("applyFx error", err); } }
      FX.raf = requestAnimationFrame(loop);
    };
    FX.raf = requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- SHARED (for chat.js)
  window.VV = {
    $: $, $all: $all, el: el, esc: esc,
    email: email,
    bindHover: bindHover,
    getCursorBind: function () { return FX.bindCursorHover; },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
