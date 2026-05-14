
// Ceci est un proxy nodeJS qui doit tourner sur le même server que le site en lui même

const https = require("https");
const http = require("http");

// CONFIG 
const PROXMOX_HOST = "192.168.0.100"; // IP du serv proxmox
const PROXMOX_PORT = 8006; // Port de l'API Proxmox (8006 par défaut)
const PROXMOX_USER = "NodeJS@pve"; // utilisateur dédié pour le monitoring, avec un token API généré dans Proxmox
const PROXMOX_TOKEN_NAME = "monitoring"; // nom du token API (ex: "monitoring")
const PROXMOX_TOKEN_VALUE = "99c045bc-d137-4fbc-8fb3-288058c67cf2"; // valeur du token API (ex: "99c045bc-d137-4fbc-8fb3-288058c67cf2")
const NODE_NAME = "Node-1"; // nom du node Proxmox à monitorer (ex: "Node-1")
const PROXY_PORT = 5001; // port sur lequel le proxy NodeJS écoutera (ex: 5001)

function proxmoxRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: PROXMOX_HOST,
      port: PROXMOX_PORT,
      path: `/api2/json${path}`,
      method: "GET",
      headers: {
        Authorization: `PVEAPIToken=${PROXMOX_USER}!${PROXMOX_TOKEN_NAME}=${PROXMOX_TOKEN_VALUE}`,
      },
      rejectUnauthorized: false,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        // Vérification avant JSON.parse
        if (!data || data.trim() === "") {
          return reject(new Error(`Réponse vide de Proxmox (HTTP ${res.statusCode}) pour ${path}`));
        }
        try {
          const parsed = JSON.parse(data);
          // Log utile pour déboguer
          console.log(`[Proxmox] GET ${path} → HTTP ${res.statusCode}`);
          resolve(parsed);
        } catch (e) {
          console.error(`[Proxmox] JSON invalide pour ${path}:`, data.slice(0, 200));
          reject(new Error(`JSON invalide : ${e.message}`));
        }
      });
    });

    req.on("error", (e) => {
      console.error(`[Proxmox] Erreur réseau pour ${path}:`, e.message);
      reject(e);
    });

    // Timeout de 5 secondes
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error(`Timeout pour ${path}`));
    });

    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  if (req.url === "/api/proxmox-stats") {
    try {
      const [nodeStatus, storage] = await Promise.all([
        proxmoxRequest(`/nodes/${NODE_NAME}/status`),
        proxmoxRequest(`/nodes/${NODE_NAME}/storage`),
      ]);

      const n = nodeStatus.data;
      const disk = storage.data.find((s) => s.storage === "local") || storage.data[0];

      res.end(JSON.stringify({
        cpu: Math.round(n.cpu * 100),
        ram: {
          used: n.memory.used,
          total: n.memory.total,
          percent: Math.round((n.memory.used / n.memory.total) * 100),
        },
        disk: {
          used: disk.used,
          total: disk.total,
          percent: Math.round((disk.used / disk.total) * 100),
        },
        uptime: n.uptime,
      }));
    } catch (e) {
      console.error("[Proxy] Erreur:", e.message);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: e.message }));
    }
  } else {
    res.statusCode = 404;
    res.end("{}");
  }
});

server.listen(PROXY_PORT, () =>
  console.log(`Proxy Proxmox en écoute sur http://localhost:${PROXY_PORT}`)
);