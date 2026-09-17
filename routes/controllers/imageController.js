const connection = require("../../database/index");
const multer = require("multer");
const path = require("path");

// Configuration du stockage des images avec Multer
const imageStorage = multer.diskStorage({
	destination: "uploads/images/",
	filename: (req, file, cb) => {
		cb(
			null,
			file.fieldname + "_" + Date.now() + path.extname(file.originalname)
		);
	},
});

const imageUpload = multer({
	storage: imageStorage,
	limits: {
		fileSize: 1000000, // 1000000 Bytes = 1 MB
	},
	fileFilter(req, file, cb) {
		if (!file.originalname.match(/\.(png|jpg|webp|svg|jpeg|avif)$/)) {
			return cb(
				new Error("please upload an image (png|jpg|webp|svg|jpeg|avif)")
			);
		}
		cb(undefined, true);
	},
});

// Middleware Multer à monter sur la route avant ce handler
exports.imageUpload = imageUpload;

// Route pour télécharger une seule image et l'enregistrer comme image de profil de l'utilisateur
exports.UploadImage = (req, res) => {
	// Récupérez le nom du fichier téléchargé
	const imageName = req.file.filename;

	// Insérez le nom de l'image dans la colonne "imageProfil" de la table utilisateur
	const userId = req.body.userId; // Assurez-vous de disposer de l'ID de l'utilisateur connecté
	const updateQuery =
		"UPDATE utilisateur SET imageProfil = ? WHERE IdUtilisateur = ?";
	connection.query(
		updateQuery,
		[imageName, userId],
		(updateErr, updateResults) => {
			if (updateErr) {
				console.error(
					"Erreur lors de la mise à jour de l'image de profil : ",
					updateErr
				);
				return res
					.status(500)
					.send("Erreur lors de la mise à jour de l'image de profil");
			}

			res.json({
				message: "Image de profil mise à jour avec succès",
			});
		}
	);
};
