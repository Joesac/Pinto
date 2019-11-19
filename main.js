const {app, BrowserWindow} = require('electron')
const ipc = require('electron').ipcMain
const shell = require('electron').shell
const dialog = require('electron').dialog

const url = require("url");
const path = require("path");
const os = require('os')
const fs = require('fs')
const crypto = require('crypto')

let mainWindow
let printPreviewWindow

function createWindow () {
  mainWindow = new BrowserWindow({
    minHeight: 600,
    minWidth: 1000,
    icon: './assets/icon.png',
    show: false,
    center: true,
    frame: false,
    backgroundColor: '#ECECEC', /*'EFF3F8',*/
    webPreferences: {
      nodeIntegration: true
    }
  })

  mainWindow.webContents.once('did-finish-load', () => {
    if (splashWin) splashWin.close()
    mainWindow.show();
  })

  // Remove the menu
  mainWindow.removeMenu();

  // Load the html page
  mainWindow.loadFile('./pages/index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  mainWindow.on('close', function () {
    mainWindow = null
    printPreviewWindow.close()
    if (splashWin) splashWin.close()
  })

  // Handle resizing window
 mainWindow.on('resize', (event) => {
    winWidth = mainWindow.getSize()[0];
    event.sender.send('winWidth', winWidth);
  })

  // Handle when the window is Unmaximized
  mainWindow.on('unmaximize', (event) => {
    event.sender.send('winUnmaximize', true)
  })

  // Handle when the window is Maximized
  mainWindow.on('maximize', (evt) => {
    evt.sender.send('winMaximized', true);
  })

  // Print Preview Window
  printPreviewWindow = new BrowserWindow({show: false, webPreferences: {nodeIntegration: true}})
  // printPreviewWindow.webContents.openDevTools()
  printPreviewWindow.loadFile('./pages/print-preview.html')

  // End Print Preview Window Implementation
}

let splashWin;
function createSplashScreen() {
  splashWin = new BrowserWindow({
    width: 500,
    height: 300,
    center: true,
    frame: false,
    show: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true
    }
  })
  
  splashWin.loadFile('./pages/splash.html')
  splashWin.setSkipTaskbar(true)
  splashWin.on('closed', () => splashWin = null)
  splashWin.webContents.once('did-finish-load', () => {
    splashWin.show()
  })
}

app.on('ready', () => {
  createSplashScreen()
  setTimeout(() =>
  createWindow(),
  2000)
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (mainWindow === null) createWindow()
})

// Printing automatically. This is sent to the Print Preview Page
ipc.on('print-automatically', (evt, dataToAppend) => {
  // Send to the hidden print preview page
  printPreviewWindow.webContents.send('print-silent', dataToAppend);
  // evt.sender.send = dataToAppend;
})

// Begin Automatic Printing
ipc.on('begin-silent-print', (evt, arg) => {
  // printPreviewWindow.show();
  const win = BrowserWindow.fromWebContents(evt.sender);
  win.webContents.print({silent: true});

})

// Create the PDF File
ipc.on('print-to-pdf', (evt, dataToAppend) => {
  // Send to the hidden print preview page
  printPreviewWindow.webContents.send('wrote-pdf', dataToAppend);
  // evt.sender.send = dataToAppend;
})

// Create the PDF File
ipc.on('print-pdf', (evt, arg) => {
  // printPreviewWindow.show();

  const win = BrowserWindow.fromWebContents(evt.sender);

  // ask for save location
  dialog.showSaveDialog(mainWindow, {
    title: 'Save File',
    filters: [{'name': 'Adobe PDF', 'extensions': ['pdf']}]
  }).then((res) => {
    if (!res.canceled) {
       let filePath = res.filePath

       win.webContents.printToPDF({}, (err, data) => {
          if (err) return dialog.showErrorBox("Saving Error", "There was an error saving the file: " + err.message)
    
          fs.writeFile(filePath, data, err => {
    
              if (err) return dialog.showErrorBox("Writing Error", "There was an error writing file: " + err.message);
              // shell.openItem(filePath);
          });
      })
    }
  });
  

  /* const pdfPath = path.join(os.tmpdir(), 'testPdf.pdf');
  const win = BrowserWindow.fromWebContents(evt.sender);

  win.webContents.printToPDF({}, (err, data) => {
      if (err) return console.log('error! ' + err.message);

      fs.writeFile(pdfPath, data, err => {

          if (err) return console.log("Error!!! " + err.message);
          shell.openItem(pdfPath);
      });
  }) */
})

// Handle Template Export
ipc.on('export', (evt, arg) => {
  dialog.showSaveDialog(mainWindow, {
    title: 'Export File',
    filters: [{'name': 'Pinto', 'extensions': ['pit']}]
  }).then((res) => {
    if (!res.canceled) {
       let filePath = res.filePath
       
       arg = encryptData(arg);

       fs.writeFile(filePath, arg, () => {
         console.log("File written successfully")
       })
    }
  });
})

// // Handle Template Import
ipc.on('import', (evt) => {
  dialog.showOpenDialog(mainWindow, {
    title: 'Import File',
    properties: ['openFile'],
    filters: [{'name': 'Pinto', 'extensions': ['pit']}]
  }).then(data => {
    evt.sender.send('imported-data', data)
  }).catch(e => {
    dialog.showErrorBox('Error!', 'There was a problem importing file: ' + e)
  })
})

ipc.on('desktop-path', (evt) => {
  evt.sender.send('desktopPath', app.getPath('desktop'))
})

ipc.on('document-path', (evt) => {
  evt.sender.send('documentPath', app.getPath('documents'))
})

ipc.on('excel', (evt) => {
  dialog.showOpenDialog(mainWindow, {
    title: 'Import File',
    properties: ['openFile']
  }).then(file => {
    evt.sender.send('loadedExcelData', file)
  }).catch(e => {
    dialog.showErrorBox('Error!', e)
  })
});

const encryption_metadata = {
  encryption_key: "byz9VFNtbRQM0yBODcCb1lr*_?_|3D3x", // Must be 32 characters
  initialization_vector: "X05IGQ5qdBnIqAWD" // Must be 16 characters
}

function encryptData(text) {
    const cipher = crypto.createCipheriv('aes-256-cbc',Buffer.from(encryption_metadata.encryption_key), Buffer.from(encryption_metadata.initialization_vector))
    let crypted = cipher.update(text, 'utf8', 'hex')
    crypted += cipher.final('hex')
    return crypted
}