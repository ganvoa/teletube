const { app, BrowserWindow, Notification, Tray, Menu } = require("electron");
const Device = require("chromecast-api/lib/device");
const { logger, tag } = require("./logger");
const { makeError } = require("./utils");
const path = require("path");

class Player {
    window;
    device;

    getStatus = async device => {
        return new Promise((resolve, reject) => {
            device.getStatus((err, status) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(status);
            });
        });
    };

    update = async device => {
        try {
            let status = await this.getStatus(device);
            if (status) {
                if (status.playerState == "PLAYING") {
                    if (this.window) {
                        let volume = status.volume.muted ? 0 : status.volume.level;
                        this.window.webContents.send(`device-update`, Math.floor(status.currentTime), volume);
                    }
                }
            }
            this.update(device);
        } catch (error) {
            logger.error(makeError(error), tag.PLAYER);
        }
    };

    constructor(onLoad) {
        this.device = null;

        this.window = new BrowserWindow({
            title: "TeleTube Player",
            icon: path.join(__dirname, "../assets/favicon.png"),
            width: 1000,
            height: 650,
            minWidth: 850,
            minHeight: 550,
            show: true,
            center: true,
            webPreferences: {
                nodeIntegration: true
            }
        });
        this.window.setMenu(null);
        this.window.openDevTools();
        // this.window.loadURL(`file://${path.join(__dirname, '../view/index.html')}`)
        this.window.loadURL(`http://localhost:3001`);
        let self = this;
        self.window.show();

        const contextMenu = Menu.buildFromTemplate([
            {
                label: "Show App",
                click: function() {
                    self.window.show();
                }
            },
            {
                label: "Quit",
                click: function() {
                    app.isQuiting = true;
                    self.window.close();
                }
            }
        ]);
        const appIcon = new Tray(path.join(__dirname, "../assets/favicon.png"));
        appIcon.setContextMenu(contextMenu);
        this.window.webContents.on("did-finish-load", () => {
            onLoad();
        });

        this.window.on("minimize", function(event) {
            event.preventDefault();
            self.window.hide();
        });

        this.window.on("close", function(event) {
            if (!app.isQuiting) {
                event.preventDefault();
                self.window.hide();
            }

            return false;
        });
    }

    /**
     * sends a notification to the ui
     * @param {string} body
     */
    notify = body => {
        const options = {
            title: `TeleTube Player`,
            body: body
        };
        let myNotification = new Notification(options);
        logger.info(`Notifying: ${body}`, tag.MAIN);
        myNotification.show();
    };

    loading = isLoading => {
        this.window.webContents.send(`loading`, isLoading);
    };

    updateLoading = message => {
        this.window.webContents.send(`update-loading`, message);
    };

    loadStatus = status => {
        this.window.webContents.send(`load-status`, status);
    };

    remoteSkip = () => {
        this.window.webContents.send(`skip`, {});
    };

    remotePrev = () => {
        this.window.webContents.send(`prev`, {});
    };

    remoteResume = () => {
        this.window.webContents.send(`resume`, {});
    };

    remotePause = () => {
        this.window.webContents.send(`pause`, {});
    };

    remoteShuffleEnd = () => {
        this.window.webContents.send(`shuffle-end`, {});
    };

    remoteShuffleStart = () => {
        this.window.webContents.send(`shuffle-start`, {});
    };

    uiAddSongError = (song, error) => {
        this.window.webContents.send(`ui-add-song-error`, song, error);
    };

    uiAddSongSuccess = song => {
        this.window.webContents.send(`ui-add-song-success`, song);
    };

    uiAddPlaySongError = (song, error) => {
        this.window.webContents.send(`ui-add-play-song-error`, song, error);
    };

    uiAddPlaySongSuccess = song => {
        this.window.webContents.send(`ui-add-play-song-success`, song);
    };

    uiYoutubeSearchResult = results => {
        this.window.webContents.send(`ui-youtube-search-result`, results);
    };

    uiYoutubeSearchError = error => {
        this.window.webContents.send(`ui-youtube-search-error`, error);
    };

    remotePlay = song => {
        this.window.webContents.send(`play`, song);
    };

    songCheckedToPlay = song => {
        this.window.webContents.send(`song-checked-to-play`, song);
    };

    sendPlaylists = playlists => {
        this.window.webContents.send(`playlists`, playlists);
    };

    loadConfig = config => {
        this.window.webContents.send(`config-update`, config);
    };

    createPlaylistResponse = (isSuccess, msg) => {
        this.window.webContents.send(`create-playlist-response`, isSuccess, msg);
    };

    setVolume = volume => {
        if (this.device !== null) {
            this.device.setVolume(volume / 100, error => {
                if (error) {
                    logger.error(makeError(error), tag.CAST);
                    return;
                }
                logger.info(`volume set on ${volume} on device ${this.device.friendlyName}`, tag.CAST);
            });
        } else {
            this.window.webContents.send(`set-volume`, volume);
        }
    };

    devicePause = () => {
        if (this.device !== null) {
            this.device.pause(error => {
                if (error) {
                    logger.error(makeError(error), tag.CAST);
                    return;
                }
                logger.info(`song paused on ${this.device.friendlyName}`, tag.CAST);
            });
        }
    };

    deviceStop = () => {
        if (this.device !== null) {
            this.device.stop(error => {
                if (error) {
                    logger.error(makeError(error), tag.CAST);
                    return;
                }
                logger.info(`song stop on ${this.device.friendlyName}`, tag.CAST);
            });
        }
    };

    deviceSeek = time => {
        if (this.device !== null) {
            this.device.seek(time, error => {
                if (error) {
                    logger.error(makeError(error), tag.CAST);
                    return;
                }
                logger.info(`song seek on ${this.device.friendlyName}`, tag.CAST);
            });
        }
    };

    deviceResume = () => {
        if (this.device !== null) {
            this.device.resume(error => {
                if (error) {
                    logger.error(makeError(error), tag.CAST);
                    return;
                }
                logger.info(`song resumed on ${this.device.friendlyName}`, tag.CAST);
            });
        }
    };

    devicePlay = song => {
        if (this.device !== null) {
            this.device.play(
                {
                    url: song.audioUrl,
                    contentType: "audio/webm",
                    cover: {
                        title: song.title,
                        url: song.image
                    }
                },
                error => {
                    if (error) {
                        logger.error(makeError(error), tag.CAST);
                        this.window.webContents.send(`refresh-song`, {});
                        return;
                    }
                    logger.info(`song ${song.title} playing on ${this.device.friendlyName}`, tag.CAST);
                    this.update(this.device);
                }
            );
        }
    };

    stop = () => {
        this.window.webContents.send(`stop`, {});
    };

    notifyDevice = devices => {
        this.window.webContents.send(`devices`, devices);
    };

    deviceSendStatus = async () => {
        if (this.device) {
            try {
                let status = await this.getStatus(this.device);
                this.window.webContents.send(
                    `device-status`,
                    status.playerState,
                    status.playerState === "PLAYING" && status.media ? Math.floor(status.media.duration) : 0,
                    status
                );
            } catch (error) {
                logger.error(makeError(error), tag.CAST);
            }
        }
    };

    setDevice = device => {
        if (!this.device) {
            const opts = {
                name: device.name,
                friendlyName: device.friendlyName,
                host: device.host
            };
            this.device = new Device(opts);
            this.device._connect(() => {
                this.window.webContents.send(`device-selected`, device);
                this.notify(`Connected to Device ${device.friendlyName}`);
            });
            this.device.on("status", status => {
                logger.info(`new status: ${status.playerState} on device ${this.device.friendlyName}`, tag.CAST);
                this.window.webContents.send(
                    `device-status`,
                    status.playerState,
                    status.playerState === "PLAYING" && status.media ? Math.floor(status.media.duration) : 0,
                    status
                );
            });
            this.device.on("finished", () => {
                logger.info(`song finished on device ${this.device.friendlyName}`, tag.CAST);
                this.window.webContents.send(`device-finish`, {});
            });
        } else {
            this.window.webContents.send(`device-selected`, this.device);
            this.notify(`Connected to Device ${this.device.friendlyName}`);
        }
    };

    notifyDeviceSelected = () => {
        if (this.device) {
            this.window.webContents.send(`device-selected`, this.device);
            this.notify(`Connected to Device ${this.device.friendlyName}`);
        }
    };

    setYoutubeChannel = channel => {
        this.window.webContents.send(`set-youtube-channel`, channel);
    };

    disconnectDevice = () => {
        if (this.device) {
            let deviceName = this.device.friendlyName;
            try {
                this.device.close(() => {
                    this.device = null;
                    try {
                        this.window.webContents.send(`device-disconnected`, {});
                        this.notify(`Disconnected from Device ${deviceName}`);
                    } catch (error) {
                        logger.error(makeError(error), tag.PLAYER);
                    }
                });
            } catch (error) {
                try {
                    this.window.webContents.send(`device-disconnected`, {});
                    this.notify(`Disconnected from Device ${deviceName}`);
                } catch (error) {
                    logger.error(makeError(error), tag.PLAYER);
                }
            }
        }
    };
}

module.exports.Player = Player;
