# Projects — Vatsal Vala

Vatsal's best and most impressive projects are the **Multi-Chatbot RAG Platform** and the **AI Medical Transcription System** (both built professionally at Vivansh Infotech), and **SignAssistive** — his real-time sign-language translator — among personal projects. Dhanvantari and EquityNews.AI round out his RAG portfolio.

## 1. Multi-Chatbot RAG Platform (professional, at Vivansh Infotech)

A production multi-chatbot RAG platform where each user turns their own PDFs, documents, and crawled URLs into a per-bot knowledge base — then chats with answers grounded in that context instead of guesswork. Users can create multiple chatbots, each with its own isolated knowledge base built from their own uploaded content.

**How it works:**
- Ingestion: users upload PDFs and documents, or provide URLs. Web pages are crawled via BeautifulSoup/Requests; documents are OCR'd and converted to clean markdown with Docling so the pipeline sees consistent, structured text.
- The retrieval chain: text is split with Recursive Character chunking, embedded with the all-MiniLM-L6-v2 sentence-transformer (384-dimensional vectors), and stored in Pinecone. At query time, results are reranked down to the top-3 most relevant chunks.
- Generation: GPT-4o with carefully optimized prompting answers strictly from the retrieved context, so each bot answers from its own knowledge base instead of hallucinating.

**Tech stack:** Python, FastAPI, Pinecone, all-MiniLM-L6-v2, GPT-4o, Docling, BeautifulSoup, Requests

## 2. AI Medical Transcription System (professional, at Vivansh Infotech)

An AI medical-transcription system that turns raw medical records into structured medical forms automatically. Vatsal re-architected it from a single heavy LLM call into a lean two-stage pipeline — a case study in LLM cost and latency optimization.

**How it works:**
- Stage one: an LLM pass extracts medical terms and their permutations from the raw record.
- Stage two: fuzzy search (RapidFuzz) plus semantic search (FAISS) map the extracted terms to the correct structured form fields.
- Results: end-to-end form generation dropped to about 15 seconds, and token usage fell 60% — from roughly 25,000 tokens down to 10,000 per form — by optimizing the sequential pipeline.

**Tech stack:** Python, LLM pipelines, RapidFuzz, FAISS, FastAPI

## 3. SignAssistive — Real-Time Indian Sign Language Translator

One of Vatsal's most impressive personal projects: a real-time Indian Sign Language recognizer that classifies 47 gestures — 23 letters, 10 digits, and 14 common words like HELP, WATER and THANK YOU — entirely in the browser, with no backend at all.

**How it works:**
- MediaPipe extracts 21 hand landmarks (63 features) from the webcam feed; a lightweight 1D CNN (Conv1D → MaxPooling → Dense layers with dropout and a softmax head) classifies the gesture. The landmark-based approach makes it fast and robust to lighting and background changes.
- Achieves **92% test accuracy** on the 47-gesture vocabulary.
- The Keras model was ported to TensorFlow.js by rebuilding the architecture and re-implementing the Python landmark normalization line-for-line in JavaScript, guaranteeing input parity between training and browser inference.
- Fully client-side inference via getUserMedia + MediaPipe Tasks — the webcam feed never leaves the user's device, so it is private by design.
- The static frontend is auto-deployed to GitHub Pages through a GitHub Actions CI/CD workflow.

**Tech stack:** Python, TensorFlow/Keras, TensorFlow.js, MediaPipe, OpenCV, scikit-learn, FastAPI, GitHub Actions
**Live demo:** https://vala412.github.io/SignAssistive/translate.html
**GitHub:** https://github.com/Vala412/SignAssistive

## 4. Dhanvantari — Ayurvedic RAG Health Assistant

A full-stack RAG web app that answers Ayurvedic health questions by grounding an LLM in 15+ classical texts — including the Charaka Samhita, the Ayurvedic Pharmacopoeia of India, and Dr. Vasant Lad's works — citing the originating book for each answer instead of hallucinating. Vatsal led the team that built Dhanvantari at the Hack the Mountains hackathon.

**How it works:**
- Offline ingestion: Ayurvedic PDFs are loaded with PyPDFLoader, split into 500-character chunks with 50-character overlap, embedded with all-MiniLM-L6-v2, and stored in a FAISS vector store.
- Online query: top-k retrieval plus a custom system prompt flow through a LangChain RetrievalQA chain, answered by Mistral-7B-Instruct with streamed source citations.
- Session-based conversational memory keeps context across follow-up questions; prompt engineering forces the model to include precautions and exceptions for every remedy it suggests.
- A Prakruti Analyzer questionnaire profiles the user's body constitution (Vata / Pitta / Kapha) for personalized guidance.
- Model selection was metric-driven: Vatsal benchmarked Mistral-7B, Zephyr-7B, Gemma-7B and GPT-3.5 with the RAGAS evaluation framework and chose Mistral-7B for its top faithfulness score of 0.86.

**Tech stack:** Python, LangChain, Chainlit, Mistral-7B, FAISS, HuggingFace, RAGAS, React, TypeScript, Vite, Tailwind CSS, Recoil, Socket.IO
**GitHub:** https://github.com/Vala412/Dhanvantari

## 5. EquityNews.AI — News Research Tool

An AI research assistant for news: paste in article URLs (for example, equity and stock-market news), ask questions in plain language, and get answers grounded in the actual articles with citations back to each source — verifiable answers, not generic LLM guesses.

**How it works:**
- Ingestion: loads up to 3 URLs with UnstructuredURLLoader, splits them into roughly 1000-character chunks, embeds them into 384-dimensional vectors with all-MiniLM-L6-v2, and indexes them in FAISS (persisted to disk).
- Query: the question is embedded, the closest chunks are retrieved via FAISS similarity search, and Flan-T5-large answers through a RetrievalQAWithSourcesChain — returning the source URLs with the answer.
- Cost-conscious by design: it uses free, open-source, self-hostable HuggingFace models instead of paid OpenAI APIs.
- Full interactive UI built in pure Python with Streamlit; API keys are loaded securely via python-dotenv.

**Tech stack:** Python, LangChain, Streamlit, HuggingFace, FAISS, Sentence-Transformers, Flan-T5
**GitHub:** https://github.com/Vala412/EquityNews.AI

## 6. LogSense — Hybrid Log Classifier

A hybrid log-classification pipeline that routes each log line to the cheapest method that can confidently label it — escalating only when needed, so common logs are classified almost for free.

**How it works:**
- Regex handles known, well-structured log patterns instantly.
- Sentence Transformers embeddings plus Logistic Regression classify the remaining lines.
- An LLM fallback resolves only the ambiguous or previously unseen logs.

**Tech stack:** Python, Regex, Sentence Transformers, Logistic Regression, LLM

## 7. Other Projects

- **Real Estate Price Prediction:** a machine learning project using linear regression with thorough exploratory data analysis (EDA) to predict property prices.
- **InsurePro:** a Django web application with a Random Forest model that predicts insurance premiums.
- **Application Tracking System (ATS):** built for the Rajkot Municipal Corporation as team lead at the SSIP New India Vibrant Hackathon, where the team reached the Grand Finals.
