const Store = require("electron-store");

class DataStore extends Store {
    constructor(settings) {
        super(settings);
        this.playlist = this.get("playlist") || [];
        this.config = this.get("config") || {
            telegramBotToken: null,
            telegramBotTokenValid: false,
            youtubeApiKey: null,
            youtubeApiKeyValid: false
        };
        this.status = this.get("status") || {
            currentSong: null,
            prevSong: null,
            nextSong: null,
            loop: true
        };
    }

    saveStatus(status) {
        this.set("status", status);
        return this;
    }

    saveConfig(config) {
        this.set("config", config);
        return this;
    }

    getStatus() {
        return (
            this.get("status") || {
                currentSong: null,
                prevSong: null,
                nextSong: null,
                loop: true
            }
        );
    }

    getConfig() {
        return (
            this.get("config") || {
                telegramBotToken: null,
                telegramBotTokenValid: false,
                youtubeApiKey: null,
                youtubeApiKeyValid: false
            }
        );
    }

    savePlaylist() {
        this.set("playlist", this.playlist);
        return this;
    }

    getPlaylist() {
        this.playlist = this.get("playlist") || [];

        return this.playlist;
    }

    shuffle() {
        this.playlist = this.get("playlist") || [];
        for (let i = this.playlist.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [this.playlist[i], this.playlist[j]] = [
                this.playlist[j],
                this.playlist[i]
            ];
        }
        return this.savePlaylist(this.playlist);
    }

    addSong(song) {
        this.playlist = [...this.playlist, song];
        return this.savePlaylist();
    }

    putSongNext(song) {
        let currentSong = this.get("status").currentSong;
        let index = this.playlist.findIndex(s => {
            return s.uid == currentSong.uid;
        });
        if (index === -1) this.playlist = [...this.playlist, song];
        else this.playlist.splice(index + 1, 0, song);

        return this.savePlaylist();
    }

    deleteSong(song) {
        this.playlist = this.playlist.filter(s => s.uid !== song.uid);

        return this.savePlaylist();
    }

    updateSong(song) {
        this.playlist = this.playlist.map(s => {
            if (s.uid !== song.uid) return s;
            return song;
        });

        return this.savePlaylist();
    }
}

module.exports = DataStore;
