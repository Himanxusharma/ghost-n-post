document.addEventListener("DOMContentLoaded", async () => {
  const apiBaseUrl = document.getElementById("apiBaseUrl");
  const apiToken = document.getElementById("apiToken");
  const status = document.getElementById("status");
  const saved = await chrome.storage.sync.get({
    apiBaseUrl: "http://localhost:3010",
    apiToken: "",
  });
  apiBaseUrl.value = saved.apiBaseUrl;
  apiToken.value = saved.apiToken;

  document.getElementById("save").addEventListener("click", async () => {
    await chrome.storage.sync.set({
      apiBaseUrl: apiBaseUrl.value.trim().replace(/\/$/, ""),
      apiToken: apiToken.value.trim(),
    });
    status.textContent = "Saved.";
  });
});
