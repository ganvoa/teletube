const ChromecastAPI = require("chromecast-api");
const { logger, tag } = require("./lib/logger");
const { Ytb } = require("./lib/Ytb");
const { app, ipcMain } = require("electron");
const { Player } = require("./lib/Player");
const { Bot } = require("./lib/Bot");
const { makeError } = require("./lib/utils");
const DataStore = require("./lib/datastore");
const teletubeData = new DataStore({ name: "teletube" });

app.allowRendererProcessReuse = true;

let ytb = null;
let bot = null;
let player = null;
let INTERVAL_CHECKEXPIRED_ID = null;
let INTERVAL_CHROMECAST_ID = null;

const checkExpiredsongs = async notify => {
    let playlist = teletubeData.getPlaylist();
    logger.info(`checking ${playlist.length} songs`, tag.YOUTUBE);
    let cont = 0;
    for (let index = 0; index < playlist.length; index++) {
        const song = playlist[index];
        let now = Math.floor(Date.now() / 1000);
        let expiresOn = parseInt(song.expiresOn) - 60 * 10;
        if (now - expiresOn > 0) {
            cont++;
            await refreshSong(song, notify, false);
        }
    }
    logger.info(`fixed ${cont} songs`, tag.YOUTUBE);
};

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
        try {
            bot.notify(chatId, `:)`);
            player.remoteResume();
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(`error on command /play`, { error: makeError(error), ...tag.TELEGRAM });
        }
    });

    bot.onPlaySong(async (chatId, query) => {
        logger.info(`received command /play ${query}`, tag.TELEGRAM);
        try {
            bot.notify(chatId, `Buscando la canción: ${query}`);
            logger.info(`searching for ${query}`, tag.YOUTUBE);
            let song = await ytb.getSong(query);
            logger.info(`got song ${song.uid} - ${song.title}`, tag.YOUTUBE);
            song = await ytb.getAudioUrl(song);
            logger.info(`got audio url for song ${song.uid}`, tag.YOUTUBE);
            bot.notify(
                chatId,
                `Se está reproduciendo la canción: ${song.title}`
            );
            player.updatePlaylist(teletubeData.putSongNext(song).getPlaylist());
            player.remotePlay(song);
        } catch (error) {
            bot.notify(chatId, `Error: ${error.message}`);
            logger.error(`error on command /play ${query}`, {
                error: makeError(error),
                ...tag.TELEGRAM
            });
        }
    });

    bot.onAddSong(async (chatId, query) => {
        logger.info(`received command /add ${query}`, tag.TELEGRAM);
        try {
            bot.notify(chatId, `Buscando la canción: ${query}`);
            logger.info(`searching for ${query}`, tag.YOUTUBE);
            let song = await ytb.getSong(query);
            logger.info(`got song ${song.uid} - ${song.title}`, tag.YOUTUBE);
            song = await ytb.getAudioUrl(song);
            logger.info(`got audio url for song ${song.uid}`, tag.YOUTUBE);
            bot.notify(chatId, `Se agregó la canción: ${song.title}`);
            player.updatePlaylist(teletubeData.addSong(song).getPlaylist());
        } catch (error) {
            bot.notify(chatId, `Error: ${error.message}`);
            logger.error(`error on command /add ${query}`, {
                error: makeError(error),
                ...tag.TELEGRAM
            });
        }
    });

    bot.onAddNextSong(async (chatId, query) => {
        logger.info(`received command /next ${query}`, tag.TELEGRAM);
        try {
            bot.notify(chatId, `Buscando la canción: ${query}`);
            logger.info(`searching for ${query}`, tag.YOUTUBE);
            let song = await ytb.getSong(query);
            logger.info(`got song ${song.uid} - ${song.title}`, tag.YOUTUBE);
            song = await ytb.getAudioUrl(song);
            logger.info(`got audio url for song ${song.uid}`, tag.YOUTUBE);
            bot.notify(chatId, `Se agregó la canción: ${song.title}`);
            player.updatePlaylist(teletubeData.putSongNext(song).getPlaylist());
        } catch (error) {
            bot.notify(chatId, `Error: ${error.message}`);
            logger.error(`error on command /next ${query}`, {
                error: makeError(error),
                ...tag.TELEGRAM
            });
        }
    });

    bot.onPlayNextSong(chatId => {
        logger.info(`received command /next`, tag.TELEGRAM);
        try {
            bot.notify(chatId, `:)`);
            player.remoteSkip();
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(`error on command /next`, { error: makeError(error), ...tag.TELEGRAM });
        }
    });

    bot.onPause(chatId => {
        logger.info(`received command /pause`, tag.TELEGRAM);
        try {
            bot.notify(chatId, `:)`);
            player.remotePause();
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(`error on command /pause`, { error: makeError(error), ...tag.TELEGRAM });
        }
    });

    bot.onPrevSong(chatId => {
        logger.info(`received command /prev`, tag.TELEGRAM);
        try {
            bot.notify(chatId, `:)`);
            player.remotePrev();
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(`error on command /prev`, { error: makeError(error), ...tag.TELEGRAM });
        }
    });

    bot.onShuffle(chatId => {
        logger.info(`received command /shuffle`, tag.TELEGRAM);
        try {
            bot.notify(chatId, `:)`);
            player.updatePlaylist(teletubeData.shuffle().getPlaylist());
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(`error on command /shuffle`, {
                error: makeError(error),
                ...tag.TELEGRAM
            });
        }
    });

    bot.onVolume((chatId, volume) => {
        logger.info(`received command /volume ${volume}`, tag.TELEGRAM);
        try {
            bot.notify(chatId, `:)`);
            player.setVolume(volume);
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(`error on command /volume ${volume}`, {
                error: makeError(error),
                ...tag.TELEGRAM
            });
        }
    });

    bot.onList(chatId => {
        logger.info(`received command /list`, tag.TELEGRAM);
        try {
            let playlist = teletubeData.getPlaylist();
            let showNext = playlist.length > 5;
            let options = {
                parse_mode: "HTML",
                disable_web_page_preview: true
            };

            let songs = [];
            for (let index = 1; index <= 5; index++) {
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
            let msg = `🎵 <b>Playlist</b> <i>${playlist.length} Songs</i> Page 1\n\n`;
            playlist.slice(0, 5).forEach((song, key) => {
                msg += `#${key + 1} - ${song.title}\n<a href="${
                    song.url
                }">Youtube</a> | <a href="${song.audioUrl}">Audio</a>\n\n`;
            });
            bot.notify(chatId, msg, options);
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(`error on command /list`, { error: makeError(error), ...tag.TELEGRAM });
        }
    });

    bot.onSong((chatId, songIndex) => {
        logger.info(`received command /song ${songIndex}`, tag.TELEGRAM);
        try {
            songIndex = parseInt(songIndex);
            let playlist = teletubeData.getPlaylist();
            if (playlist.length < songIndex - 1)
                bot.notify(chatId, `Error: songIndex ${songIndex} invalid`);
            else {
                let song = playlist[songIndex - 1];
                bot.notify(
                    chatId,
                    `Se está reproduciendo la canción: ${song.title}`
                );
                player.remotePlay(song);
            }
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(`error on command /song ${songIndex}`, {
                error: makeError(error),
                ...tag.TELEGRAM
            });
        }
    });

    bot.onPlaylistPage((chatId, msgId, page) => {
        logger.info(`received command /page ${page}`, tag.TELEGRAM);
        try {
            page = parseInt(page);
            let pagePrev = page - 1;
            let pageNext = page + 1;
            let playlist = teletubeData.getPlaylist();
            let pageInf = (page - 1) * 5;
            let pageSup = Math.min(pageInf + 5, playlist.length);
            let showNext = playlist.length > pageSup;
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
            let msg = `🎵 <b>Playlist</b> <i>${playlist.length} Songs</i> Page ${page}\n\n`;
            playlist.slice(pageInf, pageSup).forEach((song, key) => {
                msg += `#${key + pageInf + 1} - ${song.title}\n<a href="${
                    song.url
                }">Youtube</a> | <a href="${song.audioUrl}">Audio</a>\n\n`;
            });
            bot.editMessageText(msg, options);
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(`error on command /page ${page}`, {
                error: makeError(error),
                ...tag.TELEGRAM
            });
        }
    });

    bot.onCurrent(chatId => {
        logger.info(`received command /current`, tag.TELEGRAM);
        try {
            let song = teletubeData.getStatus().currentSong;
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
            let msg = "🎵 Current Song\n<b>" + song.title + "</b>";
            bot.notify(chatId, msg, options);
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(`error on command /current`, {
                error: makeError(error),
                ...tag.TELEGRAM
            });
        }
    });

    bot.onMute(chatId => {
        logger.info(`received command /mute`, tag.TELEGRAM);
        try {
            bot.notify(chatId, `:)`);
            player.setVolume(0);
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(`error on command /mute`, { error: makeError(error), ...tag.TELEGRAM });
        }
    });

    bot.onUnmute(chatId => {
        logger.info(`received command /unmute`, tag.TELEGRAM);
        try {
            bot.notify(chatId, `:)`);
            player.setVolume(100);
        } catch (error) {
            bot.notify(chatId, `Error: ${error}`);
            logger.error(`error on command /unmute`, {
                error: makeError(error),
                ...tag.TELEGRAM
            });
        }
    });

    bot.onMessage((chatId, message) => {
        logger.info(
            `received message ${message} on chat ${chatId}`,
            tag.TELEGRAM
        );
    });

    bot.onError(error => {
        logger.error(`received error on polling`, { error: makeError(error), ...tag.TELEGRAM });
        let config = teletubeData.getConfig();
        config.telegramBotTokenValid = false;
        teletubeData.saveConfig(config);
        if (player) {
            player.loadConfig(teletubeData.getConfig());
        }
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

const refreshSong = async (song, notify, play) => {
    logger.info(`refreshing song ${song.uid} - ${song.title}`, tag.YOUTUBE);
    player.updateLoading(`Fixing song ${song.uid} - ${song.title}`);
    try {
        let updatedSong = await ytb.getAudioUrl(song);
        logger.info(`got audio url for ${song.uid}`, tag.YOUTUBE);
        teletubeData.updateSong(updatedSong);
        if (player && notify) player.updatePlaylist(teletubeData.getPlaylist());
        if (player && play) player.remotePlay(updatedSong);
    } catch (error) {
        logger.error(`couldnt load audio url for ${song.uid}`, {
            error: makeError(error),
            ...tag.YOUTUBE
        });
        if (player && notify) player.updatePlaylist(teletubeData.getPlaylist());
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
        player.updateLoading("Starting Bot...");
        try {
            await stopBot();
            await startBot(config.telegramBotToken);
            config.telegramBotTokenValid = true;
        } catch (error) {
            config.telegramBotTokenValid = false;
            logger.error(`couldnt start bot`, { error: makeError(error), ...tag.TELEGRAM });
        }

        logger.info(
            `starting service with api key: ${config.youtubeApiKey}`,
            tag.YOUTUBE
        );

        player.updateLoading("Validating Youtube API Key...");
        ytb = new Ytb(config.youtubeApiKey);
        try {
            let isValid = await ytb.test();
            logger.info(`api key valid`, tag.YOUTUBE);
            config.youtubeApiKeyValid = isValid;
        } catch (error) {
            config.youtubeApiKeyValid = false;
            logger.error(`api key invalid`, { error: makeError(error), ...tag.YOUTUBE });
        }

        config = teletubeData.saveConfig(config).getConfig();

        // player.updateLoading("Checking Expired Songs...");
        // await checkExpiredsongs(false);

        player.loading(false);
        logger.info(`window content ready`, tag.MAIN);

        logger.info(`loading playlist`, tag.MAIN);
        let playlist = teletubeData.getPlaylist();
        player.notifyDevice(devices);
        player.notifyDeviceSelected();
        player.loadStatus(teletubeData.getStatus());
        player.updatePlaylist(playlist);
        logger.info(`playlist loaded`, tag.MAIN);
    });

    const client = new ChromecastAPI();
    client.on("device", device => {
        devices.push(device);
        logger.info(`found new device: ${device.friendlyName}`, tag.CAST);
        player.notifyDevice(devices);
    });

    // Check Expired Songs every 10 min
    INTERVAL_CHECKEXPIRED_ID = setInterval(() => {
        checkExpiredsongs(true);
    }, 10 * 60 * 1000);

    ipcMain.on(`device-play`, (e, song) => {
        player.devicePlay(song);
    });

    ipcMain.on(`refresh-song`, (e, song) => {
        refreshSong(song, true, true);
    });

    ipcMain.on(`device-pause`, e => {
        player.devicePause();
    });

    ipcMain.on(`device-seek`, (e, time) => {
        player.deviceSeek();
    });

    ipcMain.on(`device-resume`, e => {
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
        player.remotePlay(song);
    });

    ipcMain.on(`save-status`, (e, status) => {
        teletubeData.saveStatus(status);
    });

    ipcMain.on(`load-config`, (e, {}) => {
        player.loadConfig(config);
    });

    ipcMain.on(`save-config`, async (e, updatedConfig) => {
        logger.info(`user save config`, tag.MAIN);
        logger.info(`reloading services`, tag.MAIN);
        config = teletubeData.getConfig();
        config.telegramBotToken = updatedConfig.telegramBotToken;
        config.youtubeApiKey = updatedConfig.youtubeApiKey;
        config = teletubeData.saveConfig(config).getConfig();
        logger.info(`testing api key`, tag.YOUTUBE);
        try {
            ytb.setApiKey(config.youtubeApiKey);
            let isValid = await ytb.test();
            if (isValid) logger.info(`api key is valid`, tag.YOUTUBE);
            else logger.warn(`api key is invalid`, tag.YOUTUBE);
            config.youtubeApiKeyValid = isValid;
        } catch (error) {
            logger.error(`api key is invalid`, { error: makeError(error), ...tag.YOUTUBE });
        }

        logger.info(`testing token`, tag.TELEGRAM);
        try {
            await bot.changeToken(config.telegramBotToken);
            logger.info(`getting updates`, tag.TELEGRAM);
            let updates = await bot.flush();
            logger.info(`got ${updates.length} updates`, tag.TELEGRAM);
            logger.info(`starting polling`, tag.TELEGRAM);
            await bot.start();
            logger.info(`polling started`, tag.TELEGRAM);
            config.telegramBotTokenValid = true;
        } catch (error) {
            config.telegramBotTokenValid = false;
            logger.error(`couldnt start bot`, { error: makeError(error), ...tag.TELEGRAM });
        }
        config = teletubeData.saveConfig(config).getConfig();
        player.loadConfig(config);
    });

    ipcMain.on(`delete-song`, (e, song) => {
        player.updatePlaylist(teletubeData.deleteSong(song).getPlaylist());
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

    logger.info("stopping service", tag.YOUTUBE);
    if (INTERVAL_CHECKEXPIRED_ID) clearInterval(INTERVAL_CHECKEXPIRED_ID);

    logger.info("stopping service", tag.CAST);
    if (INTERVAL_CHROMECAST_ID) clearInterval(INTERVAL_CHROMECAST_ID);

    app.quit();
});
