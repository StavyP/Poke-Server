const router = require("express").Router();
const authController = require("../controllers/authController");

const rateLimit = require("express-rate-limit");
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 5,
	message: "Trop de tentatives de connexion, réessayez plus tard.",
});

router.post("/", apiLimiter, authController.Connection);

router.get("/current", authController.Current);

router.delete("/", authController.clearCookie);

module.exports = router;
