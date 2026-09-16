const connection = require("../../database/index");

exports.Like = async (req, res) => {
	console.log(req.body);
	const { pokemonId, userId } = req.body;

	// Vérifier si l'utilisateur a déjà liké ce Pokémon
	const sqlCheckLike = `SELECT * FROM favoris WHERE IdUtilisateur = ? AND idPokedex = ?`;
	connection.query(sqlCheckLike, [userId, pokemonId], (err, result) => {
		if (err) {
			console.error("Erreur lors de la vérification du like :", err);
			res.status(500).json({
				error: "Erreur lors de la vérification du like de l'utilisateur",
			});
		} else if (result.length > 0) {
			// Si l'entrée existe, supprimer le "like" (retirer le favori)
			const sqlRemoveLike = `DELETE FROM favoris WHERE IdUtilisateur = ? AND idPokedex = ?`;
			connection.query(sqlRemoveLike, [userId, pokemonId], (err, result) => {
				if (err) {
					console.error("Erreur lors du retrait du like :", err);
					res.status(500).json({
						error:
							"Une erreur s'est produite lors du retrait du like du Pokémon",
					});
				} else {
					res.status(200).json({
						message: "Like retiré avec succès",
					});
				}
			});
		} else {
			const sqlCountLikes = `SELECT COUNT(*) AS totalLikes FROM favoris WHERE IdUtilisateur = ?`;
			connection.query(sqlCountLikes, [userId], (err, countResult) => {
				if (err) {
					console.error("Erreur lors de la vérification des likes :", err);
					res.status(500).json({
						error: "Erreur lors de la vérification des likes de l'utilisateur",
					});
				} else {
					const totalLikes = countResult[0].totalLikes;

					if (totalLikes >= 12) {
						res
							.status(400)
							.json({ error: "Vous avez déjà atteint la limite de 12 likes" });
					} else {
						const sqlInsertLike = `INSERT INTO favoris (IdUtilisateur, idPokedex) VALUES (?, ?)`;
						connection.query(
							sqlInsertLike,
							[userId, pokemonId],
							(err, result) => {
								if (err) {
									console.error("Erreur lors de l'ajout aux favoris :", err);
									res.status(500).json({
										error: "Une erreur s'est produite lors du like du Pokémon",
									});
								} else {
									res.status(200).json({ message: "Like ajouté" });
								}
							}
						);
					}
				}
			});
		}
	});
};

exports.RecupLikeUser = (req, res) => {
	const userId = req.params.userId;
	const sql = `SELECT p.* FROM pokedex p
                 INNER JOIN favoris f ON p.idPokedex = f.idPokedex
                 WHERE f.IdUtilisateur = ?`;

	connection.query(sql, [userId], (err, result) => {
		if (err) {
			console.error("Erreur lors de la récupération des Pokémon likés :", err);
			res.status(500).json({
				error:
					"Une erreur s'est produite lors de la récupération des Pokémon likés",
			});
		} else {
			res.json(result);
		}
	});
};
