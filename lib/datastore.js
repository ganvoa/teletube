const Store = require("electron-store");
const uuidv4 = require("uuid").v4;

const defaultStatus = {
    currentSong: null,
    prevSong: null,
    nextSong: null,
    loop: true,
    currentPlaylist: null
};

const defaultConfig = {
    telegramBotToken: null,
    telegramBotTokenValid: false,
    youtubeApiKey: null,
    youtubeApiKeyValid: false
};

const defaultPlaylists = [];

class DataStore extends Store {
    constructor(settings) {
        super(settings);
        this.playlists = this.get("playlists") || [] || defaultPlaylists;
        this.config = this.get("config") || defaultConfig;
        this.status = this.get("status") || defaultStatus;
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
        return this.get("status") || defaultStatus;
    }

    getConfig() {
        return this.get("config") || defaultConfig;
    }

    addPlaylist(name) {
        let playlists = this.get("playlists") || [];
        let newPlaylist = {
            uid: uuidv4(),
            name: name,
            tracks: []
        };
        playlists.push(newPlaylist);
        this.set("playlists", playlists);
        return newPlaylist.uid;
    }

    deletePlaylist(playlistId) {
        let playlists = (this.get("playlists") || []);
        playlists = playlists.filter(pl => pl.uid !== playlistId);
        this.set("playlists", playlists);

        let status = this.getStatus();
        let currentPl = status.currentPlaylist;
        if (currentPl !== null && currentPl.uid == playlistId) {
            status.currentPlaylist = null;
            status.currentSong = null;
            status.prevSong = null;
            status.nextSong = null;
        }
        this.saveStatus(status);
        return this;
    }

    savePlaylist(uid, name, tracks) {
        let playlists = (this.get("playlists") || []).map(pl => {
            if (pl.uid !== uid) return pl;
            return {
                uid: uid,
                tracks: tracks,
                name: name
            };
        });
        this.set("playlists", playlists);
        let status = this.get("status");
        if (status.currentPlaylist !== null && status.currentPlaylist.uid == uid) {
            status.currentPlaylist = this.getPlaylist(uid);
            this.saveStatus(status);
        }
        return this;
    }

    getPlaylists() {
        return (this.get("playlists") || []);
    }

    getPlaylist(playlistId) {
        let pls = (this.get("playlists") || []).filter(
            playlist => playlist.uid == playlistId
        );
        if (pls.length > 0) return pls[0];
        else return null;
    }

    shuffle(playlistId) {
        let playlist = this.getPlaylist(playlistId);
        let tracks = playlist.tracks;
        for (let i = tracks.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [tracks[i], tracks[j]] = [
                tracks[j],
                tracks[i]
            ];
        }
        return this.savePlaylist(playlist.uid, playlist.name, tracks);
    }

    addSong(playlistId, song) {
        let playlist = this.getPlaylist(playlistId);
        if (playlist !== null) {
            playlist.tracks = [...playlist.tracks, song];
            this.savePlaylist(playlistId, playlist.name, playlist.tracks);
        }
        return this;
    }

    putSongNext(playlistId, song) {
        let playlist = this.getPlaylist(playlistId);
        if (playlist === null) return this;
        let currentPlaylist = this.get("status").currentPlaylist;
        let currentSong = this.get("status").currentSong;
        if (playlistId === currentPlaylist.uid) {
            if (currentSong) {
                let index = playlist.tracks.findIndex(s => {
                    return s.id == currentSong.id;
                });
                if (index === -1) playlist.tracks = [...playlist.tracks, song];
                else playlist.tracks.splice(index + 1, 0, song);
            } else {
                playlist.tracks = [...playlist.tracks, song];
            }

            this.savePlaylist(playlist.uid, playlist.name, playlist.tracks);
        }
        return this;
    }

    deleteSong(playlistId, song) {
        let playlist = this.getPlaylist(playlistId);
        if (playlist === null) return this;
        playlist.tracks = playlist.tracks.filter(s => s.id !== song.id);

        this.savePlaylist(playlist.uid, playlist.name, playlist.tracks);
        return this;
    }

    updateSong(playlistId, song) {
        let playlist = this.getPlaylist(playlistId);
        if (playlist === null) return this;

        playlist.tracks = playlist.tracks.map(s => {
            if (s.id !== song.id) return s;
            return song;
        });

        return this.savePlaylist(playlist.uid, playlist.name, playlist.tracks);
    }
}

module.exports = DataStore;
