async function getAuthToken(baseUrl) {
  const settings = await chrome.storage.sync.get({ apiToken: "" });
  if (settings.apiToken) {
    return settings.apiToken;
  }
  try {
    const cookie = await chrome.cookies.get({
      url: baseUrl.replace(/\/$/, ""),
      name: "__session",
    });
    if (cookie?.value) {
      return cookie.value;
    }
  } catch (err) {
    console.warn("Could not read session cookie", err);
  }
  return null;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "OPEN_OR_GENERATE") return;

  chrome.storage.sync.get(
    { apiBaseUrl: "http://localhost:3010", apiToken: "" },
    async (settings) => {
      let base = settings.apiBaseUrl.replace(/\/$/, "");
      const token = await getAuthToken(base);

      if (!token) {
        chrome.tabs.create({
          url: `${base}/?url=${encodeURIComponent(message.url)}&autostart=true`,
        });
        sendResponse({ opened: true });
        return;
      }

      const tryFetch = async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            youtubeUrl: message.url,
            applyStyle: true,
          }),
        });
        return { response, baseUrl };
      };

      try {
        let result;
        try {
          result = await tryFetch(base);
        } catch (err) {
          if (base.includes("localhost:3000")) {
            base = "http://localhost:3010";
            result = await tryFetch(base);
          } else {
            throw err;
          }
        }
        const json = await result.response.json();

        if (!json?.success) {
          chrome.tabs.create({
            url: `${result.baseUrl}/?url=${encodeURIComponent(message.url)}&autostart=true`,
          });
          sendResponse({ opened: true });
          return;
        }

        const appUrl =
          json?.data?.appUrl ||
          `${result.baseUrl}/?url=${encodeURIComponent(message.url)}&autostart=true`;
        chrome.tabs.create({ url: appUrl });
        sendResponse({ ok: true });
      } catch (error) {
        chrome.tabs.create({
          url: `${base}/?url=${encodeURIComponent(message.url)}&autostart=true`,
        });
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "failed",
        });
      }
    },
  );

  return true;
});
