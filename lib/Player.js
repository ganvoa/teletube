const { BrowserWindow, Notification } = require('electron');
const Device = require('chromecast-api/lib/device');
const { logger, tag } = require('./logger');
const { makeError } = require('./utils');
const path = require('path');

class Player {
    window;
    device;

    deviceGetUpdate = async () => {
        try {
            if (this.device !== null) {
                let status = await this.device.getStatus();
                if (status) {
                    if (status.playerState == 'PLAYING') {
                        if (this.window) {
                            let volume = status.volume.muted ? 0 : status.volume.level;
                            this.window.webContents.send(`device-update`, Math.floor(status.currentTime), volume);
                        }
                    }
                }
                setTimeout(() => {
                    this.deviceGetUpdate();
                }, 300);
            }
        } catch (error) {
            logger.error(makeError(error), tag.PLAYER);
        }
    };

    constructor(onLoad) {
        this.device = null;

        this.window = new BrowserWindow({
            title: 'TeleTube Player',
            icon: path.join(__dirname, '../assets/favicon.png'),
            width: 1000,
            height: 650,
            minWidth: 850,
            minHeight: 550,
            show: true,
            center: true,
            webPreferences: {
                nodeIntegration: true,
            },
        });
        this.window.setMenu(null);
        this.window.openDevTools();
        // this.window.loadURL(`file://${path.join(__dirname, '../view/index.html')}`)
        this.window.loadURL(`http://localhost:3001`);
        this.window.show();
        this.window.webContents.on('did-finish-load', () => {
            onLoad();
        });
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
                this.deviceGetUpdate();
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
                let status = await this.getStatus(this.device);
                let duration = status.playerState === 'PLAYING' && status.media ? Math.floor(status.media.duration) : 0;
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
                let duration = status.playerState === 'PLAYING' && status.media ? Math.floor(status.media.duration) : 0;
                self.window.webContents.send(`device-status`, status.playerState, duration, status);
            }

            function onFinished() {
                logger.info(`song finished on device ${self.device.friendlyName}`, tag.CAST);
                self.window.webContents.send(`device-finish`);
            }

            function onDisconnected() {
                self.device.removeListener('status', onStatus);
                self.device.removeListener('finished', onFinished);
                self.device = null;
                self.notifyDeviceDisconnected();
            }

            this.device.on('status', onStatus);
            this.device.on('finished', onFinished);
            this.device.once('disconnected', onDisconnected);
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
                this.notifyDeviceDisconnected();
            } catch (error) {
                logger.error(makeError(error), tag.PLAYER);
                try {
                    this.device = null;
                    this.notifyDeviceDisconnected();
                } catch (error) {
                    logger.error(makeError(error), tag.PLAYER);
                }
            }
        }
    };
}

module.exports.Player = Player;
