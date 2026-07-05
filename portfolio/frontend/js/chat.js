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
  var PROD_API_URL = "https://REPLACE_WITH_YOUR_RENDER_URL.onrender.com";
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

  // ----- persist the transcript so memory survives a page refresh -----
  var LS_KEY = "vv_chat_v1";
  function persist() {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ cid: state.conversationId, messages: state.messages })); } catch (e) {}
  }
  function restore() {
    try {
      var r = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (r && r.messages && r.messages.length) { state.messages = r.messages; state.conversationId = r.cid || null; }
    } catch (e) {}
  }
  function forget() { try { localStorage.removeItem(LS_KEY); } catch (e) {} }

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
      s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, "$1<em>$2</em>");
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
          out += '<div style="font-family:\'Archivo\';font-weight:900;font-size:15px;margin:10px 0 4px;text-transform:uppercase;letter-spacing:-0.01em">' + mdInline(m[2]) + "</div>";
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
    function renderMessages() {
      var host = $("[data-chat-messages]");
      host.innerHTML = state.messages.map(function (m) {
        var u = m.role === "user";
        var align = u ? "flex-end" : "flex-start";
        var bg = u ? "#c5f82a" : "rgba(242,241,234,.06)";
        var color = u ? "#0b0b0b" : "#f2f1ea";
        var border = u ? "#c5f82a" : "rgba(242,241,234,.18)";
        var ws = u ? ";white-space:pre-wrap" : "";
        var body = u ? esc(m.text) : mdToHtml(m.text);
        return '<div style="align-self:' + align + ';max-width:86%;padding:13px 15px;background:' + bg + ';color:' + color + ';border:1px solid ' + border + ';font-family:\'Archivo\';font-size:14px;line-height:1.5' + ws + '">' + body + '</div>';
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

    function streamReply(full) {
      state.messages.push({ role: "assistant", text: "" });
      setTyping(false);
      renderMessages(); scrollChat();
      var parts = String(full).split(/(\s+)/);
      var i = 0;
      clearInterval(streamIv);
      streamIv = setInterval(function () {
        i++;
        var partial = parts.slice(0, i).join("");
        var m = state.messages;
        if (m.length) m[m.length - 1] = { role: "assistant", text: partial };
        renderMessages(); scrollChat();
        if (i >= parts.length) { clearInterval(streamIv); streaming = false; persist(); }
      }, 26);
    }

    function clearChat() {
      clearInterval(streamIv);
      streaming = false;
      var prev = state.conversationId;
      state.messages = []; state.input = ""; state.sending = false; state.confirmDelete = false; state.conversationId = null;
      var inp = $("[data-chat-input]"); if (inp) inp.value = "";
      forget();
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

    function appendAssistant() {
      state.messages.push({ role: "assistant", text: "" });
      renderMessages(); scrollChat();
    }
    function updateAssistant(text) {
      var m = state.messages;
      if (m.length && m[m.length - 1].role === "assistant") m[m.length - 1].text = text;
      renderMessages(); scrollChat();
    }
    function finishStreaming() { state.sending = false; streaming = false; persist(); }

    function sendMsg() {
      var text = (state.input || "").trim();
      if (!text || state.sending || streaming) return;
      streaming = true;
      state.messages.push({ role: "user", text: text });
      state.input = "";
      var inp = $("[data-chat-input]"); if (inp) inp.value = "";
      state.sending = true;
      persist();
      renderMessages(); setTyping(true); scrollChat();
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
          else { updateAssistant(ctrl.acc || FALLBACK_MSG); finishStreaming(); }
        });
    }

    function ensureBubble(ctrl) {
      if (ctrl.started) return;
      ctrl.started = true;
      setTyping(false);
      appendAssistant();
    }

    function handleEvent(raw, ctrl) {
      var ev = "message", data = "";
      raw.split("\n").forEach(function (line) {
        if (!line || line.charAt(0) === ":") return;          // ping/comment
        if (line.indexOf("event:") === 0) ev = line.slice(6).trim();
        else if (line.indexOf("data:") === 0) data += line.slice(5).trim();
      });
      if (ev === "meta") {
        try { var j = JSON.parse(data); if (j.conversation_id) { state.conversationId = j.conversation_id; persist(); } } catch (e) {}
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
          finishStreaming();
          if (data && data.conversation_id) state.conversationId = data.conversation_id;
          streamReply((data && data.answer) || FALLBACK_MSG);
        })
        .catch(function () { finishStreaming(); streamReply(FALLBACK_MSG); });
    }

    function buildSuggestions() {
      var host = $("[data-chat-suggestions]");
      var suggestions = [
        { label: "Best project?", q: "What is Vatsal's most impressive project?" },
        { label: "Tech stack?", q: "What technologies does Vatsal work with?" },
        { label: "How to hire?", q: "How can I hire or contact Vatsal?" },
      ];
      suggestions.forEach(function (s) {
        var b = el("button", { "data-hover": "ask",
          style: "font-family:'JetBrains Mono';font-size:10px;letter-spacing:0.04em;text-transform:uppercase;color:#f2f1ea;padding:7px 11px;background:transparent;border:1px solid rgba(242,241,234,.25);border-radius:0;cursor:pointer" });
        b.textContent = s.label;
        b.addEventListener("click", function () { askQuick(s.q); });
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

    buildSuggestions();
    restore();
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
