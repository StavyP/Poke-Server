const connection = require("../../database/index");
const jsonwebtoken = require("jsonwebtoken");
const { keyPub } = require("../../keys");
const { sendShinyCaptureWebhook } = require("../../utils/discordWebhook");

// Même pattern que collectionController.js : on décode le cookie signé plutôt que de se fier
// à un champ du body pour savoir qui fait la demande.
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

const SELECT_BASE = `
	SELECT shasse.*, pokedex.numeroDex, pokedex.nomPokemon, pokedex.type1, pokedex.type2,
		pokedex.idPokeApi, utilisateur.pseudo, utilisateur.IdUtilisateur AS ownerId
	FROM shasse
	JOIN pokedex ON shasse.idPokedex = pokedex.idPokedex
	JOIN utilisateur ON shasse.IdUtilisateur = utilisateur.IdUtilisateur
`;

// Masque le champ interne ownerId (n'a servi qu'à la comparaison serveur) avant de renvoyer au front.
function sanitize(row) {
	const { ownerId, ...rest } = row;
	return rest;
}

exports.CreerShasse = (req, res) => {
	const userId = getUserIdFromToken(req);
	if (!userId) {
		return res.status(401).json({ error: "Non authentifié" });
	}

	const { idPokedex, jeu } = req.body;
	if (!idPokedex) {
		return res.status(400).json({ error: "idPokedex requis" });
	}

	const sql = `INSERT INTO shasse (IdUtilisateur, idPokedex, jeu) VALUES (?, ?, ?)`;
	connection.query(sql, [userId, idPokedex, jeu || null], (error, result) => {
		if (error) {
			console.error("Erreur lors de la création de la shasse :", error);
			return res.status(500).json({ error: "Erreur lors de la création de la shasse" });
		}
		res.status(201).json({ idShasse: result.insertId, message: "Shasse créée" });
	});
};

// Liste des shasses d'un utilisateur (pseudo dans l'URL) — lecture publique, mais les shasses
// "secrètes" ne sont incluses que si le visiteur est le propriétaire (comparaison via cookie).
exports.ListerShasses = (req, res) => {
	const pseudo = req.params.pseudo;
	const viewerId = getUserIdFromToken(req) || 0;

	const sql = `
		${SELECT_BASE}
		WHERE utilisateur.pseudo = ?
			AND (shasse.secrete = 0 OR utilisateur.IdUtilisateur = ?)
		ORDER BY shasse.statut ASC, shasse.dateDebut DESC
	`;

	connection.query(sql, [pseudo, viewerId], (error, results) => {
		if (error) {
			console.error("Erreur lors de la récupération des shasses :", error);
			return res.status(500).json({ error: "Erreur lors de la récupération des shasses" });
		}
		res.status(200).json(results.map(sanitize));
	});
};

exports.RecupererShasse = (req, res) => {
	const idShasse = req.params.idShasse;
	const viewerId = getUserIdFromToken(req) || 0;

	const sql = `${SELECT_BASE} WHERE shasse.idShasse = ?`;
	connection.query(sql, [idShasse], (error, results) => {
		if (error) {
			console.error("Erreur lors de la récupération de la shasse :", error);
			return res.status(500).json({ error: "Erreur lors de la récupération de la shasse" });
		}
		const row = results[0];
		// Une shasse secrète introuvable pour un non-propriétaire renvoie 404, pas 403, pour ne
		// pas révéler qu'elle existe.
		if (!row || (row.secrete && row.ownerId !== viewerId)) {
			return res.status(404).json({ error: "Shasse introuvable" });
		}
		res.status(200).json(sanitize(row));
	});
};

// Met à jour tous les paramètres configurables d'une shasse — réservé au propriétaire.
exports.ModifierShasse = (req, res) => {
	const idShasse = req.params.idShasse;
	const userId = getUserIdFromToken(req);
	if (!userId) {
		return res.status(401).json({ error: "Non authentifié" });
	}

	const {
		idPokedex,
		methode,
		jeu,
		lieu,
		charmeChroma,
		secrete,
		webhookUrl,
		webhookMessage,
		spriteStyle,
		couleurTheme,
		pasIncrement,
		raccourciClavier,
		autoCompteActif,
		autoCompteIntervalle,
		afficherTempsPasse,
		haloActif,
	} = req.body;

	const sql = `
		UPDATE shasse SET
			idPokedex = ?, methode = ?, jeu = ?, lieu = ?, charmeChroma = ?, secrete = ?,
			webhookUrl = ?, webhookMessage = ?, spriteStyle = ?, couleurTheme = ?,
			pasIncrement = ?, raccourciClavier = ?, autoCompteActif = ?, autoCompteIntervalle = ?,
			afficherTempsPasse = ?, haloActif = ?, configuree = 1
		WHERE idShasse = ? AND IdUtilisateur = ?
	`;

	connection.query(
		sql,
		[
			idPokedex,
			methode || "Full Odds",
			jeu || null,
			lieu || null,
			charmeChroma ? 1 : 0,
			secrete ? 1 : 0,
			webhookUrl || null,
			webhookMessage || null,
			spriteStyle || "artwork",
			couleurTheme || null,
			pasIncrement || 1,
			raccourciClavier || null,
			autoCompteActif ? 1 : 0,
			autoCompteIntervalle || 5,
			afficherTempsPasse === false ? 0 : 1,
			haloActif ? 1 : 0,
			idShasse,
			userId,
		],
		(error, result) => {
			if (error) {
				console.error("Erreur lors de la modification de la shasse :", error);
				return res.status(500).json({ error: "Erreur lors de la modification" });
			}
			if (result.affectedRows === 0) {
				return res.status(403).json({ error: "Introuvable ou non autorisé" });
			}
			res.status(200).json({ message: "Shasse mise à jour" });
		}
	);
};

