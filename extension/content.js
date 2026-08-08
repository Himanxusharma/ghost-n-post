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
  button.innerHTML = `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#c8eb32;margin-right:6px;vertical-align:middle;"></span>Ghost n Post`;
  button.style.cssText =
    "margin-left:8px;padding:8px 14px;border:1px solid #c8eb32;background:#0c0d0e;color:#c8eb32;font-weight:700;font-size:13px;font-family:system-ui,sans-serif;cursor:pointer;border-radius:0;box-shadow:2px 2px 0 #000;transition:all 140ms ease;";
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
