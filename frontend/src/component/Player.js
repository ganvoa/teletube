import React from "react";

import { Row, Col, Button, Typography, Slider } from "antd";
import {
    PauseOutlined,
    CaretRightOutlined,
    StepBackwardOutlined,
    StepForwardOutlined,
    SoundOutlined
} from "@ant-design/icons";
import "../assets/dark.css";
import "../assets/iconwrapper.css";

const { Paragraph, Text } = Typography;

class Player extends React.Component {
    player;

    constructor(props) {
        super(props);
        this.state = {
            isPlaying: false,
            currentSong: null,
            currentVolume: 1,
            duration: 0,
            currentTime: 0
        };
    }

    timeupdate() {
        this.setState({
            currentTime: this.player.currentTime
        });
    }

    volumeupdate() {
        this.setState({
            currentVolume: this.player.volume
        });
    }

    componentDidMount() {
        this.player = document.getElementsByTagName("audio")[0];

        this.player.addEventListener("timeupdate", () => {
            if (!this.state.device) this.timeupdate();
        });
        this.player.addEventListener("volumechange", () => {
            if (!this.state.device) this.volumeupdate();
        });

        this.player.addEventListener("loadedmetadata", () => {
            if (!this.state.device) this.loadedMetadata();
        });

        this.player.addEventListener("error", err => {
            console.error(err);
            this.refreshSong(this.state.currentSong);
        });

        this.player.addEventListener("play", () => {
            if (!this.state.device) this.play();
        });

        this.player.addEventListener("pause", () => {
            if (!this.state.device) this.pause();
        });

        this.player.addEventListener("pause", () => {
            if (!this.state.device) this.pause();
        });

        this.player.addEventListener("ended", () => {
            if (!this.state.device) this.onNextSong();
        });

        const { ipcRenderer } = window.require("electron");

        ipcRenderer.on(`load-status`, (e, status) => {
            this.loadStatus(status);
        });

        ipcRenderer.on(`refresh-song`, e => {
            this.refreshSong(this.state.currentSong);
        });

        ipcRenderer.on(`play`, (e, song) => {
            this.onPlay(song);
        });

        ipcRenderer.on(`skip`, e => {
            this.onNextSong();
        });

        ipcRenderer.on(`prev`, e => {
            this.onPrevSong();
        });

        ipcRenderer.on(`pause`, e => {
            this.onPause();
        });

        ipcRenderer.on(`resume`, e => {
            this.onResume();
        });

        ipcRenderer.on(`device-status`, (e, state, duration, status) => {
            console.log(status);
            if (state === "PLAYING") {
                this.setState({
                    duration: duration === 0 ? this.state.duration : duration,
                    isPlaying: true
                });
            } else {
                this.setState({
                    isPlaying: false
                });
            }
        });

        ipcRenderer.on(`device-update`, (e, currentTime, currentVolume) => {
            if (
                this.state.currentTime !== currentTime ||
                this.state.currentVolume !== currentVolume
            ) {
                this.setState({
                    currentTime: currentTime,
                    currentVolume: currentVolume
                });
            }
        });

        ipcRenderer.on(`device-finish`, e => {
            this.onNextSong();
        });

        ipcRenderer.on(`set-volume`, (e, volume) => {
            console.log(`setting volume to ${volume}`);
            this.setVolume(volume);
        });

        ipcRenderer.on(`device-selected`, (e, device) => {
            console.log(`Se conectó al dispositivo ${device.friendlyName}`);
            this.onPause();
            this.setState(
                {
                    device: device
                },
                () => {
                    this.props.onDeviceSelected(device);
                    // this.onPlay(this.state.currentSong);
                }
            );
        });

        ipcRenderer.on(`device-disconnected`, e => {
            console.log(`Se desconectó del dispositivo`);
            this.setState(
                {
                    device: null
                },
                () => {
                    this.props.onDeviceDisconnected();
                }
            );
        });
    }

    setVolume(volume) {
        this.player.volume = volume / 100;
    }

    loadStatus(status) {
        if (status.currentSong) {
            this.setState({
                currentSong: status.currentSong
            });
            this.player.src = status.currentSong.audioUrl;
            this.player.load();
        }
    }

    play() {
        this.setState({
            isPlaying: true
        });
    }

    pause() {
        this.setState({
            isPlaying: false
        });
    }

    loadedMetadata() {
        this.setState({
            duration: this.player.duration
        });
    }

    onPause() {
        if (this.state.device) {
            const { ipcRenderer } = window.require("electron");
            ipcRenderer.send(`device-pause`, {});
            return;
        }

        if (!this.player.paused) {
            this.player.pause();
        }
    }

    refreshSong(song) {
        const { ipcRenderer } = window.require("electron");
        if (this.playlist)
            ipcRenderer.send(`refresh-song`, this.playlist.uid, song);
    }

    onResume() {
        if (this.state.device) {
            const { ipcRenderer } = window.require("electron");
            ipcRenderer.send(`device-resume`, {});
            return;
        }

        if (this.player.paused && this.state.currentSong) {
            this.player.play();
        }
    }

    onPlay(song) {
        this.setState({
            currentSong: song
        });

        if (this.state.device) {
            const { ipcRenderer } = window.require("electron");
            ipcRenderer.send(`device-play`, song);
            this.props.onPlay(song);
            return;
        }

        try {
            this.player.pause();
            this.player.src = song.audioUrl;
            this.player.load();
            this.player.play();
            this.props.onPlay(song);
        } catch (err) {
            console.error(err);
        }
    }

