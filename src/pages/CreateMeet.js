import { SocketContext } from "../context";
import React, { useState, useContext, useEffect } from "react";
import { Link } from "react-router-dom";
import { showLinkMessage } from "../utilities";

const loginFormStyle = {
  fontSize: "14px",
  textAlign: "left",
  paddingLeft: "30%",
  maxWidth: "70%",
};

const inputStyle = {
  marginBottom: "15px",
  width: "100%",
};

const linkButtonStyle = {
  textTransform: "uppercase",
  textDecoration: "none",
  borderRadius: "15px",
  backgroundColor: "white",
  paddingTop: "8px",
  paddingLeft: "15px",
  paddingRight: "15px",
  paddingBottom: "8px",
  textTransform: "uppercase",
  fontWeight: "500",
  color: "black",
  fontSize: "14px",
  lineHeight: "31px",
};

export function CreateMeet(props) {
  const [roomID, setRoomID] = useState("");
  const socket = useContext(SocketContext);

  useEffect(() => {
    socket.on("room-created", (roomID) => {
      showLinkMessage("Room Created", `Room with ID ${roomID} has been created`, "/meet/" + roomID);
    });
  }, []);

  const handleRoomIDChange = (event) => {
    setRoomID(event.target.value);
  };

  const handleCreateRoom = () => {
    socket.emit("createMeet", roomID, props.user.name);
  };

  if (props.user !== undefined) {
    return (
      <div style={loginFormStyle}>
        <h1>Buat Room</h1>
        <p>ID Room : </p>
        <input style={inputStyle} type="text" name="roomId" onChange={handleRoomIDChange} /> <br />
        <button onClick={handleCreateRoom}>Create Room</button>
      </div>
    );
  } else {
    return (
      <div>
        <h2>You must be logged in to use this website</h2>
        <Link style={linkButtonStyle} to={`/login`}>
          Login
        </Link>
      </div>
    );
  }
}
