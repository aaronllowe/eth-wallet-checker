const cluster = require("cluster");
const numCPUs = require("os").cpus().length;
const eth = require("ethers");
const Web3 = require("web3");
const hdkey = require("ethereumjs-wallet");
const bip39 = require("bip39");
const web3 = new Web3("https://mainnet.infura.io/v3/your-api-key");

async function check() {
  const path = "m/44'/60'/0'/0/0";
  let entropy, mnemonicPhrase, hdwallet, wallet, address;
  entropy = eth.utils.randomBytes(16);
  mnemonicPhrase = eth.utils.entropyToMnemonic(entropy);
  hdwallet = hdkey.hdkey.fromMasterSeed(bip39.mnemonicToSeedSync(mnemonicPhrase));
  wallet = hdwallet.derivePath(path).getWallet();
  address = `0x${wallet.getAddress().toString("hex")}`;
  web3.eth.getBalance(address, (error, balance) => {
    process.send({ cmd: "notifyRequest" });
    if (balance > 0) {
      console.log("");
      console.log(`mnemonic => ${mnemonicPhrase}`);
      console.log(`balance => ${balance}`);
    }
  });
}

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  let cps = 0;
  setInterval(() => {
    process.stdout.cursorTo(0);
    process.stdout.write(`Checks/second: ${cps}`);
    cps = 0;
  }, 1000);

  function messageHandler(msg) {
    if (msg.cmd && msg.cmd === "notifyRequest") {
      cps += 1;
    }
  }

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  for (const id in cluster.workers) {
    cluster.workers[id].on("message", messageHandler);
  }

  cluster.on("exit", (worker, code, signal) => {
    cluster.fork();
  });
} else {
  // console.log(`Worker ${process.pid} started`);
  setInterval(() => {
    check();
  }, 0);
}
