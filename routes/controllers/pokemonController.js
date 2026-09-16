const connection = require("../../database/index");
const cron = require("node-cron");

let randomPokemon = Math.floor(Math.random() * 1009) + 1;

// Exécute la mise à jour du Pokémon aléatoire toutes les 5 secondes
cron.schedule("0 0 * * *", () => {
	const newRandomPokemon = Math.floor(Math.random() * 1009) + 1;
	randomPokemon = newRandomPokemon;
});

exports.RecupPokemon = (req, res) => {
	const sql = "SELECT * FROM pokedex WHERE forme = ?";
	connection.query(sql, [0], (err, result) => {
		if (err) {
			console.error("Erreur lors de la récupération des Pokémon :", err);
			return res.status(500).json({ error: "Erreur lors de la récupération des Pokémon" });
		}
		res.send(JSON.stringify(result));
	});
};

exports.DetailPokemon = (req, res) => {
	const idPokedex = req.params.idPokedex;
	const sql = `SELECT * FROM pokedex WHERE idPokedex =  ?`;
	connection.query(sql, [idPokedex], (err, result) => {
		if (err) {
			console.error("Erreur lors de la récupération du Pokémon :", err);
			return res.status(500).json({ error: "Erreur lors de la récupération du Pokémon" });
		}
		res.send(JSON.stringify(result));
	});
};

exports.StatsPokemon = (req, res) => {
	const idPokedex = req.params.idPokedex;
	const sql = `SELECT * FROM stats WHERE idPokedex = ?`;
	connection.query(sql, [idPokedex], (err, result) => {
		if (err) {
			console.error("Erreur lors de la récupération des stats :", err);
			return res.status(500).json({ error: "Erreur lors de la récupération des stats" });
		}
		res.send(JSON.stringify(result));
	});
};

exports.FaiblessesPokemon = (req, res) => {
	const idPokedex = req.params.idPokedex;
	const sql = `SELECT * FROM faiblesse WHERE idPokedex = ?`;
	connection.query(sql, [idPokedex], (err, result) => {
		if (err) {
			console.error("Erreur lors de la récupération des faiblesses :", err);
			return res.status(500).json({ error: "Erreur lors de la récupération des faiblesses" });
		}
		res.send(JSON.stringify(result));
	});
};

exports.EvolutionPokemon = (req, res) => {
	const idPokedex = req.params.idPokedex;
	const sql = `SELECT p.nomPokemon, evolution.family, evolution.evolutionName
	FROM pokedex p
	INNER JOIN evolution ON p.nomPokemon = evolution.evolutionName
	WHERE  p.idPokedex = ?
	`;
	connection.query(sql, [idPokedex], (err, result) => {
		if (err) {
			console.error(
				"Erreur lors de la récupération des détails du Pokémon :",
				err
			);
			return res.status(500).json({
				error:
					"Une erreur s'est produite lors de la récupération des détails du Pokémon",
			});
		}
		const familys = result.map((row) => row.family);
		const sql_evol = `SELECT p.idPokedex, p.numeroDex, p.nomPokemon, evolution.family, evolution.evolutionNumber, evolution.evolutionCondition
			FROM pokedex p
			INNER JOIN evolution ON p.nomPokemon = evolution.evolutionName
			WHERE evolution.family IN (?)`;
		connection.query(sql_evol, [familys], (err, result) => {
			if (err) {
				console.error("Erreur lors de la récupération des évolutions :", err);
				return res.status(500).json({ error: "Erreur lors de la récupération des évolutions" });
			}
			res.send(JSON.stringify(result));
		});
	});
};

exports.PokemonJour = (req, res) => {
	const value = [randomPokemon, 0];
	const sql = `SELECT * FROM pokedex WHERE numeroDex= ? AND forme = ?`;
	connection.query(sql, value, (err, result) => {
		if (err) {
			console.error(
				"Erreur lors de la récupération du Pokémon aléatoire :",
				err
			);
			res.status(500).json({
				error:
					"Une erreur s'est produite lors de la récupération du Pokémon aléatoire",
			});
		} else {
			res.json(result[0]); // Utilisez res.json() pour renvoyer des données JSON
		}
	});
};

exports.PokemonNav = (req, res) => {
	const sql = "SELECT * FROM pokedex";
	connection.query(sql, (err, result) => {
		if (err) {
			console.error("Erreur lors de la récupération de la nav Pokémon :", err);
			return res.status(500).json({ error: "Erreur lors de la récupération de la nav Pokémon" });
		}
		res.send(JSON.stringify(result));
	});
};
