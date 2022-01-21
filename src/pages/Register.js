import axios from "axios";
import React, { useState } from "react";

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

export function Register() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailChange = (event) => {
    setEmail(event.target.value);
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const handleNameChange = (event) => {
    setName(event.target.value);
  };

  const handleLogin = (event) => {
    console.log(name, password);
    axios
      .post(
        "http://localhost:8080/register",
        {
          name: name,
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
        window.location.href = "http://localhost:3000/login";
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <div style={loginFormStyle}>
      <h1>Create New User</h1>
      <p>Nama : </p>
      <input style={inputStyle} type="text" onChange={handleNameChange} /> <br />
      <p>Email : </p>
      <input style={inputStyle} type="text" onChange={handleEmailChange} /> <br />
      <p>Password : </p>
      <input style={inputStyle} type="password" onChange={handlePasswordChange} /> <br />
      <button onClick={handleLogin}>Register</button>
    </div>
  );
}
