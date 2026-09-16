// Importe le pokédex national (espèces de base, formes régionales/méga exclues pour l'instant)
// depuis PokeAPI vers les tables pokedex / stats / faiblesse / evolution.
// Usage : node scripts/importPokedex.js
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

// matrix[typeAnglaisAttaquant][typeAnglaisDefenseur] = multiplicateur
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

function evolutionConditionText(detail) {
	if (!detail) return null;
	if (detail.min_level) return `Niveau ${detail.min_level}`;
	if (detail.item) return `Objet : ${detail.item.name}`;
	if (detail.trigger && detail.trigger.name === "trade") return "Échange";
	if (detail.min_happiness) return "Bonheur élevé";
	if (detail.known_move) return `Connaît ${detail.known_move.name}`;
	if (detail.time_of_day === "day") return "Le jour";
	if (detail.time_of_day === "night") return "La nuit";
	if (detail.trigger) return detail.trigger.name;
	return null;
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

	console.log("Construction de la matrice des types...");
	const matrix = await buildTypeMatrix();

	const speciesCountRes = await fetchJson(`${API}/pokemon-species?limit=1`);
	const total = Number(process.argv[2]) || speciesCountRes.count;
	const ids = Array.from({ length: total }, (_, i) => i + 1);

	const frenchNameCache = new Map(); // id espèce -> nom FR
	const evolutionChainUrls = new Map(); // id espèce -> url de la chaîne

	console.log(`Import de ${total} espèces (formes de base uniquement)...`);
	let done = 0;
	await mapLimit(ids, 8, async (id) => {
		try {
			const [poke, species] = await Promise.all([
				fetchJson(`${API}/pokemon/${id}`),
				fetchJson(`${API}/pokemon-species/${id}`),
			]);
			const frName =
				species.names.find((n) => n.language.name === "fr")?.name || poke.name;
			frenchNameCache.set(id, frName);
			if (species.evolution_chain) {
				evolutionChainUrls.set(id, species.evolution_chain.url);
			}

			const types = poke.types
				.sort((a, b) => a.slot - b.slot)
				.map((t) => t.type.name);
			const type1 = TYPE_FR[types[0]];
			const type2 = types[1] ? TYPE_FR[types[1]] : null;

			const statMap = {};
			for (const s of poke.stats) statMap[s.stat.name] = s.base_stat;

			const insertPokedex = await query(
				"INSERT INTO pokedex (numeroDex, nomPokemon, type1, type2, forme) VALUES (?, ?, ?, ?, 0)",
				[id, frName, type1, type2]
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

			done++;
			if (done % 100 === 0) console.log(`  ${done}/${total} espèces importées`);
		} catch (error) {
			console.error(`Erreur sur l'espèce #${id} :`, error.message);
		}
	});
	console.log(`Espèces importées : ${done}/${total}`);

	console.log("Import des chaînes d'évolution...");
	const uniqueChainUrls = [...new Set(evolutionChainUrls.values())];
	let evolutionRows = 0;
	await mapLimit(uniqueChainUrls, 6, async (chainUrl) => {
		try {
			const chainId = Number(chainUrl.match(/\/(\d+)\//)[1]);
			const data = await fetchJson(chainUrl);

			async function walk(node, depth, incomingDetail) {
				const speciesId = Number(node.species.url.match(/\/(\d+)\/?$/)[1]);
				let frName = frenchNameCache.get(speciesId);
				if (!frName) {
					// espèce hors des 1..total de base (forme spéciale) : on la nomme quand même
					const species = await fetchJson(node.species.url).catch(() => null);
					frName = species?.names.find((n) => n.language.name === "fr")?.name || node.species.name;
				}
				const condition = evolutionConditionText(incomingDetail);
				await query(
					"INSERT INTO evolution (family, evolutionName, evolutionNumber, evolutionCondition) VALUES (?, ?, ?, ?)",
					[chainId, frName, depth, condition]
				);
				evolutionRows++;
				for (const child of node.evolves_to) {
					await walk(child, depth + 1, child.evolution_details[0] || null);
				}
			}
			await walk(data.chain, 1, null);
		} catch (error) {
			console.error(`Erreur sur la chaîne ${chainUrl} :`, error.message);
		}
	});
	console.log(`Lignes d'évolution insérées : ${evolutionRows}`);

	conn.end();
	console.log("Import terminé.");
}

main().catch((error) => {
	console.error("Échec de l'import :", error);
	process.exit(1);
});
