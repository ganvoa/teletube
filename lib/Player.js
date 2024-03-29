const { BrowserWindow, Notification, dialog } = require("electron");
const { logger, tag } = require("./logger");
const { makeError } = require("./utils");
const path = require("path");
const isDev = require("electron-is-dev");

class Player {
    window;
    device;
    polling_interval;

    stopPolling = () => {
        if (this.polling_interval) clearInterval(this.polling_interval);
    };

    startPolling = async () => {
        this.polling_interval = setInterval(async () => {
            try {
                if (this.device !== null) {
                    let { clientStatus, playerStatus } = await this.device.getStatus();
                    let volume = clientStatus && clientStatus.volume.muted ? 0 : clientStatus.volume.level;
                    let currentTime = playerStatus ? Math.floor(playerStatus.currentTime) : 0;
                    if (this.window) {
                        this.window.webContents.send(`device-update`, currentTime, volume);
                    }
                }
            } catch (error) {
                logger.error(makeError(error), tag.CAST);
            }
        }, 700);
    };

    constructor(onLoad) {
        this.device = null;

        this.window = new BrowserWindow({
            title: "TeleTube Player",
            icon: path.join(__dirname, "../assets/favicon.png"),
            width: 1070,
            height: 650,
            minWidth: 1070,
            minHeight: 650,
            show: false,
            center: true,
            webPreferences: {
                nodeIntegration: true,
            },
        });
        this.window.setMenu(null);
        if (isDev) {
            this.window.openDevTools();
            this.window.loadURL(`http://localhost:3001`);
        } else {
            this.window.loadURL(`file://${path.join(__dirname, "/../ui/build/index.html")}`);
        }
        this.window.once('ready-to-show', () => this.window.show())
        this.window.webContents.on("did-finish-load", () => {
            onLoad();
        });
    }

    async exportPlaylist(currentPlaylist) {
        let options = {
            title: "Export Playlist - Teletube Player",
            buttonLabel: "Save",
            filters: [{ name: "Teletube Playlist", extensions: ["teletube"] }],
        };
        let file = await dialog.showSaveDialog(this.window, options);
        if (!file.canceled) {
            let filePath = file.filePath;
            let playlistContent = {
                name: currentPlaylist.name,
                tracks: currentPlaylist.tracks.map((track) => {
                    return {
                        ...track,
                        audioUrl: "https://",
                    };
                }),
            };
            let fs = require("fs");
            fs.writeFileSync(filePath, JSON.stringify(playlistContent));
            this.notify("Playlist saved");
        }
    }

    async importPlaylist() {
        let options = {
            title: "Import Playlist - Teletube Player",
            buttonLabel: "Import",
            filters: [{ name: "Teletube Playlist", extensions: ["teletube"] }],
            properties: ["openFile"],
        };
        let file = await dialog.showOpenDialog(this.window, options);
        if (!file.canceled) {
            let filePath = file.filePaths[0];
            let fs = require("fs");
            let data = fs.readFileSync(filePath);
            let playlist = JSON.parse(data);
            console.log(playlist.tracks.length);
            if (playlist.hasOwnProperty("name")) {
                playlist.tracks.forEach((track) => {
                    if (
                        !(
                            track.hasOwnProperty("id") &&
                            track.hasOwnProperty("title") &&
                            track.hasOwnProperty("description") &&
                            track.hasOwnProperty("url") &&
                            track.hasOwnProperty("seconds") &&
                            track.hasOwnProperty("time") &&
                            track.hasOwnProperty("views") &&
                            track.hasOwnProperty("thumbnail") &&
                            track.hasOwnProperty("image") &&
                            track.hasOwnProperty("ago") &&
                            track.hasOwnProperty("audioUrl") &&
                            track.hasOwnProperty("expiresOn") &&
                            track.hasOwnProperty("addedBy") &&
                            track.hasOwnProperty("mimeType")
                        )
                    ) {
                        throw new Error("Invalid playlist format");
                    }
                });
            } else {
                throw new Error("Invalid playlist format");
            }
            return playlist;
        }

        return null;
    }

    /**
     * sends a notification to the ui
     * @param {string} body
     */
    notify = (body) => {
        const options = {
            title: `TeleTube Player`,
            body: body,
        };
        let myNotification = new Notification(options);
        logger.info(`Notifying: ${body}`, tag.MAIN);
        myNotification.show();
    };

    loading = (isLoading) => {
        this.window.webContents.send(`loading`, isLoading);
    };

    updateLoading = (message) => {
        this.window.webContents.send(`update-loading`, message);
    };

    loadStatus = (status) => {
        this.window.webContents.send(`load-status`, status);
    };

    remoteSkip = () => {
        this.window.webContents.send(`skip`);
    };

    remotePrev = () => {
        this.window.webContents.send(`prev`);
    };

    remoteResume = () => {
        this.window.webContents.send(`resume`);
    };

    remotePause = () => {
        this.window.webContents.send(`pause`);
    };

    remoteShuffleEnd = () => {
        this.window.webContents.send(`shuffle-end`);
    };

    remoteShuffleStart = () => {
        this.window.webContents.send(`shuffle-start`);
    };

    uiAddSongError = (song, error) => {
        this.window.webContents.send(`ui-add-song-error`, song, error);
    };

    uiAddSongSuccess = (song) => {
        this.window.webContents.send(`ui-add-song-success`, song);
    };

    uiAddPlaySongError = (song, error) => {
        this.window.webContents.send(`ui-add-play-song-error`, song, error);
    };

