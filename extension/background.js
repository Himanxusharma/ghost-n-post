chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "OPEN_OR_GENERATE") return;

  chrome.storage.sync.get(
    { apiBaseUrl: "http://localhost:3000", apiToken: "" },
    async (settings) => {
      const base = settings.apiBaseUrl.replace(/\/$/, "");
      if (!settings.apiToken) {
        chrome.tabs.create({
          url: `${base}/?url=${encodeURIComponent(message.url)}`,
        });
        sendResponse({ opened: true });
        return;
      }

      try {
        const response = await fetch(`${base}/api/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.apiToken}`,
          },
          body: JSON.stringify({
            youtubeUrl: message.url,
            applyStyle: true,
          }),
        });
        const json = await response.json();
        const appUrl =
          json?.data?.appUrl ||
          `${base}/?url=${encodeURIComponent(message.url)}`;
        chrome.tabs.create({ url: appUrl });
        sendResponse({ ok: Boolean(json?.success) });
      } catch (error) {
        chrome.tabs.create({
          url: `${base}/?url=${encodeURIComponent(message.url)}`,
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
