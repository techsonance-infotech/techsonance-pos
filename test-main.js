const { app, BrowserWindow } = require("electron"); console.log("app:", typeof app); app.whenReady().then(() => { console.log("App is ready"); app.quit(); });
