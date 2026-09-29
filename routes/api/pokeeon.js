const router = require("express").Router();
const pokeeonController = require("../controllers/pokeeonController");

router.get("/", pokeeonController.ChargerPartie);
router.put("/", pokeeonController.EnregistrerPartie);
router.delete("/", pokeeonController.EffacerPartie);

module.exports = router;
