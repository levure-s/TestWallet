const Wallet = require("./wallet.js")
const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
app.use("/", express.static(__dirname + '/'))
app.get('/', (req, res) => { res.redirect("/index.html") })


async function startSystem(){
    await connectSocket()

    http.listen(3000, () => {
        console.log('listen 3000')
    })
}

async function connectSocket(){
    io.sockets.on('connection', (socket) => {
        console.log("connected " + socket.id)

        socket.on('call_create', () => {
            createWallet(socket)
        })

        socket.on('call_info', (msg) => {
            getInfo(socket,msg)
        })

        socket.on('send_coins', (msg) => {
            info = JSON.parse(msg)
            sendCoins(socket,info.from,info.addr,info.amount)
        })

        socket.on('call_mnemonic', () => {
            getMnemonic(socket)
        })
    })
}

function createWallet(sock){
    const wallet1 = new Wallet()
    wallet1.toFile("test.wallet")
    console.log(wallet1.getWIF(0))
    console.log(wallet1.getAddress(0))
    sock.emit('notice_wallet', wallet1.getAddress(0))
}

async function getInfo(sock,n){
    const wallet2 = Wallet.fromFile("test.wallet")
    await wallet2.checkUtxos(n)
    console.log(wallet2.getAddress(n))
    const utxos = wallet2.getUtxos(n)
    let inputTotalAmount = 0
    utxos.forEach(utxo => {
        inputTotalAmount += utxo.value_int
    })
    var j = {
        addr:wallet2.getAddress(n),
        Balance:inputTotalAmount
    }
    sock.emit('notice_info', JSON.stringify(j))
}

async function sendCoins(sock,from,address,amount){
    const wallet3 = Wallet.fromFile("test.wallet")
    const txid = await  wallet3.sendCoins(from,address,parseInt(amount))
    sock.emit('notice_tx', txid)
}

function getMnemonic(sock){
    const wallet4 = Wallet.fromFile("test.wallet")
    const mnemonicPhrase = wallet4.mnemonicPhrase
    sock.emit('notice_mnemonic', mnemonicPhrase)
}

startSystem()
