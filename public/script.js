const videoGrid = document.getElementById("vid-holder")
const myVideo = document.createElement("video")
const socket = io("/");
myVideo.muted = true

let myVideoStream;

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then((stream) => {
    myVideoStream = stream
    addVideoStream(myVideo , stream)  
})

socket.emit("join-room", ROOM_ID)
socket.on("user-connected", () => {
    connectToNewUser()
}
)

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
}

function connectToNewUser() {
    console.log("new user connected")
}