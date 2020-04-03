const ChromecastAPI = require("chromecast-api");
const { logger, tag } = require("./lib/logger");
const Youtube = require("./lib/Youtube");
const { app, ipcMain } = require("electron");
const { Player } = require("./lib/Player");
const { Bot } = require("./lib/Bot");
const { makeError } = require("./lib/utils");
const DataStore = require("./lib/datastore");
const teletubeData = new DataStore({ name: "teletube" });

app.allowRendererProcessReuse = true;

/**
 * @type {Bot}
 */
let bot = null;
/**
 * @type {Player}
 */
let player = null;
let decipher = null;
let INTERVAL_CHROMECAST_ID = null;

const getDevice = (name, devices) => {
    for (let index = 0; index < devices.length; index++) {
        if (devices[index].name == name) {
            return devices[index];
        }
    }
    return name;
};

const startBot = async telegramBotToken => {
    logger.info(`starting bot with token: ${telegramBotToken}`, tag.TELEGRAM);
    bot = new Bot(telegramBotToken);

    bot.onPlay(chatId => {
        logger.info(`received command /play`, tag.TELEGRAM);
        if (teletubeData.getStatus().currentPlaylist === null) {
            logger.warn(`no playlist selected`, tag.TELEGRAM);
            bot.notify(chatId, `No playlist selected`);
            return;
        }
        try {
            let song = teletubeData.getStatus().currentSong;
            if (song !== null) {
                player.remoteResume();
                bot.notify(chatId, `:)`);
            } else {
                let playlist = teletubeData.getPlaylist(teletubeData.getStatus().currentPlaylist.uid);
                if (playlist.tracks.length > 0) {
                    song = playlist.tracks[0];
                    player.remotePlay(song);
                } else {
                    throw new Error(`empty playlist`);
                }
                bot.notify(chatId, `:)`);
            }
            bot.notify(chatId, `Se está reproduciendo la canción: ${song.title}`);
        } catch (error) {
            bot.notify(chatId, `${error}`);
            logger.error(makeError(error), tag.TELEGRAM);
        }
    });

    bot.onPlaySong(async (chatId, query, from) => {
        logger.info(`received command /play ${query}`, tag.TELEGRAM);
        if (teletubeData.getStatus().currentPlaylist === null) {
            logger.warn(`no playlist selected`, tag.TELEGRAM);
            bot.notify(chatId, `No playlist selected`);
            return;
        }
        try {
            bot.notify(chatId, `Buscando la canción: ${query}`);
            logger.info(`searching for ${query}`, tag.YOUTUBE);
            let song = await Youtube.getSong(query);
            logger.info(`got song ${song.id} - ${song.title}`, tag.YOUTUBE);
            song = await Youtube.updateSongWithAudio(song, decipher);
            logger.info(`got audio url for song ${song.id}`, tag.YOUTUBE);
            let playlistId = teletubeData.getStatus().currentPlaylist.uid;
            logger.info(`updating playlist ${playlistId}`, tag.MAIN);
            teletubeData.putSongNext(playlistId, song, from);
            player.loadStatus(teletubeData.getStatus());
            player.remotePlay(song);
            bot.notify(chatId, `Se está reproduciendo la canción: ${song.title}`);
        } catch (error) {
            bot.notify(chatId, `Error: ${error.message}`);
            logger.error(makeError(error), tag.TELEGRAM);
        }
    });

    bot.onAddSong(async (chatId, query, from) => {
        logger.info(`received command /add ${query}`, tag.TELEGRAM);
        if (teletubeData.getStatus().currentPlaylist === null) {
            logger.warn(`no playlist selected`, tag.TELEGRAM);
            bot.notify(chatId, `No playlist selected`);
            return;
        }
        try {
            bot.notify(chatId, `Buscando la canción: ${query}`);
            logger.info(`searching for ${query}`, tag.YOUTUBE);
            let song = await Youtube.getSong(query);
            logger.info(`got song ${song.id} - ${song.title}`, tag.YOUTUBE);
            song = await Youtube.updateSongWithAudio(song, decipher);
            logger.info(`got audio url for song ${song.id}`, tag.YOUTUBE);
            let playlistId = teletubeData.getStatus().currentPlaylist.uid;
            teletubeData.addSong(playlistId, song, from);
            player.loadStatus(teletubeData.getStatus());
            bot.notify(chatId, `Se agregó la canción: ${song.title}`);
        } catch (error) {
            bot.notify(chatId, `Error: ${error.message}`);
            logger.error(makeError(error), tag.TELEGRAM);
        }
    });

    bot.onAddNextSong(async (chatId, query, from) => {
        logger.info(`received command /next ${query}`, tag.TELEGRAM);
        if (teletubeData.getStatus().currentPlaylist === null) {
            logger.warn(`no playlist selected`, tag.TELEGRAM);
            bot.notify(chatId, `No playlist selected`);
            return;
        }
        try {
            bot.notify(chatId, `Buscando la canción: ${query}`);
            logger.info(`searching for ${query}`, tag.YOUTUBE);
            let song = await Youtube.getSong(query);
            logger.info(`got song ${song.id} - ${song.title}`, tag.YOUTUBE);
            song = await Youtube.updateSongWithAudio(song, decipher);
            logger.info(`got audio url for song ${song.id}`, tag.YOUTUBE);
            let playlistId = teletubeData.getStatus().currentPlaylist.uid;
            teletubeData.putSongNext(playlistId, song, from);
            player.loadStatus(teletubeData.getStatus());
            bot.notify(chatId, `Se agregó la canción: ${song.title}`);
        } catch (error) {
            bot.notify(chatId, `Error: ${error.message}`);
            logger.error(makeError(error), tag.TELEGRAM);
        }
    });

    bot.onPlayNextSong(chatId => {
        logger.info(`received command /next`, tag.TELEGRAM);
        if (teletubeData.getStatus().currentPlaylist === null) {
            logger.warn(`no playlist selected`, tag.TELEGRAM);
            bot.notify(chatId, `No playlist selected`);
            return;
        }
        try {
            bot.notify(chatId, `:)`);
            player.remoteSkip();
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(makeError(error), tag.TELEGRAM);
        }
    });

    bot.onStop(chatId => {
        logger.info(`received command /stop`, tag.TELEGRAM);
        if (teletubeData.getStatus().currentPlaylist === null) {
            logger.warn(`no playlist selected`, tag.TELEGRAM);
            bot.notify(chatId, `No playlist selected`);
            return;
        }
        try {
            player.stop();
            bot.notify(chatId, `:)`);
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(makeError(error), tag.TELEGRAM);
        }
    });

    bot.onPause(chatId => {
        logger.info(`received command /pause`, tag.TELEGRAM);
        if (teletubeData.getStatus().currentPlaylist === null) {
            logger.warn(`no playlist selected`, tag.TELEGRAM);
            bot.notify(chatId, `No playlist selected`);
            return;
        }
        try {
            bot.notify(chatId, `:)`);
            player.remotePause();
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(makeError(error), tag.TELEGRAM);
        }
    });

    bot.onPrevSong(chatId => {
        logger.info(`received command /prev`, tag.TELEGRAM);
        if (teletubeData.getStatus().currentPlaylist === null) {
            logger.warn(`no playlist selected`, tag.TELEGRAM);
            bot.notify(chatId, `No playlist selected`);
            return;
        }
        try {
            bot.notify(chatId, `:)`);
            player.remotePrev();
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(makeError(error), tag.TELEGRAM);
        }
    });

    bot.onShuffle(chatId => {
        logger.info(`received command /shuffle`, tag.TELEGRAM);
        if (teletubeData.getStatus().currentPlaylist === null) {
            logger.warn(`no playlist selected`, tag.TELEGRAM);
            bot.notify(chatId, `No playlist selected`);
            return;
        }

        try {
            bot.notify(chatId, `:)`);
            player.remoteShuffleStart();
            let playlistId = teletubeData.getStatus().currentPlaylist.uid;
            teletubeData.shuffle(playlistId);
            player.loadStatus(teletubeData.getStatus());
            setTimeout(() => {
                player.remoteShuffleEnd();
            }, 1000);
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(makeError(error), tag.TELEGRAM);
        }
    });

    bot.onVolume((chatId, volume) => {
        logger.info(`received command /volume ${volume}`, tag.TELEGRAM);
        try {
            player.setVolume(volume);
            bot.notify(chatId, `:)`);
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(makeError(error), tag.TELEGRAM);
        }
    });

    bot.onList(chatId => {
        logger.info(`received command /list`, tag.TELEGRAM);

        if (teletubeData.getStatus().currentPlaylist === null) {
            logger.warn(`no playlist selected`, tag.TELEGRAM);
            bot.notify(chatId, `No playlist selected`);
            return;
        }

        let playlistId = teletubeData.getStatus().currentPlaylist.uid;
        let playlist = teletubeData.getPlaylist(playlistId);
        if (playlist.tracks.length === 0) {
            logger.warn(`empty playlist`, tag.TELEGRAM);
            bot.notify(chatId, `empty playlist`);
            return;
        }

        try {
            let showNext = playlist.tracks.length > 5;
            let options = {
                parse_mode: "HTML",
                disable_web_page_preview: true
            };

            let songs = [];
            for (let index = 1; index <= Math.min(5, playlist.tracks.length); index++) {
                songs.push({
                    text: "▶️ " + index,
                    callback_data: "/song " + index
                });
            }
            let pages = [];
            if (showNext) {
                pages.push({ text: "Next Page >", callback_data: "/page 2" });
            }
            let inline_keyboard = [];
            inline_keyboard.push(songs);
            inline_keyboard.push(pages);
            options.reply_markup = {
                inline_keyboard: inline_keyboard
            };
            let msg = `🎵 <b>Playlist</b> <i>${playlist.tracks.length} Songs</i> Page 1\n\n`;
            playlist.tracks.slice(0, 5).forEach((song, key) => {
                msg += `#${key + 1} - ${song.title}\n<a href="${song.url}">Youtube</a> | <a href="${
                    song.audioUrl
                }">Audio</a>\n\n`;
            });
            bot.notify(chatId, msg, options);
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(makeError(error), tag.TELEGRAM);
        }
    });

    bot.onSong((chatId, songIndex) => {
        logger.info(`received command /song ${songIndex}`, tag.TELEGRAM);
        if (teletubeData.getStatus().currentPlaylist === null) {
            logger.warn(`no playlist selected`, tag.TELEGRAM);
            bot.notify(chatId, `No playlist selected`);
            return;
        }

        songIndex = parseInt(songIndex);
        let playlistId = teletubeData.getStatus().currentPlaylist.uid;
        let playlist = teletubeData.getPlaylist(playlistId);
        if (playlist.tracks.length === 0) {
            logger.warn(`empty playlist`, tag.TELEGRAM);
            bot.notify(chatId, `empty playlist`);
            return;
        }

        try {
            if (typeof playlist.tracks[songIndex - 1] === "undefined")
                bot.notify(chatId, `Error: songIndex ${songIndex} invalid`);
            else {
                let song = playlist.tracks[songIndex - 1];
                bot.notify(chatId, `Se está reproduciendo la canción: ${song.title}`);
                player.remotePlay(song);
            }
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(makeError(error), tag.TELEGRAM);
        }
    });

    bot.onPlaylistPage((chatId, msgId, page) => {
        logger.info(`received command /page ${page}`, tag.TELEGRAM);
        if (teletubeData.getStatus().currentPlaylist === null) {
            logger.warn(`no playlist selected`, tag.TELEGRAM);
            bot.notify(chatId, `No playlist selected`);
            return;
        }

        let playlistId = teletubeData.getStatus().currentPlaylist.uid;
        let playlist = teletubeData.getPlaylist(playlistId);
        if (playlist.tracks.length === 0) {
            logger.warn(`empty playlist`, tag.TELEGRAM);
            bot.notify(chatId, `empty playlist`);
            return;
        }

        try {
            page = parseInt(page);
            let pagePrev = page - 1;
            let pageNext = page + 1;
            let pageInf = (page - 1) * 5;
            let pageSup = Math.min(pageInf + 5, playlist.tracks.length);
            let showNext = playlist.tracks.length > pageSup;
            let showPrev = page > 1;
            let options = {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                chat_id: chatId,
                message_id: msgId
            };

            let songs = [];
            for (let index = pageInf + 1; index <= pageSup; index++) {
                songs.push({
                    text: "▶️ " + index,
                    callback_data: "/song " + index
                });
            }
            let pages = [];
            if (showPrev) {
                pages.push({
                    text: "< Prev Page ",
                    callback_data: "/page " + pagePrev
                });
            }
            if (showNext) {
                pages.push({
                    text: "Next Page >",
                    callback_data: "/page " + pageNext
                });
            }
            let inline_keyboard = [];
            inline_keyboard.push(songs);
            inline_keyboard.push(pages);
            options.reply_markup = {
                inline_keyboard: inline_keyboard
            };
            let msg = `🎵 <b>Playlist</b> <i>${playlist.tracks.length} Songs</i> Page ${page}\n\n`;
            playlist.tracks.slice(pageInf, pageSup).forEach((song, key) => {
                msg += `#${key + pageInf + 1} - ${song.title}\n<a href="${song.url}">Youtube</a> | <a href="${
                    song.audioUrl
                }">Audio</a>\n\n`;
            });
            bot.editMessageText(msg, options);
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(makeError(error), tag.TELEGRAM);
        }
    });

    bot.onCurrent(chatId => {
        logger.info(`received command /current`, tag.TELEGRAM);
        if (teletubeData.getStatus().currentPlaylist === null) {
            logger.warn(`no playlist selected`, tag.TELEGRAM);
            bot.notify(chatId, `No playlist selected`);
            return;
        }
        try {
            let song = teletubeData.getStatus().currentSong;

            if (song == null) {
                throw new Error(`theres no current song`);
            }

            let playlist = teletubeData.getStatus().currentPlaylist;
            let options = {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "Youtube", url: song.url },
                            { text: "Audio", url: song.audioUrl }
                        ]
                    ]
                }
            };
            let msg = "🎵 Current Song\n<b>" + song.title + "</b>\n<i>Playlist: " + playlist.name + "</i>";
            bot.notify(chatId, msg, options);
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(makeError(error), tag.TELEGRAM);
        }
    });

    bot.onMute(chatId => {
        logger.info(`received command /mute`, tag.TELEGRAM);
        try {
            bot.notify(chatId, `:)`);
            player.setVolume(0);
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(makeError(error), tag.TELEGRAM);
        }
    });

    bot.onUnmute(chatId => {
        logger.info(`received command /unmute`, tag.TELEGRAM);
        try {
            bot.notify(chatId, `:)`);
            player.setVolume(100);
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(makeError(error), tag.TELEGRAM);
        }
    });

    bot.onMessage((chatId, message) => {
        logger.info(`received message ${message} on chat ${chatId}`, tag.TELEGRAM);
    });

    bot.onError(error => {
        logger.error(makeError(error), tag.TELEGRAM);
        let config = teletubeData.getConfig();
        config.telegramBotTokenValid = false;
        teletubeData.saveConfig(config);
        if (player) {
            player.loadConfig(teletubeData.getConfig());
        }
        stopBot();
    });

    logger.info(`setting listeners`, tag.TELEGRAM);
    bot.listen();
    logger.info(`getting updates`, tag.TELEGRAM);
    let updates = await bot.flush();
    logger.info(`got ${updates.length} updates`, tag.TELEGRAM);

    logger.info(`starting polling`, tag.TELEGRAM);
    await bot.start();
    logger.info(`polling started`, tag.TELEGRAM);
};

