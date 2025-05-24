import { useState } from "react";
import supabase from "./supabase";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      alert("Erreur d'envoi de lien : " + error.message);
      console.error(error);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="container">
      <h2>🔐 Connexion</h2>
      <p>Entrez votre email pour recevoir un lien magique :</p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="votre@email.com"
      />
      <button onClick={handleLogin}>📩 Envoyer le lien</button>
      {sent && <p>✅ Lien envoyé ! Vérifiez votre boîte mail.</p>}
    </div>
  );
}
