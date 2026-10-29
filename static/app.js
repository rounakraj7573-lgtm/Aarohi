const form = document.querySelector("#chat-form");
const input = document.querySelector("#message");
const conversation = document.querySelector("#conversation");
const welcome = document.querySelector("#welcome");
const send = document.querySelector("#send");
const statusLabel = document.querySelector("#status-label");
const statusDot = document.querySelector(".status-dot");
const providerSelect = document.querySelector("#provider-select");
const providerNote = document.querySelector("#provider-note");
const history = [];
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

async function loadProviders() {
  try {
    const response = await fetch("/api/providers");
    if (!response.ok) throw new Error("providers unavailable");
    const data = await response.json();
    providers = Array.isArray(data.providers) ? data.providers : [];
    providerSelect.replaceChildren();
    if (!providers.length) {
      providerSelect.append(new Option("No models configured yet", ""));
      providerSelect.disabled = true;
      send.disabled = true;
      providerNote.textContent = "Add provider keys and model IDs in server environment settings.";
      return;
    }
    providers.forEach(provider => {
      providerSelect.append(new Option(provider.label + " · " + provider.model, provider.id));
    });
    const preferred = providers.find(provider => provider.default);
    if (preferred) providerSelect.value = preferred.id;
    providerSelect.disabled = false;
    send.disabled = false;
    providerNote.textContent = providers.length + " provider(s) configured · keys stay server-side";
  } catch {
    providerSelect.replaceChildren(new Option("Could not load providers", ""));
    providerSelect.disabled = true;
    send.disabled = true;
    providerNote.textContent = "Server unavailable. Check deployment.";
  }
}

async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error("offline");
    const data = await response.json();
    const count = Number(data.configured_provider_count || 0);
    statusLabel.textContent = count ? "Server online · " + count + " model provider(s)" : "Server online · setup needed";
    statusDot.classList.add("ok");
    statusDot.title = count ? count + " provider(s) configured" : "No AI providers configured";
  } catch {
    statusLabel.textContent = "Server status unavailable";
    statusDot.classList.remove("ok");
  }
}

async function sendMessage(text) {
  const message = text.trim();
  if (!message || send.disabled || !providerSelect.value) return;
  addMessage("user", message);
  history.push({ role: "user", content: message });
  input.value = "";
  input.style.height = "auto";
  send.disabled = true;
  providerSelect.disabled = true;
  const pending = document.createElement("div");
  pending.className = "typing";
  pending.textContent = "Aarohi is thinking…";
  conversation.appendChild(pending);
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history.slice(-20), provider: providerSelect.value })
    });
    const data = await response.json().catch(() => ({}));
    pending.remove();
    if (!response.ok) {
      addMessage("assistant", data.detail || "Request failed. Please try again.", true);
      return;
    }
    const reply = String(data.reply || "").trim();
    if (!reply) {
      addMessage("assistant", "The server returned an empty reply. Please try again.", true);
      return;
    }
    history.push({ role: "assistant", content: reply });
    addMessage("assistant", "[" + (data.provider || providerSelect.value) + " · " + (data.model || "model") + "]\n" + reply);
  } catch {
    pending.remove();
    addMessage("assistant", "Could not reach the Aarohi server. Check the connection or deployment.", true);
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
