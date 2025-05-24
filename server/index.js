require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

// OpenAI SDK
const OpenAI = require("openai");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const app = express();
app.use(cors());
app.use(express.json());

console.log("🚀 Backend NeuroBrand démarré");

// 🧠 OpenRouter : génération texte
app.post('/generate', async (req, res) => {
  const { trend } = req.body;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'mistralai/mistral-7b-instruct',
        messages: [
          {
            role: 'user',
            content: `Je veux créer une mini-marque virale autour de la tendance suivante : "${trend}". Donne-moi :
1. Un nom de marque original
2. Un slogan court
3. Une description stylée
4. Une idée d’image ou visuel associé`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = response.data.choices[0].message.content;
    console.log("📥 /generate →", result);
    res.json({ result });

  } catch (err) {
    console.error("❌ Erreur OpenRouter :", err.response?.data || err.message);
    res.status(500).json({ error: "Erreur génération texte IA" });
  }
});

// 🎨 OpenAI DALL·E : génération image
app.post('/generate-image', async (req, res) => {
  let { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
    return res.status(400).json({ error: "Prompt trop court ou invalide pour la génération d'image." });
  }

  try {
    if (prompt.length > 200) {
      prompt = prompt.slice(0, 200);
    }

    console.log("🎨 Génération image DALL·E pour :", prompt);

    const dalleRes = await openai.images.generate({
      prompt: prompt,
      n: 1,
      size: "512x512"
    });
    // Compatibilité avec les deux formats de réponse du SDK OpenAI
    let imageUrl = null;
    if (dalleRes && Array.isArray(dalleRes.data) && dalleRes.data[0]?.url) {
      imageUrl = dalleRes.data[0].url;
    } else if (dalleRes && dalleRes.data?.data && Array.isArray(dalleRes.data.data) && dalleRes.data.data[0]?.url) {
      imageUrl = dalleRes.data.data[0].url;
    }
    if (!imageUrl) {
      console.error("❌ DALL·E: format de réponse inattendu", JSON.stringify(dalleRes));
      return res.status(500).json({ error: "Réponse inattendue de l'API DALL·E", dalleRes });
    }
    console.log("✅ Image DALL·E :", imageUrl);

    res.json({ imageUrl });

  } catch (err) {
    console.error("❌ Erreur DALL·E :", err.response?.data || err.message);
    res.status(500).json({ error: "Erreur génération image OpenAI" });
  }
});

// ✅ Démarrage serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend NeuroBrand actif sur http://localhost:${PORT}`);
});