const refreshSong = async (playlistId, song, notify, play) => {
    logger.info(`refreshing song ${song.id} - ${song.title}`, tag.YOUTUBE);
    player.updateLoading(`Fixing song ${song.id} - ${song.title}`);
    try {
        let updatedSong = await Youtube.updateSongWithAudio(song, decipher);
        logger.info(`got audio url for ${song.id}`, tag.YOUTUBE);
        teletubeData.updateSong(playlistId, updatedSong);
        if (player && notify) {
            player.loadStatus(teletubeData.getStatus());
        }
        if (player && play) player.songCheckedToPlay(updatedSong);
    } catch (error) {
        logger.error(makeError(error), tag.YOUTUBE);
        if (player && notify) {
            player.loadStatus(teletubeData.getStatus());
        }
        if (player && play) player.remoteSkip();
    }
};

app.on("ready", async () => {
    let config = teletubeData.getConfig();
    let devices = [];
    logger.info(`starting player window`, tag.MAIN);

    player = new Player(async () => {
        logger.info(`player window shown`, tag.MAIN);
        logger.info(`preparing window content`, tag.MAIN);
        player.loading(true);
        player.updateLoading("Preparing Youtube...");
        decipher =  await Youtube.getDecFn();
        player.updateLoading("Starting Bot...");
        let loadBot = true;
        if (bot) {
            if (bot.isPolling()) {
                loadBot = false;
            }
        }
        if (loadBot) {
            try {
                await stopBot();
                await startBot(config.telegramBotToken);
                config.telegramBotTokenValid = true;
            } catch (error) {
                config.telegramBotTokenValid = false;
                logger.error(makeError(error), tag.TELEGRAM);
            }
        }

        config = teletubeData.saveConfig(config).getConfig();
        player.loading(false);
        logger.info(`window content ready`, tag.MAIN);
        logger.info(`loading playlist`, tag.MAIN);
        player.notifyDevice(devices);
        player.notifyDeviceSelected();
        player.sendPlaylists(teletubeData.getPlaylists());
        player.loadStatus(teletubeData.getStatus());
        logger.info(`playlist loaded`, tag.MAIN);
        player.deviceSendStatus();
    });

    const client = new ChromecastAPI();

    client.on(`device`, device => {
        devices.push(device);
        logger.info(`found new device: ${device.friendlyName}`, tag.CAST);
        player.notifyDevice(devices);
    });

    ipcMain.on(`ui-search-youtube`, async (e, query) => {
        logger.info(`ui-search-youtube ${query}`, tag.UI);
        try {
            logger.info(`searching for ${query}`, tag.YOUTUBE);
            let results = await Youtube.search(query);
            logger.info(`got ${results.length} results`, tag.YOUTUBE);
            player.uiYoutubeSearchResult(results);
        } catch (error) {
            logger.error(`Error: ${error.message}`);
            player.uiYoutubeSearchError(error.message);
        }
    });

    ipcMain.on(`ui-add-song`, async (e, song) => {
        logger.info(`ui-add-song ${song.id}`, tag.UI);
        if (teletubeData.getStatus().currentPlaylist === null) {
            logger.warn(`no playlist selected`, tag.UI);
            player.uiAddSongError(song, `No playlist selected`);
            return;
        }
        try {
            let songWithAudio = await Youtube.updateSongWithAudio(song, decipher);
            logger.info(`got audio url for song ${songWithAudio.id}`, tag.YOUTUBE);
            let playlistId = teletubeData.getStatus().currentPlaylist.uid;
            teletubeData.addSong(playlistId, songWithAudio, "host");
            player.loadStatus(teletubeData.getStatus());
            player.uiAddSongSuccess(songWithAudio);
        } catch (error) {
            player.uiAddSongError(song, error.message);
            logger.error(makeError(error), tag.UI);
        }
    });

    ipcMain.on(`ui-add-play-song`, async (e, song) => {
        logger.info(`ui-add-play-song ${song.id}`, tag.UI);
        if (teletubeData.getStatus().currentPlaylist === null) {
            logger.warn(`no playlist selected`, tag.UI);
            player.uiAddSongError(song, `No playlist selected`);
            return;
        }
        try {
            let songWithAudio = await Youtube.updateSongWithAudio(song, decipher);
            logger.info(`got audio url for song ${songWithAudio.id}`, tag.YOUTUBE);
            let playlistId = teletubeData.getStatus().currentPlaylist.uid;
            teletubeData.addSong(playlistId, songWithAudio, "host");
            player.loadStatus(teletubeData.getStatus());
            player.remotePlay(song);
            player.uiAddPlaySongSuccess(songWithAudio);
        } catch (error) {
            player.uiAddPlaySongError(song, error.message);
            logger.error(makeError(error), tag.UI);
        }
    });

    ipcMain.on(`check-song`, async (e, playlistId, songToCheck) => {
        let song = songToCheck;
        logger.info(`check song ${song.title} to play`, tag.MAIN);
        try {
            await Youtube.checkUrl(song.audioUrl);
            logger.info(`song ${song.title} is valid`, tag.MAIN);
            player.songCheckedToPlay(song);
        } catch (error) {
            logger.warn(`invalid song, trying to get new link: ${error.message}`, tag.MAIN);
            await refreshSong(playlistId, song, true, true);
        }
    });

    ipcMain.on(`device-play`, (e, song) => {
        logger.info(`play song ${song.title} on device`, tag.MAIN);
        if (teletubeData.getStatus().currentPlaylist === null) {
            logger.warn(`no playlist selected`, tag.MAIN);
            return;
        }
        player.devicePlay(song);
    });

    ipcMain.on(`refresh-song`, (e, playlistId, song) => {
        logger.info(`Refresh song requested for Song: ${song.title}  Playlist ${playlistId}`, tag.MAIN);
        refreshSong(playlistId, song, true, true);
    });

    ipcMain.on(`device-pause`, e => {
        logger.info(`pause song on device`, tag.MAIN);
        player.devicePause();
    });

    ipcMain.on(`device-stop`, e => {
        logger.info(`stop song on device`, tag.MAIN);
        player.deviceStop();
    });

    ipcMain.on(`device-seek`, (e, time) => {
        logger.info(`seek time to ${time} on device`, tag.MAIN);
        player.deviceSeek(time);
    });

    ipcMain.on(`select-playlist`, (e, playlistId) => {
        logger.info(`select playlist ${playlistId}`, tag.MAIN);
        let playlist = teletubeData.getPlaylist(playlistId);
        let status = teletubeData.getStatus();
        status.currentSong = null;
        status.nextSong = null;
        status.prevSong = null;
        status.currentPlaylist = playlist;
        teletubeData.saveStatus(status);
        player.loadStatus(status);
    });

    ipcMain.on(`create-playlist`, (e, playlistName) => {
        let isSuccess = false;
        let msg = null;
        logger.info(`crete playlist with name: ${playlistName}`, tag.MAIN);
        if (playlistName === "") {
            isSuccess = false;
            msg = "Invalid name!";
            player.createPlaylistResponse(isSuccess, msg);
            logger.warn(`coudnt create playlist, because ${msg}`, tag.MAIN);
        } else {
            isSuccess = true;
            msg = "Playlist created";
            logger.info(`stopping player`, tag.MAIN);
            player.stop();
            logger.info(`playlist created`, tag.MAIN);
            teletubeData.addPlaylist(playlistName);
            player.createPlaylistResponse(isSuccess, msg);
            player.sendPlaylists(teletubeData.getPlaylists());
        }
    });

    ipcMain.on(`shuffle-playlist`, (e, playlistId) => {
        logger.info(`shuffle current playlist`, tag.MAIN);
        if (teletubeData.getStatus().currentPlaylist === null) {
            logger.warn(`no playlist selected`, tag.MAIN);
            player.remoteShuffleEnd();
            return;
        }
        teletubeData.shuffle(playlistId);
        player.loadStatus(teletubeData.getStatus());
        player.remoteShuffleEnd();
    });

    ipcMain.on(`device-resume`, e => {
        logger.info(`resume song on device`, tag.MAIN);
        player.deviceResume();
    });

    ipcMain.on(`select-device`, (e, device) => {
        logger.info(`user selected device: ${device.friendlyName}`, tag.CAST);
        let selectedDevice = getDevice(device.name, devices);
        player.setDevice(selectedDevice);
    });

    ipcMain.on(`disconnect-device`, e => {
        logger.info(`user disconnected device`, tag.CAST);
        player.disconnectDevice();
    });

    ipcMain.on(`play-song`, (e, song) => {
        logger.info(`play song ${song.title}`, tag.MAIN);
        if (teletubeData.getStatus().currentPlaylist === null) {
            logger.warn(`no playlist selected`, tag.MAIN);
            return;
        }
        player.remotePlay(song);
    });

    ipcMain.on(`save-status`, (e, status) => {
        teletubeData.saveStatus(status);
    });

    ipcMain.on(`notify-now-playing`, (e, song) => {
        player.notify(`Now Playing ${song.title}`);
    });

    ipcMain.on(`load-config`, (e, {}) => {
        logger.info(`load config request`, tag.MAIN);
        player.loadConfig(config);
    });

    ipcMain.on(`delete-playlist`, (e, playlistId) => {
        logger.info(`delete-playlist request ${playlistId}`, tag.MAIN);
        let status = teletubeData.deletePlaylist(playlistId).getStatus();
        player.sendPlaylists(teletubeData.getPlaylists());
        player.loadStatus(status);
    });

    ipcMain.on(`save-config`, async (e, updatedConfig) => {
        logger.info(`user save config`, tag.MAIN);
        logger.info(`reloading services`, tag.MAIN);
        config = teletubeData.getConfig();
        config.telegramBotToken = updatedConfig.telegramBotToken;
        config = teletubeData.saveConfig(config).getConfig();
        logger.info(`testing bot token`, tag.TELEGRAM);
        try {
            if (bot == null) {
                await startBot(config.telegramBotToken);
            } else {
                await bot.changeToken(config.telegramBotToken);
                logger.info(`getting updates`, tag.TELEGRAM);
                let updates = await bot.flush();
                logger.info(`got ${updates.length} updates`, tag.TELEGRAM);
                logger.info(`starting polling`, tag.TELEGRAM);
                await bot.start();
            }
            logger.info(`polling started`, tag.TELEGRAM);
            config.telegramBotTokenValid = true;
        } catch (error) {
            config.telegramBotTokenValid = false;
            logger.error(makeError(error), tag.TELEGRAM);
        }
        config = teletubeData.saveConfig(config).getConfig();
        player.loadConfig(config);
    });

    ipcMain.on(`delete-song`, (e, playlistId, song) => {
        logger.info(`delete song ${song.title} from playlist ${playlistId}`, tag.MAIN);

        teletubeData.deleteSong(playlistId, song);
        player.loadStatus(teletubeData.getStatus());
    });
});

const stopBot = async () => {
    if (bot) {
        await bot.removeAllListeners();
        res = await bot.stopPolling();
        logger.info("stopped polling", tag.TELEGRAM);
        bot = null;
    }
};

app.on("window-all-closed", async () => {
    logger.info("stopping running services", tag.TELEGRAM);
    if (player) {
        try {
            logger.info("stopping service", tag.CAST);
            player.disconnectDevice();
        } catch (err) {}
    }

    await stopBot();

    logger.info("stopping service", tag.CAST);
    if (INTERVAL_CHROMECAST_ID) clearInterval(INTERVAL_CHROMECAST_ID);

    app.quit();
});
