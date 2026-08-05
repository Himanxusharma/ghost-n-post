function currentWatchUrl() {
  if (!/youtube\.com\/watch/.test(location.href)) return null;
  return location.href.split("&")[0];
}

function ensureButton() {
  if (document.getElementById("gnp-extension-btn")) return;
  const host =
    document.querySelector("#top-level-buttons-computed") ||
    document.querySelector("#actions") ||
    document.querySelector("#owner");
  if (!host) return;

  const button = document.createElement("button");
  button.id = "gnp-extension-btn";
  button.type = "button";
  button.textContent = "Ghost n Post";
  button.style.cssText =
    "margin-left:8px;padding:8px 12px;border:0;background:#0f7a7a;color:#fff;font-weight:600;cursor:pointer;";
  button.addEventListener("click", () => {
    const url = currentWatchUrl();
    if (!url) return;
    chrome.runtime.sendMessage({ type: "OPEN_OR_GENERATE", url });
  });
  host.appendChild(button);
}

ensureButton();
const observer = new MutationObserver(() => ensureButton());
observer.observe(document.documentElement, { childList: true, subtree: true });
