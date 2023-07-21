function sendMessagePromise(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (response.complete) {
        resolve(response.data);
      } else {
        reject("Something wrong");
      }
    });
  });
}

async function getProxiedUrls() {
  return sendMessagePromise({ message: "getProxiedUrls" });
}

async function getProxyIsActive() {
  return sendMessagePromise({ message: "getActive" });
}

async function setProxyIsActive(status) {
  return sendMessagePromise({ message: status ? "activate" : "deactivate" });
}

async function toggleProxyIsActive() {
  const proxyIsActive = await getProxyIsActive();
  await setProxyIsActive(!proxyIsActive);
  await checkIfCurrentPageIsProxied();
}

async function getProxyHostnameAndPort() {
  return sendMessagePromise({ message: "getProxyHostnameAndPort" });
}

async function setProxyHostnameAndPort(hostname, port) {
  return sendMessagePromise({
    message: "setProxyHostnameAndPort",
    hostname,
    port,
  });
}

async function loadProxy() {
  const proxiedUrls = (await getProxiedUrls()) || [];
  const { hostname, port } = await getProxyHostnameAndPort();
  const config = {
    mode: "pac_script",
    pacScript: {
      data: `function FindProxyForURL(url, host) {
  // Define the proxy server and port
  var proxy = "PROXY ${hostname}:${port};";
  const urls = ${JSON.stringify(proxiedUrls)};
  if (urls.includes(host)) {
    return proxy;
  }
  return "DIRECT";
}`,
    },
  };
  chrome.proxy.settings.set(
    {
      value: config,
      scope: "regular",
    },
    () => {
      console.log(
        "Proxy settings set using PacScript: " + config.pacScript.data
      );
    }
  );
  setProxyIsActive(true);
}

async function unloadProxy() {
  const config = {
    mode: "direct",
  };
  chrome.proxy.settings.set(
    {
      value: config,
      scope: "regular",
    },
    () => {
      console.log("Proxy unloaded");
    }
  );
  setProxyIsActive(false);
}

async function reloadProxy() {
  await unloadProxy();
  await loadProxy();
}

async function addProxiedUrls(url) {
  await sendMessagePromise({ message: "addProxyUrl", url });
  if (await getProxyIsActive()) await reloadProxy();
  checkIfCurrentPageIsProxied();
}

async function removeProxiedUrls(url) {
  await sendMessagePromise({ message: "removeProxyUrl", url });
  if (await getProxyIsActive()) await reloadProxy();
  checkIfCurrentPageIsProxied();
}

async function checkIfCurrentPageIsProxied() {
  const currentTabProxied = document.getElementById("current-page-proxied");
  const proxyActive = await getProxyIsActive();
  if (proxyActive) {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tab) => {
      const url = new URL(tab[0].url);
      const hostname = url.hostname;
      const proxiedUrls = await getProxiedUrls();
      if (proxiedUrls.includes(hostname)) {
        currentTabProxied.textContent = "This page is proxied";
        currentTabProxied.classList.add("text-green-600");
        currentTabProxied.classList.remove("text-white");
        currentTabProxied.classList.remove("text-red-600");
      } else {
        currentTabProxied.textContent = "This page is not proxied";
        currentTabProxied.classList.remove("text-green-600");
        currentTabProxied.classList.add("text-red-600");
        currentTabProxied.classList.remove("text-white");
      }
    });
  } else {
    currentTabProxied.textContent = "";
    currentTabProxied.classList.remove("text-green-600");
    currentTabProxied.classList.remove("text-red-600");
    currentTabProxied.classList.add("text-white");
  }
}

/* 
  ProxyStatusButton Code
*/

const proxyStatusButton = document.getElementById("proxy-status-button");
const proxyStatusButtonIndicator = proxyStatusButton.querySelector("span");
const proxyStatusText = document.getElementById("proxy-status-text");

