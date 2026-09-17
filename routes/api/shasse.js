const router = require("express").Router();
const shasseController = require("../controllers/shasseController");

router.post("/", shasseController.CreerShasse);
router.get("/utilisateur/:pseudo", shasseController.ListerShasses);
router.get("/:idShasse", shasseController.RecupererShasse);
router.put("/:idShasse", shasseController.ModifierShasse);
router.patch("/:idShasse/compteur", shasseController.AjusterCompteur);
router.patch("/:idShasse/phase", shasseController.NouvellePhase);
router.patch("/:idShasse/toggle-actif", shasseController.ToggleActif);
router.post("/:idShasse/capture", shasseController.ValiderCapture);
router.delete("/:idShasse", shasseController.SupprimerShasse);

module.exports = router;
