const router = require("express").Router();

const apiAuth = require("./auth");
const apiCollection = require("./collection");
const apiConfirmationEmail = require("./confirmationmail");
const apiEchange = require("./echange");
const apiImage = require("./image");
const apiLike = require("./like");
const apiOublie = require("./oubliemdp");
const apiPokemon = require("./pokemon");
const apiShasse = require("./shasse");
const apiUsers = require("./users");

router.use("/auth", apiAuth);
router.use("/collection", apiCollection);
router.use("/confirmationEmail", apiConfirmationEmail);
router.use("/echange", apiEchange);
router.use("/image", apiImage);
router.use("/like", apiLike);
router.use("/oubliemdp", apiOublie);
router.use("/pokemon", apiPokemon);
router.use("/shasse", apiShasse);
router.use("/users", apiUsers);

router.get("/", (req, res) => {
	res.send(JSON.stringify("API WORKING"));
});

module.exports = router;
