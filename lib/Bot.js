// https://github.com/yagop/node-telegram-bot-api/issues/540
process.env.NTBA_FIX_319 = 1;

const TelegramBot = require("node-telegram-bot-api");

/**
 * @class
 * @classdesc Bot with musicplayer commands
 */
class Bot extends TelegramBot {
    /**
     * constructor
     * @param {string} token - Telegram Bot Token
     */
    constructor(token) {
        super(token);

        /** @private */
        this._onPlay = chatId => {};
        /** @private */
        this._onPause = chatId => {};
        /** @private */
        this._onPrevSong = chatId => {};
        /** @private */
        this._onPlayNextSong = chatId => {};
        /** @private */
        this._onShuffle = chatId => {};
        /** @private */
        this._onMute = chatId => {};
        /** @private */
        this._onUnmute = chatId => {};
        /** @private */
        this._onList = chatId => {};
        /** @private */
        this._onCurrent = chatId => {};
        /** @private */
        this._onPlaySong = (chatId, query) => {};
        /** @private */
        this._onAddSong = (chatId, query) => {};
        /** @private */
        this._onAddNextSong = (chatId, query) => {};
        /** @private */
        this._onVolume = (chatId, volume) => {};
        /** @private */
        this._onMessage = (chatId, msg) => {};
        /** @private */
        this._onStop = (chatId) => {};
        /** @private */
        this._onsSong = (chatId, songIndex) => {};
        /** @private */
        this._onError = error => {};
        /** @private */
        this._onCallbackQuery = (chatId, msgId, action) => {};
        /** @private */
        this._onPlaylistPage = (chatId, msgId, page) => {};
    }

    /**
     * Change current bot's token
     *
     * @param {string} token
     */
    async changeToken(token) {
        await this.stop();
        this.token = token;
    }

    /**
     * @callback chatCallback
     * @param {number} chatId
     */

    /**
     * @callback chatVolumeCallback
     * @param {number} chatId
     * @param {number} level - value from 1-100
     */

    /**
     * @callback chatMessageCallback
     * @param {number} chatId
     * @param {string} message - message received
     */

    /**
     * @callback chatQueryCallback
     * @param {number} chatId
     * @param {string} query
     */

    /**
     * Executed on commands: `/play` `/resume`
     * @param {chatCallback} fn
     */
    onPlay(fn) {
        this._onPlay = fn;
    }

    /**
     * Executed on commands: `/stop`
     * @param {chatCallback} fn
     */
    onStop(fn) {
        this._onStop = fn;
    }
    /**
     * Executed on commands: `/play` `/resume`
     * @param {chatCallback} fn
     */
    onPlay(fn) {
        this._onPlay = fn;
    }

    /**
     * Executed on command: `/play {query}`
     * @param {chatQueryCallback} fn
     */
    onPlaySong(fn) {
        this._onPlaySong = fn;
    }

    /**
     * Executed on command: `/add {query}`
     * @param {chatQueryCallback} fn - callback function
     */
    onAddSong(fn) {
        this._onAddSong = fn;
    }

    /**
     * Executed on command: `/pause`
     * @param {chatCallback} fn
     */
    onPause(fn) {
        this._onPause = fn;
    }

    /**
     * Executed on command: `/prev`
     * @param {chatCallback} fn
     */
    onPrevSong(fn) {
        this._onPrevSong = fn;
    }

    /**
     * Executed on commands: `/next` `/skip`
     * @param {chatCallback} fn
     */
    onPlayNextSong(fn) {
        this._onPlayNextSong = fn;
    }

    /**
     * Executed on command: `/next {query}`
     * @param {chatQueryCallback} fn - callback function
     */
    onAddNextSong(fn) {
        this._onAddNextSong = fn;
    }

    /**
     * Executed on command: `/shuffle`
     * @param {chatCallback} fn - callback function
     */
    onShuffle(fn) {
        this._onShuffle = fn;
    }

    /**
     * Executed on command: `/volume {level}`
     * @param {chatVolumeCallback} fn - callback function
     */
    onVolume(fn) {
        this._onVolume = fn;
    }

    /**
     * Executed on command: `/mute`
     * @param {chatCallback} fn - callback function
     */
    onMute(fn) {
        this._onMute = fn;
    }

    /**
     * Executed on command: `/unmute`
     * @param {chatCallback} fn - callback function
     */
    onUnmute(fn) {
        this._onUnmute = fn;
    }

    /**
     * Executed on message received
     * @param {chatMessageCallback} fn - callback function
     */
    onMessage(fn) {
        this._onMessage = fn;
    }

    onError(fn) {
        this._onError = fn;
    }

    onCurrent(fn) {
        this._onCurrent = fn;
    }

    onList(fn) {
        this._onList = fn;
    }

    onSong(fn) {
        this._onSong = fn;
    }

    onCallbackQuery(fn) {
        this._onCallbackQuery = fn;
    }

    onPlaylistPage(fn) {
        this._onPlaylistPage = fn;
    }

    /**
     * Send a silent `message` to `chatId`
     * @param {number} chatId
     * @param {*} message
     * @param {*} options
     */
    notify(chatId, message, options = {}) {
        options.disable_notification = true;
        this.sendMessage(chatId, message, options);
    }

