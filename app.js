let sharedScramjet = null;
let sharedConnection = null;
let currentWispUrl = "";

async function fetchWispServers() {
  return [
    "wss://wisp.mercuryworkshop.tech/",
    "wss://wisp.pizzabox.tech/",
    "wss://ruby.rubynetwork.co/wisp/",
    "wss://wisp.mercuryworkshop.com/"
  ];
}

async function getSharedScramjet() {
  if (sharedScramjet) return sharedScramjet;

  if ("serviceWorker" in navigator) {
    await navigator.serviceWorker.register("./sw.js", { scope: "/" });
  }

  const { ScramjetController } = window.Scramjet;
  sharedScramjet = new ScramjetController({
    prefix: "/scramjet/",
    files: {
      wasm: "/scramjet/scramjet.wasm.js",
      worker: "/scramjet/scramjet.worker.js",
      client: "/scramjet/scramjet.client.js",
      shared: "/scramjet/scramjet.shared.js",
      sync: "/scramjet/scramjet.sync.js"
    }
  });

  await sharedScramjet.init();
  return sharedScramjet;
}

async function getSharedConnection() {
  if (sharedConnection) return sharedConnection;

  const connection = new BareMux.BareMuxConnection("./bareworker.js");
  const servers = await fetchWispServers();
  let connected = false;

  for (const wispUrl of servers) {
    try {
      await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
      currentWispUrl = wispUrl;
      connected = true;
      console.log("Successfully connected to Wisp server:", wispUrl);
      break;
    } catch (err) {
      console.warn(`Failed to connect to Wisp server ${wispUrl}, trying next...`, err);
    }
  }

  if (!connected) {
    throw new Error("All Wisp servers failed to establish a WebSocket connection.");
  }

  sharedConnection = connection;
  return sharedConnection;
}

async function createTab(targetUrl) {
  if (!sharedScramjet) {
    throw new Error("Scramjet controller is not initialized.");
  }

  const encodedUrl = sharedScramjet.encodeUrl(targetUrl);
  const frameContainer = document.getElementById("frame-container");
  
  if (!frameContainer) return;

  frameContainer.innerHTML = "";

  const iframe = document.createElement("iframe");
  iframe.src = encodedUrl;
  frameContainer.appendChild(iframe);
}

async function initializeBrowser() {
  const goBtn = document.getElementById("go-btn");
  const urlInput = document.getElementById("url-input");

  const handleNavigate = () => {
    let input = urlInput.value.trim();
    if (!input) return;
    if (!/^https?:\/\//i.test(input)) {
      input = "https://" + input;
    }
    createTab(input);
  };

  if (goBtn) {
    goBtn.addEventListener("click", handleNavigate);
  }
  
  if (urlInput) {
    urlInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleNavigate();
    });
  }

  await createTab("https://www.google.com");
}

async function startApp() {
  try {
    await getSharedScramjet();
    await getSharedConnection();
    await initializeBrowser();
  } catch (err) {
    console.error("Initialization failed:", err);
  }
}

window.addEventListener("DOMContentLoaded", startApp);
