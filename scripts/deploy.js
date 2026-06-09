/**
 * Deployment script for AgentIdentityRegistry and ReputationRegistry
 * Deploy locally: npx hardhat run scripts/deploy.js --network localhost
 * Deploy to Somnia: npx hardhat run scripts/deploy.js --network somnia
 */

async function main() {
  console.log("🚀 Deploying Agent Identity Registry and Reputation Registry...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  const balance = await deployer.getBalance();
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy AgentIdentityRegistry
  console.log("\n📋 Deploying AgentIdentityRegistry...");
  const AgentIdentityRegistry = await ethers.getContractFactory("AgentIdentityRegistry");
  const identityRegistry = await AgentIdentityRegistry.deploy();
  await identityRegistry.waitForDeployment();
  const identityAddress = await identityRegistry.getAddress();
  console.log("✅ AgentIdentityRegistry deployed to:", identityAddress);

  // Deploy ReputationRegistry
  console.log("\n📊 Deploying ReputationRegistry...");
  const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
  const reputationRegistry = await ReputationRegistry.deploy();
  await reputationRegistry.waitForDeployment();
  const reputationAddress = await reputationRegistry.getAddress();
  console.log("✅ ReputationRegistry deployed to:", reputationAddress);

  // Save deployment addresses
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    identityRegistry: identityAddress,
    reputationRegistry: reputationAddress,
    deploymentTime: new Date().toISOString(),
  };

  console.log("\n📌 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Save to file
  const fs = require("fs");
  const path = require("path");
  const deployDir = path.join(__dirname, "../deployments");

  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir);
  }

  const filename = path.join(
    deployDir,
    `${deploymentInfo.network}-${deploymentInfo.chainId}-${Date.now()}.json`
  );
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment info saved to:", filename);

  // Add to .env file for app usage
  const envPath = path.join(__dirname, "../.env");
  let envContent = "";

  try {
    envContent = fs.readFileSync(envPath, "utf8");
  } catch (e) {
    // Create new .env file if it doesn't exist
    console.log("📄 Creating new .env file...");
  }

  // Update or add environment variables
  const updateEnv = (content, key, value) => {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      return content.replace(regex, `${key}=${value}`);
    }
    return content + (content.endsWith("\n") ? "" : "\n") + `${key}=${value}\n`;
  };

  envContent = updateEnv(envContent, "AGENT_IDENTITY_REGISTRY", identityAddress);
  envContent = updateEnv(envContent, "REPUTATION_REGISTRY", reputationAddress);

  fs.writeFileSync(envPath, envContent);
  console.log("✅ .env file updated with contract addresses");

  console.log("\n🎉 Deployment complete!");
  console.log("\n💡 Next steps:");
  console.log("1. Update your .env file with the deployed addresses (done!)");
  console.log("2. Update app/lib/erc8004/config.js with the registry addresses");
  console.log("3. Run migrations: npx prisma migrate deploy");
  console.log("4. Start the app: npm run dev");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
