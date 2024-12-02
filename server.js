const WebSocket = require("ws");
const http = require("http");
const express = require("express");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Inicializace proměnných
let documentContent = ""; // Obsah sdíleného dokumentu
const clients = {}; // Sledování připojených klientů a jejich kurzorů
const userNames = ["PixelPioneer", "CodeMaster", "WebWhiz", "ByteBeast", "DataDynamo"]; // Seznam jmen
let userIndex = 0; // Pro přiřazení unikátního jména

// Servírování statických souborů
app.use(express.static(__dirname));

// WebSocket logika
wss.on("connection", (ws) => {
  const userId = Date.now(); // Unikátní identifikátor klienta
  const userName = userNames[userIndex % userNames.length]; // Přiřadit jméno z nového seznamu
  userIndex++;

  console.log(`Uživatel připojen: ${userName}`);
  clients[userId] = { userName, cursor: { x: 0, y: 0 }, ws };

  // Poslat počáteční data nově připojenému klientovi
  ws.send(
    JSON.stringify({
      type: "init",
      content: documentContent,
      users: Object.values(clients).map((client) => client.userName),
    })
  );

  // Zpracování příchozích zpráv od klienta
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "textUpdate") {
        // Aktualizace obsahu dokumentu
        if (typeof data.content === "string") {
          documentContent = data.content;
          broadcast({ type: "textUpdate", content: documentContent }, ws);
        }
      } else if (data.type === "cursorMove") {
        // Aktualizace pozice kurzoru
        if (data.cursor && typeof data.cursor.x === "number" && typeof data.cursor.y === "number") {
          clients[userId].cursor = data.cursor;
          broadcast({ type: "cursorUpdate", userId, cursor: data.cursor }, ws);
        }
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

  // Ošetření chyb WebSocket
  ws.on("error", (err) => {
    console.error(`Chyba WebSocket u uživatele ${userName}:`, err);
  });
});

// Funkce pro rozeslání zpráv všem klientům kromě odesílatele
function broadcast(data, excludeWs) {
  wss.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(data));
      } catch (err) {
        console.error("Chyba při rozesílání zprávy:", err);
      }
    }
  });
}

// Spuštění serveru
const PORT = 3306;
server.listen(PORT, () => {
  console.log(`Server běží na http://0.0.0.0:${PORT}`);
});
