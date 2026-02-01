const hre = require("hardhat");

async function main() {
  const network = hre.network.name;
  console.log(`Deploying to ${network}...`);
  
  // USDC addresses on testnets
  const usdcAddresses = {
    sepolia: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    arbitrumSepolia: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
  };
  
  const usdcAddress = usdcAddresses[network];
  if (!usdcAddress) {
    throw new Error(`USDC address not configured for network: ${network}`);
  }
  
  const FastDEXBridge = await hre.ethers.getContractFactory("FastDEXBridge");
  const bridge = await FastDEXBridge.deploy(usdcAddress);
  
  await bridge.waitForDeployment();
  const address = await bridge.getAddress();
  
  console.log(`FastDEXBridge deployed to: ${address}`);
  console.log(`USDC address: ${usdcAddress}`);
  console.log(`Network: ${network}`);
  
  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network,
    bridgeAddress: address,
    usdcAddress,
    deployedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    `deployments/${network}.json`, 
    JSON.stringify(deploymentInfo, null, 2)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
