const { BrowserWindow, session } = require("electron");
const axios = require("axios");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const uuidv4 = require("uuid").v4;

class Ytb {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    async test() {
        try {
            await this.getSong("gondwana");
            return true;
        } catch (err) {
            return false;
        }
    }

    getSong(query) {
        return new Promise((resolve, reject) => {
            const params = {
                part: "snippet",
                type: "video",
                order: "relevance",
                q: query,
                key: this.apiKey,
                maxResults: 1
            };
            axios
                .get("https://www.googleapis.com/youtube/v3/search", {
                    params: params
                })
                .then(response => {
                    let bodyJson = response.data;
                    if (bodyJson.items.length == 0) {
                        const error = new Error(
                            `No se encontraron resultados para ${query}`
                        );
                        reject(error);
                        return;
                    }

                    const data = bodyJson.items[0];
                    const dom = new JSDOM(
                        `<!DOCTYPE html><p>${data.snippet.title}</p>`
                    );
                    const song = {
                        title: dom.window.document.querySelector("p")
                            .textContent,
                        url: `https://www.youtube.com/watch?v=${data.id.videoId}`,
                        id: data.id.videoId,
                        thumbnails: data.snippet.thumbnails,
                        uid: uuidv4()
                    };
                    resolve(song);
                })
                .catch(err => {
                    const reason = err.response.data.error.errors[0].reason;
                    const error = new Error(`YoutubeApiKey error: ${reason}`);
                    reject(error);
                });
        });
    }

    getURLParameter(url, parameter) {
        let value = "";
        let urlparts = url.split("?");
        if (urlparts.length >= 2) {
            let pars = urlparts[1].split(/[&;]/g);
            for (let i = pars.length; i-- > 0; ) {
                if (pars[i].startsWith(parameter + "=")) {
                    value = pars[i].split("=")[1];
                }
            }
        }
        return value;
    }

    removeURLParameters(url, parameters) {
        parameters.forEach(parameter => {
            var urlparts = url.split("?");
            if (urlparts.length >= 2) {
                var prefix = encodeURIComponent(parameter) + "=";
                var pars = urlparts[1].split(/[&;]/g);

                for (var i = pars.length; i-- > 0; ) {
                    if (pars[i].lastIndexOf(prefix, 0) !== -1) {
                        pars.splice(i, 1);
                    }
                }
                url = urlparts[0] + "?" + pars.join("&");
            }
        });
        return url;
    }

    getAudioUrl(song) {
        return new Promise((resolve, reject) => {
            const downloadSession = session.fromPartition(
                `downloadSession${song.id}`
            );
            let searchWindow = new BrowserWindow({
                width: 100,
                height: 100,
                show: false,
                webPreferences: {
                    session: downloadSession
                }
            });

            const timerId = setTimeout(() => {
                const error = new Error(
                    `No se encontró la canción despues de 5 segundos`
                );
                reject(error);
                try {
                    searchWindow.close();
                } catch (error) {}
            }, 1000 * 5);

            searchWindow.setMenu(null);
            searchWindow.webContents.session.webRequest.onBeforeSendHeaders(
                (details, callback) => {
                    if (details.url.includes("youtube.com"))
                        details.requestHeaders["Cookie"] =
                            "VISITOR_INFO1_LIVE=oKckVSqvaGw; path=/;";

                    if (details.url.indexOf("mime=audio") !== -1) {
                        song.audioUrl = this.removeURLParameters(details.url, [
                            "range",
                            "rn",
                            "rbuf"
                        ]);
                        song.expiresOn = parseInt(
                            this.getURLParameter(details.url, "expire")
                        );
                        clearTimeout(timerId);
                        resolve(song);

                        try {
                            searchWindow.close();
                        } catch (error) {}
                    }

                    if (
                        details.url.includes("doubleclick.net") ||
                        details.url.includes("/ads/") ||
                        details.url.includes("s0.2mdn.net") ||
                        details.url.includes("files.adform.net") ||
                        details.url.includes("secure-ds.serving-sys.com") ||
                        details.url.includes("googlesyndication")
                    )
                        callback({ cancel: true });
                    else
                        callback({
                            cancel: false,
                            requestHeaders: details.requestHeaders
                        });
                }
            );
            searchWindow.loadURL(song.url);
        });
    }
}

module.exports.Ytb = Ytb;
