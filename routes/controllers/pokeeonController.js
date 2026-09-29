const connection = require("../../database/index");
const jsonwebtoken = require("jsonwebtoken");
const { keyPub } = require("../../keys");

// PokéEon (jeu idle de PokeCollect) : une partie par compte, stockée en JSON dans pokeeon_partie.
// Le jeu tourne entièrement côté navigateur ; le serveur ne fait que garder la partie, donner
// l'heure (pour calculer l'absence avec une horloge fiable) et refuser les sauvegardes périmées.

// Même pattern que shasseController.js : on décode le cookie signé plutôt que de se fier à un
// champ du body pour savoir qui fait la demande.
function getUserIdFromToken(req) {
	const { token } = req.cookies;
	if (!token) return null;
	try {
		const decoded = jsonwebtoken.verify(token, keyPub, { algorithms: "RS256" });
		return Number(decoded.sub);
	} catch (error) {
		return null;
	}
}

// express.json() refuse déjà les corps de plus de 100 Ko ; le jeu reste bien en dessous.
const TAILLE_MAX = 100 * 1024;

exports.ChargerPartie = (req, res) => {
	const userId = getUserIdFromToken(req);
	if (!userId) return res.status(401).json({ error: "Non authentifié" });

	const sql = "SELECT etat, version, horodatage FROM pokeeon_partie WHERE IdUtilisateur = ?";
	connection.query(sql, [userId], (error, results) => {
		if (error) {
			console.error("Erreur lors du chargement de la partie PokéEon :", error);
			return res.status(500).json({ error: "Erreur lors du chargement de la partie" });
		}
		const maintenant = Date.now();
		if (!results.length) return res.status(200).json({ partie: null, maintenant });
		const ligne = results[0];
		let partie;
		try {
			partie = JSON.parse(ligne.etat);
		} catch (e) {
			console.error("Partie PokéEon illisible pour l'utilisateur", userId);
			return res.status(500).json({ error: "Partie enregistrée illisible" });
		}
		res.status(200).json({ partie, version: ligne.version, horodatage: Number(ligne.horodatage), maintenant });
	});
};

// version 0 = première sauvegarde (INSERT) ; sinon mise à jour seulement si la version envoyée est
// toujours la dernière (verrou optimiste) — sinon 409, la partie a été enregistrée ailleurs.
exports.EnregistrerPartie = (req, res) => {
	const userId = getUserIdFromToken(req);
	if (!userId) return res.status(401).json({ error: "Non authentifié" });

	const { partie, version } = req.body || {};
	if (!partie || typeof partie !== "object" || !Number.isInteger(version) || version < 0) {
		return res.status(400).json({ error: "partie et version requis" });
	}
	const etat = JSON.stringify(partie);
	if (etat.length > TAILLE_MAX) return res.status(413).json({ error: "Partie trop volumineuse" });
	const horodatage = Date.now();

	if (version === 0) {
		const sql = "INSERT INTO pokeeon_partie (IdUtilisateur, etat, version, horodatage) VALUES (?, ?, 1, ?)";
		return connection.query(sql, [userId, etat, horodatage], (error) => {
			if (error && error.code === "ER_DUP_ENTRY") {
				return res.status(409).json({ error: "Une partie existe déjà pour ce compte" });
			}
			if (error) {
				console.error("Erreur lors de la création de la partie PokéEon :", error);
				return res.status(500).json({ error: "Erreur lors de la sauvegarde" });
			}
			res.status(201).json({ version: 1, horodatage });
		});
	}

	const sql = `UPDATE pokeeon_partie SET etat = ?, version = version + 1, horodatage = ?
		WHERE IdUtilisateur = ? AND version = ?`;
	connection.query(sql, [etat, horodatage, userId, version], (error, result) => {
		if (error) {
			console.error("Erreur lors de la sauvegarde de la partie PokéEon :", error);
			return res.status(500).json({ error: "Erreur lors de la sauvegarde" });
		}
		if (result.affectedRows === 0) {
			return res.status(409).json({ error: "La partie a été enregistrée ailleurs entre-temps" });
		}
		res.status(200).json({ version: version + 1, horodatage });
	});
};

exports.EffacerPartie = (req, res) => {
	const userId = getUserIdFromToken(req);
	if (!userId) return res.status(401).json({ error: "Non authentifié" });

	connection.query("DELETE FROM pokeeon_partie WHERE IdUtilisateur = ?", [userId], (error) => {
		if (error) {
			console.error("Erreur lors de l'effacement de la partie PokéEon :", error);
			return res.status(500).json({ error: "Erreur lors de l'effacement" });
		}
		res.status(200).json({ message: "Partie effacée" });
	});
};
