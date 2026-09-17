// Corrige les shasses déjà validées ("trouve") avant que ValiderCapture ne fasse aussi
// l'insertion dans collectionutilisateur (bug corrigé le 2026-09-17) : pour chaque shasse
// trouvée sans capture correspondante dans la collection (même utilisateur + même espèce +
// shiny), on l'ajoute rétroactivement.
// Usage : node scripts/backfillMissingShinyFromShasses.js
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mysql = require("mysql");

const conn = mysql.createConnection({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
});

const query = (sql, params) =>
	new Promise((resolve, reject) => {
		conn.query(sql, params, (err, results) => (err ? reject(err) : resolve(results)));
	});

async function main() {
	const trouveShasses = await query(`SELECT * FROM shasse WHERE statut = 'trouve'`);
	console.log(`${trouveShasses.length} shasse(s) marquée(s) "trouve".`);

	let inserted = 0;
	for (const s of trouveShasses) {
		const existing = await query(
			`SELECT idUtilisateurCollect FROM collectionutilisateur WHERE IdUtilisateur = ? AND idPokedex = ? AND estShiny = 1`,
			[s.IdUtilisateur, s.idPokedex]
		);
		if (existing.length > 0) continue;

		await query(
			`INSERT INTO collectionutilisateur (nombreDeRencontre, methode, IdUtilisateur, jeu, idPokedex, estShiny, dateAjout)
			 VALUES (?, ?, ?, ?, ?, 1, COALESCE(?, CURRENT_TIMESTAMP))`,
			[s.rencontres, s.methode, s.IdUtilisateur, s.jeu, s.idPokedex, s.dateCapture]
		);
		inserted++;
		console.log(`Ajouté à la collection : shasse #${s.idShasse} (idPokedex ${s.idPokedex}, utilisateur ${s.IdUtilisateur})`);
	}

	console.log(`${inserted} capture(s) rattrapée(s).`);
	conn.end();
}

main().catch((err) => {
	console.error(err);
	conn.end();
	process.exit(1);
});
