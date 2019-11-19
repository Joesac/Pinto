
const electron = require('electron')
const ipc = electron.ipcRenderer
const shell = electron.shell

const os = require('os')
const path = require('path')

ipc.on('wrote-pdf', (evt, arg) => {
    console.log(arg)
    document.getElementById("container").innerHTML = arg;

    ipc.send('print-pdf', arg);
})

ipc.on('print-silent', (evt, arg) => {
    document.getElementById("container").innerHTML = arg;
    ipc.send('begin-silent-print', arg);
})