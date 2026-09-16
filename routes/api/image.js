const router = require("express").Router();
const imageController = require("../controllers/imageController");

// Route pour télécharger une seule image et l'enregistrer comme image de profil de l'utilisateur
router.post(
	"/image",
	(req, res, next) => {
		imageController.imageUpload.single("image")(req, res, (err) => {
			if (err) {
				return res.status(400).json({ error: err.message });
			}
			next();
		});
	},
	imageController.UploadImage
);

module.exports = router;
