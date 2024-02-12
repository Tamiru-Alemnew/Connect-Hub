const express = require("express")


const {v4:uuiv4} =require("uuid") 

const app = express()
app.set("view engine", "ejs")
app.use(express.static('public'))

const server = require("http").Server(app)
const io = require("socket.io")(server)

app.get("/", (req, res) => {
    res.redirect(`${uuiv4()}`)
})

app.get("/:home", (req, res) => {
    res.render("room",{roomID: req.params.home})
})

io.on("connection", socket => {
    socket.on("join-room", (roomId) => {
        socket.join(roomId)
        socket.to(roomId).broadcast.emit("user-connected")
    })
}
)

server.listen(process.env.PORT || 3000)