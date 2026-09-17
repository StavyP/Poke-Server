const router = require("express").Router();
const confirmationmailController = require("../controllers/confirmationmailController");

router.get("/", confirmationmailController.ValidationMail);

router.post("/resend", confirmationmailController.RenvoieMail);

module.exports = router;