    listen() {
        this.onText(/^\/controls$/, msg => {
            const chatId = msg.chat.id;

            this.notify(chatId, "Controls", {
                reply_markup: {
                    keyboard: [
                        ["⏮", "⏸", "▶️", "⏭"],
                        ["🔇", "🔈", "🔉", "🔊"],
                        ["🔀", "📝", "🎵", "♥️", "🔞"]
                    ],
                    resize_keyboard: true
                }
            });
        });

        this.onText(/^\/list$/, msg => {
            const chatId = msg.chat.id;

            this.notify(chatId, "Controls", {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "prev", callback_data: "/prev" },
                            { text: "play/pause", callback_data: "/resume" },
                            { text: "next", callback_data: "/next" }
                        ]
                    ]
                }
            });
        });

        this.onText(/^\/play (.+)$/, (msg, match) => {
            const chatId = msg.chat.id;
            const query = match[1];
            this._onPlaySong(chatId, query);
        });

        this.onText(/^\/play$|resume$|▶️$/, msg => {
            const chatId = msg.chat.id;
            this._onPlay(chatId);
        });

        this.onText(/^\/manuel$|manu$|♥️$/, msg => {
            const chatId = msg.chat.id;
            this.sendSticker(chatId, `CAADAQADAQADCgqrKjVC2hWu1DNdFgQ`);
        });

        this.onText(/^\/gonzalo$|gonza$|👙$|🍄$|🔞$/, msg => {
            const chatId = msg.chat.id;
            this.sendSticker(chatId, `CAADAQADAgADCgqrKvHF0TW1DAitFgQ`);
        });

        this.onText(/^\/add (.+)/, (msg, match) => {
            const chatId = msg.chat.id;
            const query = match[1];
            this._onAddSong(chatId, query);
        });

        this.onText(/^\/next (.+)/, (msg, match) => {
            const chatId = msg.chat.id;
            const query = match[1];
            this._onAddNextSong(chatId, query);
        });

        this.onText(/^\/skip$|next$|⏭$/, msg => {
            const chatId = msg.chat.id;
            this._onPlayNextSong(chatId);
        });

        this.onText(/^\/pause$|⏸$/, msg => {
            const chatId = msg.chat.id;
            this._onPause(chatId);
        });

        this.onText(/^\/prev$|⏮$/, msg => {
            const chatId = msg.chat.id;
            this._onPrevSong(chatId);
        });

        this.onText(/^\/shuffle$|🔀/, msg => {
            const chatId = msg.chat.id;
            this._onShuffle(chatId);
        });

        this.onText(/^🔈$/, msg => {
            const chatId = msg.chat.id;
            this._onVolume(chatId, 35);
        });

        this.onText(/^🔉$/, msg => {
            const chatId = msg.chat.id;
            this._onVolume(chatId, 70);
        });

        this.onText(/^🔊$/, msg => {
            const chatId = msg.chat.id;
            this._onVolume(chatId, 100);
        });

        this.onText(/^\/volume ([1-9][0-9]?|100)$/, (msg, match) => {
            const chatId = msg.chat.id;
            const volume = match[1];
            this._onVolume(chatId, volume);
        });

        this.onText(/^\/mute$|🔇$/, msg => {
            const chatId = msg.chat.id;
            this._onMute(chatId);
        });

        this.onText(/^\/unmute$/, msg => {
            const chatId = msg.chat.id;
            this._onUnmute(chatId);
        });

        this.onText(/^\/stop$/, msg => {
            const chatId = msg.chat.id;
            this._onStop(chatId);
        });

        this.onText(/^\/list$|📝$|playlist$/, msg => {
            const chatId = msg.chat.id;
            this._onList(chatId);
        });

        this.onText(/^\/current$|🎵$/, msg => {
            const chatId = msg.chat.id;
            this._onCurrent(chatId);
        });

        this.on("message", msg => {
            const chatId = msg.chat.id;
            const message = msg.text;
            this._onMessage(chatId, message);
        });

        this.on("polling_error", async msg => {
            this._onError(msg);
        });

        this.on("error", async msg => {
            this._onError(msg);
        });

        this.on("callback_query", query => {
            const action = query.data;
            const messageId = query.message.message_id;
            const chatId = query.message.chat.id;
            let match = action.match(/^\/page ([1-9][0-9]?|100)$/);
            let songMatch = action.match(/^\/song ([1-9][0-9]?|100)$/);
            if (match && match.length > 0) {
                this._onPlaylistPage(chatId, messageId, match[1]);
            } else if (songMatch && songMatch.length > 0) {
                this._onSong(chatId, songMatch[1]);
            } else {
                this._onCallbackQuery(chatId, messageId, action);
            }
        });
    }

    /**
     * Stop polling from Telegram
     */
    async stop() {
        if (this.isPolling()) {
            await this.removeAllListeners();
            await this.stopPolling();
        }
        return;
    }

    /**
     * Start polling from Telegram
     */
    async start() {
        return await this.startPolling();
    }

    /**
     * Get updates from telegram
     * @returns {TelegramBot.Update[]}
     */
    async flush() {
        let updates = await this.getUpdates();
        return updates;
    }
}

module.exports.Bot = Bot;
