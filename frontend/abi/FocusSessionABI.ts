
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const FocusSessionABI = {
  "abi": [
    "event MinutesAdded(address indexed,uint256)",
    "event SessionLogged(address indexed,uint256,uint256)",
    "event StatsReset(address indexed,uint256)",
    "event WeeklyGoalUpdated(address indexed,uint256)",
    "function addMinutes(bytes32,bytes)",
    "function getSessionCount() view returns (bytes32)",
    "function getTotalMinutes() view returns (bytes32)",
    "function getWeeklyGoal() view returns (bytes32)",
    "function logSession(bytes32,bytes)",
    "function protocolId() pure returns (uint256)",
    "function resetStats()",
    "function setWeeklyGoal(bytes32,bytes)"
  ]
} as const;
