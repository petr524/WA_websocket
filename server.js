const WebSocket = require("ws");
const http = require("http");
const express = require("express");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Inicializace proměnných
let documentContent = ""; // Obsah sdíleného dokumentu
const clients = {}; // Sledování připojených klientů a jejich kurzorů
const userNames = ["BigBoy", "LittlePookie", "CoolCat", "SmartCookie", "FastFingers"];
let userIndex = 0; // Pro přiřazení unikátního jména

// Servírování statických souborů
app.use(express.static(__dirname));

// WebSocket logika
wss.on("connection", (ws) => {
  const userId = Date.now(); // Unikátní identifikátor klienta
  const userName = userNames[userIndex % userNames.length]; // Přiřadit jméno z předdefinovaného seznamu
  userIndex++;

  console.log(`Uživatel připojen: ${userName}`);
  clients[userId] = { userName, cursor: { x: 0, y: 0 }, ws };

  // Poslat počáteční data nově připojenému klientovi
  ws.send(
    JSON.stringify({
      type: "init",
      content: documentContent,
      users: Object.values(clients).map(client => client.userName),
    })
  );

  // Zpracování příchozích zpráv od klienta
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "textUpdate") {
        // Aktualizace obsahu dokumentu
        documentContent = data.content;
        broadcast({ type: "textUpdate", content: documentContent }, ws);
      } else if (data.type === "cursorMove") {
        // Aktualizace pozice kurzoru
        clients[userId].cursor = data.cursor;
        broadcast({ type: "cursorUpdate", userId, cursor: data.cursor }, ws);
      }
    } catch (err) {
      console.error("Chyba při zpracování zprávy:", err);
    }
  });

  // Řešení odpojení klienta
  ws.on("close", () => {
    console.log(`Uživatel odpojen: ${userName}`);
    delete clients[userId];
    broadcast({ type: "userDisconnect", userId });
  });
});

// Funkce pro rozeslání zpráv všem klientům kromě odesílatele
function broadcast(data, excludeWs) {
  wss.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Spuštění serveru
const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Server běží na http://0.0.0.0:${PORT}`);
});