// Incrémente/décrémente (delta) ou fixe (value) le nombre de rencontres — réservé au propriétaire.
exports.AjusterCompteur = (req, res) => {
	const idShasse = req.params.idShasse;
	const userId = getUserIdFromToken(req);
	if (!userId) {
		return res.status(401).json({ error: "Non authentifié" });
	}

	const { delta, value } = req.body;
	const sql =
		value !== undefined
			? `UPDATE shasse SET rencontres = GREATEST(0, ?) WHERE idShasse = ? AND IdUtilisateur = ?`
			: `UPDATE shasse SET rencontres = GREATEST(0, rencontres + ?) WHERE idShasse = ? AND IdUtilisateur = ?`;
	const param = value !== undefined ? value : delta || 0;

	connection.query(sql, [param, idShasse, userId], (error, result) => {
		if (error) {
			console.error("Erreur lors de l'ajustement du compteur :", error);
			return res.status(500).json({ error: "Erreur lors de l'ajustement du compteur" });
		}
		if (result.affectedRows === 0) {
			return res.status(403).json({ error: "Introuvable ou non autorisé" });
		}
		res.status(200).json({ message: "Compteur ajusté" });
	});
};

// Incrémente le sous-compteur de phases (Pokémon indésirables trouvés) sans toucher aux
// rencontres — réservé au propriétaire.
exports.NouvellePhase = (req, res) => {
	const idShasse = req.params.idShasse;
	const userId = getUserIdFromToken(req);
	if (!userId) {
		return res.status(401).json({ error: "Non authentifié" });
	}

	const sql = `UPDATE shasse SET phases = phases + 1 WHERE idShasse = ? AND IdUtilisateur = ?`;
	connection.query(sql, [idShasse, userId], (error, result) => {
		if (error) {
			console.error("Erreur lors de l'ajout d'une phase :", error);
			return res.status(500).json({ error: "Erreur lors de l'ajout d'une phase" });
		}
		if (result.affectedRows === 0) {
			return res.status(403).json({ error: "Introuvable ou non autorisé" });
		}
		res.status(200).json({ message: "Phase ajoutée" });
	});
};

// Valide la capture du shiny : passe la shasse à "trouve" et envoie l'alerte Discord si un
// webhook est configuré — réservé au propriétaire.
exports.ValiderCapture = (req, res) => {
	const idShasse = req.params.idShasse;
	const userId = getUserIdFromToken(req);
	if (!userId) {
		return res.status(401).json({ error: "Non authentifié" });
	}

	connection.query(`${SELECT_BASE} WHERE shasse.idShasse = ?`, [idShasse], (selectError, results) => {
		if (selectError) {
			console.error("Erreur lors de la récupération de la shasse :", selectError);
			return res.status(500).json({ error: "Erreur lors de la validation de la capture" });
		}
		const row = results[0];
		if (!row || row.ownerId !== userId) {
			return res.status(403).json({ error: "Introuvable ou non autorisé" });
		}

		const sql = `UPDATE shasse SET statut = 'trouve', dateCapture = CURRENT_TIMESTAMP WHERE idShasse = ? AND IdUtilisateur = ?`;
		connection.query(sql, [idShasse, userId], async (updateError) => {
			if (updateError) {
				console.error("Erreur lors de la validation de la capture :", updateError);
				return res.status(500).json({ error: "Erreur lors de la validation de la capture" });
			}

			if (row.webhookUrl) {
				await sendShinyCaptureWebhook(row.webhookUrl, row.webhookMessage, {
					pseudo: row.pseudo,
					pokemon: row.nomPokemon,
					rencontres: row.rencontres,
					methode: row.methode,
					jeu: row.jeu || "",
					lieu: row.lieu || "",
				});
			}

			res.status(200).json({ message: "Capture validée" });
		});
	});
};

exports.SupprimerShasse = (req, res) => {
	const idShasse = req.params.idShasse;
	const userId = getUserIdFromToken(req);
	if (!userId) {
		return res.status(401).json({ error: "Non authentifié" });
	}

	const sql = `DELETE FROM shasse WHERE idShasse = ? AND IdUtilisateur = ?`;
	connection.query(sql, [idShasse, userId], (error, result) => {
		if (error) {
			console.error("Erreur lors de la suppression de la shasse :", error);
			return res.status(500).json({ error: "Erreur lors de la suppression" });
		}
		if (result.affectedRows === 0) {
			return res.status(403).json({ error: "Introuvable ou non autorisé" });
		}
		res.status(200).json({ message: "Shasse supprimée" });
	});
};
