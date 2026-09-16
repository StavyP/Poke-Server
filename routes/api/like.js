const router = require("express").Router();
const likeController = require("../controllers/likeController");

router.post("/likePokemon", likeController.Like);

router.get("/getLikedPokemons/:userId", likeController.RecupLikeUser);


module.exports = router;
