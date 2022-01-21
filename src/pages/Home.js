import axios from "axios";
import React, { useState } from "react";
import { Link } from "react-router-dom";

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

export function Home(props) {
  const [room, setRoom] = useState("");
  const [name, setName] = useState("");

  const joinRoom = () => {
    console.log("room ", room);
    console.log("name ", name);
  };

  const handleRoomChange = (event) => {
    setRoom(event.target.value);
  };

  const handleNameChange = (event) => {
    setName(event.target.value);
  };

  if (props.user !== undefined) {
    return (
      <div style={loginFormStyle}>
        <h1>Join Room</h1>
        <p>Room ID : </p>
        <input style={inputStyle} type="text" name="roomId" onChange={handleRoomChange} /> <br />
        <Link style={linkButtonStyle} to={`/meet/${room}`}>
          Join Room
        </Link>
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
