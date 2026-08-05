async function getSettings() {
  return chrome.storage.sync.get({
    apiBaseUrl: "http://localhost:3000",
    apiToken: "",
  });
}

async function getActiveYouTubeUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/youtube\.com\/watch/.test(tab.url)) {
    return null;
  }
  return tab.url;
}

document.addEventListener("DOMContentLoaded", async () => {
  const status = document.getElementById("status");
  const openApp = document.getElementById("open-app");
  const generate = document.getElementById("generate");
  const settings = await getSettings();
  const videoUrl = await getActiveYouTubeUrl();

  if (!videoUrl) {
    status.textContent = "Open a YouTube watch page first.";
    openApp.disabled = true;
    generate.disabled = true;
    return;
  }

  status.textContent = "Ready for this video.";

  openApp.addEventListener("click", () => {
    const target = `${settings.apiBaseUrl.replace(/\/$/, "")}/?url=${encodeURIComponent(videoUrl)}`;
    chrome.tabs.create({ url: target });
  });

  generate.addEventListener("click", async () => {
    if (!settings.apiToken) {
      status.textContent = "Add an API token in Settings first.";
      return;
    }
    generate.disabled = true;
    status.textContent = "Starting generation…";
    try {
      const response = await fetch(
        `${settings.apiBaseUrl.replace(/\/$/, "")}/api/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.apiToken}`,
          },
          body: JSON.stringify({ youtubeUrl: videoUrl, applyStyle: true }),
        },
      );
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error?.message || "Generate failed");
      }
      const appUrl =
        json.data.appUrl ||
        `${settings.apiBaseUrl.replace(/\/$/, "")}/?jobId=${json.data.jobId}`;
      status.textContent = "Queued — opening app…";
      chrome.tabs.create({ url: appUrl });
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Failed";
      generate.disabled = false;
    }
  });
});
