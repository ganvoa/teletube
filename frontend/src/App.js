import React from "react";

import "antd/dist/antd.min.css";
import "./assets/main.css";
import "./assets/loading.css";
import "./assets/scrollbar.css";

import { Row, Col } from "antd";
import Status from "./component/Status";
import Player from "./component/Player";
import Playlist from "./component/Playlist";

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            currentPlaylist: null,
            currentSong: null,
            prevSong: null,
            nextSong: null,
            device: null,
            loop: false,
            isLoading: true,
            isPlaying: false,
            loadingMessage: "Preparing Everything...",
            loadingDevice: false,
            playlists: [],
            devices: []
        };
    }

    componentWillMount() {
        const { ipcRenderer } = window.require("electron");

        ipcRenderer.on(`load-status`, (e, status) => {
            this.loadStatus(status);
        });

        ipcRenderer.on(`playlists`, (e, playlists) => {
            this.loadPlaylists(playlists);
        });

        ipcRenderer.on(`loading`, (e, isLoading) => {
            this.setState({
                isLoading: isLoading
            });
        });

        ipcRenderer.on(`update-loading`, (e, loadingMessage) => {
            this.setState({
                loadingMessage: loadingMessage
            });
        });

        ipcRenderer.on(`devices`, (e, devices) => {
            console.log(`Se recibe ${devices.length} dispositivos`);
            this.setState({
                devices: devices
            });
        });
    }

    loadPlaylists(playlists) {
        this.setState({
            playlists: playlists
        });
    }

    updateIsPlaying(isPlaying) {
        this.setState({
            isPlaying: isPlaying
        });
    }

    loadStatus(config) {
        this.setState(
            {
                currentPlaylist: config.currentPlaylist,
                currentSong: config.currentSong,
                prevSong: config.prevSong,
                nextSong: config.nextSong,
                loop: config.loop
            },
            () => {
                this.updatePrevNext();
            }
        );
    }

    saveStatus() {
        let status = {
            currentPlaylist: this.state.currentPlaylist,
            currentSong: this.state.currentSong,
            prevSong: this.state.prevSong,
            nextSong: this.state.nextSong,
            loop: this.state.loop
        };
        const { ipcRenderer } = window.require("electron");
        ipcRenderer.send(`save-status`, status);
    }

    onSelectDevice(device) {
        console.log(`Selecciona dispositivo ${device.friendlyName}`);
        const { ipcRenderer } = window.require("electron");
        ipcRenderer.send(`select-device`, device);
        this.setState({
            loadingDevice: true
        });
    }

    onDisconnectDevice() {
        if (this.state.device) {
            console.log(`desconecta dispositivo ${this.state.friendlyName}`);
            const { ipcRenderer } = window.require("electron");
            ipcRenderer.send(`disconnect-device`, {});
            this.setState({
                loadingDevice: true
            });
        }
    }

    onDeviceSelected(device) {
        this.setState({
            device: device,
            loadingDevice: false
        });
    }

    onDeviceDisconnected() {
        this.setState({
            device: null,
            loadingDevice: false
        });
    }

    onStop() {
        console.log(`stopping player`);
        this.setState(
            {
                currentSong: null,
                nextSong: null,
                prevSong: null
            },
            () => {
                this.saveStatus();
            }
        );
    }

    onPlay(song) {
        console.log(`playing song ${song.uid} - ${song.title}`);
        this.setState(
            {
                currentSong: song
            },
            () => {
                this.updatePrevNext();
            }
        );
    }

    updatePrevNext() {
        if (!this.state.currentSong) return;
        if (!this.state.currentPlaylist) return;

        let search = this.state.currentSong.uid;
        let index = 0;
        this.state.currentPlaylist.tracks.forEach((element, key) => {
            // console.log(`#${key} - ${element.uid} - ${element.title}`);
            if (element.uid === search) {
                index = key;
            }
        });
        let prevSong = null;
        if (index >= 1) prevSong = this.state.currentPlaylist.tracks[index - 1];
        else if (
            this.state.loop &&
            this.state.currentPlaylist.tracks.length > 0
        ) {
            prevSong = this.state.currentPlaylist.tracks[
                this.state.currentPlaylist.tracks.length - 1
            ];
        }
        let nextSong = null;
        if (index < this.state.currentPlaylist.tracks.length - 1)
            nextSong = this.state.currentPlaylist.tracks[index + 1];
        else if (this.state.loop) {
            nextSong = this.state.currentPlaylist.tracks[0];
        }
        if (prevSong)
            console.log(`canción anterior ${prevSong.uid} - ${prevSong.title}`);
        if (nextSong)
            console.log(
                `canción siguiente ${nextSong.uid} - ${nextSong.title}`
            );
        // obtengo la cancion anterior y siguiente
        this.setState(
            {
                prevSong: prevSong,
                nextSong: nextSong
            },
            () => {
                this.saveStatus();
            }
        );
    }

    onPlaylist(playlist) {
        this.setState(
            {
                playlist: playlist
            },
            () => {
                this.updatePrevNext();
            }
        );
    }

    onLoopChange(checked) {
        this.setState(
            {
                loop: checked
            },
            () => {
                this.updatePrevNext();
            }
        );
    }

    render() {
        let classLoading = this.state.isLoading ? `loading` : `loading hidden`;
        let classMain = this.state.isLoading ? `hidden` : ``;

        return (
            <div>
                <div className={classLoading}>
                    <div className="loadingio-spinner-bars-axpzpuw254w">
                        <div className="ldio-tikloxx5pb">
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                        </div>
                    </div>
                    <p className="loading-text">{this.state.loadingMessage}</p>
                </div>
                <Row className={classMain}>
                    <Col theme="dark" span={10}>
                        <Player
                            onDeviceDisconnected={this.onDeviceDisconnected.bind(
                                this
                            )}
                            onDeviceSelected={this.onDeviceSelected.bind(this)}
                            device={this.state.device}
                            playlist={this.state.currentPlaylist}
                            nextSong={this.state.nextSong}
                            prevSong={this.state.prevSong}
                            onPlay={this.onPlay.bind(this)}
                            updateIsPlaying={this.updateIsPlaying.bind(this)}
                            onStop={this.onStop.bind(this)}
                        />
                    </Col>
                    <Col
                        span={14}
                        style={{
                            height: "calc(100vh)"
                        }}
                    >
                        <Row>
                            <Col span={24}>
                                <Status
                                    device={this.state.device}
                                    devices={this.state.devices}
                                    onDisconnectDevice={this.onDisconnectDevice.bind(
                                        this
                                    )}
                                    onSelectDevice={this.onSelectDevice.bind(
                                        this
                                    )}
                                    loadingDevice={this.state.loadingDevice}
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col span={24}>
                                <Playlist
                                    playlists={this.state.playlists}
                                    isPlaying={this.state.isPlaying}
                                    playlist={this.state.currentPlaylist}
                                    currentSong={this.state.currentSong}
                                    onLoopChange={this.onLoopChange.bind(this)}
                                    loop={this.state.loop}
                                />
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </div>
        );
    }
}

export default App;
