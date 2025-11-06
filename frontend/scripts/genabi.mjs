import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// Contract names to generate ABIs for
const CONTRACT_NAMES = ["FHECounter", "FocusSession"];

// <root>/packages/fhevm-hardhat-template
const rel = "..";

// <root>/packages/site/components
const outdir = path.resolve("./abi");

if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir);
}

const dir = path.resolve(rel);
const dirname = path.basename(dir);

const line =
  "\n===================================================================\n";

if (!fs.existsSync(dir)) {
  console.error(
    `${line}Unable to locate ${rel}. Expecting <root>/packages/${dirname}${line}`
  );
  process.exit(1);
}

if (!fs.existsSync(outdir)) {
  console.error(`${line}Unable to locate ${outdir}.${line}`);
  process.exit(1);
}

const deploymentsDir = path.join(dir, "deployments");

function deployOnHardhatNode() {
  if (process.platform === "win32") {
    // Not supported on Windows
    return;
  }
  try {
    execSync(`./deploy-hardhat-node.sh`, {
      cwd: path.resolve("./scripts"),
      stdio: "inherit",
    });
  } catch (e) {
    console.error(`${line}Script execution failed: ${e}${line}`);
    process.exit(1);
  }
}

function readDeployment(chainName, chainId, contractName, optional) {
  const chainDeploymentDir = path.join(deploymentsDir, chainName);

  if (!fs.existsSync(chainDeploymentDir) && chainId === 31337) {
    // Try to auto-deploy the contract on hardhat node!
    deployOnHardhatNode();
  }

  if (!fs.existsSync(chainDeploymentDir)) {
    console.error(
      `${line}Unable to locate '${chainDeploymentDir}' directory.\n\n1. Goto '${dirname}' directory\n2. Run 'npx hardhat deploy --network ${chainName}'.${line}`
    );
    if (!optional) {
      process.exit(1);
    }
    return undefined;
  }

  const contractFile = path.join(chainDeploymentDir, `${contractName}.json`);
  if (!fs.existsSync(contractFile)) {
    console.warn(`Contract ${contractName} not found in ${chainDeploymentDir}`);
    return undefined;
  }

  const jsonString = fs.readFileSync(contractFile, "utf-8");
  const obj = JSON.parse(jsonString);
  obj.chainId = chainId;

  return obj;
}

function generateContractFiles(contractName) {
  // Auto deployed on Linux/Mac (will fail on windows)
  let deployLocalhost = readDeployment("localhost", 31337, contractName, true /* optional */);

  // Try hardhat network name as fallback
  if (!deployLocalhost) {
    deployLocalhost = readDeployment("hardhat", 31337, contractName, true /* optional */);
  }

  // Sepolia is optional
  let deploySepolia = readDeployment("sepolia", 11155111, contractName, true /* optional */);

  // If neither deployment exists, create placeholder with empty address
  if (!deployLocalhost && !deploySepolia) {
    console.warn(`${line}No deployments found for ${contractName}. Creating placeholder.${line}`);
    // Try to read ABI from artifacts
    const artifactPath = path.join(dir, "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
      deployLocalhost = { abi: artifact.abi, address: "0x0000000000000000000000000000000000000000" };
      deploySepolia = { abi: artifact.abi, address: "0x0000000000000000000000000000000000000000" };
    } else {
      console.error(`${line}No ABI found for ${contractName}. Run 'pnpm compile' first.${line}`);
      return;
    }
  }

  if (!deploySepolia) {
    deploySepolia = { abi: deployLocalhost.abi, address: "0x0000000000000000000000000000000000000000" };
  }

  if (!deployLocalhost) {
    deployLocalhost = { abi: deploySepolia.abi, address: "0x0000000000000000000000000000000000000000" };
  }

  if (deployLocalhost && deploySepolia) {
    if (
      JSON.stringify(deployLocalhost.abi) !== JSON.stringify(deploySepolia.abi)
    ) {
      console.error(
        `${line}Deployments on localhost and Sepolia differ for ${contractName}. Cant use the same abi on both networks. Consider re-deploying the contracts on both networks.${line}`
      );
      // Continue anyway using localhost ABI
    }
  }

  const tsCode = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const ${contractName}ABI = ${JSON.stringify({ abi: deployLocalhost.abi }, null, 2)} as const;
\n`;
  const tsAddresses = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const ${contractName}Addresses = { 
  "11155111": { address: "${deploySepolia.address}", chainId: 11155111, chainName: "sepolia" },
  "31337": { address: "${deployLocalhost.address}", chainId: 31337, chainName: "hardhat" },
};
`;

  console.log(`Generated ${path.join(outdir, `${contractName}ABI.ts`)}`);
  console.log(`Generated ${path.join(outdir, `${contractName}Addresses.ts`)}`);
  console.log(tsAddresses);

  fs.writeFileSync(path.join(outdir, `${contractName}ABI.ts`), tsCode, "utf-8");
  fs.writeFileSync(
    path.join(outdir, `${contractName}Addresses.ts`),
    tsAddresses,
    "utf-8"
  );
}

// Generate files for each contract
for (const contractName of CONTRACT_NAMES) {
  generateContractFiles(contractName);
}
