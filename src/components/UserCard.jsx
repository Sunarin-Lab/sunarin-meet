import React, { Component } from "react";

const userNameStyle = {
  color: "white",
  fontSize: "12px",
  maxWidth: "150px",
  width: "150px",
};

const userCardStyle = {
  color: "white",
  fontSize: "14px",
  letterSpacing: "2px",
  fontWeight: "500",
};

const videoStyle = {
  width: "100%",
  height: "auto",
  backgroundSize: "cover",
  overflow: "hidden",
};

const audioStyle = {
  display: "none",
};

class UserCard extends Component {
  constructor(props) {
    super(props);
  }

  setUsername(username) {
    this.state.username = username;
  }

  setVideoStream(videoStream) {
    this.video.srcObject = videoStream;
  }

  setAudioStream(audioStream) {
    this.audio.srcObject = audioStream;
  }

  render() {
    return (
      <div className="col-md-3 user-card" style={userCardStyle} id={this.props.socketId + this.props.username}>
        <video id={this.props.username + this.props.socketId + "-video"} style={videoStyle} autoPlay muted />
        <audio id={this.props.username + this.props.socketId + "-audio"} style={audioStyle} autoPlay controls />
        <span>{this.props.username}</span>
      </div>
    );
  }
}

export default UserCard;