    uiAddPlaySongSuccess = (song) => {
        this.window.webContents.send(`ui-add-play-song-success`, song);
    };

    uiYoutubeSearchResult = (results) => {
        this.window.webContents.send(`ui-youtube-search-result`, results);
    };

    uiYoutubeSearchError = (error) => {
        this.window.webContents.send(`ui-youtube-search-error`, error);
    };

    remotePlay = (song) => {
        this.window.webContents.send(`play`, song);
    };

    songCheckedToPlay = (song) => {
        this.window.webContents.send(`song-checked-to-play`, song);
    };

    sendPlaylists = (playlists) => {
        this.window.webContents.send(`playlists`, playlists);
    };

    loadConfig = (config) => {
        this.window.webContents.send(`config-update`, config);
    };

    createPlaylistResponse = (isSuccess, msg) => {
        this.window.webContents.send(`create-playlist-response`, isSuccess, msg);
    };

    editPlaylistResponse = (isSuccess, msg) => {
        this.window.webContents.send(`edit-playlist-response`, isSuccess, msg);
    };

    setVolume = async (volume) => {
        if (this.device !== null) {
            try {
                await this.device.setVolume(volume / 100);
                logger.info(`volume set on ${volume} on device ${this.device.friendlyName}`, tag.CAST);
            } catch (error) {
                logger.error(makeError(error), tag.CAST);
            }
        } else {
            this.window.webContents.send(`set-volume`, volume);
        }
    };

    devicePause = async () => {
        if (this.device !== null) {
            try {
                await this.device.pause();
                logger.info(`song paused on ${this.device.friendlyName}`, tag.CAST);
            } catch (error) {
                logger.error(makeError(error), tag.CAST);
            }
        }
    };

    deviceStop = async () => {
        if (this.device !== null) {
            try {
                this.device.stop();
                logger.info(`song stop on ${this.device.friendlyName}`, tag.CAST);
            } catch (error) {
                logger.error(makeError(error), tag.CAST);
            }
        }
    };

    deviceSeek = async (time) => {
        if (this.device !== null) {
            try {
                await this.device.seek(time);
                logger.info(`song seek on ${this.device.friendlyName}`, tag.CAST);
            } catch (error) {
                logger.error(makeError(error), tag.CAST);
            }
        }
    };

    deviceResume = async () => {
        if (this.device !== null) {
            try {
                await this.device.resume();
                logger.info(`song resumed on ${this.device.friendlyName}`, tag.CAST);
            } catch (error) {
                logger.error(makeError(error), tag.CAST);
            }
        }
    };

    devicePlay = async (song) => {
        if (this.device !== null) {
            try {
                await this.device.play(
                    {
                        url: song.audioUrl,
                        mimeType: song.mimeType,
                    },
                    {
                        title: song.title,
                        img: song.image,
                        artist: song.description,
                        albumName: song.addedBy,
                    }
                );
                logger.info(`song ${song.title} playing on ${this.device.friendlyName}`, tag.CAST);
            } catch (error) {
                logger.error(makeError(error), tag.CAST);
                this.window.webContents.send(`refresh-song`);
            }
        }
    };

    stop = () => {
        this.window.webContents.send(`stop`);
    };

    notifyDevice = (devices) => {
        this.window.webContents.send(`devices`, devices);
    };

    deviceSendStatus = async () => {
        if (this.device) {
            try {
                let status = await this.device.getStatus();
                let duration = status.playerState === "PLAYING" && status.media ? Math.floor(status.media.duration) : 0;
                this.window.webContents.send(`device-status`, status.playerState, duration, status);
            } catch (error) {
                logger.error(makeError(error), tag.CAST);
            }
        }
    };

    setDevice = async (device) => {
        if (!this.device) {
            this.device = device;
            await this.device.connectAndLaunch();
            this.notifyDeviceSelected();
            let self = this;

            function onStatus(status) {
                logger.info(`new status: ${status.playerState} on device ${self.device.friendlyName}`, tag.CAST);
                let duration = status.playerState === "PLAYING" && status.media ? Math.floor(status.media.duration) : 0;
                self.window.webContents.send(`device-status`, status.playerState, duration, status);
            }

            function onFinished() {
                logger.info(`song finished on device ${self.device.friendlyName}`, tag.CAST);
                self.window.webContents.send(`device-finish`);
            }

            function onDisconnected() {
                self.device.removeListener("status", onStatus);
                self.device.removeListener("finished", onFinished);
                self.device = null;
                self.notifyDeviceDisconnected();
                self.stopPolling();
            }

            this.device.on("status", onStatus);
            this.device.on("finished", onFinished);
            this.device.once("disconnected", onDisconnected);

            this.startPolling();
        } else {
            this.notifyDeviceSelected();
        }
    };

    notifyDeviceSelected = () => {
        if (this.device) {
            this.window.webContents.send(`device-selected`, this.device.object());
            this.notify(`Connected to Device ${this.device.friendlyName}`);
        }
    };

    notifyDeviceDisconnected = () => {
        logger.info(`device disconnected`, tag.CAST);
        this.window.webContents.send(`device-disconnected`);
    };

    setYoutubeChannel = (channel) => {
        this.window.webContents.send(`set-youtube-channel`, channel);
    };

    disconnectDevice = async () => {
        if (this.device) {
            try {
                await this.device.close();
                this.device = null;
            } catch (error) {
                logger.error(makeError(error), tag.PLAYER);
                try {
                    this.device = null;
                } catch (error) {
                    logger.error(makeError(error), tag.PLAYER);
                }
            }
        }
    };
}

module.exports.Player = Player;
