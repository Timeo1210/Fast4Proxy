const proxiedUrls = new Set();
const config = {
  active: false,
  hostname: "",
  port: "",
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get("proxiedUrls", (data) => {
    console.log("DATA on installation : ", data.proxiedUrls);
    if (data.proxiedUrls) {
      data.proxiedUrls.forEach((url) => {
        proxiedUrls.add(url);
      });
    }
  });
  chrome.storage.sync.get("hostname", (data) => {
    console.log("DATA on installation : ", data.hostname);
    if (data.hostname) {
      config.hostname = data.hostname;
    }
  });
  chrome.storage.sync.get("port", (data) => {
    console.log("DATA on installation : ", data.port);
    if (data.port) {
      config.port = data.port;
    }
  });
});

chrome.runtime.onStartup.addListener(() => {
  console.log(proxiedUrls);
  chrome.storage.sync.get("proxiedUrls", (data) => {
    console.log("DATA on startup : ", data.proxiedUrls);
    if (data.proxiedUrls) {
      data.proxiedUrls.forEach((url) => {
        proxiedUrls.add(url);
      });
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "getProxiedUrls") {
    sendResponse({ data: [...proxiedUrls], complete: true });
  } else if (request.message === "addProxyUrl") {
    proxiedUrls.add(request.url);
    sendResponse({ complete: true });
    chrome.storage.sync.set({ proxiedUrls: [...proxiedUrls] }, () => {
      console.log("Proxied urls : ", proxiedUrls);
    });
  } else if (request.message === "removeProxyUrl") {
    proxiedUrls.delete(request.url);
    sendResponse({ complete: true });
    chrome.storage.sync.set({ proxiedUrls: [...proxiedUrls] }, () => {
      console.log("Proxied urls : ", proxiedUrls);
    });
  }

  if (request.message === "getActive") {
    console.log("ACTIVE : ", config.active);
    sendResponse({ data: config.active, complete: true });
  } else if (request.message === "activate") {
    config.active = true;
    sendResponse({ complete: true });
  } else if (request.message === "deactivate") {
    config.active = false;
    sendResponse({ complete: true });
  }

  if (request.message === "getProxyHostnameAndPort") {
    sendResponse({
      data: { hostname: config.hostname, port: config.port, complete: true },
      complete: true,
    });
  } else if (request.message === "setProxyHostnameAndPort") {
    config.hostname = request.hostname;
    config.port = request.port;
    sendResponse({ complete: true });
    chrome.storage.sync.set(
      { hostname: config.hostname, port: config.port },
      () => {
        console.log("Hostname and port : ", config.hostname, config.port);
      }
    );
  }
});
