var Protocol = require('azure-iot-device-amqp').Amqp;
var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;
var Web3 = require('web3');

var connectionString = process.env['IOTHUB'] || process.exit(1);

var client = Client.fromConnectionString(connectionString, Protocol);

var temperature, brightness;

// Set up the IoT Hub communication

var connectCallback = function(err) {
  if (err) {
    console.error('Could not connect: ' + err.message);
  } else {
    console.log('Client connected');

    // Send an update to IoT Hub every second

    var sendInterval = setInterval(function() {
      var data = JSON.stringify({ deviceId: 'yun-office', temperature: temperature, brightness: brightness });
      var message = new Message(data);
      console.log('Sending message: ' + message.getData());
      client.sendEvent(message, function(err, res) {
        //console.log(res);
      });
    }, 10000);

    client.on('error', function(err) {
      console.error(err.message);
    });

    client.on('disconnect', function() {
      clearInterval(sendInterval);
      client.removeAllListeners();
      client.connect(connectCallback);
    });
  }
};

// Read from serial port & update global variables

var serialport = require("serialport");
var SerialPort = serialport.SerialPort;

var sp = new SerialPort("/dev/ttyACM0", {
  parser: serialport.parsers.readline("\r\n")
});

sp.on('open', function(){
  console.log('Serial Port Opened');
  sp.on('data', function(data){
    var v = data.split(':');
    switch (v[0]) {
      case 'C':
        temperature = v[1];
        break;
      case 'B':
        brightness = v[1];
        break;
    }
  });
});

// Run IoT client

client.open(connectCallback);

// Ethereum setup

var account = '0x4cf24bf15bfead008b22ea33b7c99a82326031a7'; // Pi
//var account = '0x87b3f6def4d451c41be733b8924da66dea0caed4'; // Dev
var contractAddress = '0x58b671784f4fa6b02e3dcac9f9dd215b66b5669b';

var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
web3.eth.defaultAccount = account;

var abiArray = [
  {
    "constant": false,
    "inputs": [
      {
        "name": "rate",
        "type": "uint256"
      }],
    "name": "setRate",
    "outputs": [],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "kWh_rate",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "kwh",
        "type": "uint256"
      }],
    "name": "sellEnergy",
    "outputs": [],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [],
    "name": "getEnergyAccount",
    "outputs": [
      {
        "name": "kwh",
        "type": "uint256"
      }],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [],
    "name": "getCoinAccount",
    "outputs": [
      {
        "name": "coin",
        "type": "uint256"
      }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "name": "",
        "type": "address"
      }],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "coin",
        "type": "uint256"
      }],
    "name": "buyEnergy",
    "outputs": [],
    "type": "function"
  },
  {
    "inputs": [],
    "type": "constructor"
  }
];

var contract = web3.eth.contract(abiArray).at(contractAddress);

setInterval(function() {
  // Sell some energy
  console.log("Selling " + brightness + " kW/h");
  contract.sellEnergy(brightness);
}, 5000);

