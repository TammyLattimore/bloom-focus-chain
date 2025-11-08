"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Save } from "lucide-react";
import { toast } from "sonner";

interface SessionControlsProps {
  onStateChange: (isActive: boolean, progress: number) => void;
  onSessionComplete: (minutes: number) => Promise<void>;
  isLogging: boolean;
  canLog: boolean;
  defaultDuration?: number; // Duration in minutes, defaults to 25
}

const SessionControls = ({ 
  onStateChange, 
  onSessionComplete, 
  isLogging, 
  canLog,
  defaultDuration = 25 
}: SessionControlsProps) => {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [customDuration, setCustomDuration] = useState<number>(defaultDuration);
  const [showDurationInput, setShowDurationInput] = useState(false);
  
  // Calculate session duration in seconds
  const sessionDuration = customDuration * 60;
  
  // Use refs to avoid stale closures and rendering issues
  const onStateChangeRef = useRef(onStateChange);
  const secondsRef = useRef(seconds);
  const isActiveRef = useRef(isActive);
  
  // Keep refs in sync
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);
  
  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);
  
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Notify parent of state changes using a separate effect to avoid render-time updates
  useEffect(() => {
    const progress = (seconds / sessionDuration) * 100;
    onStateChange(isActive, Math.min(progress, 100));
  }, [isActive, seconds, sessionDuration, onStateChange]);

  const handleStop = useCallback(() => {
    setIsActive(false);
    setIsPaused(false);
    // Keep current seconds for saving - don't reset until actually saved
    toast.info("Session stopped", {
      description: "Click 'Save Session' to store your progress on-chain.",
    });
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let completionTimeout: NodeJS.Timeout | null = null;

    if (isActive && !isPaused) {
      interval = setInterval(() => {
        setSeconds(prev => {
          const newSeconds = prev + 1;
          
          if (newSeconds >= sessionDuration) {
            // Use setTimeout to avoid state update during render
            completionTimeout = setTimeout(() => {
              setIsActive(false);
              setIsPaused(false);
              toast.success("Focus session completed!", {
                description: "Click 'Save Session' to encrypt and store your data on-chain.",
              });
            }, 0);
            return sessionDuration;
          }
          
          return newSeconds;
        });
      }, 1000);
    }

    // Cleanup function to prevent memory leaks
    return () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      if (completionTimeout) {
        clearTimeout(completionTimeout);
        completionTimeout = null;
      }
    };
  }, [isActive, isPaused, sessionDuration]);

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
    toast.success("Focus session started", {
      description: "Your session will be encrypted when completed.",
    });
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    toast.info(isPaused ? "Session resumed" : "Session paused");
  };

  const handleSaveSession = async () => {
    if (seconds === 0) {
      toast.error("No session to save", {
        description: "Start a focus session first.",
      });
      return;
    }
    
    if (!canLog) {
      toast.error("Cannot save session", {
        description: "Please connect your wallet first.",
      });
      return;
    }
    
    const minutes = Math.ceil(seconds / 60);
    
    try {
      await onSessionComplete(minutes);
      // Only reset seconds after successful save
      setSeconds(0);
      setIsActive(false);
      setIsPaused(false);
      toast.success("Session saved on-chain!", {
        description: `${minutes} minutes encrypted and stored securely.`,
      });
    } catch (error) {
      console.error("Failed to save session:", error);
      toast.error("Failed to save session", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
      // Don't reset state on error - user can try again
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDurationChange = (newDuration: number) => {
    if (newDuration > 0 && newDuration <= 240) { // Max 4 hours
      setCustomDuration(newDuration);
      setShowDurationInput(false);
      toast.success(`Session duration set to ${newDuration} minutes`);
    } else {
      toast.error("Duration must be between 1 and 240 minutes");
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 animate-fade-in">
      <div className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent tabular-nums">
        {formatTime(seconds)}
      </div>
      
      {/* Duration selector */}
      {!isActive && showDurationInput && (
        <div className="flex items-center gap-2 p-3 bg-card rounded-lg border border-border">
          <label className="text-sm text-muted-foreground">Duration:</label>
          <input
            type="number"
            value={customDuration}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val)) {
                handleDurationChange(val);
              }
            }}
            className="w-20 px-2 py-1 rounded border border-border bg-background text-sm"
            min="1"
            max="240"
          />
          <span className="text-sm text-muted-foreground">min</span>
        </div>
      )}
      
      {!isActive && !showDurationInput && seconds === 0 && (
        <button
          onClick={() => setShowDurationInput(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
        >
          Session: {customDuration} minutes (click to change)
        </button>
      )}
      
      <div className="flex gap-3">
        {!isActive ? (
          <>
            <Button
              onClick={handleStart}
              size="lg"
              className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-lg"
              disabled={!canLog}
            >
              <Play className="w-5 h-5" />
              Start Focus Session
            </Button>
            {seconds > 0 && (
              <Button
                onClick={handleSaveSession}
                size="lg"
                variant="outline"
                className="gap-2 border-accent/30 hover:bg-accent/5"
                disabled={isLogging || !canLog}
              >
                <Save className="w-5 h-5" />
                {isLogging ? "Encrypting..." : "Save Session"}
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              onClick={handlePause}
              size="lg"
              variant="outline"
              className="gap-2 border-primary/30 hover:bg-primary/5"
            >
              {isPaused ? (
                <>
                  <Play className="w-5 h-5" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="w-5 h-5" />
                  Pause
                </>
              )}
            </Button>
            <Button
              onClick={handleStop}
              size="lg"
              variant="outline"
              className="gap-2 border-destructive/30 hover:bg-destructive/5 text-destructive"
            >
              <Square className="w-5 h-5" />
              Stop
            </Button>
          </>
        )}
      </div>
      
      {isActive && (
        <p className="text-sm text-muted-foreground">
          Session data will be encrypted with your wallet key
        </p>
      )}
      
      {!canLog && !isActive && (
        <p className="text-sm text-destructive">
          Connect your wallet to start tracking
        </p>
      )}
    </div>
  );
};

export default SessionControls;
