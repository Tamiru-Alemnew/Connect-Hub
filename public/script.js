const videoGrid = document.getElementById("vid-holder")
const myVideo = document.createElement("video")
myVideo.muted = true

let myVideoStream;

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then((stream) => {
    myVideoStream = stream
    addVideoStream(myVideo , stream)  
})

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
}