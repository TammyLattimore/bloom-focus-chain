"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";

/*
  Contract ABI and addresses - addresses can be overridden via environment variables:
  - NEXT_PUBLIC_FOCUS_SESSION_ADDRESS_HARDHAT (for chainId 31337)
  - NEXT_PUBLIC_FOCUS_SESSION_ADDRESS_SEPOLIA (for chainId 11155111)
*/
import { FocusSessionAddresses, getFocusSessionAddress } from "@/abi/FocusSessionAddresses";
import { FocusSessionABI } from "@/abi/FocusSessionABI";

export type ClearValueType = {
  handle: string;
  clear: string | bigint | boolean;
};

type FocusSessionInfoType = {
  abi: typeof FocusSessionABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

/**
 * Resolves FocusSession contract metadata for the given EVM `chainId`.
 * Supports dynamic address resolution via environment variables.
 */
function getFocusSessionByChainId(
  chainId: number | undefined
): FocusSessionInfoType {
  if (!chainId) {
    return { abi: FocusSessionABI.abi };
  }

  // Try to get address dynamically (supports env var override)
  const dynamicAddress = getFocusSessionAddress(chainId);
  
  if (dynamicAddress && dynamicAddress !== ethers.ZeroAddress) {
    const entry = FocusSessionAddresses[chainId.toString() as keyof typeof FocusSessionAddresses];
    return {
      address: dynamicAddress as `0x${string}`,
      chainId: entry?.chainId ?? chainId,
      chainName: entry?.chainName ?? (chainId === 31337 ? "hardhat" : chainId === 11155111 ? "sepolia" : "unknown"),
      abi: FocusSessionABI.abi,
    };
  }

  return { abi: FocusSessionABI.abi, chainId };
}

/**
 * Safely call a contract method that returns euint32 encrypted value.
 * 
 * This function handles the case where an encrypted value has not been initialized yet.
 * In FHEVM, uninitialized encrypted values return "0x" or empty bytes, which would
 * normally cause decoding errors. This wrapper catches those cases and returns ZeroHash.
 * 
 * @param contract - The ethers.js contract instance
 * @param methodName - Name of the contract method to call (e.g., "getSessionCount")
 * @returns The encrypted handle as a string, or ZeroHash if uninitialized
 * 
 * @example
 * const handle = await safeGetEuint32(contract, "getSessionCount");
 * if (handle === ethers.ZeroHash) {
 *   // Handle uninitialized case
 * }
 */
async function safeGetEuint32(
  contract: ethers.Contract,
  methodName: string
): Promise<string> {
  try {
    const encryptedHandle = await contract[methodName]();
    
    // Check if the encrypted handle is empty or uninitialized
    // FHEVM returns "0x" or empty string for uninitialized encrypted values
    if (!encryptedHandle || encryptedHandle === "0x" || encryptedHandle === "") {
      return ethers.ZeroHash;
    }
    
    return encryptedHandle;
  } catch (error) {
    // If the contract call fails (e.g., method doesn't exist, network error),
    // treat it as an uninitialized value
    console.warn(`Failed to call ${methodName}:`, error);
    return ethers.ZeroHash;
  }
}

/**
 * Main FocusSession React hook for encrypted focus session tracking
 */
export const useFocusSession = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    sameChain,
    sameSigner,
  } = parameters;

  // States + Refs
  const [sessionCountHandle, setSessionCountHandle] = useState<string | undefined>(undefined);
  const [totalMinutesHandle, setTotalMinutesHandle] = useState<string | undefined>(undefined);
  const [weeklyGoalHandle, setWeeklyGoalHandle] = useState<string | undefined>(undefined);
  
  const [clearSessionCount, setClearSessionCount] = useState<ClearValueType | undefined>(undefined);
  const [clearTotalMinutes, setClearTotalMinutes] = useState<ClearValueType | undefined>(undefined);
  const [clearWeeklyGoal, setClearWeeklyGoal] = useState<ClearValueType | undefined>(undefined);
  
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isLogging, setIsLogging] = useState<boolean>(false);
  const [isSettingGoal, setIsSettingGoal] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [walletAddress, setWalletAddress] = useState<string | undefined>(undefined);

  const focusSessionRef = useRef<FocusSessionInfoType | undefined>(undefined);
  const isRefreshingRef = useRef<boolean>(false);
  const isDecryptingRef = useRef<boolean>(false);
  const isLoggingRef = useRef<boolean>(false);

  // Track wallet address
  useEffect(() => {
    if (ethersSigner) {
      ethersSigner.getAddress().then(setWalletAddress).catch(() => setWalletAddress(undefined));
    } else {
      setWalletAddress(undefined);
    }
  }, [ethersSigner]);

  // Check if there's any data (non-zero handle)
  // Memoize to prevent unnecessary re-calculations
  const hasData = useMemo(() => {
    return sessionCountHandle !== undefined && sessionCountHandle !== ethers.ZeroHash;
  }, [sessionCountHandle]);

  // Check if data is decrypted - handles must match their clear values
  // This is a critical check used in multiple places, so memoize it
  const isDecrypted = useMemo(() => {
    // If no session count handle, not decrypted yet
    if (!sessionCountHandle) return false;
    // If session count is zero hash, treat as decrypted with zeros
    if (sessionCountHandle === ethers.ZeroHash) return true;
    // Otherwise check if handles match their clear values
    const sessionMatches = sessionCountHandle === clearSessionCount?.handle;
    const minutesMatch = !totalMinutesHandle || totalMinutesHandle === clearTotalMinutes?.handle;
    return sessionMatches && minutesMatch;
  }, [sessionCountHandle, totalMinutesHandle, clearSessionCount, clearTotalMinutes]);

  // FocusSession Contract Info
  const focusSession = useMemo(() => {
    const c = getFocusSessionByChainId(chainId);
    focusSessionRef.current = c;
    if (!c.address) {
      setMessage(`FocusSession deployment not found for chainId=${chainId}.`);
    }
    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!focusSession) return undefined;
    return Boolean(focusSession.address) && focusSession.address !== ethers.ZeroAddress;
  }, [focusSession]);

  const canRefresh = useMemo(() => {
    return focusSession.address && ethersSigner && !isRefreshing;
  }, [focusSession.address, ethersSigner, isRefreshing]);

  /**
   * Refresh encrypted data handles from the FocusSession contract.
   * 
   * This function fetches the latest encrypted handles (session count, total minutes, 
   * and weekly goal) from the blockchain. It must use a signer (not just a provider) 
   * because the contract methods use msg.sender to return user-specific data.
   * 
   * The function is debounced using isRefreshingRef to prevent concurrent fetches.
   * It safely handles uninitialized values and provides user feedback via setMessage.
   * 
   * @see safeGetEuint32 for how uninitialized values are handled
   */
  const refreshHandles = useCallback(() => {
    // Prevent concurrent refresh operations
    if (isRefreshingRef.current) {
      console.debug("Refresh already in progress, skipping");
      return;
    }
    
    // Validate required parameters before fetching
    if (!focusSessionRef.current?.chainId || !focusSessionRef.current?.address || !ethersSigner) {
      // Clear handles if contract or signer not available
      setSessionCountHandle(undefined);
      setTotalMinutesHandle(undefined);
      setWeeklyGoalHandle(undefined);
      return;
    }

    // Lock to prevent concurrent fetches
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    setMessage("Fetching encrypted session data...");

    // Capture current state to detect stale operations
    const currentChainId = focusSessionRef.current.chainId;
    const currentContractAddress = focusSessionRef.current.address;
    
    // Create contract instance with signer (required because methods use msg.sender)
    const contractWithSigner = new ethers.Contract(
      currentContractAddress,
      focusSessionRef.current.abi,
      ethersSigner
    );

    // Fetch all encrypted handles in parallel for efficiency
    // Use safe getters that gracefully handle uninitialized values
    Promise.all([
      safeGetEuint32(contractWithSigner, "getSessionCount"),
      safeGetEuint32(contractWithSigner, "getTotalMinutes"),
      safeGetEuint32(contractWithSigner, "getWeeklyGoal"),
    ])
      .then(([sessionCountEncrypted, totalMinutesEncrypted, weeklyGoalEncrypted]) => {
        // Check if context is still valid (user hasn't switched chains/contracts)
        const isStillValid = sameChain.current(currentChainId) && 
                            currentContractAddress === focusSessionRef.current?.address;
        
        if (isStillValid) {
          // Update handles with fetched values
          setSessionCountHandle(sessionCountEncrypted);
          setTotalMinutesHandle(totalMinutesEncrypted);
          setWeeklyGoalHandle(weeklyGoalEncrypted);
          
          // Check if this is a new user (no data on-chain yet)
          if (sessionCountEncrypted === ethers.ZeroHash) {
            // Initialize clear values to zero for uninitialized account
            setClearSessionCount({ handle: sessionCountEncrypted, clear: BigInt(0) });
            setClearTotalMinutes({ handle: totalMinutesEncrypted, clear: BigInt(0) });
            setClearWeeklyGoal({ handle: weeklyGoalEncrypted, clear: BigInt(0) });
            setMessage("Welcome! Start your first focus session to begin tracking.");
          } else {
            // User has encrypted data on-chain
            setMessage("Encrypted session data loaded. Click 'Decrypt' to view your stats.");
          }
        } else {
          // Context changed during fetch, ignore results
          console.debug("Ignoring stale refresh results");
        }
        
        // Release refresh lock
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      })
      .catch((e) => {
        console.error("Failed to fetch session data:", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        
        // Set handles to zero hash on error
        setSessionCountHandle(ethers.ZeroHash);
        setTotalMinutesHandle(ethers.ZeroHash);
        setWeeklyGoalHandle(ethers.ZeroHash);
        setClearSessionCount({ handle: ethers.ZeroHash, clear: BigInt(0) });
        setClearTotalMinutes({ handle: ethers.ZeroHash, clear: BigInt(0) });
        setClearWeeklyGoal({ handle: ethers.ZeroHash, clear: BigInt(0) });
        
        // Provide user-friendly error message
        if (errorMessage.includes("network")) {
          setMessage("Network error. Please check your connection.");
        } else if (errorMessage.includes("contract")) {
          setMessage("Contract not found. Please check network.");
        } else {
          setMessage("Ready to start tracking. Log your first session!");
        }
        
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      });
  }, [ethersSigner, sameChain]);

  // Auto refresh when signer is available
  // Only run when signer or address actually changes, not when refreshHandles changes
  useEffect(() => {
    if (ethersSigner && focusSession.address) {
      refreshHandles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ethersSigner, focusSession.address]);

  // Decrypt all handles
  const canDecrypt = useMemo(() => {
    return (
      focusSession.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isDecrypting &&
      sessionCountHandle &&
      sessionCountHandle !== ethers.ZeroHash &&
      sessionCountHandle !== clearSessionCount?.handle
    );
  }, [focusSession.address, instance, ethersSigner, isRefreshing, isDecrypting, sessionCountHandle, clearSessionCount]);

  const decryptStats = useCallback(() => {
    if (isRefreshingRef.current || isDecryptingRef.current) return;
    if (!focusSession.address || !instance || !ethersSigner) return;

    // Check if all zero (not initialized)
    if (sessionCountHandle === ethers.ZeroHash) {
      setClearSessionCount({ handle: sessionCountHandle, clear: BigInt(0) });
      setClearTotalMinutes({ handle: totalMinutesHandle || ethers.ZeroHash, clear: BigInt(0) });
      setClearWeeklyGoal({ handle: weeklyGoalHandle || ethers.ZeroHash, clear: BigInt(0) });
      setMessage("No data to decrypt yet.");
      return;
    }

    const thisChainId = chainId;
    const thisAddress = focusSession.address;
    const thisEthersSigner = ethersSigner;

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Starting decryption...");

    const run = async () => {
      const isStale = () =>
        thisAddress !== focusSessionRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        const sig = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [focusSession.address as `0x${string}`],
          ethersSigner,
          fhevmDecryptionSignatureStorage
        );

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return;
        }

        if (isStale()) {
          setMessage("Decryption cancelled - context changed");
          return;
        }

        setMessage("Decrypting encrypted data...");

        const handlesToDecrypt = [];
        if (sessionCountHandle && sessionCountHandle !== ethers.ZeroHash) {
          handlesToDecrypt.push({ handle: sessionCountHandle, contractAddress: thisAddress });
        }
        if (totalMinutesHandle && totalMinutesHandle !== ethers.ZeroHash) {
          handlesToDecrypt.push({ handle: totalMinutesHandle, contractAddress: thisAddress });
        }
        if (weeklyGoalHandle && weeklyGoalHandle !== ethers.ZeroHash) {
          handlesToDecrypt.push({ handle: weeklyGoalHandle, contractAddress: thisAddress });
        }

        if (handlesToDecrypt.length === 0) {
          setClearSessionCount({ handle: sessionCountHandle || ethers.ZeroHash, clear: BigInt(0) });
          setClearTotalMinutes({ handle: totalMinutesHandle || ethers.ZeroHash, clear: BigInt(0) });
          setClearWeeklyGoal({ handle: weeklyGoalHandle || ethers.ZeroHash, clear: BigInt(0) });
          setMessage("No encrypted data to decrypt");
          return;
        }

        const res = await instance.userDecrypt(
          handlesToDecrypt,
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        if (isStale()) {
          setMessage("Decryption cancelled - context changed");
          return;
        }

        if (sessionCountHandle) {
          setClearSessionCount({ handle: sessionCountHandle, clear: res[sessionCountHandle] ?? BigInt(0) });
        }
        if (totalMinutesHandle) {
          setClearTotalMinutes({ handle: totalMinutesHandle, clear: res[totalMinutesHandle] ?? BigInt(0) });
        }
        if (weeklyGoalHandle) {
          setClearWeeklyGoal({ handle: weeklyGoalHandle, clear: res[weeklyGoalHandle] ?? BigInt(0) });
        }

        setMessage("Decryption completed!");
      } catch (e) {
        console.error("Decryption error:", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        
        // Provide user-friendly error messages
        if (errorMessage.includes("signature") || errorMessage.includes("sign")) {
          setMessage("Decryption failed: Wallet signature rejected");
        } else if (errorMessage.includes("permission") || errorMessage.includes("allow")) {
          setMessage("Decryption failed: Missing decrypt permission");
        } else if (errorMessage.includes("network")) {
          setMessage("Decryption failed: Network error");
        } else {
          setMessage(`Decryption failed: ${errorMessage}`);
        }
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };

    run();
  }, [
    fhevmDecryptionSignatureStorage,
    ethersSigner,
    focusSession.address,
    instance,
    sessionCountHandle,
    totalMinutesHandle,
    weeklyGoalHandle,
    chainId,
    sameChain,
    sameSigner,
  ]);

  // Log Session
  const canLogSession = useMemo(() => {
    return focusSession.address && instance && ethersSigner && !isRefreshing && !isLogging;
  }, [focusSession.address, instance, ethersSigner, isRefreshing, isLogging]);

  const logSession = useCallback(
    async (minutes: number) => {
      if (isRefreshingRef.current || isLoggingRef.current) return;
      if (!focusSession.address || !instance || !ethersSigner || minutes <= 0) return;

      const thisChainId = chainId;
      const thisAddress = focusSession.address;
      const thisEthersSigner = ethersSigner;
      const contract = new ethers.Contract(thisAddress, focusSession.abi, thisEthersSigner);

      isLoggingRef.current = true;
      setIsLogging(true);
      setMessage(`Encrypting ${minutes} minutes...`);

      try {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const isStale = () =>
          thisAddress !== focusSessionRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        const input = instance.createEncryptedInput(thisAddress, thisEthersSigner.address);
        input.add32(minutes);
        const enc = await input.encrypt();

        if (isStale()) {
          setMessage("Operation cancelled - context changed");
          return;
        }

        setMessage("Submitting encrypted session to blockchain...");
        const tx = await contract.logSession(enc.handles[0], enc.inputProof);
        setMessage(`Waiting for tx: ${tx.hash}...`);
        const receipt = await tx.wait();
        setMessage(`Session logged! Status: ${receipt?.status}`);

        if (isStale()) return;
        
        // Reset clear values since handles will change
        setClearSessionCount(undefined);
        setClearTotalMinutes(undefined);
        setClearWeeklyGoal(undefined);
        
        refreshHandles();
      } catch (e) {
        console.error("Log session error:", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        
        // Provide user-friendly error messages
        if (errorMessage.includes("user rejected") || errorMessage.includes("denied")) {
          setMessage("Session logging cancelled by user");
        } else if (errorMessage.includes("gas") || errorMessage.includes("fee")) {
          setMessage("Transaction failed: Insufficient gas or funds");
        } else if (errorMessage.includes("network")) {
          setMessage("Network error: Please try again");
        } else {
          setMessage(`Failed to log session: ${errorMessage.substring(0, 100)}`);
        }
        throw e;
      } finally {
        isLoggingRef.current = false;
        setIsLogging(false);
      }
    },
    [ethersSigner, focusSession.address, focusSession.abi, instance, chainId, refreshHandles, sameChain, sameSigner]
  );

  // Set Weekly Goal
  const setWeeklyGoal = useCallback(
    async (goalMinutes: number) => {
      if (!focusSession.address || !instance || !ethersSigner || goalMinutes <= 0) return;

      const thisChainId = chainId;
      const thisAddress = focusSession.address;
      const thisEthersSigner = ethersSigner;
      const contract = new ethers.Contract(thisAddress, focusSession.abi, thisEthersSigner);

      setIsSettingGoal(true);
      setMessage(`Encrypting goal: ${goalMinutes} minutes...`);

      try {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const isStale = () =>
          thisAddress !== focusSessionRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        const input = instance.createEncryptedInput(thisAddress, thisEthersSigner.address);
        input.add32(goalMinutes);
        const enc = await input.encrypt();

        if (isStale()) {
          setMessage("Operation cancelled - context changed");
          return;
        }

        setMessage("Setting encrypted weekly goal...");
        const tx = await contract.setWeeklyGoal(enc.handles[0], enc.inputProof);
        setMessage(`Waiting for tx: ${tx.hash}...`);
        const receipt = await tx.wait();
        setMessage(`Goal set! Status: ${receipt?.status}`);

        if (isStale()) return;
        
        // Reset clear values since handles will change
        setClearWeeklyGoal(undefined);
        
        refreshHandles();
      } catch (e) {
        console.error("Set goal error:", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        
        // Provide user-friendly error messages
        if (errorMessage.includes("user rejected") || errorMessage.includes("denied")) {
          setMessage("Goal setting cancelled by user");
        } else if (errorMessage.includes("gas") || errorMessage.includes("fee")) {
          setMessage("Transaction failed: Insufficient gas or funds");
        } else {
          setMessage(`Failed to set goal: ${errorMessage.substring(0, 100)}`);
        }
        throw e;
      } finally {
        setIsSettingGoal(false);
      }
    },
    [ethersSigner, focusSession.address, focusSession.abi, instance, chainId, refreshHandles, sameChain, sameSigner]
  );

  // Reset all stats on-chain
  const resetStats = useCallback(
    async () => {
      if (!focusSession.address || !ethersSigner) {
        setMessage("Cannot reset: wallet not connected");
        return;
      }

      const thisChainId = chainId;
      const thisAddress = focusSession.address;
      const thisEthersSigner = ethersSigner;
      const contract = new ethers.Contract(thisAddress, focusSession.abi, thisEthersSigner);

      setIsResetting(true);
      setMessage("Resetting encrypted stats on-chain...");

      try {
        const isStale = () =>
          thisAddress !== focusSessionRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        const tx = await contract.resetStats();
        setMessage(`Waiting for reset tx: ${tx.hash}...`);
        const receipt = await tx.wait();
        setMessage(`Stats reset! Status: ${receipt?.status}`);

        if (isStale()) return;
        
        // Clear all local state
        setSessionCountHandle(undefined);
        setTotalMinutesHandle(undefined);
        setWeeklyGoalHandle(undefined);
        setClearSessionCount(undefined);
        setClearTotalMinutes(undefined);
        setClearWeeklyGoal(undefined);
        
        // Refresh to get new (zero) handles
        refreshHandles();
      } catch (e) {
        setMessage("Failed to reset stats: " + e);
        console.error("Reset stats error:", e);
      } finally {
        setIsResetting(false);
      }
    },
    [ethersSigner, focusSession.address, focusSession.abi, chainId, refreshHandles, sameChain, sameSigner]
  );

  return {
    contractAddress: focusSession.address,
    walletAddress,
    isDeployed,
    hasData,
    canRefresh,
    canDecrypt,
    canLogSession,
    refreshHandles,
    decryptStats,
    logSession,
    setWeeklyGoal,
    resetStats,
    isDecrypted,
    message,
    sessionCount: clearSessionCount?.clear,
    totalMinutes: clearTotalMinutes?.clear,
    weeklyGoal: clearWeeklyGoal?.clear,
    sessionCountHandle,
    totalMinutesHandle,
    weeklyGoalHandle,
    isRefreshing,
    isDecrypting,
    isLogging,
    isSettingGoal,
    isResetting,
  };
};
