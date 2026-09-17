const router = require("express").Router();
const collectionController = require("../controllers/collectionController");

// Route pour créer une collection d'utilisateur
router.post("/collectionutilisateur", collectionController.AjoutCollection);

router.get(
	"/getCollectionUtilisateur/:pseudo",
	collectionController.RecupCollection
);

router.get("/recentShinies", collectionController.RecentShinies);

router.put(
	"/collectionutilisateur/:idUtilisateurCollect",
	collectionController.ModifierCollection
);

router.delete(
	"/collectionutilisateur/:idUtilisateurCollect",
	collectionController.SupprimerCollection
);

module.exports = router;
