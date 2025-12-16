const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying contracts...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy FHECounter
  console.log("Deploying FHECounter...");
  const FHECounter = await ethers.getContractFactory("FHECounter");
  const fheCounter = await FHECounter.deploy();
  await fheCounter.waitForDeployment();
  console.log("FHECounter deployed to:", await fheCounter.getAddress());

  // Deploy FocusSession
  console.log("Deploying FocusSession...");
  const FocusSession = await ethers.getContractFactory("FocusSession");
  const focusSession = await FocusSession.deploy();
  await focusSession.waitForDeployment();
  console.log("FocusSession deployed to:", await focusSession.getAddress());

  // Save deployment info
  const fs = require("fs");

  // Create deployments directory structure
  const deploymentsDir = "deployments/localhost";
  if (!fs.existsSync("deployments")) {
    fs.mkdirSync("deployments");
  }
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  // Save FHECounter deployment
  const fheCounterAddress = await fheCounter.getAddress();
  const fheCounterDeployment = {
    address: fheCounterAddress,
    abi: fheCounter.interface.format("json")
  };
  fs.writeFileSync(`${deploymentsDir}/FHECounter.json`, JSON.stringify(fheCounterDeployment, null, 2));

  // Save FocusSession deployment
  const focusSessionAddress = await focusSession.getAddress();
  const focusSessionDeployment = {
    address: focusSessionAddress,
    abi: focusSession.interface.format("json")
  };
  fs.writeFileSync(`${deploymentsDir}/FocusSession.json`, JSON.stringify(focusSessionDeployment, null, 2));

  console.log("FHECounter deployed and saved to:", fheCounterAddress);
  console.log("FocusSession deployed and saved to:", focusSessionAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
