const router = require("express").Router();
const usersController = require("../controllers/usersController");

router.post("/", usersController.Inscription);

module.exports = router;
