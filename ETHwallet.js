const fs = require('fs')
const web3 = new (require("web3"));
const HDWalletProvider = require('truffle-hdwallet-provider');
const INFURA_PROJECT_ID = "d11c17162d934093bf8bafa878e42df7";
const b64Data = fs.readFileSync("test.wallet").toString('utf8')
const jsonString = Buffer.from(b64Data, 'base64').toString('utf8')
const jsonData = JSON.parse(jsonString)
web3.setProvider(new HDWalletProvider(jsonData.mnemonicPhrase, `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`));

class ETHWallet{
    constructor (){
        this.account
    }
    async getAccount(){
        var account = await web3.eth.getAccounts()
        this.account = account[0]
        return this.account
    }
    async getBalance(){
        var wei = await web3.eth.getBalance(this.account)
        return wei
    }
    async sendCoins(addr,amount){
        var txid = await web3.eth.sendTransaction({
            from: this.account,
            to: addr,
            value: amount
        });
        return txid.transactionHash
    }
}

module.exports = ETHWallet

