import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// Contract names to generate ABIs for
const CONTRACT_NAMES = ["FHECounter", "FocusSession"];

// Where to output generated ABI/addresses in the frontend
const outdir = path.resolve("./abi");

if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir);
}

// Resolve a deployments directory from a few likely repo layouts
const line = "\n===================================================================\n";
const candidates = [
  path.resolve("../deployments"),
  path.resolve("../../fhevm-hardhat-template/deployments"),
  path.resolve("../fhevm-hardhat-template/deployments"),
  path.resolve("../../packages/fhevm-hardhat-template/deployments"),
];

let deploymentsDir = undefined;
let projectRoot = undefined;
for (const cand of candidates) {
  if (fs.existsSync(cand)) {
    deploymentsDir = cand;
    projectRoot = path.dirname(cand);
    break;
  }
}

if (!deploymentsDir) {
  console.error(
    `${line}Unable to locate a deployments directory. Looked at:\n${candidates
      .map((c) => ` - ${c}`)
      .join("\n")}\n\nEnsure you have deployed contracts (e.g., 'npx hardhat deploy --network localhost') in your Hardhat project.${line}`
  );
  process.exit(1);
}

function deployOnHardhatNode() {
  if (process.platform === "win32") {
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
    deployOnHardhatNode();
  }

  if (!fs.existsSync(chainDeploymentDir)) {
    const hintRoot = projectRoot ? path.basename(projectRoot) : "<hardhat-project>";
    console.warn(
      `${line}Unable to locate '${chainDeploymentDir}' directory.\n\n1. Goto '${hintRoot}' directory\n2. Run 'npx hardhat deploy --network ${chainName}'.${line}`
    );
    if (!optional) {
      process.exit(1);
    }
    return undefined;
  }

  const contractJsonPath = path.join(chainDeploymentDir, `${contractName}.json`);
  if (!fs.existsSync(contractJsonPath)) {
    const hintRoot = projectRoot ? path.basename(projectRoot) : "<hardhat-project>";
    if (!optional) {
      console.error(
        `${line}Missing ${contractName}.json in '${chainDeploymentDir}'.\n\n1. Goto '${hintRoot}' directory\n2. Run 'npx hardhat deploy --network ${chainName}'.${line}`
      );
      process.exit(1);
    }
    return undefined;
  }

  const jsonString = fs.readFileSync(contractJsonPath, "utf-8");
  const obj = JSON.parse(jsonString);
  obj.chainId = chainId;

  return obj;
}

function generateForContract(CONTRACT_NAME) {
  // Try localhost first (standard Hardhat network name for local dev)
  let deployLocalhost = readDeployment("localhost", 31337, CONTRACT_NAME, true);
  
  // If not found, try 'hardhat' as fallback network name
  if (!deployLocalhost) {
    deployLocalhost = readDeployment("hardhat", 31337, CONTRACT_NAME, true);
  }
  
  // Sepolia is optional
  let deploySepolia = readDeployment("sepolia", 11155111, CONTRACT_NAME, true);
  
  // If no localhost deployment found, try to read ABI from artifacts
  if (!deployLocalhost) {
    const artifactPath = path.join(projectRoot, "artifacts", "contracts", `${CONTRACT_NAME}.sol`, `${CONTRACT_NAME}.json`);
    if (fs.existsSync(artifactPath)) {
      console.log(`Reading ABI from artifacts for ${CONTRACT_NAME}`);
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
      deployLocalhost = { abi: artifact.abi, address: "0x0000000000000000000000000000000000000000" };
    } else {
      console.error(`${line}No deployment or artifacts found for ${CONTRACT_NAME}. Run 'pnpm compile' first.${line}`);
      return;
    }
  }
  
  if (!deploySepolia) {
    deploySepolia = {
      abi: deployLocalhost.abi,
      address: "0x0000000000000000000000000000000000000000",
    };
  }

  // Generate ABI file
  const tsAbiCode = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const ${CONTRACT_NAME}ABI = ${JSON.stringify({ abi: deployLocalhost.abi }, null, 2)} as const;
`;

  // Generate Addresses file with dynamic address support
  const envVarName = CONTRACT_NAME.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
  const tsAddressesCode = `
/*
  This file provides dynamic contract addresses based on chain ID.
  
  Addresses can be overridden via environment variables:
  - NEXT_PUBLIC_${envVarName}_ADDRESS_HARDHAT (for chainId 31337)
  - NEXT_PUBLIC_${envVarName}_ADDRESS_SEPOLIA (for chainId 11155111)
  
  Command: 'npm run genabi' to regenerate from deployment artifacts.
*/

// Default addresses from deployment artifacts
const DEFAULT_ADDRESSES = {
  "11155111": { address: "${deploySepolia.address}", chainId: 11155111, chainName: "sepolia" },
  "31337": { address: "${deployLocalhost.address}", chainId: 31337, chainName: "hardhat" },
} as const;

// Allow runtime override via environment variables
function getHardhatAddress(): string {
  if (typeof window !== 'undefined') {
    const envAddress = process.env.NEXT_PUBLIC_${envVarName}_ADDRESS_HARDHAT;
    if (envAddress && envAddress !== "" && envAddress !== "0x0000000000000000000000000000000000000000") {
      return envAddress;
    }
  }
  return DEFAULT_ADDRESSES["31337"].address;
}

function getSepoliaAddress(): string {
  if (typeof window !== 'undefined') {
    const envAddress = process.env.NEXT_PUBLIC_${envVarName}_ADDRESS_SEPOLIA;
    if (envAddress && envAddress !== "" && envAddress !== "0x0000000000000000000000000000000000000000") {
      return envAddress;
    }
  }
  return DEFAULT_ADDRESSES["11155111"].address;
}

// Export dynamic addresses
export const ${CONTRACT_NAME}Addresses = {
  "11155111": { 
    get address() { return getSepoliaAddress(); },
    chainId: 11155111, 
    chainName: "sepolia" 
  },
  "31337": { 
    get address() { return getHardhatAddress(); },
    chainId: 31337, 
    chainName: "hardhat" 
  },
} as const;

// Helper function to get address by chainId
export function get${CONTRACT_NAME}Address(chainId: number | undefined): string | undefined {
  if (!chainId) return undefined;
  
  const chainIdStr = chainId.toString();
  if (chainIdStr === "31337") {
    return getHardhatAddress();
  }
  if (chainIdStr === "11155111") {
    return getSepoliaAddress();
  }
  return undefined;
}
`;

  console.log(`Generated ${path.join(outdir, `${CONTRACT_NAME}ABI.ts`)}`);
  console.log(`Generated ${path.join(outdir, `${CONTRACT_NAME}Addresses.ts`)}`);
  console.log(`  Hardhat (31337): ${deployLocalhost.address}`);
  console.log(`  Sepolia (11155111): ${deploySepolia.address}`);
  
  fs.writeFileSync(path.join(outdir, `${CONTRACT_NAME}ABI.ts`), tsAbiCode, "utf-8");
  fs.writeFileSync(path.join(outdir, `${CONTRACT_NAME}Addresses.ts`), tsAddressesCode, "utf-8");
}

// Generate for all contracts
for (const contractName of CONTRACT_NAMES) {
  generateForContract(contractName);
}

console.log("\n✓ ABI generation complete!");
console.log("\nTo override addresses at runtime, set environment variables:");
console.log("  NEXT_PUBLIC_FHE_COUNTER_ADDRESS_HARDHAT=0x...");
console.log("  NEXT_PUBLIC_FOCUS_SESSION_ADDRESS_HARDHAT=0x...");
