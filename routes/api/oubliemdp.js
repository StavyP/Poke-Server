const router = require("express").Router();
const motDePasseController = require("../controllers/motDePasseController");

router.post("/resetpassword", motDePasseController.envoieMail);

router.get("/:id/:token", motDePasseController.test);

router.post("/:id/:token", motDePasseController.test2);

module.exports = router;
