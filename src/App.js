import { io } from "socket.io-client";
import React, { useState, useEffect } from "react";
import { Device } from "mediasoup-client";
import Usercard from "./components/UserCard";

import "./App.css";

// Get url parameters
const urlArgs = new URLSearchParams(window.location.search);
const roomId = urlArgs.get("room");
const myName = urlArgs.get("name");

// Global variables
const device = new Device();
const socket = io("https://sfu.server:5000", { secure: true });
let videoTrack, audioTrack;
let sendTransport, recvTransport;
let videoProducer, audioProducer;

/**
 * ------------------------------------------------
 * LOCAL EVENT LISTENERS
 * Fungsi yang digunakan untuk handle button
 * ------------------------------------------------
 */
async function getUserVideo() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        height: { ideal: 360, max: 720 },
      },
    });

    return stream.getVideoTracks()[0];
  } catch (err) {
    console.log("error getting video ", err);
    return null;
  }
}

async function getUserAudio() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    return stream.getAudioTracks()[0];
  } catch (err) {
    console.log("error getting audio ", err);
    return null;
  }
}

/**
 * ------------------------------------------------
 * REACT COMPONENT
 * ------------------------------------------------
 */
function App() {
  const [users, setUsers] = useState([]);
  const [isJoined, setJoined] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);

  const joinMeeting = async function () {
    console.log(isJoined);

    if (!isJoined) {
      videoTrack = await getUserVideo();
      audioTrack = await getUserAudio();

      console.log("Joining room ", roomId);
      if (myName != "bot") {
        addUser(myName, socket.id);
      }
      socket.emit("joinMeet", roomId, myName);
      setJoined(true);
    }
  };

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected");

      /**
       * ------------------------------------------------
       * AUTOMATICALLY CREATE ROOM ONLY FOR DEVELOPMENT
       * Should be manual on production
       * ------------------------------------------------
       */
      socket.emit("createMeet", roomId);
      socket.emit("get-rtp-capabilities", roomId);

      socket.on("new-user-joined", async (user) => {
        if (user.name != "bot") {
          setUsers((users) => [...users, { socketId: user.socketId, name: user.name }]);

          console.log("new user joined ", user.name);
        }
      });

      /**
       * ------------------------------------------------
       * GET RTP CAPABILITIES
       * ------------------------------------------------
       */
      socket.on("rtp-capabilities", async (rtpCapabilities) => {
        console.log("Syncing with server");
        await device.load({
          routerRtpCapabilities: rtpCapabilities,
        });
      });

      socket.on("peers-in-room", (roomUsers) => {
        roomUsers.forEach((user) => {
          setUsers((users) => [...users, { socketId: user[0], name: user[1] }]);
        });
      });

      /**
       * ------------------------------------------------
       * TRANSPORT OPTION
       * Creating transport for sending and receiving
       * ------------------------------------------------
       */
      socket.on("error", (error) => {
        console.log(error);
      });

      socket.on("transport-options", async (options) => {
        try {
          const sendOptions = options.send;
          const recvOptions = options.recv;
          // Creating transport
          sendTransport = device.createSendTransport({
            id: sendOptions.id,
            iceParameters: sendOptions.iceParameters,
            iceCandidates: sendOptions.iceCandidates,
            dtlsParameters: sendOptions.dtlsParameters,
            sctpParameters: sendOptions.sctpParameters,
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
            try {
              console.log("recv transport created");
              socket.emit("transport-connect", "recv", dtlsParameters);

              callback();
            } catch (error) {
              errback("Transport Connect error. " + error);
            }
          });

          sendTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
            try {
              console.log("connecting");
              socket.emit("transport-connect", "send", dtlsParameters);

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
                  transportId: sendTransport.id,
                  kind: parameters.kind,
                  rtpParameters: parameters.rtpParameters,
                  appData: parameters.appData,
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

          if (videoTrack != undefined) {
            // Create producer
            videoProducer = await sendTransport.produce({
              track: videoTrack,
              encodings: [{ maxBitrate: 100000 }],
              codecOptions: {
                videoGoogleStartBitrate: 1000,
              },
            });

            if (!isVideoOn) {
              videoProducer.pause();
            }
          }

          if (audioTrack != undefined) {
            audioProducer = await sendTransport.produce({
              track: audioTrack,
            });

            if (!isAudioOn) {
              audioProducer.pause();
            }
          }

          // Finally notify the server when transport created and ready to produce
          socket.emit("transport-created");
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
      socket.on("new-consumer", async (data) => {
        const consumer = await recvTransport.consume({
          id: data.id,
          producerId: data.producerId,
          kind: data.kind,
          rtpParameters: data.rtpParameters,
        });
        const { track } = consumer;

        if (data.kind === "video") {
          const video = document.getElementById(data.peerName + data.socketId + "-video");
          video.srcObject = new MediaStream([track]);
          console.log("Video = ", data.peerName);
        } else if (data.kind === "audio" && data.socketId !== socket.id) {
          const audio = document.getElementById(data.peerName + data.socketId + "-audio");
          audio.srcObject = new MediaStream([track]);
        }

        socket.emit("consumer-done", consumer.id);
      });

      // Producer data { producer, socketId }
      socket.on("new-producer", (consumerOptions) => {
        socket.emit("consume-producer", consumerOptions);
      });

      socket.on("user-leave", (data) => {
        console.log(data.socketId + data.peerName);
        var peerElement = document.getElementById(data.socketId + data.peerName);
        peerElement.remove();
      });
    });

    joinMeeting(); // This will tell server if client is ready

    window.addEventListener("beforeunload", (e) => {
      socket.disconnect();
    });
  }, []); // COMPONENT INIT

  useEffect(() => {
    console.log(users);
  }, [users]);

  useEffect(() => {
    console.log(isAudioOn);

    if (audioProducer) {
      isAudioOn ? audioProducer.resume() : audioProducer.pause();
    }
  }, [isAudioOn]);

  useEffect(() => {
    console.log(isVideoOn);

    if (videoProducer) {
      isVideoOn ? videoProducer.resume() : videoProducer.pause();
    }
  }, [isVideoOn]);

  const addUser = (user, socketId) => {
    setUsers([
      ...users,
      {
        socketId: socketId,
        name: user,
      },
    ]);
  };

  const audioToggle = function () {
    setIsAudioOn(!isAudioOn);
  };
  const videoToggle = function () {
    setIsVideoOn(!isVideoOn);
  };

  const startRecording = function () {
    addUser(myName, socket.id);
  };

  return (
    <div className="App">
      <div className="container-fluid">
        <div className="row">
          <div className="col">
            <div id="videoContainer">
              <div className="row">
                {users.map((user) => (
                  <Usercard username={user.name} socketId={user.socketId} key={user.socketId + user.name} />
                ))}
              </div>
            </div>
            <div id="bottomBar">
              <ul className="bottom-bar-menu">
                <li>
                  <button onClick={audioToggle}>Audio Toggle</button>
                </li>
                <li>
                  <button onClick={videoToggle}>Video Toggle</button>
                </li>
                <li>
                  <button onClick={startRecording}>Recording</button>
                </li>
              </ul>
            </div>
          </div>
          {/* <div id="sideBar" className="col-md-3">
            <h3>Chat</h3>
            <hr />
          </div> */}
        </div>
      </div>
    </div>
  );
}

export default App;
