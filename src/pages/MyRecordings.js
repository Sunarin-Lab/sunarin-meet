import axios from "axios";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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

const navbarLink = {
  color: "white",
  paddingRight: "10px",
  fontWeight: "500",
  fontSize: "1rem",
  textDecoration: "none",
};

const center = {
  marginLeft: "auto",
  marginRight: "auto",
};

export function MyRecordings(props) {
  const [recordings, setRecordings] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:8080/my-recordings", { withCredentials: true })
      .then((response) => {
        console.log(response.data);
        setRecordings(response.data);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  if (props.user !== undefined) {
    return (
      <div>
        <h1>My Recordings</h1>
        <div>
          <table style={center}>
            {recordings.map((recording, i) => (
              <tr>
                <td>
                  <a style={navbarLink} key={i} href={`/recording/${recording.filename}`}>
                    {recording.filename}
                  </a>
                </td>
              </tr>
            ))}
          </table>
        </div>
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
