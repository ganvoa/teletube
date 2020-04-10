const { Client } = require('castv2-client');
const EventEmitter = require('events');
const { StyledMediaReceiver } = require('./StyledMediaReceiver');

class Device extends EventEmitter {
    constructor(name, friendlyName, host) {
        super();

        this.name = name;
        this.friendlyName = friendlyName;
        this.host = host;

        this.client = null;
        this.player = null;
    }

    object() {
        return {
            name: this.name,
            friendlyName: this.friendlyName,
            host: this.host
        };
    }

    connect() {
        return new Promise((resolve, reject) => {
            if (this.client === null) {
                this.client = new Client();
                console.log('client on error');
                this.client.on('error', error => {
                    this.client.close();
                    this.client = null;
                    reject(error);
                });

                this.client.connect(this.host, () => {
                    resolve();
                });
            } else resolve();
        });
    }

    launch(app) {
        return new Promise((resolve, reject) => {
            if (this.client === null) {
                reject(new Error('Client not initialized'));
                return;
            }

            this.client.getSessions((err, sessions) => {
                if (err) {
                    reject(err);
                    return;
                }

                const filtered = sessions.filter(session => {
                    return session.appId === app.APP_ID;
                });
                const session = filtered.shift();

                if (session) {
                    this.client.join(session, app, (error, player) => {
                        if (error) {
                            reject(error);
                            return;
                        }

                        resolve(player);
                    });
                } else {
                    this.client.launch(app, (error, player) => {
                        if (error) {
                            reject(error);
                            return;
                        }

                        resolve(player);
                    });
                }
            });
        });
    }

    async playMedia(media, metadata, opts) {
        if (this.player == null) {
            this.player = await this.launch(StyledMediaReceiver);
            console.log('client on status');
            this.player.on('status', status => {
                this.emit('status', status);
                if (status.playerState === 'IDLE' && status.idleReason === 'FINISHED') {
                    this.emit('finished');
                }
            });
        }
        return await this.playAudio(media, metadata, opts);
    }

    /**
     * @param {Object} audioMedia
     * @param {string} audioMedia.url - Audio resource URL
     * @param {string} audioMedia.mimeType - Audio mimeType
     * @param {Object} metadata - Audio Metada
     * @param {string} metadata.title - Audio title
     * @param {string} metadata.img - URL of the audio image
     * @param {Object} options - Player Options
     * @param {boolean} options.autoplay - Should autoplay. Default = true
     * @param {number} options.currentTime - Starting point in seconds. Default = 0
     */
    async play(audioMedia, metadata, options) {
        await this.connect();
        await this.playMedia(audioMedia, metadata, options);
    }

    playAudio(audioMedia, metadata, opt = {}) {
        return new Promise((resolve, reject) => {
            let media = {
                contentId: audioMedia.url,
                contentType: audioMedia.mimeType
            };

            media.metadata = {
                type: 3,
                metadataType: 3,
                title: metadata.title || undefined,
                artist: metadata.artist || undefined,
                albumName: metadata.albumName || undefined,
                albumArtist: metadata.albumArtist || undefined,
                composer: metadata.composer || undefined,
                releaseDate: metadata.releaseDate || undefined,
                songName: metadata.songName || undefined,
                images: [
                    {
                        url: metadata.img
                    }
                ]
            };

            let options = {
                autoplay: opt.autoplay || true,
                currentTime: opt.currentTime || 0
            };

            this.player.load(media, options, error => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }

    getStatus() {
        return new Promise((resolve, reject) => {
            this.player.getStatus((err, status) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(status);
            });
        });
    }

    seek(seconds) {
        return new Promise((resolve, reject) => {
            this.player.seek(seconds, err => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    pause() {
        return new Promise((resolve, reject) => {
            this.player.pause(err => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    resume() {
        return new Promise((resolve, reject) => {
            this.player.play(err => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    setVolume(volume) {
        return new Promise((resolve, reject) => {
            this.client.setVolume({ level: volume }, err => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    stop() {
        return new Promise((resolve, reject) => {
            this.player.stop(err => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    mute() {
        return new Promise((resolve, reject) => {
            this.client.setVolume({ muted: true }, err => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    unmute() {
        return new Promise((resolve, reject) => {
            this.client.setVolume({ muted: false }, err => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.client.stop(this.player, error => {
                if (error) {
                    reject(error);
                    return;
                }
                this.client.close();
                this.client = null;
                resolve();
            });
        });
    }
}

module.exports.Device = Device;
