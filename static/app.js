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
const history = [];
let savedMemory = localStorage.getItem("aarohi_saved_memory") || "";
let accessCode = localStorage.getItem("aarohi_access_code") || window.prompt("Enter your Aarohi access code:") || "";
if (accessCode) localStorage.setItem("aarohi_access_code", accessCode);
let providers = [];

function addMessage(role, content, isError = false) {
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
  return wrapper;
}

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
    statusLabel.textContent = count ? "Online · " + count + " model provider(s)" : "Online · setup needed";
    statusDot.classList.add("ok");
  } catch {
    statusLabel.textContent = "Server status unavailable";
    statusDot.classList.remove("ok");
  }
}

function chooseRoute(message) {
  const text = message.trim();
  const hasUrl = /https?:\/\/|www\./i.test(text);
  const codeLike = /(^|\n)\s*(print\s*\(|def\s+\w+|class\s+\w+|for\s+\w+\s+in\s|while\s|import\s+\w+|from\s+\w+\s+import|[A-Za-z_]\w*\s*=)/m.test(text);
  const webIntent = /\b(search|browse|website|web|internet|online|latest|today|current|recent|news|research|source|sources|compare online|look up|find online)\b|खोज|वेबसाइट|ताज़ा|आज की खबर/i.test(text);
  const actionIntent = /\b(build|create|make|design|plan|develop|analyze|analyse|investigate|run|execute|automate|fix|debug|deploy|write code|generate)\b/i.test(text);
  if (codeLike) return "code";
  if (hasUrl || webIntent || actionIntent) return "agent";
  return "chat";
}

async function postJson(path, body) {
  const response = await fetch(API_BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Aarohi-Access-Code": accessCode },
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
  addMessage("user", message);
  input.value = "";
  input.style.height = "auto";
  send.disabled = true;
  providerSelect.disabled = true;
  const pending = document.createElement("div");
  pending.className = "typing";
  const route = chooseRoute(message);
  pending.textContent = route === "agent" ? "Aarohi is selecting tools and researching…" : route === "code" ? "Aarohi is running the supported code task…" : "Aarohi is thinking…";
  conversation.appendChild(pending);
  try {
    let reply = "";
    if (route === "agent") {
      const data = await postJson("/api/agent", { task: message, provider: providerSelect.value, memory: savedMemory });
      reply = String(data.reply || "").trim();
      if (Array.isArray(data.tools_used) && data.tools_used.length) reply += "\n\nTools used: " + data.tools_used.join(", ");
    } else if (route === "code") {
      const data = await postJson("/api/code/run", { code: message });
      reply = "Code output:\n" + String(data.output || "");
    } else {
      history.push({ role: "user", content: message });
      const data = await postJson("/api/chat", { messages: history.slice(-20), provider: providerSelect.value, memory: savedMemory });
      reply = String(data.reply || "").trim();
      if (reply) history.push({ role: "assistant", content: reply });
    }
    pending.remove();
    addMessage("assistant", reply || "No result returned. Please try again.");
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

form.addEventListener("submit", event => {
  event.preventDefault();
  sendMessage(input.value);
});
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 180) + "px";
});
input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => sendMessage(button.dataset.prompt || ""));
});
document.querySelector("#new-chat").addEventListener("click", () => {
  history.length = 0;
  conversation.querySelectorAll(".message,.typing").forEach(el => el.remove());
  welcome?.classList.remove("hidden");
  input.value = "";
  input.focus();
});
document.querySelector("#mobile-menu").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("open");
});
document.querySelector(".main").addEventListener("click", event => {
  if (event.target.closest("a,button") && !event.target.closest("#mobile-menu")) {
    document.querySelector(".sidebar").classList.remove("open");
  }
});
loadProviders();
checkHealth();
