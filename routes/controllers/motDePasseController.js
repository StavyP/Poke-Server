const jsonwebtoken = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const transporter = require("../../utils/mailer");
const { key, keyPub } = require("../../keys");
const connection = require("../../database");

// Fonction utilitaire pour envoyer un email
function sendEmail(email, link, callback) {
	const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: "Mot de passe oublié",
		text: `Veuillez cliquer sur le lien pour réinitialiser votre mot de passe : ${link}`,
	};

	transporter.sendMail(mailOptions, callback);
}

// Fonction utilitaire pour vérifier le token JWT
function verifyToken(token) {
	try {
		return jsonwebtoken.verify(token, keyPub);
	} catch (error) {
		return null; // En cas d'erreur de vérification, retourne null
	}
}

exports.envoieMail = (req, res) => {
	try {
		const email = req.body.email;
		const sql = `SELECT * FROM utilisateur WHERE email = ?`;
		connection.query(sql, [email], (err, result) => {
			if (err) {
				console.error("Erreur lors de la recherche de l'utilisateur :", err);
				return res.status(500).json({ error: "Erreur lors de la réinitialisation du mot de passe" });
			}

			if (result[0]) {
				const token = jsonwebtoken.sign(
					{ email: result[0].email, id: result[0].IdUtilisateur },
					key,
					{
						expiresIn: "5m",
						algorithm: "RS256",
					}
				);

				const link = `${process.env.BACKEND_URL}/api/oubliemdp/${result[0].IdUtilisateur}/${token}`;

				sendEmail(email, link, (error, info) => {
					if (error) {
						res
							.status(500)
							.send(JSON.stringify("Erreur lors de l'envoi de l'e-mail."));
					} else {
						res.status(200).send({ message: "Email envoyé avec succès." });
					}
				});
			} else {
				res.status(400).send(JSON.stringify("Utilisateur inconnu"));
			}
		});
	} catch (error) {
		console.error(error);
	}
};

exports.test = (req, res) => {
	try {
		const { id, token } = req.params;
		const verify = verifyToken(token);

		if (verify) {
			res.render("index", { email: verify.email, status: false, same: false });
		} else {
			res.send("Vérification invalide");
		}
	} catch (error) {
		console.error("Une erreur est survenue :", error);
		res
			.status(500)
			.send("Une erreur est survenue lors du traitement de la requête.");
	}
};

exports.test2 = async (req, res) => {
	try {
		const { id, token } = req.params;
		const { password } = req.body;

		const sql = `SELECT * FROM utilisateur WHERE IdUtilisateur = ?`;
		connection.query(sql, [id], async (err, result) => {
			if (err) {
				console.error("Erreur lors de la recherche de l'utilisateur :", err);
				return res.status(500).json({ error: "Erreur lors de la réinitialisation du mot de passe" });
			}

			if (result[0]) {
				const passwordCrypt = await bcrypt.hash(password, 8);
				const verify = verifyToken(token);

				if (verify) {
					const same = bcrypt.compareSync(password, result[0].motDePasse);
					if (same) {
						res.render("index", {
							email: verify.email,
							status: false,
							same: true,
						});
					} else {
						const updateSql = `UPDATE utilisateur SET motDePasse = ? WHERE IdUtilisateur = ?`;
						connection.query(updateSql, [passwordCrypt, id], (err, result) => {
							if (err) {
								console.error("Erreur lors de la mise à jour du mot de passe :", err);
								return res.status(500).json({ error: "Erreur lors de la réinitialisation du mot de passe" });
							}
							res.render("index", {
								email: verify.email,
								status: true,
								same: false,
							});
						});
					}
				} else {
					res.send(JSON.stringify(false));
				}
			} else {
				res.send(JSON.stringify(false));
			}
		});
	} catch (error) {
		console.error("Une erreur est survenue :", error);
		res
			.status(500)
			.send("Une erreur est survenue lors du traitement de la requête.");
	}
};

