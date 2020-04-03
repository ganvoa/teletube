const yts = require("yt-search");
const axios = require("axios");
const fs = require("fs");
const decipherPath = __dirname + "/dec.js";

const getUrlPlayer = async videoUrl => {
    let body = await getBody(videoUrl);
    let match = body.match(/assets\":.*?\"js\":"(.*?)"/);
    if (match) {
        return `https://www.youtube.com${match[1].replace(/\\\//g, "/")}`;
    } else {
        throw new Error("Couldnt find JSON");
    }
};

const getFormats = async videoUrl => {
    let body = await getBody(videoUrl);
    let match = body.match(/\\"adaptiveFormats\\":(\[.*?\])/);
    if (match) {
        let formats = match[1].replace(/\\"/g, '"').replace(/\\\\"/g, '\\"');
        let formatsArray = JSON.parse(formats).map(item => {
            let cipher = {};
            if (item.hasOwnProperty('cipher')) {
                cipher.requireDec = true;
                decodeURIComponent(decodeURIComponent(item.cipher))
                .split("\\u0026")
                .forEach(key => {
                    let param = key.match(/(sp|s|url)=(.+)/);
                    if (param) {
                        cipher[param[1]] = param[2];
                    }
                });
            } else {
                cipher = {
                    requireDec: false,
                    url: decodeURIComponent(item.url.replace(/\\u0026/g, '&'))
                }
            }
                return {
                ...item,
                mimeType: item.mimeType.split(";")[0],
                cipher: cipher
            };
        });
        return formatsArray;
    } else {
        throw new Error("Couldnt find JSON");
    }
};

const updateSongWithAudio = async song => {
    const { audioUrl, mimeType } = await getAudioUrl(song.url);
    song.audioUrl = audioUrl;
    song.mimeType = mimeType;
    song.expiresOn = parseInt(getURLParameter(song.url, "expire"));
    return song;
};

const getAudioUrl = async (url, decipher) => {
    let formats = await getFormats(url);
    formatWithBestAudioQlty = formats
        .filter(format => format.mimeType.startsWith("audio"))
        .reduce((prev, current) => {
            return prev.averageBitrate > current.averageBitrate ? prev : current;
        });
    if (formatWithBestAudioQlty) {
        const { dec } = require(decipherPath);
        let decFn = decipher || dec;
        let mimeType = formatWithBestAudioQlty.mimeType;
        let audioUrl = null;
        if (formatWithBestAudioQlty.cipher.requireDec) {
            audioUrl =
            formatWithBestAudioQlty.cipher.url +
            "&" +
            formatWithBestAudioQlty.cipher.sp +
            "=" +
            decFn(formatWithBestAudioQlty.cipher.s);
        } else {
            audioUrl = formatWithBestAudioQlty.cipher.url;
        }
        return { audioUrl, mimeType };
    } else {
        throw new Error(`Could find audio ${url}`);
    }
};

const getBody = url => {
    return new Promise((resolve, reject) => {
        axios
            .get(url)
            .then(res => {
                if (res.status == 200) resolve(res.data);
                else reject(new Error(`Got status ${res.status} - ${res.statusText}`));
            })
            .catch(error => {
                reject(error);
            });
    });
};

const getURLParameter = (url, parameter) => {
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
};

const getDecFn = async () => {
    const urlTest = "https://www.youtube.com";
    const playerUrl = await getUrlPlayer(urlTest);
    const body = await getBody(playerUrl);
    let match = body.match(/=([a-zA-Z0-9\$]+?)\(decodeURIComponent/);
    if (!match) throw new Error("Couldnt find function");
    let functionName = match[1];
    match = body.match(new RegExp(`${functionName}=function(\\(.+?})`));
    if (!match) throw new Error("Couldnt find function");
    let functionBody = match[1];
    match = functionBody.match(/;(.+?)\..+?\(/);
    if (!match) throw new Error("Couldnt find aux function");
    let auxFunctionName = match[1];
    match = body.match(new RegExp(`(var ${auxFunctionName}={[\\s\\S]+?};)`));
    if (!match) throw new Error("Couldnt find aux function body");
    let auxFunctionBody = match[1];
    return new Function(`${auxFunctionBody} function decipher${functionBody} return decipher(arguments[0])`);
}

const getFunction = body => {
    let match = body.match(/=([a-zA-Z0-9\$]+?)\(decodeURIComponent/);
    if (!match) throw new Error("Couldnt find function");
    let functionName = match[1];
    match = body.match(new RegExp(`${functionName}(=function\\(.+?})`));
    if (!match) throw new Error("Couldnt find function");
    let functionBody = `module.exports.dec${match[1]}`;
    match = functionBody.match(/;(.+?)\..+?\(/);
    if (!match) throw new Error("Couldnt find aux function");
    let auxFunctionName = match[1];
    match = body.match(new RegExp(`(var ${auxFunctionName}={[\\s\\S]+?};)`));
    if (!match) throw new Error("Couldnt find aux function body");
    let auxFunctionBody = match[1];
    return `${auxFunctionBody}\n${functionBody}`;
};

const updateDecipher = async () => {
    const urlTest = "https://www.youtube.com";
    const playerUrl = await getUrlPlayer(urlTest);
    const playerScriptBody = await getBody(playerUrl);
    const fnScript = await getFunction(playerScriptBody);
    fs.writeFileSync(decipherPath, fnScript);
};

const search = async query => {
    const r = await yts(query);
    return r.videos.map(video => {
        return {
            id: video.videoId,
            title: video.title,
            description: video.description,
            url: video.url,
            seconds: video.seconds,
            time: video.timestamp,
            views: video.views,
            thumbnail: video.thumbnail,
            image: video.image,
            ago: video.ago
        };
    });
};

const checkUrl = url => {
    return new Promise((resolve, reject) => {
        axios
            .head(url)
            .then(res => {
                if (res.status == 200) {
                    if (res.headers["content-type"] == "text/plain") {
                        reject(new Error(`Got content-type ${res.headers["content-type"]}`));
                    } else {
                        resolve();
                    }
                } else reject(new Error(`Got status ${res.status} - ${res.statusText}`));
            })
            .catch(error => {
                reject(error);
            });
    });
};

const getSong = async query => {
    let videos = await search(query);
    if (videos.length === 0) {
        throw new Error("No se encontraron resultados...");
    }
    return videos[0];
};

module.exports.search = search;
module.exports.checkUrl = checkUrl;
module.exports.getSong = getSong;
module.exports.getAudioUrl = getAudioUrl;
module.exports.updateDecipher = updateDecipher;
module.exports.getDecFn = getDecFn;
module.exports.updateSongWithAudio = updateSongWithAudio;
