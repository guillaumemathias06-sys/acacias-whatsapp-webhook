import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ==============================
// VARIABLES D’ENVIRONNEMENT
// ==============================
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || "";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "";

// ==============================
// PAGE TEST (racine)
// ==============================
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

// ==============================
// 1️⃣ VÉRIFICATION WEBHOOK (GET)
// ==============================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("🔍 Webhook verification attempt");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }

  console.log("❌ Webhook verification failed");
  return res.sendStatus(403);
});

// ==============================
// HELPER ENVOI MESSAGE WHATSAPP
// ==============================
async function sendWhatsAppMessage(to, body) {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.error("❌ ACCESS_TOKEN ou PHONE_NUMBER_ID manquant");
    return;
  }

  const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body },
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("❌ Erreur envoi WhatsApp :", response.status, data);
    } else {
      console.log("✅ Message WhatsApp envoyé :", data);
    }
  } catch (err) {
    console.error("❌ Exception envoi WhatsApp :", err);
  }
}

// ==============================
// 2️⃣ RÉCEPTION DES MESSAGES (POST)
// ==============================
app.post("/webhook", async (req, res) => {
  // ⚠️ Toujours répondre vite à Meta
  res.sendStatus(200);

  try {
    console.log("📩 POST /webhook reçu");
    console.log(JSON.stringify(req.body, null, 2));

    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) {
      console.log("ℹ️ Aucun message utilisateur détecté");
      return;
    }

    const from = message.from; // numéro de l’utilisateur
    const text = (message.text?.body || "").toLowerCase();

    console.log("✉️ Message reçu de", from, ":", text);

    let reply =
      "👋 Bonjour !\n\nÉcris :\n• américaine\n• league\n• tarif";

    if (text.includes("américaine") || text.includes("americaine")) {
      reply =
        "🎾 AMÉRICAINE — Tennis Club des Acacias\n\n👉 Réponds avec :\n1) Tennis ou Padel\n2) Ton dispo (jour / heure)\n3) Ton niveau";
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

    await sendWhatsAppMessage(from, reply);
  } catch (err) {
    console.error("❌ Erreur dans POST /webhook :", err);
  }
});

// ==============================
// DÉMARRAGE SERVEUR (RENDER)
// ==============================
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("🚀 Webhook Acacias LIVE sur le port", port);
});
