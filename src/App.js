import axios from "axios";
import Meet from "./pages/Meet";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { CreateMeet } from "./pages/CreateMeet";
import { MyRecordings } from "./pages/MyRecordings";
import { ViewRecording } from "./pages/ViewRecording";
import { Routes, Route, Link } from "react-router-dom";
import React, { useEffect, useState, useContext } from "react";

import { socket, SocketContext } from "./context";

const navbarStyle = {
  margin: "0",
  padding: "0",
  textAlign: "center",
};

const navbarUl = {
  position: "relative",
  display: "inline-table",
  listStyle: "none",
};

const navbarLi = {
  float: "left",
};

const navbarLink = {
  color: "white",
  paddingRight: "10px",
  fontWeight: "500",
  fontSize: "1.3rem",
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [me, setUser] = useState(undefined);

  useEffect(() => {
    axios
      .get("http://localhost:8080/me", { withCredentials: true })
      .then((response) => {
        if (response.data.status === true) {
          setIsLoggedIn(true);
          setUser(response.data.user);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  function LoginButton() {
    return (
      <Link to="/login" style={navbarLink}>
        Login
      </Link>
    );
  }

  function logout(event) {
    axios
      .post("http://localhost:8080/logout", {}, { withCredentials: true })
      .then((response) => {
        if (response.data.status === true) {
          setIsLoggedIn(false);
        }
        console.log(response);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function LogoutButton() {
    return (
      <a onClick={logout} style={navbarLink}>
        Logout
      </a>
    );
  }

  return (
    <div className="App">
      <SocketContext.Provider value={socket}>
        <Routes>
          <Route path="/meet" element={<Meet user={me} />}>
            <Route path=":meetID" element={<Meet />} />
          </Route>
        </Routes>
        <nav style={navbarStyle}>
          <ul style={navbarUl}>
            <li style={navbarLi}>
              <Link to="/" style={navbarLink}>
                Home
              </Link>
            </li>
            <li style={navbarLi}>
              <Link to="/create-meet" style={navbarLink}>
                Create Room
              </Link>
            </li>
            <li style={navbarLi}>
              <Link to="/my-recordings" style={navbarLink}>
                My Recordings
              </Link>
            </li>
            <li style={navbarLi}>{isLoggedIn ? <LogoutButton /> : <LoginButton />}</li>
          </ul>
        </nav>
        {isLoggedIn}
        <Routes>
          <Route path="/" element={<Home user={me} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/create-meet" element={<CreateMeet user={me} />} />
          <Route path="/my-recordings" element={<MyRecordings user={me} />} />
          <Route path="/recording" element={<ViewRecording />}>
            <Route path=":recordingID" element={<ViewRecording />} />
          </Route>
        </Routes>
      </SocketContext.Provider>
    </div>
  );
}
