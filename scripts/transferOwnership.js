const { ethers } = require("hardhat");

const HODLpacGov = await ethers.getContractFactory("HODLpacGov");

console.log(HODLpacGov);