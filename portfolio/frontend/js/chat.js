"use strict";
/* ============================================================
   Vatsal Vala — Brutalist Portfolio · chat.js
   Portfolio assistant panel wired to the FastAPI RAG backend.
   Contract: POST /chat {query, conversation_id?} -> {answer, conversation_id}
             DELETE /conversation/{id}
   Override the backend with ?api=https://host — defaults to localhost:8000.
   ============================================================ */
(function () {

  // ----- backend chat endpoint (FastAPI) -----
  // Resolution order: (1) ?api=... query override, (2) localhost during dev,
  // (3) the hosted backend in production. After you deploy the backend to
  // Render, replace PROD_API_URL below with your service URL (no trailing slash).
  var PROD_API_URL = "https://vatsal-portfolio-api.onrender.com";
  var API_URL = (function () {
    try {
      var q = new URLSearchParams(location.search).get("api");
      if (q) return q.replace(/\/$/, "");
    } catch (e) {}
    var host = location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "") return "http://localhost:8000";
    return PROD_API_URL.replace(/\/$/, "");
  })();

  var state = { chatOpen: false, input: "", sending: false, messages: [], confirmDelete: false, conversationId: null };
  var streaming = false;
  var streamIv = null;
  var stageT = null;

  // Conversation is intentionally in-memory only: it survives opening/closing
  // the panel within a page load, but a refresh starts a fresh conversation.
  // Wipe any transcript left behind by older builds that persisted to storage.
  try { localStorage.removeItem("vv_chat_v1"); } catch (e) {}

  function init() {
    var VV = window.VV;
    var $ = VV.$, $all = VV.$all, el = VV.el, esc = VV.esc, email = VV.email;

    // ----- minimal, safe Markdown → HTML (escape first, then format) -----
    function mdInline(s) {
      s = s.replace(/`([^`]+)`/g, function (_, c) {
        return '<code style="font-family:\'JetBrains Mono\';font-size:.88em;background:rgba(197,248,42,.14);border:1px solid rgba(197,248,42,.3);padding:1px 5px">' + c + '</code>';
      });
      s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, function (_, t, u) {
        return '<a href="' + u + '" target="_blank" rel="noopener" style="color:#c5f82a">' + t + '</a>';
      });
      s = s.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#c5f82a;font-weight:800">$1</strong>');
      s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em style="color:#e9ffb0;font-style:normal;border-bottom:1px solid rgba(197,248,42,.4)">$2</em>');
      return s;
    }
    function mdToHtml(src) {
      var escd = esc(String(src == null ? "" : src));
      var blocks = [];
      escd = escd.replace(/```([\s\S]*?)```/g, function (_, code) {
        blocks.push(code.replace(/^\n/, "").replace(/\n$/, ""));
        return "§CB" + (blocks.length - 1) + "§";
      });
      var lines = escd.split(/\n/), out = "", listTag = null;
      function closeList() { if (listTag) { out += "</" + listTag + ">"; listTag = null; } }
      for (var i = 0; i < lines.length; i++) {
        var ln = lines[i], m;
        if ((m = ln.match(/^§CB(\d+)§$/))) {
          closeList();
          out += '<pre style="font-family:\'JetBrains Mono\';font-size:12px;line-height:1.5;background:rgba(242,241,234,.06);border:1px solid rgba(242,241,234,.18);padding:11px 12px;overflow-x:auto;margin:8px 0;white-space:pre-wrap">' + blocks[+m[1]] + "</pre>";
          continue;
        }
        if (/^\s*$/.test(ln)) { closeList(); continue; }
        if ((m = ln.match(/^(#{1,4})\s+(.*)$/))) {
          closeList();
          out += '<div style="font-family:\'Archivo\';font-weight:900;font-size:15px;margin:10px 0 4px;text-transform:uppercase;letter-spacing:-0.01em;color:#c5f82a">' + mdInline(m[2]) + "</div>";
          continue;
        }
        if ((m = ln.match(/^\s*[-*+]\s+(.*)$/))) {
          if (listTag !== "ul") { closeList(); out += '<ul style="margin:6px 0;padding-left:20px">'; listTag = "ul"; }
          out += "<li style=\"margin:3px 0\">" + mdInline(m[1]) + "</li>";
          continue;
        }
        if ((m = ln.match(/^\s*\d+\.\s+(.*)$/))) {
          if (listTag !== "ol") { closeList(); out += '<ol style="margin:6px 0;padding-left:22px">'; listTag = "ol"; }
          out += "<li style=\"margin:3px 0\">" + mdInline(m[1]) + "</li>";
          continue;
        }
        closeList();
        out += '<p style="margin:0 0 7px">' + mdInline(ln) + "</p>";
      }
      closeList();
      return out;
    }

    function toggleChat() { state.chatOpen = !state.chatOpen; reflectChat(); }
    function reflectChat() {
      var p = $("[data-chat-panel]");
      if (!p) return;
      if (state.chatOpen) {
        p.style.opacity = "1"; p.style.transform = "translateY(0)"; p.style.pointerEvents = "auto";
        setTimeout(function () { var i = $("[data-chat-input]"); if (i) i.focus(); }, 80);
      } else {
        p.style.opacity = "0"; p.style.transform = "translateY(24px)"; p.style.pointerEvents = "none";
      }
    }
    // ----- Claude-style "reasoning" panel: animated stages + selected chunks -----
    function renderThinking(th) {
      if (!th) return "";
      var acid = "#c5f82a";
      var rows = (th.sources || []).map(function (s) {
        return '<div style="display:flex;gap:7px;padding:5px 0;border-top:1px solid rgba(242,241,234,.09)">'
          + '<span style="color:' + acid + ';flex:none;font-size:9px;line-height:1.6">▸</span>'
          + '<span style="font-family:\'JetBrains Mono\';font-size:10.5px;line-height:1.5">'
          + '<span style="color:' + acid + ';text-transform:uppercase;letter-spacing:.04em">' + esc(s.source) + '</span>'
          + '<span style="color:rgba(242,241,234,.55)"> &mdash; ' + esc(s.snippet || "") + '</span></span></div>';
      }).join("");

      if (!th.done) {
        var head = '<div style="display:flex;align-items:center;gap:8px;font-family:\'JetBrains Mono\';font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:' + acid + '">'
          + '<span class="think-diamond">◆</span><span>' + esc(th.stage || "Thinking") + '<span class="think-dots"></span></span></div>';
        var openList = (th.sources && th.sources.length) ? '<div style="margin-top:9px">' + rows + '</div>' : "";
        return '<div style="padding:11px 13px;background:rgba(197,248,42,.05);border:1px solid rgba(197,248,42,.22)">' + head + openList + '</div>';
      }

      var secs = ((th.elapsedMs || 0) / 1000).toFixed(1);
      var n = (th.sources || []).length;
      var caret = th.collapsed ? "▾" : "▴";
      var summary = '<button data-think-toggle style="display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:transparent;border:none;cursor:pointer;font-family:\'JetBrains Mono\';font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:rgba(242,241,234,.6);padding:0">'
        + '<span style="color:' + acid + '">◆</span><span>Thought for ' + secs + 's' + (n ? (" · " + n + " source" + (n > 1 ? "s" : "")) : "") + '</span>'
        + '<span style="margin-left:auto;color:' + acid + '">' + caret + '</span></button>';
      var list = (!th.collapsed && n) ? '<div style="margin-top:9px">' + rows + '</div>' : "";
      return '<div style="padding:9px 12px;background:rgba(242,241,234,.04);border:1px solid rgba(242,241,234,.14)">' + summary + list + '</div>';
    }

    function renderMessages() {
      var host = $("[data-chat-messages]");
      host.innerHTML = state.messages.map(function (m, mi) {
        var u = m.role === "user";
        var align = u ? "flex-end" : "flex-start";
        var bg = u ? "#c5f82a" : "rgba(242,241,234,.06)";
        var color = u ? "#0b0b0b" : "#f2f1ea";
        var border = u ? "#c5f82a" : "rgba(242,241,234,.18)";
        var ws = u ? ";white-space:pre-wrap" : "";
        var label = u ? "You" : "Anvi";
        var labelColor = u ? "#c5f82a" : "rgba(242,241,234,.5)";
        var labelHtml = '<div style="font-family:\'JetBrains Mono\';font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:' + labelColor + ';padding:0 2px">' + label + '</div>';
        var think = (!u && m.thinking) ? renderThinking(m.thinking) : "";
        var hasBody = u || m.text;
        var bubble = hasBody
          ? '<div style="padding:13px 15px;background:' + bg + ';color:' + color + ';border:1px solid ' + border + ';font-family:\'Archivo\';font-size:14px;line-height:1.5;max-width:100%' + ws + '">' + (u ? esc(m.text) : mdToHtml(m.text)) + '</div>'
          : "";
        return '<div data-mi="' + mi + '" style="display:flex;flex-direction:column;gap:5px;align-items:' + (u ? "flex-end" : "flex-start") + ';align-self:' + align + ';max-width:92%">' + labelHtml + think + bubble + '</div>';
      }).join("");
      $("[data-chat-delete]").style.display = state.messages.length ? "grid" : "none";
    }
    function scrollChat() {
      requestAnimationFrame(function () {
        var s = $("[data-chat-scroll]");
        if (s) s.scrollTop = s.scrollHeight;
      });
    }
    function setTyping(on) { $("[data-chat-typing]").style.display = on ? "flex" : "none"; if (on) scrollChat(); }

    function onInput(e) { state.input = e.target.value; }
    function onKey(e) { if (e.key === "Enter") { e.preventDefault(); sendMsg(); } }
    function askQuick(q) { state.input = q; var i = $("[data-chat-input]"); if (i) i.value = q; sendMsg(); }

    // Word-by-word reveal for the non-streaming fallback path. Assumes an
    // assistant turn was already pushed by sendMsg().
    function streamReply(full) {
      setStage("Generating");
      var parts = String(full).split(/(\s+)/);
      var i = 0;
      clearInterval(streamIv);
      streamIv = setInterval(function () {
        i++;
        updateAssistant(parts.slice(0, i).join(""));
        if (i >= parts.length) { clearInterval(streamIv); finishThinking(); finishStreaming(); }
      }, 26);
    }

    function clearChat() {
      clearInterval(streamIv);
      clearTimeout(stageT);
      streaming = false;
      var prev = state.conversationId;
      state.messages = []; state.input = ""; state.sending = false; state.confirmDelete = false; state.conversationId = null;
      var inp = $("[data-chat-input]"); if (inp) inp.value = "";
      setTyping(false); renderMessages(); reflectConfirm();
      if (prev) {
        try {
          fetch(API_URL + "/conversation/" + encodeURIComponent(prev), { method: "DELETE" }).catch(function () {});
        } catch (e) {}
      }
    }
    function askDelete() { state.confirmDelete = true; reflectConfirm(); }
    function cancelDelete() { state.confirmDelete = false; reflectConfirm(); }
    function confirmClear() { clearChat(); }
    function reflectConfirm() { $("[data-chat-confirm]").style.display = state.confirmDelete ? "flex" : "none"; }

    var FALLBACK_MSG = "I'm having a moment connecting — but you can reach Vatsal directly at " + email + ".";

    function lastAssistant() {
      var m = state.messages;
      return (m.length && m[m.length - 1].role === "assistant") ? m[m.length - 1] : null;
    }
    // Push the assistant turn up front so the reasoning panel can animate while
    // retrieval + generation run. thinking is finalized in finishThinking().
    function newAssistantTurn() {
      state.messages.push({
        role: "assistant",
        text: "",
        thinking: { stage: "Thinking", sources: [], startTs: Date.now(), done: false, collapsed: false },
      });
      renderMessages(); scrollChat();
    }
    function setStage(stage) {
      var a = lastAssistant();
      if (a && a.thinking && !a.thinking.done) { a.thinking.stage = stage; renderMessages(); scrollChat(); }
    }
    function setSources(list) {
      var a = lastAssistant();
      if (a && a.thinking && !a.thinking.done) {
        a.thinking.sources = list || [];
        a.thinking.stage = "Reasoning";
        renderMessages(); scrollChat();
      }
    }
    function finishThinking() {
      var a = lastAssistant();
      if (a && a.thinking && !a.thinking.done) {
        a.thinking.done = true;
        a.thinking.collapsed = true;
        a.thinking.elapsedMs = Date.now() - a.thinking.startTs;
        renderMessages(); scrollChat();
      }
    }
    function updateAssistant(text) {
      var a = lastAssistant();
      if (a) a.text = text;
      renderMessages(); scrollChat();
    }
    function finishStreaming() { state.sending = false; streaming = false; clearTimeout(stageT); }

    function sendMsg() {
      var text = (state.input || "").trim();
      if (!text || state.sending || streaming) return;
      streaming = true;
      state.messages.push({ role: "user", text: text });
      state.input = "";
      var inp = $("[data-chat-input]"); if (inp) inp.value = "";
      state.sending = true;
      renderMessages();
      newAssistantTurn();
      // if retrieval hasn't reported back quickly, advance the stage locally
      clearTimeout(stageT);
      stageT = setTimeout(function () { setStage("Searching"); }, 450);
      streamAnswer(text);
    }

    // ---- real SSE streaming against POST /chat/stream ----
    function streamAnswer(text) {
      var body = { query: text };
      if (state.conversationId) body.conversation_id = state.conversationId;
      var ctrl = { started: false, acc: "" };

      fetch(API_URL + "/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "text/event-stream" },
        body: JSON.stringify(body),
      })
        .then(function (resp) {
          if (!resp.ok || !resp.body || !resp.body.getReader) {
            throw new Error("no-stream " + (resp && resp.status));
          }
          var reader = resp.body.getReader();
          var decoder = new TextDecoder();
          var buffer = "";
          function pump() {
            return reader.read().then(function (res) {
              if (res.done) {
                if (!ctrl.acc) updateAssistant(FALLBACK_MSG);
                finishThinking();
                finishStreaming();
                return;
              }
              buffer += decoder.decode(res.value, { stream: true });
              buffer = buffer.replace(/\r\n/g, "\n");
              var idx;
              while ((idx = buffer.indexOf("\n\n")) !== -1) {
                handleEvent(buffer.slice(0, idx), ctrl);
                buffer = buffer.slice(idx + 2);
              }
              return pump();
            });
          }
          return pump();
        })
        .catch(function () {
          if (!ctrl.started) fallbackChat(text);  // streaming unsupported/unreachable
          else { updateAssistant(ctrl.acc || FALLBACK_MSG); finishThinking(); finishStreaming(); }
        });
    }

    // First token arrived: retrieval/reasoning is done, switch to generating.
    function ensureBubble(ctrl) {
      if (ctrl.started) return;
      ctrl.started = true;
      clearTimeout(stageT);
      setStage("Generating");
    }

    function handleEvent(raw, ctrl) {
      var ev = "message", data = "";
      raw.split("\n").forEach(function (line) {
        if (!line || line.charAt(0) === ":") return;          // ping/comment
        if (line.indexOf("event:") === 0) ev = line.slice(6).trim();
        else if (line.indexOf("data:") === 0) data += line.slice(5).trim();
      });
      if (ev === "meta") {
        try { var j = JSON.parse(data); if (j.conversation_id) { state.conversationId = j.conversation_id; } } catch (e) {}
      } else if (ev === "sources") {
        clearTimeout(stageT);
        try { var s = JSON.parse(data).chunks; if (s && s.length) setSources(s); else setStage("Reasoning"); } catch (e) {}
      } else if (ev === "token") {
        ensureBubble(ctrl);
        try { var t = JSON.parse(data).t; if (t) { ctrl.acc += t; updateAssistant(ctrl.acc); } } catch (e) {}
      } else if (ev === "error") {
        ensureBubble(ctrl);
        var detail = ""; try { detail = JSON.parse(data).detail; } catch (e) {}
        ctrl.acc = ctrl.acc || detail || FALLBACK_MSG;
        updateAssistant(ctrl.acc);
      }
      // "done" is handled when the reader closes
    }

    // ---- non-streaming fallback: POST /chat ----
    function fallbackChat(text) {
      var body = { query: text };
      if (state.conversationId) body.conversation_id = state.conversationId;
      fetch(API_URL + "/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
        .then(function (r) { if (!r.ok) throw new Error("status " + r.status); return r.json(); })
        .then(function (data) {
          if (data && data.conversation_id) state.conversationId = data.conversation_id;
          streamReply((data && data.answer) || FALLBACK_MSG);
        })
        .catch(function () { streamReply(FALLBACK_MSG); });
    }

    function buildSuggestions() {
      var host = $("[data-chat-suggestions]");
      // The visible label IS the sent message — clicking "best project?" shows
      // exactly "best project?" in the transcript (the backend expands terse
      // prompts into full portfolio questions on its side).
      var suggestions = ["best project?", "tech stack?", "how to hire?"];
      suggestions.forEach(function (q) {
        var b = el("button", { "data-hover": "ask",
          style: "font-family:'JetBrains Mono';font-size:10px;letter-spacing:0.04em;text-transform:uppercase;color:#f2f1ea;padding:7px 11px;background:transparent;border:1px solid rgba(242,241,234,.25);border-radius:0;cursor:pointer" });
        b.textContent = q;
        b.addEventListener("click", function () { askQuick(q); });
        host.appendChild(b);
      });
    }

    // bind chat-owned actions
    var ACTIONS = { toggleChat: toggleChat, sendMsg: sendMsg, askDelete: askDelete, cancelDelete: cancelDelete, confirmClear: confirmClear };
    $all("[data-action]").forEach(function (n) {
      var fn = ACTIONS[n.getAttribute("data-action")];
      if (fn && !n._abound) { n._abound = true; n.addEventListener("click", fn); }
    });
    var inp = $("[data-chat-input]");
    if (inp) { inp.addEventListener("input", onInput); inp.addEventListener("keydown", onKey); }

    // expand / collapse the "Thought for Xs" reasoning panel (event-delegated,
    // since renderMessages rebuilds the transcript on every token)
    var msgHost = $("[data-chat-messages]");
    if (msgHost && !msgHost._tbound) {
      msgHost._tbound = true;
      msgHost.addEventListener("click", function (e) {
        var btn = e.target.closest ? e.target.closest("[data-think-toggle]") : null;
        if (!btn) return;
        var wrap = btn.closest("[data-mi]");
        var mi = wrap ? +wrap.getAttribute("data-mi") : -1;
        var m = state.messages[mi];
        if (m && m.thinking) { m.thinking.collapsed = !m.thinking.collapsed; renderMessages(); }
      });
    }

    buildSuggestions();
    renderMessages();
    // suggestion buttons appeared after main.js bound the cursor — rebind
    var cursorBind = window.VV.getCursorBind && window.VV.getCursorBind();
    if (cursorBind) cursorBind(document);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
