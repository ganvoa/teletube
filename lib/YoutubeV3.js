const { userFolder, makeError } = require("../lib/utils");
const express = require("express");
const { logger, tag } = require("../lib/logger");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const fs = require("fs");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const open = require("open");
const uuidv4 = require("uuid").v4;

const defaults = {
    credentialsFileName: "ytbv3.credentials.json",
    credentialsFolder: userFolder
};
const callbackUrl = "http://localhost:8888/oauth/redirect";
const scopes = ["https://www.googleapis.com/auth/youtube.readonly"];

class YoutubeV3 {
    /**
     *
     * @param {JSON} clienteSecret
     * @param {Object} options
     * @param {string} options.credentialsFileName
     * @param {string} options.credentialsFolder
     */
    constructor(appCredentials, options = {}) {
        this.appCredentials = appCredentials;
        this.credentialsFolder =
            options.userFolder || defaults.credentialsFolder;
        this.credentialsFilePath =
            this.credentialsFolder +
            (options.credentialsFileName || defaults.credentialsFileName);
    }

    createOauthClient() {
        const clientSecret = this.appCredentials.installed.client_secret;
        const clientId = this.appCredentials.installed.client_id;
        this.oAuth2Client = new OAuth2(clientId, clientSecret, callbackUrl);
    }

    checkUserFolder() {
        try {
            fs.mkdirSync(this.credentialsFolder);
        } catch (err) {
            if (err.code != "EEXIST") {
                throw err;
            }
        }
    }

    getSavedToken() {
        return new Promise((resolve, reject) => {
            fs.readFile(this.credentialsFilePath, function(err, token) {
                if (err) {
                    reject(new Error(`Token not found`));
                } else {
                    resolve(JSON.parse(token));
                }
            });
        });
    }

    saveCredentials(credentials) {
        fs.writeFileSync(this.credentialsFilePath, JSON.stringify(credentials));
    }

    openUrl(authUrl) {
        open(authUrl);
    }

    async authenticate() {
        let token = null;
        this.checkUserFolder();
        try {
            logger.info(`Trying to get token saved`, tag.YOUTUBE);
            token = await this.getSavedToken();
            this.oAuth2Client.credentials = token;
            let channel = await this.myChannel();
            return channel;
        } catch (error) {
            logger.warn(`${error.message}`, tag.YOUTUBE);
            logger.info(`Trying to get new token`, tag.YOUTUBE);
            try {
                let authUrl = this.oAuth2Client.generateAuthUrl({
                    access_type: "offline",
                    scope: scopes
                });
                this.openUrl(authUrl);
                token = await this.listenForCallback();
                this.oAuth2Client.credentials = token;
                let channel = await this.myChannel();
                return channel;
            } catch (error) {
                throw makeError(error);
            }
        }
    }

    async search(query) {
        const youtube = google.youtube({
            version: "v3",
            auth: this.oAuth2Client
        });
        const res = await youtube.search.list({
            part: "snippet",
            type: "video",
            order: "relevance",
            q: query,
            maxResults: 10
        });

        if (res.data.items.length == 0)
            throw new Error(`No se encontraron resultados para "${query}"`);

        let searchData = {
            kind: res.data.kind,
            etag: res.data.etag,
            nextPageToken: res.data.nextPageToken || null,
            prevPageToken: res.data.prevPageToken || null,
            pageInfo: { totalResults: res.data.pageInfo.totalResults, resultsPerPage: res.data.pageInfo.resultsPerPage },
        }

        let videos = res.data.items.map(element => {
            const dom = new JSDOM(
                `<!DOCTYPE html><p>${element.snippet.title}</p>`
            );
            let title = dom.window.document.querySelector("p").textContent;
            return {
                id: element.id.videoId,
                uid: uuidv4(),
                url: `https://www.youtube.com/watch?v=${element.id.videoId}`,
                title: title,
                description: element.snippet.description,
                thumbnails: element.snippet.thumbnails
            };
        });
        return videos;
    }

    async getSong(query) {
        let songs = await this.search(query);
        return songs[0];
    }

    async myChannel() {
        const youtube = google.youtube({
            version: "v3",
            auth: this.oAuth2Client
        });

        const res = await youtube.channels.list({
            part: "snippet",
            mine: true
        });

        let channels = res.data.items.map(element => {
            return {
                id: element.id,
                title: element.snippet.title,
                thumbnails: element.snippet.thumbnails
            };
        });

        return channels[0];
    }

    getToken(code) {
        return new Promise((resolve, reject) => {
            this.oAuth2Client.getToken(code, function(error, token) {
                if (error) {
                    reject(makeError(error));
                    return;
                }
                resolve(token);
            });
        });
    }

    listenForCallback() {
        return new Promise((resolve, reject) => {
            const app = express();
            let server = null;
            let success = false;
            app.use(express.static(__dirname + "/public"));
            app.get("/oauth/redirect", async (req, res) => {
                try {
                    const token = await this.getToken(req.query.code);
                    this.saveCredentials(token);
                    resolve(token);
                } catch (error) {
                    reject(error);
                    res.send(
                        "Ocurrió un error al obtener el token de autenticación"
                    );
                }
                success = true;
                res.send("Ya puedes volver a la aplicación");
            });
            server = app.listen(8888);
            setTimeout(() => {
                server.close();
                if (!success) {
                    logger.warn(
                        `Didnt receive callback in 30 seconds`,
                        tag.YOUTUBE
                    );
                    reject(new Error(`Didnt receive callback in 30 seconds`));
                }
            }, 1000 * 30);
        });
    }
}
module.exports.YoutubeV3 = YoutubeV3;
