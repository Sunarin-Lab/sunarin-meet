import axios from "axios";
import { io } from "socket.io-client";
import { Device } from "mediasoup-client";
import { useParams } from "react-router-dom";
import Usercard from "../components/UserCard";
import React, { useState, useEffect } from "react";
import { showLinkMessage, showErrorMessage } from "../utilities";

import "./Meet.css";

// Get url parameters
//const urlArgs = new URLSearchParams(window.location.search);
//var roomId = urlArgs.get("room");
var roomId;
var myName;
var userId;

// Global variables
const device = new Device();
var socket;
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
export function Meet(props) {
  const [users, setUsers] = useState([]);
  const [isJoined, setJoined] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isRoomOwner, setIsRoomOwner] = useState(false);
  const [isRecording, setRecording] = useState(false);

  const { meetID } = useParams();
  roomId = meetID;

  const joinMeeting = async function () {
    console.log(isJoined);

    if (!isJoined) {
      videoTrack = await getUserVideo();
      audioTrack = await getUserAudio();

      console.log("Joining room ", roomId);
      if (myName !== "bot") {
        addUser(myName, socket.id);
      }
      socket.emit("before-join", roomId);
      setJoined(true);
    }
  };

  useEffect(() => {
    axios
      .get("http://localhost:8080/me", { withCredentials: true })
      .then((response) => {
        if (response.data.status === true) {
          myName = response.data.user.name;
          userId = response.data.user.id;
        }
      })
      .catch((err) => {
        console.log(err);
      });

    socket = io("https://sfu-kulon.server:5000", { secure: true });
    socket.on("connect", () => {
      console.log("Connected");

      socket.on("room-not-found", (roomId) => {
        showErrorMessage("Room Not Found", `Room with id ${roomId} does not exist`);
      });

      socket.on("new-user-joined", async (user) => {
        if (user.name !== "bot") {
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
        if (!device.loaded) {
          await device.load({
            routerRtpCapabilities: rtpCapabilities,
          });
          socket.emit("joinMeet", roomId, myName, userId);
        }
      });

      socket.on("peers-in-room", (roomUsers) => {
        roomUsers.forEach((user) => {
          setUsers((users) => [...users, { socketId: user[0], name: user[1] }]);
        });
      });

      socket.on("room-owner", (roomOwner) => {
        console.log("Room owner", roomOwner);
        setIsRoomOwner(true);
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

          console.log(audioTrack);
          if (videoTrack !== null) {
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

          if (audioTrack != null) {
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
          if (video !== null) {
            video.srcObject = new MediaStream([track]);
            console.log("Video = ", data.peerName);
          }
        } else if (data.kind === "audio" && data.socketId !== socket.id) {
          const audio = document.getElementById(data.peerName + data.socketId + "-audio");

          if (audio !== null) {
            audio.srcObject = new MediaStream([track]);
            console.log("Audio = ", data.peerName);
          }
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
        if (peerElement != null) peerElement.remove();
      });

      socket.on("recording-started", () => {
        console.log("recording started");
        setRecording(true);
      });

      socket.on("recording-done", (filename) => {
        console.log("Recording done - ", filename);

        try {
          showLinkMessage("Recording Finished", "Click this to open file", "/recording/" + filename);
        } catch (e) {
          console.log(e);
        }
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
    if (isRecording) {
      console.log("stop Record");
      socket.emit("stop-recording", roomId);
      setRecording(false);
    } else {
      console.log("start Record ", userId);
      socket.emit("start-recording", roomId, userId);
    }
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
                {isRoomOwner && (
                  <li>
                    <button onClick={startRecording}>{isRecording ? "Stop Recording" : "Start Recording"}</button>
                  </li>
                )}
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

export default Meet;
