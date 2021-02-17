const Wallet = require("./wallet.js")
const ETHWallet = require("./ETHwallet")
const walletETH = new ETHWallet()
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
        Balance:inputTotalAmount,
        ETHaddr:await walletETH.getAccount(),
        ETHbalance:await walletETH.getBalance()
    }
    sock.emit('notice_info', JSON.stringify(j))
}

async function sendCoins(sock,from,address,amount){
    const wallet3 = Wallet.fromFile("test.wallet")
    if(from !== "eth"){
        const txid = await  wallet3.sendCoins(from,address,parseInt(amount))
        sock.emit('notice_tx', txid)
    }else{
        const txid = await  walletETH.sendCoins(address,parseInt(amount))
        sock.emit('notice_tx', txid)
    }
    
}

function getMnemonic(sock){
    const wallet4 = Wallet.fromFile("test.wallet")
    const mnemonicPhrase = wallet4.mnemonicPhrase
    sock.emit('notice_mnemonic', mnemonicPhrase)
}

startSystem()
