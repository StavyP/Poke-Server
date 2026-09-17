// Complète idGeneration/legendaire sur les espèces déjà importées (colonnes ajoutées après
// coup, migration 004) — UPDATE ciblé par numeroDex, ne touche à rien d'autre.
// Usage : node scripts/backfillGenerationLegendaire.js
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mysql = require("mysql");
const util = require("util");

const API = "https://pokeapi.co/api/v2";

async function fetchJson(url) {
	for (let attempt = 0; attempt < 4; attempt++) {
		try {
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
			return await res.json();
		} catch (error) {
			if (attempt === 3) throw error;
			await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
		}
	}
}

async function mapLimit(items, limit, fn) {
	const results = new Array(items.length);
	let cursor = 0;
	async function worker() {
		while (cursor < items.length) {
			const index = cursor++;
			results[index] = await fn(items[index], index);
		}
	}
	await Promise.all(Array.from({ length: limit }, worker));
	return results;
}

async function main() {
	const conn = mysql.createConnection({
		host: process.env.DB_HOST,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
	});
	const query = util.promisify(conn.query).bind(conn);
	await new Promise((resolve, reject) =>
		conn.connect((err) => (err ? reject(err) : resolve()))
	);

	const rows = await query("SELECT idPokedex, numeroDex FROM pokedex WHERE forme = 0");
	console.log(`Backfill génération/légendaire pour ${rows.length} espèces...`);

	let done = 0;
	let errors = 0;
	await mapLimit(rows, 8, async (row) => {
		try {
			const species = await fetchJson(`${API}/pokemon-species/${row.numeroDex}`);
			const generationId = Number(species.generation.url.match(/\/(\d+)\//)[1]);
			const legendaire = species.is_legendary || species.is_mythical ? 1 : 0;
			await query(
				"UPDATE pokedex SET idGeneration = ?, legendaire = ? WHERE idPokedex = ?",
				[generationId, legendaire, row.idPokedex]
			);
			done++;
			if (done % 100 === 0) console.log(`  ${done}/${rows.length}`);
		} catch (error) {
			errors++;
			console.error(`Erreur sur numeroDex #${row.numeroDex} :`, error.message);
		}
	});

	console.log(`Terminé : ${done}/${rows.length} mises à jour (${errors} erreurs).`);
	conn.end();
}

main().catch((error) => {
	console.error("Échec du backfill :", error);
	process.exit(1);
});