    onNextSong() {
        if (this.props.nextSong) this.onPlay(this.props.nextSong);
    }

    onPrevSong() {
        if (this.props.prevSong) this.onPlay(this.props.prevSong);
    }

    onTogglePlay() {
        if (this.state.device) {
            if (this.state.isPlaying) this.onPause();
            else this.onResume();
            return;
        }

        if (this.player.paused) {
            this.player.play();
        } else {
            this.player.pause();
        }
    }

    onSeek(value) {
        if (this.state.device) {
            return;
        }
        this.player.currentTime = value;
    }

    onChangeVolume(value) {
        if (this.state.device) {
            return;
        }
        this.player.volume = value / 100;
    }

    formatTime(time) {
        let minutes = Math.floor(time / 60);
        let seconds = Math.floor(time - minutes * 60);
        let minutesStr = minutes.toString().padStart(2, "0");
        let secondsStr = seconds.toString().padStart(2, "0");
        return `${minutesStr}:${secondsStr}`;
    }

    render() {
        return (
            <div>
                <audio
                    style={{ display: "hidden" }}
                    id="player"
                    controls=""
                ></audio>
                <Row>
                    <Col span={24} style={{ textAlign: "center" }}>
                        <div
                            className="ant-avatar ant-avatar-square"
                            style={{
                                width: "100%",
                                height: "calc(100vh - 263px)",
                                marginBottom: 20
                            }}
                        >
                            {this.state.currentSong ? (
                                <div
                                    className="blur-player"
                                    style={{
                                        backgroundImage: this.state.currentSong
                                            ? `url(${this.state.currentSong.thumbnails.medium.url})`
                                            : null
                                    }}
                                />
                            ) : null}
                            {this.state.currentSong ? (
                                <img
                                    style={{
                                        objectFit: "contain",
                                        objectPosition: "center",
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        margin: "0 auto",
                                        width: "75%"
                                    }}
                                    alt=""
                                    src={
                                        this.state.currentSong.thumbnails.medium
                                            .url
                                    }
                                />
                            ) : null}
                        </div>
                    </Col>
                </Row>
                <Row
                    style={{
                        paddingLeft: 40,
                        paddingRight: 40,
                        marginBottom: 5
                    }}
                >
                    <Col span={24} style={{ textAlign: "center" }}>
                        <Paragraph
                            style={{ textTransform: "uppercase", margin: 0 }}
                            strong
                            ellipsis
                        >
                            {this.state.currentSong
                                ? this.state.currentSong.title
                                : "-"}
                        </Paragraph>
                    </Col>
                </Row>
                <Row style={{ paddingLeft: 20, paddingRight: 20 }}>
                    <Col span={24}>
                        <Slider
                            min={0}
                            disabled={this.state.currentSong ? false : true}
                            max={this.state.duration}
                            value={this.state.currentTime}
                            onChange={this.onSeek.bind(this)}
                            tipFormatter={this.formatTime}
                        ></Slider>
                    </Col>
                    <Col span={24}>
                        <Text>{this.formatTime(this.state.currentTime)}</Text>
                        <Text style={{ float: "right" }}>
                            {this.formatTime(this.state.duration)}
                        </Text>
                    </Col>
                </Row>
                <Row
                    justify="space-around"
                    align="middle"
                    style={{
                        paddingLeft: 40,
                        paddingRight: 40,
                        textAlign: "center"
                    }}
                >
                    <Col span={8}>
                        <Button
                            style={{ width: 60, height: 60 }}
                            type="primary"
                            disabled={this.props.prevSong ? false : true}
                            shape="circle"
                            onClick={this.onPrevSong.bind(this)}
                            icon={<StepBackwardOutlined />}
                        />
                    </Col>
                    <Col span={8}>
                        <Button
                            style={{ width: 90, height: 90 }}
                            disabled={this.state.currentSong ? false : true}
                            type="primary"
                            onClick={this.onTogglePlay.bind(this)}
                            icon={
                                this.state.isPlaying ? (
                                    <PauseOutlined />
                                ) : (
                                    <CaretRightOutlined />
                                )
                            }
                            shape="circle"
                        />
                    </Col>
                    <Col span={8}>
                        <Button
                            style={{ width: 60, height: 60 }}
                            type="primary"
                            disabled={this.props.nextSong ? false : true}
                            shape="circle"
                            onClick={this.onNextSong.bind(this)}
                            icon={<StepForwardOutlined />}
                        />
                    </Col>
                </Row>
                <Row
                    style={{
                        paddingLeft: 20,
                        paddingRight: 20,
                        marginTop: 20,
                        marginBottom: 20
                    }}
                >
                    <Col offset={6} span={12}>
                        <div className="icon-wrapper">
                            <SoundOutlined style={{ color: "white" }} />
                            <Slider
                                className="slider"
                                disabled={this.state.device != null}
                                min={0}
                                max={100}
                                value={this.state.currentVolume * 100}
                                onChange={this.onChangeVolume.bind(this)}
                            ></Slider>
                        </div>
                    </Col>
                </Row>
            </div>
        );
    }
}

export default Player;
