async function getSettings() {
  return chrome.storage.sync.get({
    apiBaseUrl: "http://localhost:3010",
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

async function getAuthToken(baseUrl) {
  const settings = await chrome.storage.sync.get({ apiToken: "" });
  if (settings.apiToken) {
    return { token: settings.apiToken, type: "bearer" };
  }
  try {
    const cookie = await chrome.cookies.get({
      url: baseUrl.replace(/\/$/, ""),
      name: "__session",
    });
    if (cookie?.value) {
      return { token: cookie.value, type: "clerk_session" };
    }
  } catch (err) {
    console.warn("Could not read session cookie", err);
  }
  return null;
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

  const base = settings.apiBaseUrl.replace(/\/$/, "");
  const authToken = await getAuthToken(base);

  if (authToken) {
    status.textContent = "Ready for this video.";
    generate.querySelector("span").textContent = "Generate now";
  } else {
    status.textContent = "Sign in on the web app to generate.";
    generate.querySelector("span").textContent = "Sign in with Google";
  }

  openApp.addEventListener("click", () => {
    const target = `${base}/?url=${encodeURIComponent(videoUrl)}`;
    chrome.tabs.create({ url: target });
  });

  generate.addEventListener("click", async () => {
    const webStudioUrl = `${base}/?url=${encodeURIComponent(videoUrl)}&autostart=true`;
    const currentAuth = await getAuthToken(base);

    if (!currentAuth) {
      status.textContent = "Opening Sign in page…";
      chrome.tabs.create({ url: `${base}/sign-in` });
      return;
    }

    generate.disabled = true;
    status.textContent = "Starting generation…";

    const tryFetch = async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentAuth.token}`,
        },
        body: JSON.stringify({ youtubeUrl: videoUrl, applyStyle: true }),
      });
      return { response, baseUrl };
    };

    try {
      let baseUrl = base;
      let result;
      try {
        result = await tryFetch(baseUrl);
      } catch (err) {
        if (baseUrl.includes("localhost:3000")) {
          baseUrl = "http://localhost:3010";
          result = await tryFetch(baseUrl);
        } else {
          throw err;
        }
      }

      const json = await result.response.json();
      if (!json.success) {
        if (json.error?.code === "UNAUTHORIZED" || /sign in/i.test(json.error?.message || "")) {
          status.textContent = "Opening Studio to generate…";
          chrome.tabs.create({ url: `${result.baseUrl}/?url=${encodeURIComponent(videoUrl)}&autostart=true` });
          return;
        }
        const errMsg = typeof json.error?.message === "string" ? json.error.message : "Generate failed";
        throw new Error(errMsg);
      }
      const appUrl =
        json.data.appUrl ||
        `${result.baseUrl}/?jobId=${json.data.jobId}`;
      status.textContent = "Queued — opening app…";
      chrome.tabs.create({ url: appUrl });
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Generation failed";
      generate.disabled = false;
    }
  });
});
