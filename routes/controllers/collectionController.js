const connection = require("../../database/index");

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
		} = req.body;
		const sqlInsert =
			"INSERT INTO collectionutilisateur (idUtilisateurCollect, surnom, nombreDeRencontre, methode, IdUtilisateur, jeu, idPokedex) SELECT ?, ?, ?, ?, ?, ?, p.idPokedex FROM pokedex p WHERE p.nomPokemon = ?";

		connection.query(
			sqlInsert,
			[
				idUtilisateurCollect,
				surnom,
				nombre,
				methode,
				IdUtilisateur,
				jeu,
				nomPokemon,
			],
			(error, result) => {
				if (error) throw error;
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
