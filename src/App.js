import { io, Socket } from "socket.io-client";
import { Device } from "mediasoup-client";
import "./App.css";

const urlArgs = new URLSearchParams(window.location.search);
const roomId = urlArgs.get("room");

let myCamera;
let sendTransport;
let recvTransport;

const device = new Device();
const videoConsumers = new Array();
const audioConsumers = new Array();
const socket = io("https://10.10.10.12:5000", {
    secure: true,
});

socket.on("connect", () => {
    console.log("Connected");

    /**
     * ------------------------------------------------
     * AUTOMATICALLY CREATE ROOM ONLY FOR DEVELOPMENT
     * Should be manual on production
     * ------------------------------------------------
     */
    socket.emit("createMeet", roomId);

    /**
     * ------------------------------------------------
     * GET RTP CAPABILITIES
     * ------------------------------------------------
     */
    socket.on("rtp-capabilities", async (rtpCapabilities) => {
        // FIX: rtpCapabilities from router
        console.log("Syncing with server");
        await device.load({
            routerRtpCapabilities: rtpCapabilities,
        });

        socket.emit("synced", roomId);
    });

    /**
     * ------------------------------------------------
     * TRANSPORT OPTION
     * Creating transport for sending and receiving
     * ------------------------------------------------
     */
    socket.on("transport-options", async (options, recvOptions) => {
        try {
            // Getting user's devices
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            const videoTrack = stream.getVideoTracks()[0];
            const audioTrack = stream.getAudioTracks()[0];
            myCamera = document.getElementById("my-camera");
            myCamera.srcObject = stream;

            // Creating transport
            sendTransport = device.createSendTransport({
                id: options.id,
                iceParameters: options.iceParameters,
                iceCandidates: options.iceCandidates,
                dtlsParameters: options.dtlsParameters,
                sctpParameters: options.sctpParameters,
                iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
            });

            recvTransport = device.createRecvTransport({
                id: recvOptions.id,
                iceParameters: recvOptions.iceParameters,
                iceCandidates: recvOptions.iceCandidates,
                dtlsParameters: recvOptions.dtlsParameters,
                sctpParameters: recvOptions.sctpParameters,
                iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
            });

            /**
             * ------------------------------------------------
             * TRANSPORT EVENT
             * Connect
             * ------------------------------------------------
             */
            recvTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
                console.log("transport receive");
                try {
                    socket.emit("connect-receive", roomId, {
                        transportId: recvTransport.id,
                        dtlsParameters: dtlsParameters,
                    });

                    callback();
                } catch (error) {
                    errback("Transport Connect error. " + error);
                }
            });

            sendTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
                console.log("transport connetct");
                try {
                    socket.emit("transport-connect", roomId, {
                        transportId: sendTransport.id,
                        dtlsParameters: dtlsParameters,
                    });

                    callback();
                } catch (error) {
                    errback("Transport Connect error. " + error);
                }
            });

            /**
             * ------------------------------------------------
             * TRANSPORT EVENT
             * Produce
             * ------------------------------------------------
             */
            sendTransport.on("produce", async (parameters, callback, errback) => {
                try {
                    let id;
                    socket.emit(
                        "transport-produce",
                        {
                            roomId: roomId,
                            producerOption: {
                                transportId: sendTransport.id,
                                kind: parameters.kind,
                                rtpParameters: parameters.rtpParameters,
                                appData: parameters.appData,
                            },
                        },
                        (data) => {
                            id = data;
                            callback({ id });
                        }
                    );
                } catch (error) {
                    errback("Produce error." + error);
                }
            });

            // Create producer
            const videoProducer = await sendTransport.produce({
                track: videoTrack,
                encodings: [{ maxBitrate: 100000 }],
                codecOptions: {
                    videoGoogleStartBitrate: 1000,
                },
            });

            const audioProducer = await sendTransport.produce({
                track: audioTrack,
            });

            // Finally notify the server when transport created and ready to produce
            socket.emit("transport-created", roomId);
        } catch (err) {
            console.log("Error creating transport. ", err);
        }
    });

    /**
     * ------------------------------------------------
     * TRANSPORT EVENT
     * Produce
     * ------------------------------------------------
     */
    socket.on("user-leave", (data) => {
        var peerElement = document.getElementById(data.userId);
        console.log("removing peer, ", peerElement);
        peerElement.remove();
    });

    socket.on("new-consumer", async (data) => {
        const consumer = await recvTransport.consume({
            id: data.id,
            producerId: data.producerId,
            kind: data.kind,
            rtpParameters: data.rtpParameters,
        });
        const { track } = consumer;

        if (data.kind === "video") {
            videoConsumers.push(consumer);
        } else if (data.kind === "audio" && data.userId !== socket.id) {
            audioConsumers.push(consumer);
        }

        addMediaElement(consumer, track, data.userId);
        socket.emit("consumer-done", roomId, consumer.id);
    });

    socket.on("new-user-producer", async (data) => {
        socket.emit("consume-new-user", { userId: data.userId, producerId: data.producerId });
    });
});

function addMediaElement(consumer, track, userId) {
    const mediaStream = new MediaStream([track]);
    const remoteContainer = document.getElementById("remote-container");

    if (consumer.kind === "video") {
        // Creating new video elemnent
        const remoteVideo = document.createElement("video");
        remoteVideo.controls = false;
        remoteVideo.autoplay = true;
        remoteVideo.muted = false;
        remoteVideo.srcObject = mediaStream;
        remoteVideo.setAttribute("class", "remote-video");
        remoteVideo.setAttribute("id", userId);

        remoteContainer?.appendChild(remoteVideo);
    } else if (consumer.kind === "audio" && userId !== socket.id) {
        // Adding remote stream
        const remoteAudio = document.createElement("audio");
        remoteAudio.setAttribute("id", userId);
        remoteAudio.srcObject = mediaStream;
        remoteAudio.autoplay = true;

        remoteContainer?.appendChild(remoteAudio);
    }

    socket.on("disconnect", () => {
        socket.emit("exit-room", socket.id);
        console.log("Leaving Room");
    });
}

/**
 * ------------------------------------------------
 * LOCAL EVENT LISTENERS
 * Fungsi yang digunakan untuk handle button
 * ------------------------------------------------
 */
// window.onbeforeunload = () => {
// console.log("Leaving Room");
// socket.emit("exit-room", socket.id);
// alert("leaving ROom");
// };

function joinMeeting() {
    console.log("Joining room ", roomId);
    socket.emit("joinMeet", roomId);
}

async function startRecording() {
    console.log("start Recording", roomId);

    socket.emit("start-record", roomId);
}

function App() {
    return (
        <div className="App">
            <header className="App-header">
                <h1>Current room: {roomId} </h1>
                <button onClick={joinMeeting}>Send Message</button>
                <button onClick={startRecording}>Record</button>
            </header>
            <div className="container">
                <div id="remote-container"></div>
                <video id="record" autoPlay muted controls={false}></video>
                <video id="my-camera" autoPlay muted controls={false}></video>
            </div>
        </div>
    );
}

export default App;