function toggleProxyActiveStatusDOM(proxyActive) {
  proxyStatusButtonIndicator.classList.toggle("transform", proxyActive);
  proxyStatusButtonIndicator.classList.toggle("translate-x-full", proxyActive);
  proxyStatusButton.classList.toggle("bg-green-500", proxyActive);
  proxyStatusButton.classList.toggle("bg-gray-400", !proxyActive);
  proxyStatusText.textContent = proxyActive ? "Active" : "Inactive";
  proxyStatusText.classList.toggle("text-white", proxyActive);
  proxyStatusText.classList.toggle("text-gray-700", !proxyActive);
}

proxyStatusButton.addEventListener("click", async () => {
  await toggleProxyIsActive();
  const proxyActive = await getProxyIsActive();

  if (proxyActive) loadProxy();
  else unloadProxy();

  toggleProxyActiveStatusDOM(proxyActive);
});

const fetchActive = async () => {
  const proxyActive = await getProxyIsActive();
  toggleProxyActiveStatusDOM(proxyActive);
};

/* 
  proxiedUrlsList Code
*/
const proxiedUrlsList = document.getElementById("proxied-sites");
const fetchProxiedUrls = async () => {
  const proxiedUrls = await getProxiedUrls();
  proxiedUrls.forEach((url) => {
    const listItem = createProxiedSiteListItem(url);
    proxiedSitesList.appendChild(listItem);
  });
};

const proxiedSitesList = document.getElementById("proxied-sites-list");

function createProxiedSiteListItem(url) {
  const listItem = document.createElement("li");
  listItem.classList.add("flex", "justify-between", "items-center", "mb-2");

  const urlText = document.createElement("span");
  urlText.classList.add("text-gray-700", "font-bold");
  urlText.textContent = url;

  const removeButton = document.createElement("button");
  removeButton.classList.add(
    "bg-red-500",
    "hover:bg-red-700",
    "text-white",
    "font-bold",
    "py-1",
    "px-2",
    "rounded",
    "focus:outline-none",
    "focus:shadow-outline"
  );
  removeButton.textContent = "Remove";
  removeButton.addEventListener("click", () => {
    listItem.remove();
    removeProxiedUrls(url);
  });

  listItem.appendChild(urlText);
  listItem.appendChild(removeButton);

  return listItem;
}

/* 
  addProxiedSite Code
*/

const addProxyUrlButton = document.getElementById("add-proxy-url");
const proxyUrlInput = document.getElementById("proxy-url");

addProxyUrlButton.addEventListener("click", () => {
  const url = proxyUrlInput.value.trim();
  if (url !== "") {
    addProxiedUrls(url);
    const listItem = createProxiedSiteListItem(url);
    proxiedSitesList.appendChild(listItem);
    proxyUrlInput.value = "";
  }
});

(async () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tab) => {
    const url = new URL(tab[0].url);
    const hostname = url.hostname;
    proxyUrlInput.value = hostname;
  });
})();

/*
  Modify Proxy URL Code
*/
const modifyProxyHostname = document.getElementById("modify-proxy-hostname");
const modifyProxyPort = document.getElementById("modify-proxy-port");
const modifyProxyButton = document.getElementById("modify-proxy-button");

modifyProxyButton.addEventListener("click", async () => {
  const hostname = modifyProxyHostname.value.trim();
  const port = modifyProxyPort.value.trim();
  if (hostname !== "" && port !== "") {
    await setProxyHostnameAndPort(hostname, port);
  }
  if (await getProxyIsActive()) await reloadProxy();
});

(async () => {
  const { hostname, port } = await getProxyHostnameAndPort();
  modifyProxyHostname.value = hostname;
  modifyProxyPort.value = port;
})();

/*
  Current Tab Proxied Code
*/
(() => {
  chrome.runtime.sendMessage({ message: "loadBackground" });
})();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message == "backgroundLoaded") {
    console.log("FECTHING");
    fetchActive();
    fetchProxiedUrls();
    checkIfCurrentPageIsProxied();
  }
});
