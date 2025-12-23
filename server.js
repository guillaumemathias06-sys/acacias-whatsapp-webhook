import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// Variables Render (à définir dans Render > Environment Variables)
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || "";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "";

// Petite page de test
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

// 1) Vérification du webhook (Meta fait un GET)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Helper pour envoyer un message WhatsApp via Cloud API
async function sendWhatsAppText(to, body) {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.error("Missing ACCESS_TOKEN or PHONE_NUMBER_ID");
    return;
  }

  const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  const data = await resp.json().catch(() => null);

  if (!resp.ok) {
    console.error("WhatsApp send error:", resp.status, data);
  } else {
    console.log("WhatsApp sent OK:", data?.messages?.[0]?.id || data);
  }
}

// 2) Réception des événements (Meta fait un POST)
app.post("/webhook", async (req, res) => {
  try {
    // Toujours répondre vite à Meta
    res.sendStatus(200);

    const change = req.body?.entry?.[0]?.changes?.[0];
    const value = change?.value;

    // Message entrant
    const message = value?.messages?.[0];
    if (!message) return;

    const from = message.from; // ex: "336xxxxxxxx"
    const text = (message.text?.body || "").toLowerCase();

    // Réponse par défaut
    let reply =
      "👋 Salut !\n\nÉcris un mot-clé :\n• américaine\n• league\n• tarif";

    if (text.includes("américaine") || text.includes("americaine")) {
      reply =
        "🎾 AMÉRICAINE — Tennis Club des Acacias\n\n👉 Réponds avec :\n1) Tennis ou Padel\n2) Ton dispo (jour/heure)\n3) Ton niveau (débutant / intermédiaire / avancé)";
    } else if (text.includes("league") || text.includes("ligue")) {
      reply =
        "🏆 LEAGUE — Acacias\n\nTu veux :\n1) T’inscrire\n2) Rejoindre une équipe\n\nRéponds 1 ou 2 + ton prénom";
    } else if (
      text.includes("tarif") ||
      text.includes("prix") ||
      text.includes("abonnement")
    ) {
      reply =
        "💳 TARIFS — Acacias\n\nTu cherches :\n1) Location terrain\n2) Abonnements\n3) Club Premium\n\nRéponds 1 / 2 / 3";
    }

    // Envoi de la réponse
    await sendWhatsAppText(from, reply);
  } catch (e) {
    console.error("Webhook error:", e);
    // (Meta a déjà reçu 200, donc on ne renvoie rien ici)
  }
});

// IMPORTANT Render : écouter sur process.env.PORT
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Webhook Acacias prêt sur le port", port);
});
