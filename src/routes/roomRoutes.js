const express = require("express");
const { v4: uuidV4 } = require("uuid");

const router = express.Router();

router.get("/", (req, res) => {
  res.render("index");
});

router.get("/create", (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

router.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

module.exports = router;

