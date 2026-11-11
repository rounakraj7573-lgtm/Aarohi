const API_BASE = "https://aarohi-rbub.onrender.com";
const form = document.querySelector("#chat-form");
const input = document.querySelector("#message");
const conversation = document.querySelector("#conversation");
const welcome = document.querySelector("#welcome");
const send = document.querySelector("#send");
const statusLabel = document.querySelector("#status-label");
const statusDot = document.querySelector(".status-dot");
const providerSelect = document.querySelector("#provider-select");
const providerNote = document.querySelector("#provider-note");
const memoryButton = document.querySelector("#save-memory");
const chatHistory = document.querySelector("#chat-history");
const sidebar = document.querySelector("#sidebar");
const CHAT_STORE_KEY = "aarohi_chat_sessions_v1";
let sessions = [];
try { sessions = JSON.parse(localStorage.getItem(CHAT_STORE_KEY) || "[]"); } catch { sessions = []; }
if (!Array.isArray(sessions)) sessions = [];
sessions = sessions.filter(s => s && typeof s.id === "string" && Array.isArray(s.messages)).slice(0, 30);
let activeSessionId = sessions[0]?.id || "";
let history = [];
let savedMemory = localStorage.getItem("aarohi_saved_memory") || "";
let accessCode = localStorage.getItem("aarohi_access_code") || window.prompt("Enter your Aarohi access code:") || "";
if (accessCode) localStorage.setItem("aarohi_access_code", accessCode);
let providers = [];

