// Importe les formes régionales (Alola/Galar/Hisui/Paldea) exclues du premier import
// (scripts/importPokedex.js) — même numeroDex que l'espèce de base, forme != 0, idForme =
// nom de la région. Usage : node scripts/importRegionalForms.js
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mysql = require("mysql");
const util = require("util");

const API = "https://pokeapi.co/api/v2";

const TYPE_FR = {
	normal: "Normal",
	fire: "Feu",
	water: "Eau",
	grass: "Plante",
	electric: "Electrik",
	ice: "Glace",
	fighting: "Combat",
	poison: "Poison",
	ground: "Sol",
	flying: "Vol",
	psychic: "Psy",
	bug: "Insecte",
	rock: "Roche",
	ghost: "Spectre",
	dark: "Tenebre",
	steel: "Acier",
	dragon: "Dragon",
	fairy: "Fee",
};
const ALL_TYPES = Object.keys(TYPE_FR);

const REGIONS = ["alola", "galar", "hisui", "paldea"];
const REGION_GENERATION = { alola: 7, galar: 8, hisui: 8, paldea: 9 };
const REGION_FORME = { alola: 1, galar: 2, hisui: 3, paldea: 4 };
const REGION_LABEL_FR = { alola: "d'Alola", galar: "de Galar", hisui: "de Hisui", paldea: "de Paldea" };
// Certaines formes n'ont pas de variante "-region" exacte (ex: darmanitan-galar-standard,
// tauros-paldea-combat-breed) — suffixe préféré parmi les variantes "-region-*" disponibles.
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

async function buildTypeMatrix() {
	const matrix = {};
	await mapLimit(ALL_TYPES, 6, async (t) => {
		const data = await fetchJson(`${API}/type/${t}`);
		matrix[t] = {};
		for (const dt of ALL_TYPES) matrix[t][dt] = 1;
		for (const e of data.damage_relations.double_damage_to) {
			if (matrix[t][e.name] !== undefined) matrix[t][e.name] = 2;
		}
		for (const e of data.damage_relations.half_damage_to) {
			if (matrix[t][e.name] !== undefined) matrix[t][e.name] = 0.5;
		}
		for (const e of data.damage_relations.no_damage_to) {
			if (matrix[t][e.name] !== undefined) matrix[t][e.name] = 0;
		}
	});
	return matrix;
}

function computeWeaknesses(matrix, defendTypes) {
	const result = {};
	for (const atk of ALL_TYPES) {
		let mult = 1;
		for (const def of defendTypes) mult *= matrix[atk][def];
		result[atk] = `x${mult}`;
	}
	return result;
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

	console.log("Construction de la matrice des types...");
	const matrix = await buildTypeMatrix();

	const baseRows = await query("SELECT idPokedex, numeroDex, nomPokemon FROM pokedex WHERE forme = 0");
	console.log(`Recherche des formes régionales sur ${baseRows.length} espèces...`);

	const regionCounts = { alola: 0, galar: 0, hisui: 0, paldea: 0 };
	let inserted = 0;
	let errors = 0;
	let done = 0;

	await mapLimit(baseRows, 8, async (row) => {
		try {
			const species = await fetchJson(`${API}/pokemon-species/${row.numeroDex}`);
			const varieties = species.varieties.filter((v) => !v.is_default);
			if (varieties.length === 0) return;

			// slug de base = nom de la variété par défaut (pas forcément == numeroDex pour les
			// espèces à variétés multiples, mais suffit pour matcher les préfixes "-region").
			const baseSlug = species.varieties.find((v) => v.is_default)?.pokemon.name;
			if (!baseSlug) return;

			const picks = pickRegionalVarieties(varieties, baseSlug);
			const legendaire = species.is_legendary || species.is_mythical ? 1 : 0;

			for (const region of Object.keys(picks)) {
				const pokemonName = picks[region];
				const poke = await fetchJson(`${API}/pokemon/${pokemonName}`);
				const types = poke.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name);
				const type1 = TYPE_FR[types[0]];
				const type2 = types[1] ? TYPE_FR[types[1]] : null;

				const statMap = {};
				for (const s of poke.stats) statMap[s.stat.name] = s.base_stat;

				const nomPokemon = `${row.nomPokemon} ${REGION_LABEL_FR[region]}`;

				const insertPokedex = await query(
					"INSERT INTO pokedex (numeroDex, nomPokemon, type1, type2, forme, idForme, idGeneration, legendaire) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
					[row.numeroDex, nomPokemon, type1, type2, REGION_FORME[region], region, REGION_GENERATION[region], legendaire]
				);
				const idPokedex = insertPokedex.insertId;

				await query(
					"INSERT INTO stats (idPokedex, pv, att, def, attSpe, defSpe, vit) VALUES (?, ?, ?, ?, ?, ?, ?)",
					[
						idPokedex,
						statMap.hp,
						statMap.attack,
						statMap.defense,
						statMap["special-attack"],
						statMap["special-defense"],
						statMap.speed,
					]
				);

				const weaknesses = computeWeaknesses(matrix, types);
				const faiblesseColumns = ALL_TYPES.map((t) => `faiblesse${TYPE_FR[t]}`);
				const faiblesseValues = ALL_TYPES.map((t) => weaknesses[t]);
				await query(
					`INSERT INTO faiblesse (idPokedex, ${faiblesseColumns.join(", ")}) VALUES (?, ${faiblesseColumns
						.map(() => "?")
						.join(", ")})`,
					[idPokedex, ...faiblesseValues]
				);

				regionCounts[region]++;
				inserted++;
			}
			done++;
			if (done % 200 === 0) console.log(`  ${done}/${baseRows.length} espèces analysées`);
		} catch (error) {
			errors++;
			console.error(`Erreur sur numeroDex #${row.numeroDex} :`, error.message);
		}
	});

	console.log(`Terminé : ${inserted} formes régionales importées (${errors} erreurs).`);
	console.log(regionCounts);
	conn.end();
}

main().catch((error) => {
	console.error("Échec de l'import :", error);
	process.exit(1);
});
