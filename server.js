const express = require("express")

const {v4:uuiv4} =require("uuid") 

const app = express()
app.set("view engine", "ejs")
app.use(express.static('public'))

const server = require("http").Server(app)
app.get("/", (req, res) => {
    res.redirect(`${uuiv4()}`)
})

app.get("/:home", (req, res) => {
    res.render("room")
})

server.listen(process.env.PORT || 3000)