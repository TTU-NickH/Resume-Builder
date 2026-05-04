const { app, BrowserWindow } = require('electron');
const path = require('path')

const createWindow = () => {
    const objWindow = new BrowserWindow({
        width: 1200,
        height: 800
    });

    objWindow.loadFile(path.join(__dirname, '../index.html')); //Loads the file 
};

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length < 1) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

