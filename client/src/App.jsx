import React, { useState, useEffect } from "react";
import supabase from "./supabase";
import Auth from "./Auth";

function App() {
  const [trend, setTrend] = useState("");
  const [brand, setBrand] = useState(null);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");
  const [savedBrands, setSavedBrands] = useState([]);
  const [user, setUser] = useState(null);

  // Vérifier session Supabase
  useEffect(() => {
    // Si pas d'utilisateur, forcer l'affichage Auth
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) {
        setUser(null);
      } else {
        setUser(data.user);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    // Nettoyage listener
    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  // Restauration depuis localStorage
  useEffect(() => {
    const lastBrand = localStorage.getItem("neurobrand:last");
    if (lastBrand) {
      setBrand(JSON.parse(lastBrand));
    }
  }, []);

  // Sauvegarde automatique dans localStorage
  useEffect(() => {
    if (brand) {
      localStorage.setItem("neurobrand:last", JSON.stringify(brand));
    }
  }, [brand]);

  const generate = async () => {
    if (!trend.trim()) {
      setError("Veuillez entrer une tendance.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trend })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const lines = data.result.split("\n").filter((l) => l.trim());
      const [nameLine, sloganLine, descLine, imageLine] = lines;

      const newBrand = {
        name: nameLine?.replace(/^1\.\s*/, "").trim(),
        slogan: sloganLine?.replace(/^2\.\s*/, "").trim(),
        description: descLine?.replace(/^3\.\s*/, "").trim(),
        imagePrompt: imageLine?.replace(/^4\.\s*(idée|idée d’image|image|visuel).*?:/i, "").trim(),
        imageUrl: ""
      };

      setBrand(newBrand);

      if (newBrand.imagePrompt) {
        await generateImage(newBrand.imagePrompt);
      }

    } catch (err) {
      console.error("❌ Erreur generate():", err);
      setError(err.message || "Erreur inattendue.");
    } finally {
      setLoading(false);
    }
  };

  const generateTextOnly = async () => {
    if (!trend.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trend })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const lines = data.result.split("\n").filter((l) => l.trim());
      const [nameLine, sloganLine, descLine, imageLine] = lines;

      setBrand((prev) => ({
        ...prev,
        name: nameLine?.replace(/^1\.\s*/, "").trim(),
        slogan: sloganLine?.replace(/^2\.\s*/, "").trim(),
        description: descLine?.replace(/^3\.\s*/, "").trim(),
        imagePrompt: imageLine?.replace(/^4\.\s*(idée|idée d’image|image|visuel).*?:/i, "").trim()
      }));

    } catch (err) {
      console.error("❌ Erreur texte uniquement :", err);
      setError(err.message || "Erreur inattendue.");
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async (prompt) => {
    try {
      setRegenerating(true);
      const res = await fetch("/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });

      const data = await res.json();
      if (data.imageUrl) {
        setBrand((prev) => ({ ...prev, imageUrl: data.imageUrl }));
      } else {
        setError("⚠️ Image IA non générée.");
      }
    } catch (err) {
      console.error("❌ Erreur image IA :", err);
      setError("Erreur pendant la génération d’image.");
    } finally {
      setRegenerating(false);
    }
  };

  const downloadImage = () => {
    if (!brand?.imageUrl) return;
    const link = document.createElement("a");
    link.href = brand.imageUrl;
    link.download = `${brand.name}.png`;
    link.click();
  };

  const copyImageLink = () => {
    if (!brand?.imageUrl) return;
    navigator.clipboard.writeText(brand.imageUrl)
      .then(() => alert("📋 Lien copié dans le presse-papier !"))
      .catch(() => alert("❌ Impossible de copier le lien."));
  };

  const saveBrand = async () => {
    if (!brand || !user) {
      alert("Connexion requise pour sauvegarder");
      return;
    }

    const { error } = await supabase.from("brands").insert({
      user_id: user.id,
      name: brand.name,
      slogan: brand.slogan,
      description: brand.description,
      image_url: brand.imageUrl
    });

    if (error) {
      alert("Erreur lors de l’enregistrement !");
      console.error(error.message);
    } else {
      alert("✅ Marque sauvegardée dans Supabase !");
    }
  };

  return (
    <div className="container">
      <h1>🧠 NEUROBRAND</h1>
      <p>Génère une mini-marque à partir d'une tendance :</p>

      <input
        type="text"
        value={trend}
        onChange={(e) => setTrend(e.target.value)}
        placeholder="Ex: fashion IA, artisanat solaire"
        disabled={loading}
      />

      <button onClick={generate} disabled={loading}>
        {loading ? "⏳ Génération..." : "✨ Générer"}
      </button>

      {brand && (
        <>
          <button onClick={generateTextOnly} disabled={loading}>
            🔁 Texte seul
          </button>
          <button onClick={() => generateImage(brand.imagePrompt)} disabled={regenerating}>
            {regenerating ? "🔄 Image..." : "🔄 Image seule"}
          </button>
        </>
      )}

      {error && <div className="error">{error}</div>}

      {brand && (
        <div className="result-block">
          <div className="brand-card">
            <h3 className="brand-name">{brand.name}</h3>
            <p className="brand-slogan">"{brand.slogan}"</p>
            <p>{brand.description}</p>
            <p className="image-placeholder">🖼️ {brand.imagePrompt}</p>
            {brand.imageUrl && (
              <div className="image-display">
                <img
                  src={brand.imageUrl}
                  alt="Image IA"
                  style={{ width: "100%", borderRadius: 10, maxHeight: 400, objectFit: "contain" }}
                />
                <p style={{ fontSize: 12, marginTop: 6 }}>
                  🔗 <a href={brand.imageUrl} target="_blank" rel="noreferrer">{brand.imageUrl.slice(0, 70)}...</a>
                </p>
                <div className="actions">
                  <button onClick={downloadImage}>📥 Télécharger</button>
                  <button onClick={copyImageLink}>📋 Copier le lien</button>
                  <button onClick={saveBrand}>💾 Sauvegarder</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

