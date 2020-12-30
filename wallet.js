const rp = require('request-promise')
const co = require('co')
const fs = require('fs')
const crypto = require('crypto')
const bitcoinjs = require('bitcoinjs-lib')
const bip39 = require('bip39')
const bip32 = require('bip32')

function getUtxos (address) {
    return rp('https://testnet-api.smartbit.com.au/v1/blockchain/address/' + address + '/unspent')
      .then(res => JSON.parse(res))
}

function pushTransaction (rawTx) {
    const OPTS = {
      method: 'POST',
      uri: 'https://testnet-api.smartbit.com.au/v1/blockchain/pushtx',
      body: {
        hex: rawTx
      },
      json: true
    }
    return rp(OPTS)
}

class Wallet{
    constructor(seed, network) {
        this.entropy = crypto.randomBytes(16)
        this.mnemonicPhrase = bip39.entropyToMnemonic(this.entropy)
        this.seed = seed || bip39.mnemonicToSeed(this.mnemonicPhrase)
        this.network = network || bitcoinjs.networks.testnet
        this.rootNode = bip32.fromSeed(this.seed,this.network)
    }

    static fromFile(filePath) {
        filePath = filePath || 'backup.wallet'
        const b64Data = fs.readFileSync(filePath).toString('utf8')
        const jsonString = Buffer.from(b64Data, 'base64').toString('utf8')
        const jsonData = JSON.parse(jsonString)
        return new Wallet(Buffer.from(jsonData.seed,'hex'), jsonData.network)
    }

    toFile(filePath) {
        filePath = filePath || 'backup.wallet'
        const jsonData = {
          seed: this.seed.toString('hex'),
          network: this.network,
          mnemonicPhrase: this.mnemonicPhrase
        }
        const jsonString = JSON.stringify(jsonData)
        const jsonBuffer = Buffer.from(jsonString, 'utf8')
        fs.writeFileSync(filePath, jsonBuffer.toString('base64'))
    }

    getAddress(n) {
        this.address = this.address || bitcoinjs.payments.p2pkh({
          pubkey: this.rootNode.derivePath("m/44'/0'/0'/0/" + n).publicKey,
          network: this.network
        }).address
        return this.address
    }

    getWIF(n) {
        this.wif = this.wif || this.rootNode.derivePath("m/44'/0'/0'/0/" + n).toWIF()
        return this.wif
    }

    checkUtxos(n) {
        return getUtxos(this.getAddress(n))
          .then(results => {
            this.utxos = results.unspent
          })
    }

    getUtxos() {
        return this.utxos || []
    }

    sendCoins(from,toAddress, amount, fee) {
        const self = this
        return co(function*(){
          fee = fee || 100000
          yield self.checkUtxos(from)
          const utxos = self.getUtxos()
          
          const txb = new bitcoinjs.TransactionBuilder(self.network)
          let inputTotalAmount = 0
          utxos.forEach(utxo => {
            inputTotalAmount += utxo.value_int
            txb.addInput(utxo.txid, utxo.n)
          })
          
          if (amount + fee > inputTotalAmount)
            throw new Error('残高不足')
          
          txb.addOutput(toAddress, amount)
          
          const MIN_OUTPUT_AMOUNT = 600
          if (amount + fee + MIN_OUTPUT_AMOUNT < inputTotalAmount) {
            txb.addOutput(self.getAddress(from), inputTotalAmount - fee - amount)
          }
  
          
          utxos.forEach((_u, i) => {
            txb.sign(i, self.rootNode.derivePath("m/44'/0'/0'/0/" + from))
          })
          
          const tx = txb.build()
          const txHex = tx.toHex()
          const result = yield pushTransaction(txHex)
          
          return result.success ? tx.getId() : ''
        })
    }
}

module.exports = Wallet