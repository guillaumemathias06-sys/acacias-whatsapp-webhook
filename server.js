import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// Vérification webhook Meta
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Réception des messages entrants
app.post("/webhook", async (req, res) => {
  try {
    const message =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) return res.sendStatus(200);

    const from = message.from;
    const text = message.text?.body?.toLowerCase() || "";

    let reply =
      "👋 Bonjour !\n\nÉcris :\n• américaine\n• league\n• tarif";

    if (text.includes("américaine")) {
      reply =
        "🎾 AMÉRICAINE\n\n👉 Dis-moi :\n1️⃣ Tennis ou Padel\n2️⃣ Jour / heure\n3️⃣ Ton niveau";
    } else if (text.includes("league")) {
      reply =
        "🏆 LEAGUE\n\nSouhaites-tu :\n1️⃣ T’inscrire\n2️⃣ Rejoindre une équipe\n\nRéponds 1 ou 2";
    } else if (text.includes("tarif")) {
      reply =
        "💳 TARIFS\n\n👉 Location terrains\n👉 Abonnements\n👉 Club Premium\n\nQue cherches-tu ?";
    }

    await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: { body: reply },
        }),
      }
    );

    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(200);
  }
});

app.listen(3000, () => {
  console.log("Webhook Acacias prêt");
});
