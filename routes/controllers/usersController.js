const bcrypt = require("bcrypt");
const connection = require("../../database/index");

const currentDate = new Date();
const futureDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
const formattedDate = futureDate.toISOString().slice(0, 19).replace("T", " ");

exports.Inscription = async (req, res) => {
	const pseudo = req.body.pseudo;
	const email = req.body.email;
	const password = req.body.password;
	const passwordCrypt = await bcrypt.hash(password, 8);
	const values = [pseudo, email, passwordCrypt, formattedDate];

	const sql_verif = `SELECT * FROM utilisateur WHERE email = ?`;
	connection.query(sql_verif, [email], (err, result) => {
		if (err) {
			console.error("Erreur lors de la vérification de l'email :", err);
			return res.status(500).json({ error: "Erreur lors de l'inscription" });
		}

		if (result.length > 0) {
			res
				.status(400)
				.send(JSON.stringify("Le mail est déjà en base de données"));
		} else {
			const sql_verifPseudo = `SELECT * FROM utilisateur WHERE pseudo = ?`;
			connection.query(sql_verifPseudo, [pseudo], (err, result) => {
				if (err) {
					console.error("Erreur lors de la vérification du pseudo :", err);
					return res.status(500).json({ error: "Erreur lors de l'inscription" });
				}

				if (result.length > 0) {
					res
						.status(400)
						.send(JSON.stringify("Le pseudo est déjà en base de données"));
				} else {
					// Confirmation d'email désactivée temporairement (l'envoi via Gmail depuis
					// Render ne fonctionne pas) — le compte est directement actif.
					const sql_insertUser = `INSERT INTO utilisateur (pseudo, email, motDePasse, privilege, date, email_confirmed) VALUES (?, ?, ?, 1, ?, 1)`;
					connection.query(sql_insertUser, values, (err, userResult) => {
						if (err) {
							console.error("Erreur lors de la création de l'utilisateur :", err);
							return res.status(500).json({ error: "Erreur lors de l'inscription" });
						}
						res.send(JSON.stringify(userResult));
					});
				}
			});
		}
	});
};
