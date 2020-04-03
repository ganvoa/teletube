const Youtube = require("./Youtube");

const main = async () => {
    let url = "https://www.youtube.com/watch?v=2qXwz-hIhi0";
    await Youtube.updateDecipher();
    let audio = await Youtube.getAudioUrl(url);
    console.log(audio.audioUrl);
    url = "https://www.youtube.com/watch?v=SlPhMPnQ58k";
    audio = await Youtube.getAudioUrl(url);
    console.log(audio.audioUrl);
};
main();
