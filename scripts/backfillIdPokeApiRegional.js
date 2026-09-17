// Complète idPokeApi pour les formes régionales déjà importées (scripts/importRegionalForms.js) —
// ré-interroge pokemon-species pour retrouver le nom de variété exact, puis pokemon/{nom} pour
// son id PokeAPI (différent du numeroDex partagé avec l'espèce de base).
// Usage : node scripts/backfillIdPokeApiRegional.js
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mysql = require("mysql");
const util = require("util");

const API = "https://pokeapi.co/api/v2";
const REGIONS = ["alola", "galar", "hisui", "paldea"];
const PREFERRED_SUFFIX = { galar: ["standard"], paldea: ["combat-breed"] };

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

function pickRegionalVarieties(varieties, baseSlug) {
	const picks = {};
	for (const region of REGIONS) {
		const exact = varieties.find((v) => v.pokemon.name === `${baseSlug}-${region}`);
		if (exact) {
			picks[region] = exact.pokemon.name;
			continue;
		}
		const prefixed = varieties
			.filter((v) => v.pokemon.name.startsWith(`${baseSlug}-${region}-`))
			.map((v) => v.pokemon.name);
		if (prefixed.length === 0) continue;
		const preferred = PREFERRED_SUFFIX[region];
		picks[region] = preferred
			? prefixed.find((name) => preferred.some((suf) => name.endsWith(suf))) || prefixed[0]
			: prefixed[0];
	}
	return picks;
}

async function main() {
	const conn = mysql.createConnection({
		host: process.env.DB_HOST,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
	});
	const query = util.promisify(conn.query).bind(conn);
	await new Promise((resolve, reject) => conn.connect((err) => (err ? reject(err) : resolve())));

	const rows = await query(
		"SELECT idPokedex, numeroDex, idForme FROM pokedex WHERE forme != 0 AND idPokeApi IS NULL"
	);
	console.log(`Backfill idPokeApi pour ${rows.length} formes régionales...`);

	// Groupe par numeroDex pour ne réinterroger pokemon-species qu'une fois par espèce, même si
	// elle a plusieurs formes régionales.
	const byNumeroDex = new Map();
	for (const row of rows) {
		if (!byNumeroDex.has(row.numeroDex)) byNumeroDex.set(row.numeroDex, []);
		byNumeroDex.get(row.numeroDex).push(row);
	}

	let done = 0;
	let errors = 0;
	await mapLimit([...byNumeroDex.entries()], 8, async ([numeroDex, rowsForSpecies]) => {
		try {
			const species = await fetchJson(`${API}/pokemon-species/${numeroDex}`);
			const varieties = species.varieties.filter((v) => !v.is_default);
			const baseSlug = species.varieties.find((v) => v.is_default)?.pokemon.name;
			if (!baseSlug) return;
			const picks = pickRegionalVarieties(varieties, baseSlug);

			for (const row of rowsForSpecies) {
				const pokemonName = picks[row.idForme];
				if (!pokemonName) {
					console.error(`Pas de variété trouvée pour numeroDex ${numeroDex} / ${row.idForme}`);
					errors++;
					continue;
				}
				const poke = await fetchJson(`${API}/pokemon/${pokemonName}`);
				await query("UPDATE pokedex SET idPokeApi = ? WHERE idPokedex = ?", [poke.id, row.idPokedex]);
				done++;
			}
		} catch (error) {
			errors += rowsForSpecies.length;
			console.error(`Erreur sur numeroDex #${numeroDex} :`, error.message);
		}
	});

	console.log(`Terminé : ${done}/${rows.length} mises à jour (${errors} erreurs).`);
	conn.end();
}

main().catch((error) => {
	console.error("Échec du backfill :", error);
	process.exit(1);
});
