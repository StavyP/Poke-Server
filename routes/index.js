const router = require("express").Router();
const apiRouter = require("./api");

router.use("/api", apiRouter); // permet de rediriger les routes comprennant /api, dans le dossier "api" du back

module.exports = router;
