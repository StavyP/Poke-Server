const router = require("express").Router();
const collectionController = require("../controllers/collectionController");

// Route pour créer une collection d'utilisateur
router.post("/collectionutilisateur", collectionController.AjoutCollection);

router.get(
	"/getCollectionUtilisateur/:pseudo",
	collectionController.RecupCollection
);

module.exports = router;
