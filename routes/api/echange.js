const router = require("express").Router();
const echangeController = require("../controllers/echangeController");

router.get("/:pseudo", echangeController.GetEchanges);
router.post("/", echangeController.SetEchange);

module.exports = router;