let workspaceId = localStorage.getItem("aarohi_workspace_id") || "";
if (!/^[A-Za-z0-9_-]{16,80}$/.test(workspaceId)) {
  workspaceId = (window.crypto?.randomUUID?.() || ("ws_" + Date.now() + Math.random().toString(36).slice(2))).replace(/[^A-Za-z0-9_-]/g, "");
  localStorage.setItem("aarohi_workspace_id", workspaceId);
}
function parseWorkspaceCommand(message) {
  const m = message.trim();
  if (/^(list|show)\s+(my\s+)?files$/i.test(m)) return { method: "GET", path: "/api/workspace/files" };
  let x = m.match(/^read\s+file\s+(.+)$/i);
  if (x) return { method: "GET", path: "/api/workspace/files/" + encodeURIComponent(x[1].trim()) };
  x = m.match(/^download\s+file\s+(.+)$/i);
  if (x) return { method: "GET", path: "/api/workspace/files/" + encodeURIComponent(x[1].trim()), download: true };
  x = m.match(/^delete\s+file\s+(.+)$/i);
  if (x) return { method: "DELETE", path: "/api/workspace/files/" + encodeURIComponent(x[1].trim()) };
  x = m.match(/^(create|save|write)\s+file\s+([^:]+):\s*([\s\S]*)$/i);
  if (x) return { method: "PUT", path: "/api/workspace/files", body: { name: x[2].trim(), content: x[3] } };
  x = m.match(/^create\s+(?:a\s+)?file\s+named\s+([^\s]+)\s+with\s+content\s+([\s\S]*)$/i);
  if (x) return { method: "PUT", path: "/api/workspace/files", body: { name: x[1].trim(), content: x[2] } };
  // Natural-language version used in the guided workspace test.
  let natural = m.match(/^create\s+(?:a\s+)?file\s+named\s+(.+?)\s+and\s+save\s+the\s+text\s+([\s\S]+?)\s+inside\s+it[.!]?$/i);
  if (natural) return { method: "PUT", path: "/api/workspace/files", body: { name: natural[1].trim(), content: natural[2].trim() } };
  natural = m.match(/^save\s+the\s+text\s+([\s\S]+?)\s+in(?:to)?\s+(?:a\s+)?file\s+named\s+(.+?)[.!]?$/i);
  if (natural) return { method: "PUT", path: "/api/workspace/files", body: { name: natural[2].trim(), content: natural[1].trim() } };
  return null;
}
async function runWorkspaceCommand(command) {
  const response = await fetch(API_BASE + command.path, {
    method: command.method,
    headers: { "Content-Type": "application/json", "X-Aarohi-Access-Code": accessCode, "X-Aarohi-Workspace-ID": workspaceId },
    body: command.body ? JSON.stringify(command.body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "Workspace request failed.");
  if (command.method === "GET" && Array.isArray(data.files)) {
    return data.files.length ? "Workspace files:\n" + data.files.map(x => x.name + " (" + x.size + " bytes)").join("\n") : "Workspace is empty.";
  }
  if (command.download && typeof data.content === "string") {
    const extension = String(data.name || "").split(".").pop().toLowerCase();
    const mime = ({ txt: "text/plain;charset=utf-8", py: "text/x-python;charset=utf-8", js: "text/javascript;charset=utf-8", html: "text/html;charset=utf-8", css: "text/css;charset=utf-8", json: "application/json;charset=utf-8", md: "text/markdown;charset=utf-8", csv: "text/csv;charset=utf-8", xml: "application/xml;charset=utf-8" })[extension] || "application/octet-stream";
    const url = URL.createObjectURL(new Blob([data.content], { type: mime }));
    const link = document.createElement("a");
    link.href = url;
    link.download = data.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
    return "Downloaded " + data.name + " (" + mime.split(";")[0] + ").";
  }
  if (typeof data.content === "string") return "File: " + data.name + "\n\n" + data.content;
  if (data.saved === true) return "Saved " + data.name + " (" + data.size + " bytes). Workspace files are temporary and may be cleared when the server restarts.";
  if (data.deleted === true) return "Deleted " + data.name + " from the workspace.";
  return JSON.stringify(data);
}

function currentSession() { return sessions.find(s => s.id === activeSessionId); }
function saveSessions() {
  try { localStorage.setItem(CHAT_STORE_KEY, JSON.stringify(sessions.slice(0, 30))); } catch {}
}
function exportAarohiBackup() {
  const payload = { app: "Aarohi AI", version: 1, exportedAt: new Date().toISOString(), memory: savedMemory, sessions };
  const escapeHtml = value => String(value ?? "").replace(/[&<>\"\']/g, char => { if (char === "&") return "&amp;"; if (char === "<") return "&lt;"; if (char === ">") return "&gt;"; if (char === "\"") return "&quot;"; return "&#39;"; });
  const readableChats = sessions.map(session => {
    const messages = (Array.isArray(session.messages) ? session.messages : []).map(message =>
      '<article class="message"><b>' + escapeHtml(message.role || "message") + '</b><pre>' + escapeHtml(message.content || "") + '</pre></article>'
    ).join("");
    return '<section><h2>' + escapeHtml(session.title || "Chat") + '</h2>' + (messages || '<p>No messages in this chat.</p>') + '</section>';
  }).join("");
  // Keep the restore data inside the readable HTML file; escape script-closing characters.
  const embedded = JSON.stringify(payload).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aarohi Backup</title>' +
    '<style>body{font:16px/1.6 system-ui,sans-serif;max-width:850px;margin:32px auto;padding:0 18px;color:#202638;background:#f6f7fb}h1{margin-bottom:4px}small,.muted{color:#68738a}section{background:white;border:1px solid #e0e4ed;border-radius:14px;padding:18px;margin:18px 0}h2{font-size:18px;margin:0 0 12px}.message{border-top:1px solid #edf0f5;padding:12px 0}.message b{text-transform:capitalize;color:#6256ad}.message pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.6 system-ui,sans-serif;margin:6px 0 0}</style></head><body>' +
    '<h1>Aarohi conversation backup</h1><p class="muted">Exported ' + escapeHtml(payload.exportedAt) + '</p><section><h2>Saved memory</h2><p>' + escapeHtml(savedMemory || "No saved memory") + '</p></section>' +
    (readableChats || '<section>No saved chats.</section>') +
    '<script type="application/json" id="aarohi-backup-data">' + embedded + '</script></body></html>';
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "aarohi-backup.html";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}
async function importAarohiBackup(file) {
  if (!file || file.size > 2_000_000) throw new Error("Backup file is too large (2 MB maximum).");
  const raw = await file.text();
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch {
    const doc = new DOMParser().parseFromString(raw, "text/html");
    const embedded = doc.getElementById("aarohi-backup-data");
    if (!embedded) throw new Error("This is not a valid Aarohi backup file.");
    parsed = JSON.parse(embedded.textContent || "{}");
  }
  if (!parsed || parsed.app !== "Aarohi AI" || !Array.isArray(parsed.sessions)) throw new Error("This is not a valid Aarohi backup.");
  const imported = parsed.sessions.filter(item => item && typeof item.id === "string" && Array.isArray(item.messages))
    .slice(0, 30).map(item => ({
      id: item.id.slice(0, 100),
      title: makeTitle(item.title || "Imported chat"),
      updatedAt: Number(item.updatedAt) || Date.now(),
      apiHistory: Array.isArray(item.apiHistory) ? item.apiHistory.filter(m => m && ["user","assistant"].includes(m.role) && typeof m.content === "string").slice(-20) : [],
      messages: item.messages.filter(m => m && ["user","assistant"].includes(m.role) && typeof m.content === "string")
        .slice(-200).map(m => ({ role: m.role, content: m.content.slice(0, 12000), isError: Boolean(m.isError) }))
    }));
  sessions = [...imported, ...sessions].filter((item, index, all) => all.findIndex(other => other.id === item.id) === index)
    .sort((a,b) => b.updatedAt - a.updatedAt).slice(0, 30);
  if (typeof parsed.memory === "string") {
    savedMemory = parsed.memory.slice(0, 4000);
    if (savedMemory) localStorage.setItem("aarohi_saved_memory", savedMemory);
    else localStorage.removeItem("aarohi_saved_memory");
    refreshMemoryStatus();
  }
  saveSessions();
  activeSessionId = sessions[0]?.id || "";
  if (activeSessionId) openSession(activeSessionId); else newChat();
  renderChatList();
}
function makeTitle(text) {
  const clean = String(text || "New chat").replace(/\s+/g, " ").trim();
  return clean.length > 34 ? clean.slice(0, 34) + "…" : (clean || "New chat");
}
function ensureSession() {
  if (currentSession()) return currentSession();
  const session = { id: String(Date.now()) + Math.random().toString(36).slice(2, 7), title: "New chat", messages: [], apiHistory: [], updatedAt: Date.now() };
  sessions.unshift(session);
  activeSessionId = session.id;
  saveSessions();
  renderChatList();
  return session;
}
function renderChatList() {
  if (!chatHistory) return;
  chatHistory.replaceChildren();
  const query = (document.querySelector("#chat-search")?.value || "").trim().toLowerCase();
  const visible = sessions.filter(session => !query || String(session.title || "").toLowerCase().includes(query));
  visible.forEach(session => {
    const row = document.createElement("div");
    row.className = "chat-history-row";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chat-history-item" + (session.id === activeSessionId ? " active" : "");
    button.textContent = session.title || "New chat";
    button.addEventListener("click", () => openSession(session.id));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "chat-delete";
    remove.textContent = "×";
    remove.title = "Delete this chat";
    remove.setAttribute("aria-label", "Delete " + (session.title || "chat"));
    remove.addEventListener("click", event => {
      event.stopPropagation();
      if (!window.confirm("Delete this chat from this device?")) return;
      sessions = sessions.filter(item => item.id !== session.id);
      if (activeSessionId === session.id) {
        activeSessionId = "";
        newChat();
      } else {
        saveSessions();
        renderChatList();
      }
    });
    row.append(button, remove);
    chatHistory.appendChild(row);
  });
  if (!visible.length) {
    const empty = document.createElement("p");
    empty.className = "chat-empty";
    empty.textContent = "No matching chats";
    chatHistory.appendChild(empty);
  }
}
function renderTranscript(session) {
  conversation.querySelectorAll(".message,.typing").forEach(el => el.remove());
  welcome?.classList.toggle("hidden", session.messages.length > 0);
  session.messages.forEach(item => renderMessage(item.role, item.content, item.isError, false));
  history = Array.isArray(session.apiHistory) ? session.apiHistory.slice(-20) : [];
}
function openSession(id) {
  const session = sessions.find(s => s.id === id);
  if (!session) return;
  activeSessionId = id;
  renderTranscript(session);
  renderChatList();
  closeSidebar();
}
function newChat() {
  const session = { id: String(Date.now()) + Math.random().toString(36).slice(2, 7), title: "New chat", messages: [], apiHistory: [], updatedAt: Date.now() };
  sessions.unshift(session);
  sessions = sessions.slice(0, 30);
  activeSessionId = session.id;
  history = [];
  renderTranscript(session);
  renderChatList();
  input.value = "";
  input.style.height = "auto";
  input.focus();
  closeSidebar();
  saveSessions();
}
function renderMessage(role, content, isError = false, persist = true) {
  welcome?.classList.add("hidden");
  const wrapper = document.createElement("div");
  wrapper.className = "message " + (role === "user" ? "user" : "assistant") + (isError ? " error" : "");
  const label = document.createElement("span");
  label.className = "role";
  label.textContent = role === "user" ? "YOU" : (isError ? "NOTICE" : "AAROHI");
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = content;
  wrapper.append(label, bubble);
  conversation.appendChild(wrapper);
  wrapper.scrollIntoView({ behavior: "smooth", block: "nearest" });
  if (persist) {
    const session = ensureSession();
    session.messages.push({ role, content: String(content), isError: Boolean(isError) });
    if (role === "user" && session.messages.length === 1) session.title = makeTitle(content);
    session.updatedAt = Date.now();
    sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    sessions = sessions.slice(0, 30);
    saveSessions();
    renderChatList();
  }
  return wrapper;
}
function addMessage(role, content, isError = false) {
  return renderMessage(role, content, isError, true);
}
function closeSidebar() { sidebar?.classList.remove("open"); }
function refreshMemoryStatus() {
  if (!memoryButton) return;
  memoryButton.querySelector("span").textContent = savedMemory ? "Memory saved ✓" : "Memory settings";
  memoryButton.title = "Saved memory is stored only in this browser/device.";
}
refreshMemoryStatus();
memoryButton?.addEventListener("click", () => {
  const next = window.prompt("Aarohi memory (up to 4,000 characters). Do not save passwords or private secrets. Leave blank to clear:", savedMemory);
  if (next === null) return;
  savedMemory = next.trim().slice(0, 4000);
  if (savedMemory) localStorage.setItem("aarohi_saved_memory", savedMemory);
  else localStorage.removeItem("aarohi_saved_memory");
  refreshMemoryStatus();
  closeSidebar();
});

async function loadProviders() {
  try {
    const response = await fetch(API_BASE + "/api/providers", { headers: { "X-Aarohi-Access-Code": accessCode } });
    if (!response.ok) throw new Error("providers unavailable");
    const data = await response.json();
    providers = Array.isArray(data.providers) ? data.providers : [];
    providerSelect.replaceChildren();
    if (!providers.length) {
      providerSelect.append(new Option("No models configured", ""));
      providerSelect.disabled = true;
      send.disabled = true;
      providerNote.textContent = "AI model setup is needed on the server.";
      return;
    }
    providers.forEach(provider => providerSelect.append(new Option(provider.label + " · " + provider.model, provider.id)));
    const preferred = providers.find(provider => provider.default);
    if (preferred) providerSelect.value = preferred.id;
    providerSelect.disabled = false;
    send.disabled = false;
    providerNote.textContent = "One message · automatic tool selection · keys stay server-side";
  } catch {
    providerSelect.replaceChildren(new Option("Server unavailable", ""));
    providerSelect.disabled = true;
    send.disabled = true;
    providerNote.textContent = "Could not connect to Aarohi. Check the server.";
  }
}
async function checkHealth() {
  try {
    const response = await fetch(API_BASE + "/api/health");
    if (!response.ok) throw new Error("offline");
    const data = await response.json();
    const count = Number(data.configured_provider_count || 0);
    const pythonReady = Boolean(data.python_runner_configured);
    statusLabel.textContent = (count ? "Online · " + count + " model(s)" : "Online · model setup needed") +
      (pythonReady ? " · Cloud Python ready" : " · Python setup needed");
    statusDot.classList.add("ok");
  } catch {
    statusLabel.textContent = "Server status unavailable";
    statusDot.classList.remove("ok");
  }
}
function extractPython(message) {
  let code = message.trim();
  code = code.replace(/^\s*(?:please\s+)?(?:run|execute)\s+(?:the\s+)?(?:python|phyton)\s*(?:code)?\s*[:\-]?\s*/i, "");
  code = code.replace(/^\s*(?:python|phyton)\s*(?:code)?\s*[:\-]\s*/i, "");
  const fenced = code.match(/```(?:python)?\s*([\s\S]*?)```/i);
  if (fenced) code = fenced[1];
  return code.trim();
}
function handleLocalCommand(message) {
  const text = message.trim();
  let match = text.match(/^(?:please\s+)?remember(?:\s+that)?\s+(.+)$/i);
  if (match) {
    const value = match[1].trim().slice(0, 4000);
    if (!value || /password|passcode|api[ _-]?key|secret|token/i.test(value)) {
      return "I can't save passwords, access codes, API keys, or other secrets. Please save only a non-sensitive preference.";
    }
    savedMemory = value;
    localStorage.setItem("aarohi_saved_memory", savedMemory);
    refreshMemoryStatus();
    return "Saved to Aarohi memory on this device. I'll use it in future chats in this browser.";
  }
  if (/^(?:what do you remember|show my memory|what is my saved memory|what language do i prefer)\??$/i.test(text)) {
    return savedMemory ? "Your saved memory: " + savedMemory : "No saved memory yet. You can say: Remember that I prefer simple Hinglish.";
  }
  if (/^(?:new chat|start a new chat)\.?$/i.test(text)) {
    newChat();
    return "__LOCAL_NEW_CHAT__";
  }
  if (/^(?:show|open) (?:my )?(?:chat )?history\.?$/i.test(text)) {
    sidebar?.classList.add("open");
    return "Your chat history is open in the sidebar.";
  }
  match = text.match(/^search chats? for (.+)$/i);
  if (match) {
    const search = document.querySelector("#chat-search");
    sidebar?.classList.add("open");
    if (search) search.value = match[1].trim().slice(0, 100);
    renderChatList();
    const count = sessions.filter(item => String(item.title || "").toLowerCase().includes((match[1] || "").trim().toLowerCase())).length;
    return count ? "Found " + count + " matching chat(s) in the sidebar." : "No chats matched that search.";
  }
  if (/^(?:clear|reset) chat search\.?$/i.test(text)) {
    const search = document.querySelector("#chat-search");
    if (search) search.value = "";
    renderChatList();
    return "Chat search cleared.";
  }
  match = text.match(/^delete chat (?:named )?(.+)$/i);
  if (match) {
    const target = match[1].trim().toLowerCase();
    const found = sessions.find(item => String(item.title || "").trim().toLowerCase() === target);
    if (!found) return "I couldn't find a chat with that exact title. Open the sidebar to choose a chat and use its × delete button.";
    if (!window.confirm("Delete chat '" + found.title + "' from this device?")) return "Chat deletion cancelled.";
    sessions = sessions.filter(item => item.id !== found.id);
    if (activeSessionId === found.id) {
      activeSessionId = "";
      newChat();
    } else {
      saveSessions();
      renderChatList();
    }
    return "Deleted chat '" + found.title + "' from this device.";
  }
  if (/^(?:check|test) (?:the )?(?:mobile )?(?:ui|sidebar|message box)\.?$/i.test(text)) {
    sidebar?.classList.add("open");
    input.focus();
    return "The sidebar is open and the message box is focused. On mobile, use ☰ to open the sidebar; use Search chats to filter history, × beside a chat to delete it, and the bottom message box to send a message.";
  }
  if (/^(?:export|download) (?:my )?(?:aarohi )?backup\.?$/i.test(text)) {
    exportAarohiBackup();
    return "Your Aarohi backup export has started. Check your device's Downloads.";
  }
  if (/^(?:import|restore) (?:my )?(?:aarohi )?backup\.?$/i.test(text)) {
    document.querySelector("#backup-file")?.click();
    return "Choose your Aarohi backup JSON file to restore it.";
  }
  return null;
}

function chooseRoute(message) {
  const text = message.trim();
  const hasUrl = /https?:\/\/|www\./i.test(text);
  const explicitPython = /^\s*(?:please\s+)?(?:run|execute)\s+(?:the\s+)?(?:python|phyton)\b|^\s*```python/i.test(text);
  const codeLike = /(^|\n)\s*(print\s*\(|def\s+\w+|class\s+\w+|for\s+\w+\s+in\s|while\s|import\s+\w+|from\s+\w+\s+import|[A-Za-z_]\w*\s*=)/m.test(text);
  const webIntent = /\b(search|browse|website|web|internet|online|latest|today|current|recent|news|research|source|sources|compare online|look up|find|information|info|summari[sz]e|NASA|Artemis)\b|खोज|वेबसाइट|ताज़ा|आज की खबर|ढूंढ|खोजो/i.test(text);
  const mathIntent = /\b(calculate|compute|calculator|solve|multiply|divide|add|subtract)\b|[×÷]/i.test(text);
  const actionIntent = /\b(build|create|make|design|plan|develop|analyze|analyse|investigate|execute|automate|fix|debug|deploy|write code|generate)\b/i.test(text);
  if (explicitPython || codeLike) return "code";
  if (hasUrl || webIntent || mathIntent || actionIntent) return "agent";
  return "chat";
}
async function postJson(path, body) {
  const response = await fetch(API_BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Aarohi-Access-Code": accessCode, "X-Aarohi-Workspace-ID": workspaceId },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    localStorage.removeItem("aarohi_access_code");
    accessCode = window.prompt("Access code incorrect. Enter your Aarohi access code:") || "";
    if (accessCode) localStorage.setItem("aarohi_access_code", accessCode);
    throw new Error("Access code required. Please send your message again after entering the correct code.");
  }
  if (!response.ok) throw new Error(data.detail || "Request failed. Please try again.");
  return data;
}
async function sendMessage(text) {
  const message = text.trim();
  if (!message || send.disabled || !providerSelect.value) return;
  const localReply = handleLocalCommand(message);
  if (localReply !== null) {
    if (localReply !== "__LOCAL_NEW_CHAT__") {
      addMessage("user", message);
      addMessage("assistant", localReply);
    }
    input.value = "";
    input.style.height = "auto";
    return;
  }
  const session = ensureSession();
  addMessage("user", message);
  input.value = "";
  input.style.height = "auto";
  send.disabled = true;
  providerSelect.disabled = true;
  const pending = document.createElement("div");
  pending.className = "typing";
  const route = chooseRoute(message);
  pending.textContent = route === "agent" ? "Aarohi is selecting tools and researching…" : route === "code" ? "Aarohi is opening a secure cloud sandbox…" : "Aarohi is thinking…";
  conversation.appendChild(pending);
  try {
    let reply = "";
    const workspaceCommand = parseWorkspaceCommand(message);
    if (workspaceCommand) {
      reply = await runWorkspaceCommand(workspaceCommand);
    } else if (route === "agent") {
      const data = await postJson("/api/agent", { task: message, provider: providerSelect.value, memory: savedMemory });
      reply = String(data.reply || "").trim();
      if (Array.isArray(data.tools_used) && data.tools_used.length) reply += "\n\nTools used: " + data.tools_used.join(", ");
    } else if (route === "code") {
      const code = extractPython(message);
      const data = await postJson("/api/code/run", { code });
      reply = "Code output:\n" + String(data.output || "") + (data.error ? "\n\nError:\n" + String(data.error) : "");
    } else {
      const context = history.concat({ role: "user", content: message }).slice(-19);
      const data = await postJson("/api/chat", { messages: context, provider: providerSelect.value, memory: savedMemory });
      reply = String(data.reply || "").trim();
    }
    const finalReply = reply || "No result returned. Please try again.";
    history = history.concat(
      { role: "user", content: message },
      { role: "assistant", content: finalReply }
    ).slice(-20);
    session.apiHistory = history;
    saveSessions();
    pending.remove();
    addMessage("assistant", finalReply);
  } catch (error) {
    pending.remove();
    addMessage("assistant", error.message || "Aarohi could not complete that request.", true);
  } finally {
    send.disabled = providers.length === 0;
    providerSelect.disabled = providers.length === 0;
    input.focus();
    checkHealth();
  }
}
form.addEventListener("submit", event => { event.preventDefault(); sendMessage(input.value); });
input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 180) + "px"; });
input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); }
});
document.querySelectorAll("[data-prompt]").forEach(button => button.addEventListener("click", () => sendMessage(button.dataset.prompt || "")));
document.querySelector("#new-chat").addEventListener("click", newChat);
document.querySelector("#mobile-menu").addEventListener("click", () => sidebar?.classList.toggle("open"));
document.querySelector("#close-sidebar")?.addEventListener("click", closeSidebar);
document.querySelector(".main").addEventListener("click", event => {
  if (event.target.closest("a,button") && !event.target.closest("#mobile-menu")) closeSidebar();
});
if (activeSessionId) openSession(activeSessionId);
else newChat();
renderChatList();
loadProviders();
checkHealth();

document.querySelector("#chat-search")?.addEventListener("input", renderChatList);
document.querySelector("#export-backup")?.addEventListener("click", exportAarohiBackup);
document.querySelector("#import-backup")?.addEventListener("click", () => document.querySelector("#backup-file")?.click());
document.querySelector("#backup-file")?.addEventListener("change", async event => {
  try { await importAarohiBackup(event.target.files?.[0]); window.alert("Aarohi backup restored on this device."); }
  catch (error) { window.alert(error.message || "Could not restore backup."); }
  event.target.value = "";
});
