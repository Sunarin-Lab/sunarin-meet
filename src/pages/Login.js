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

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailChange = (event) => {
    setEmail(event.target.value);
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const handleLogin = (event) => {
    axios
      .post(
        "http://localhost:8080/login",
        {
          email: email,
          password: password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      )
      .then((response) => {
        console.log(response);
        window.location.href = "http://localhost:3000/";
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <div style={loginFormStyle}>
      <h1>Login Form</h1>
      <p>Email : </p>
      <input style={inputStyle} type="text" id="email" onChange={handleEmailChange} /> <br />
      <p>Password : </p>
      <input style={inputStyle} type="password" id="password" onChange={handlePasswordChange} /> <br />
      <p>
        Click{" "}
        <Link to="/register" style={{ color: "white" }}>
          register
        </Link>{" "}
        to create new account
      </p>
      <button onClick={handleLogin} id="loginButton">
        Login
      </button>
    </div>
  );
}
