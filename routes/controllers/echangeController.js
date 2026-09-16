const connection = require("../../database/index");

exports.GetEchanges = (req, res) => {
	const pseudo = req.params.pseudo;
	const sql = `
		SELECT echange_utilisateur.tradeId, echange_utilisateur.coche
		FROM echange_utilisateur
		JOIN utilisateur ON echange_utilisateur.IdUtilisateur = utilisateur.IdUtilisateur
		WHERE utilisateur.pseudo = ?
	`;
	connection.query(sql, [pseudo], (err, results) => {
		if (err) {
			console.error("Erreur lors de la récupération des échanges :", err);
			return res.status(500).json({ error: "Erreur lors de la récupération des échanges" });
		}
		res.status(200).json(results);
	});
};

exports.SetEchange = (req, res) => {
	const { IdUtilisateur, tradeId, coche } = req.body;
	const sql = `
		INSERT INTO echange_utilisateur (IdUtilisateur, tradeId, coche)
		VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE coche = VALUES(coche)
	`;
	connection.query(sql, [IdUtilisateur, tradeId, coche ? 1 : 0], (err) => {
		if (err) {
			console.error("Erreur lors de la mise à jour de l'échange :", err);
			return res.status(500).json({ error: "Erreur lors de la mise à jour de l'échange" });
		}
		res.status(200).json({ message: "Échange mis à jour" });
	});
};
