"use client";

import { useState, useCallback, useMemo } from "react";
import Logo from "@/components/Logo";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import TimerRing from "@/components/TimerRing";
import SessionControls from "@/components/SessionControls";
import ProgressRingFooter from "@/components/ProgressRingFooter";
import { Button } from "@/components/ui/button";
import { BarChart3, RefreshCw, Unlock, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ethers } from "ethers";

import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useFocusSession } from "@/hooks/useFocusSession";

export default function Home() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [goalInput, setGoalInput] = useState("600");

  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  // FHEVM instance
  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  // FocusSession hook
  const focusSession = useFocusSession({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  // Memoize callbacks to prevent unnecessary re-renders
  const handleSessionStateChange = useCallback((active: boolean, progressValue: number) => {
    setIsSessionActive(active);
    setProgress(progressValue);
  }, []);

  const handleSessionComplete = useCallback(async (minutes: number) => {
    await focusSession.logSession(minutes);
  }, [focusSession]);

  const handleDecrypt = useCallback(() => {
    focusSession.decryptStats();
    toast.info("Requesting wallet signature to decrypt data...");
  }, [focusSession]);

  const handleSetGoal = useCallback(async () => {
    const goal = parseInt(goalInput);
    if (isNaN(goal) || goal <= 0) {
      toast.error("Please enter a valid goal");
      return;
    }
    try {
      await focusSession.setWeeklyGoal(goal);
      setShowGoalInput(false);
      toast.success(`Weekly goal set to ${goal} minutes`);
    } catch {
      toast.error("Failed to set goal");
    }
  }, [goalInput, focusSession]);

  // Memoize calculated display values to prevent unnecessary recalculations
  const sessionCount = useMemo(() => {
    return focusSession.isDecrypted && focusSession.sessionCount !== undefined
      ? Number(focusSession.sessionCount) 
      : 0;
  }, [focusSession.isDecrypted, focusSession.sessionCount]);

  const totalMinutes = useMemo(() => {
    return focusSession.isDecrypted && focusSession.totalMinutes !== undefined
      ? Number(focusSession.totalMinutes) 
      : 0;
  }, [focusSession.isDecrypted, focusSession.totalMinutes]);

  const weeklyGoal = useMemo(() => {
    return focusSession.isDecrypted && focusSession.weeklyGoal !== undefined
      ? Number(focusSession.weeklyGoal) 
      : 600;
  }, [focusSession.isDecrypted, focusSession.weeklyGoal]);
  
  // Calculate progress percentage (memoized)
  const goalProgress = useMemo(() => {
    return weeklyGoal > 0 ? Math.min((totalMinutes / weeklyGoal) * 100, 100) : 0;
  }, [weeklyGoal, totalMinutes]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </Button>
            <ConnectWalletButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-24 pb-32">
        {!showAnalytics ? (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
            {/* Hero Text */}
            <div className="text-center mb-12 animate-fade-in">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Focus in Privacy. Grow with Insight.
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Track your study sessions with encrypted on-chain storage. 
                Your productivity data stays private until you choose to decrypt it.
              </p>
            </div>

            {/* Timer Ring */}
            <div className="mb-8">
              <TimerRing isActive={isSessionActive} progress={progress} />
            </div>

            {/* Session Controls */}
            <SessionControls 
              onStateChange={handleSessionStateChange} 
              onSessionComplete={handleSessionComplete}
              isLogging={focusSession.isLogging}
              canLog={focusSession.canLogSession ?? false}
            />

            {/* Status Messages */}
            {focusSession.message && (
              <div className="mt-4 px-4 py-2 bg-muted rounded-lg text-sm text-muted-foreground">
                {focusSession.message}
              </div>
            )}

            {/* FHEVM Status */}
            {fhevmError && (
              <div className="mt-4 px-4 py-2 bg-destructive/10 rounded-lg text-sm text-destructive">
                FHEVM Error: {fhevmError instanceof Error ? fhevmError.message : String(fhevmError)}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto py-8 animate-fade-in">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">Your Analytics</h2>
                <p className="text-muted-foreground">
                  {focusSession.isDecrypted 
                    ? "Decrypted insights from your encrypted session data"
                    : "Connect wallet and decrypt to view your stats"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => focusSession.refreshHandles()}
                  disabled={focusSession.isRefreshing}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${focusSession.isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDecrypt}
                  disabled={!focusSession.canDecrypt || focusSession.isDecrypting}
                  className="gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  {focusSession.isDecrypting ? "Decrypting..." : "Decrypt Stats"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGoalInput(!showGoalInput)}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Set Goal
                </Button>
              </div>
            </div>

            {/* Goal Input */}
            {showGoalInput && (
              <div className="mb-6 p-4 bg-card rounded-2xl border border-border">
                <label className="block text-sm font-medium mb-2">Weekly Goal (minutes)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background"
                    placeholder="600"
                  />
                  <Button 
                    onClick={handleSetGoal}
                    disabled={focusSession.isSettingGoal}
                  >
                    {focusSession.isSettingGoal ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-card rounded-2xl p-6 border border-border shadow-lg hover:shadow-xl transition-shadow">
                <p className="text-sm text-muted-foreground mb-2">Total Sessions</p>
                <p className="text-4xl font-bold text-foreground mb-1">
                  {focusSession.isDecrypted ? sessionCount : "***"}
                </p>
                <p className="text-xs text-accent">
                  {focusSession.isDecrypted ? "Decrypted from chain" : "Encrypted on-chain"}
                </p>
              </div>
              
              <div className="bg-card rounded-2xl p-6 border border-border shadow-lg hover:shadow-xl transition-shadow">
                <p className="text-sm text-muted-foreground mb-2">Focus Minutes</p>
                <p className="text-4xl font-bold text-foreground mb-1">
                  {focusSession.isDecrypted ? totalMinutes : "***"}
                </p>
                <p className="text-xs text-accent">
                  {focusSession.isDecrypted 
                    ? `${goalProgress.toFixed(1)}% of weekly goal` 
                    : "Private until decrypted"}
                </p>
                {/* Progress bar */}
                {focusSession.isDecrypted && (
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                      style={{ width: `${goalProgress}%` }}
                    />
                  </div>
                )}
              </div>
              
              <div className="bg-card rounded-2xl p-6 border border-border shadow-lg hover:shadow-xl transition-shadow">
                <p className="text-sm text-muted-foreground mb-2">Avg Session</p>
                <p className="text-4xl font-bold text-foreground mb-1">
                  {focusSession.isDecrypted && sessionCount > 0 
                    ? Math.round(totalMinutes / sessionCount) 
                    : "***"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {focusSession.isDecrypted && sessionCount > 0 
                    ? `minutes per session`
                    : "minutes"}
                </p>
              </div>
            </div>

            {/* Contract Info */}
            <div className="bg-card rounded-2xl p-6 border border-border shadow-lg">
              <h3 className="text-xl font-semibold mb-4">Contract Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wallet Address:</span>
                  <span className="font-mono text-xs">{focusSession.walletAddress || "Not connected"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contract Address:</span>
                  <span className="font-mono text-xs">{focusSession.contractAddress || "Not deployed"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chain ID:</span>
                  <span className="font-mono">{chainId || "Not connected"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">FHEVM Status:</span>
                  <span className={fhevmInstance ? "text-accent" : "text-muted-foreground"}>
                    {fhevmStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Is Deployed:</span>
                  <span className={focusSession.isDeployed ? "text-accent" : "text-destructive"}>
                    {focusSession.isDeployed ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Has Session Data:</span>
                  <span className={focusSession.hasData ? "text-accent" : "text-muted-foreground"}>
                    {focusSession.hasData ? "Yes" : "No (need to log a session first)"}
                  </span>
                </div>
              </div>
              
              {/* Debug Info - collapsible */}
              <details className="mt-4">
                <summary className="text-sm text-muted-foreground cursor-pointer">Debug Info</summary>
                <div className="mt-2 p-2 bg-muted rounded text-xs font-mono break-all">
                  <p>Session Handle: {focusSession.sessionCountHandle || "null"}</p>
                  <p>Is ZeroHash: {focusSession.sessionCountHandle === ethers.ZeroHash ? "Yes" : "No"}</p>
                </div>
              </details>
              
              {/* Reset Actions */}
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    focusSession.resetStats();
                    toast.info("Resetting stats on-chain...");
                  }}
                  disabled={focusSession.isResetting || !ethersSigner}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {focusSession.isResetting ? "Resetting..." : "Reset On-chain Stats"}
                </Button>
              </div>
            </div>

            {/* Status Message */}
            {focusSession.message && (
              <div className="mt-6 p-4 bg-muted rounded-lg text-sm text-muted-foreground">
                {focusSession.message}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Progress Ring */}
      <ProgressRingFooter
        totalSessions={sessionCount}
        totalMinutes={totalMinutes}
        weeklyGoal={weeklyGoal}
        isDecrypted={Boolean(focusSession.isDecrypted)}
      />
    </div>
  );
}
