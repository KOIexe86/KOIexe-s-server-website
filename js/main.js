

// -------------------------------------------------------
//                 Proxmox Health Monitor    
// -------------------------------------------------------

// Url du proxy NodeJS (a mettre en /api/proxmox-stats une fois sur le serveur)
const PROXY_URL = "/api/proxmox-stats";

// Formatage des données de stockage
function formatBytes(bytes) {
  if (bytes >= 1e12) return (bytes / 1e12).toFixed(1) + " To";
  if (bytes >= 1e9)  return (bytes / 1e9).toFixed(1)  + " Go";
  if (bytes >= 1e6)  return (bytes / 1e6).toFixed(1)  + " Mo";
  return bytes + " o";
}

// Formatage des données de l'uptime
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}j ${h}h ${m}m`;
}

//  Fonction pour afficher les barres de progression
function setBar(id, percent) {
  const el = document.getElementById(id);
  el.style.width = percent + "%";
  el.className = "Health-monitor-fill" +
    (percent > 90 ? " crit" : percent > 70 ? " warn" : "");
  
  if (id == "uptime-bar") {
    el.className = "Health-monitor-fill ok"
  }
}

// Fonction pour récupérer les stats depuis le proxy NodeJS
async function fetchProxmoxStats() {
  try {
    const res  = await fetch(PROXY_URL);
    const data = await res.json();

    document.getElementById("cpu-value").textContent   = data.cpu + "%";
    setBar("cpu-bar", data.cpu);

    document.getElementById("ram-value").textContent   = data.ram.percent + "%";
    document.getElementById("ram-sub").textContent     =
      `${formatBytes(data.ram.used)} / ${formatBytes(data.ram.total)}`;
    setBar("ram-bar", data.ram.percent);

    document.getElementById("disk-value").textContent  = data.disk.percent + "%";
    document.getElementById("disk-sub").textContent    =
      `${formatBytes(data.disk.used)} / ${formatBytes(data.disk.total)}`;
    setBar("disk-bar", data.disk.percent);

    document.getElementById("uptime-value").textContent = formatUptime(data.uptime);
    setBar("uptime-bar", 100);

    document.getElementById("Health-monitor-error").style.display = "none";
  } catch (e) {
    console.error("Erreur lors de la récupération des stats Proxmox:", e.message);
    document.getElementById("Health-monitor-error").style.display = "block";
    document.getElementById("Health-monitor-error").textContent = "Unable to connect to the proxy, check the console for an error message.";
  }
}

// Rafraîchissement toutes les 5 secondes
fetchProxmoxStats();
setInterval(fetchProxmoxStats, 5_000);



// -------------------------------------------------------
//                Web3Forms Contact Form    
// -------------------------------------------------------



const form = document.getElementById('form');
const submitBtn = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    formData.append("access_key", "105eca89-4054-4155-a2ca-1a89b0160bad");

    const originalText = submitBtn.textContent;

    submitBtn.textContent = "Sending...";
    submitBtn.disabled = true;

    try {
        const response = await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            alert("Success! Your message has been sent.");
            form.reset();
        } else {
            alert("Error: " + data.message);
        }

    } catch (error) {
        alert("Something went wrong. Please try again.");
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});