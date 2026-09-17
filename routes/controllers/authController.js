const jsonwebtoken = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const connection = require("../../database/index");
const { key, keyPub } = require("../../keys");

// En prod, le front (IONOS) et le back (Render) sont sur des domaines différents :
// le cookie doit être SameSite=None + Secure pour survivre au cross-site, sinon le
// navigateur le rejette silencieusement et personne ne reste connecté.
const isProduction = process.env.NODE_ENV === "production";
const cookieOptions = {
	httpOnly: true,
	secure: isProduction,
	sameSite: isProduction ? "none" : "lax",
};

exports.Connection = async (req, res) => {
	const pseudo = req.body.pseudo;
	const password = req.body.password;
	const sqlVerify = `SELECT * FROM utilisateur WHERE pseudo = ?`;
	connection.query(sqlVerify, [pseudo], (err, result) => {
		try {
			if (result.length > 0) {
				const user = result[0];
				const userId = user.IdUtilisateur;

				// Confirmation d'email désactivée temporairement (l'envoi via Gmail depuis
				// Render ne fonctionne pas) — à réactiver une fois un vrai service d'email en place.

				// Bcrypt vas crypté le mdp que l'utilisateur entre dans la partie front, pour le comparé à celui en base de données et créer le token si la comparaison est bonne
				if (bcrypt.compareSync(password, user.motDePasse)) {
					const token = jsonwebtoken.sign({}, key, {
						subject: userId.toString(),
						expiresIn: 3600 * 24 * 30 * 6,
						algorithm: "RS256",
					});
					res.cookie("token", token, cookieOptions); // on définie un nom au cookie et on lui associe le token précédemment créer
					res.send(user); // on renvoie les données de l'utilisateur connecté dans le front
				} else {
					res
						.status(400)
						.send(JSON.stringify("Pseudo et/ou mot de passe incorrect"));
				}
			} else {
				res
					.status(400)
					.send(JSON.stringify("Pseudo et/ou mot de passe incorrect"));
			}
		} catch (error) {
			console.log(error);
			res
				.status(400)
				.send(JSON.stringify("Pseudo et/ou mot de passe incorrect"));
		}
	});
};

exports.Current = async (req, res) => {
	const { token } = req.cookies;
	if (token) {
		try {
			const decodedToken = jsonwebtoken.verify(token, keyPub, {
				algorithms: "RS256",
			});
			const sqlVerify = `SELECT IdUtilisateur, pseudo, privilege, email, imageProfil, email_confirmed FROM utilisateur WHERE IdUtilisateur= ? `;
			connection.query(sqlVerify, [decodedToken.sub], (err, result) => {
				const currentUser = result[0];
				if (currentUser) {
					return res.send(currentUser);
				} else {
					res.send(JSON.stringify(null));
				}
			});
		} catch (error) {
			res.send(JSON.stringify(null));
		}
	} else {
		res.send(JSON.stringify(null));
	}
};

exports.clearCookie = (req, res) => {
	res.clearCookie("token", cookieOptions);
	res.end();
};
