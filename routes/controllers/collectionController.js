const connection = require("../../database/index");
const jsonwebtoken = require("jsonwebtoken");
const { keyPub } = require("../../keys");

// Modifier/supprimer une entrée exige de savoir QUI fait la demande sans se fier à ce que le
// front envoie (contrairement à AjoutCollection qui fait encore confiance à IdUtilisateur dans
// le body) — on décode le cookie signé plutôt qu'un champ modifiable par n'importe qui.
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

exports.AjoutCollection = (req, res) => {
	console.log(req.body);
	try {
		// Récupérez les données envoyées depuis le front-end
		const {
			idUtilisateurCollect,
			jeu,
			surnom,
			nombre,
			methode,
			IdUtilisateur,
			nomPokemon,
			estShiny,
			dateAjout,
		} = req.body;
		// COALESCE(?, CURRENT_TIMESTAMP) : si dateAjout n'est pas fourni (Living Dex, ou capture
		// shiny sans date précisée), la colonne retombe sur sa valeur par défaut au lieu d'un
		// NULL explicite (qui, lui, n'aurait pas déclenché le DEFAULT de la colonne).
		const sqlInsert =
			"INSERT INTO collectionutilisateur (idUtilisateurCollect, surnom, nombreDeRencontre, methode, IdUtilisateur, jeu, idPokedex, estShiny, dateAjout) SELECT ?, ?, ?, ?, ?, ?, p.idPokedex, ?, COALESCE(?, CURRENT_TIMESTAMP) FROM pokedex p WHERE p.nomPokemon = ?";

		connection.query(
			sqlInsert,
			[
				idUtilisateurCollect,
				surnom,
				nombre,
				methode,
				IdUtilisateur,
				jeu,
				estShiny ? 1 : 0,
				dateAjout || null,
				nomPokemon,
			],
			(error, result) => {
				if (error) {
					console.error("Erreur lors de l'ajout du pokemon :", error);
					return res.status(500).json({ error: "Erreur lors de l'ajout du pokemon" });
				}
				console.log(result);
				if (result.insertId === 0) {
					return res
						.status(400)
						.json({ error: "Unknow pokemon : " + nomPokemon });
				} else {
					console.log("Pokémon ajouté avec succès !");
					return res
						.status(201)
						.json({ message: "Pokémon ajouté avec succès !" });
				}
			}
		);
	} catch (error) {
		console.error("Erreur lors de l'ajout du pokemon", error);
		return res.status(500).json({
			error: "Erreur lors de l'ajout du pokemon",
		});
	}
};

exports.RecupCollection = (req, res) => {
	const pseudo = req.params.pseudo;

	const sql = `
	SELECT collectionutilisateur.*, pokedex.*
	FROM collectionutilisateur
	JOIN pokedex ON collectionutilisateur.idPokedex = pokedex.idPokedex
	JOIN utilisateur ON collectionutilisateur.IdUtilisateur = utilisateur.IdUtilisateur
	WHERE utilisateur.pseudo = ?
	
  `;

	connection.query(sql, [pseudo], (err, results) => {
		if (err) {
			console.error(
				"Erreur lors de la récupération de la collection de l'utilisateur :",
				err
			);
			return res.status(500).json({
				error:
					"Erreur lors de la récupération de la collection de l'utilisateur",
			});
		}

		if (results.length === 0) {
			return res
				.status(404)
				.json({ error: "Aucune collection d'utilisateur trouvée" });
		}

		res.status(200).json(results);
	});
};

// Modifie le surnom et/ou la date de capture d'une entrée — réservé à son propriétaire
// (vérifié via le cookie, pas via un champ du body).
exports.ModifierCollection = (req, res) => {
	const idUtilisateurCollect = req.params.idUtilisateurCollect;
	const userId = getUserIdFromToken(req);
	if (!userId) {
		return res.status(401).json({ error: "Non authentifié" });
	}

	const { surnom, dateAjout } = req.body;
	const sql = `UPDATE collectionutilisateur SET surnom = ?, dateAjout = ? WHERE idUtilisateurCollect = ? AND IdUtilisateur = ?`;

	connection.query(
		sql,
		[surnom || null, dateAjout || null, idUtilisateurCollect, userId],
		(error, result) => {
			if (error) {
				console.error("Erreur lors de la modification de la capture :", error);
				return res.status(500).json({ error: "Erreur lors de la modification" });
			}
			if (result.affectedRows === 0) {
				return res.status(403).json({ error: "Introuvable ou non autorisé" });
			}
			res.status(200).json({ message: "Capture modifiée" });
		}
	);
};

// Supprime une entrée de la collection — réservé à son propriétaire.
exports.SupprimerCollection = (req, res) => {
	const idUtilisateurCollect = req.params.idUtilisateurCollect;
	const userId = getUserIdFromToken(req);
	if (!userId) {
		return res.status(401).json({ error: "Non authentifié" });
	}

	const sql = `DELETE FROM collectionutilisateur WHERE idUtilisateurCollect = ? AND IdUtilisateur = ?`;

	connection.query(sql, [idUtilisateurCollect, userId], (error, result) => {
		if (error) {
			console.error("Erreur lors de la suppression de la capture :", error);
			return res.status(500).json({ error: "Erreur lors de la suppression" });
		}
		if (result.affectedRows === 0) {
			return res.status(403).json({ error: "Introuvable ou non autorisé" });
		}
		res.status(200).json({ message: "Capture supprimée" });
	});
};

// Fil des derniers shiny attrapés, tous utilisateurs confondus (widget "Derniers shiny" de l'accueil).
exports.RecentShinies = (req, res) => {
	const limit = Math.min(parseInt(req.query.limit, 10) || 12, 30);

	const sql = `
		SELECT collectionutilisateur.idUtilisateurCollect, collectionutilisateur.surnom,
			collectionutilisateur.dateAjout, pokedex.numeroDex, pokedex.nomPokemon, utilisateur.pseudo
		FROM collectionutilisateur
		JOIN pokedex ON collectionutilisateur.idPokedex = pokedex.idPokedex
		JOIN utilisateur ON collectionutilisateur.IdUtilisateur = utilisateur.IdUtilisateur
		WHERE collectionutilisateur.estShiny = 1 AND collectionutilisateur.dateAjout IS NOT NULL
		ORDER BY collectionutilisateur.dateAjout DESC
		LIMIT ?
	`;

	connection.query(sql, [limit], (err, results) => {
		if (err) {
			console.error("Erreur lors de la récupération des derniers shiny :", err);
			return res.status(500).json({
				error: "Erreur lors de la récupération des derniers shiny",
			});
		}
		res.status(200).json(results);
	});
};
