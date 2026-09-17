const router = require("express").Router();
const pokemonController = require("../controllers/pokemonController");

router.get("/getPokemon", pokemonController.RecupPokemon);

router.get("/getPokemonDetails/:idPokedex", pokemonController.DetailPokemon);

router.get("/getPokemonStats/:idPokedex", pokemonController.StatsPokemon);

router.get(
	"/getPokemonWeaknesses/:idPokedex",
	pokemonController.FaiblessesPokemon
);

router.get(
	"/getPokemonEvolutions/:idPokedex",
	pokemonController.EvolutionPokemon
);

router.get("/getPokemonNav", pokemonController.PokemonNav);

module.exports = router;
