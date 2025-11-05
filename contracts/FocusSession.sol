// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FocusSession - Encrypted Focus Time Tracker
/// @author MindFocus Team
/// @notice Track study/focus sessions with encrypted on-chain storage
/// @dev Uses FHEVM for encrypted state management
contract FocusSession is SepoliaConfig {
    /// @notice Encrypted total session count per user
    mapping(address => euint32) private _sessionCount;
    
    /// @notice Encrypted total focus minutes per user
    mapping(address => euint32) private _totalMinutes;
    
    /// @notice Encrypted weekly goal minutes per user
    mapping(address => euint32) private _weeklyGoal;
    
    /// @notice Event emitted when a new session is logged
    event SessionLogged(address indexed user, uint256 timestamp);
    
    /// @notice Event emitted when weekly goal is updated
    event WeeklyGoalUpdated(address indexed user, uint256 timestamp);

    /// @notice Get the encrypted session count for the caller
    /// @return The encrypted session count
    function getSessionCount() external view returns (euint32) {
        return _sessionCount[msg.sender];
    }

    /// @notice Get the encrypted total minutes for the caller
    /// @return The encrypted total minutes
    function getTotalMinutes() external view returns (euint32) {
        return _totalMinutes[msg.sender];
    }

    /// @notice Get the encrypted weekly goal for the caller
    /// @return The encrypted weekly goal minutes
    function getWeeklyGoal() external view returns (euint32) {
        return _weeklyGoal[msg.sender];
    }

    /// @notice Log a completed focus session with encrypted duration
    /// @param inputMinutes The encrypted session duration in minutes
    /// @param inputProof The proof for the encrypted input
    /// @dev Increments session count by 1 and adds minutes to total
    function logSession(externalEuint32 inputMinutes, bytes calldata inputProof) external {
        euint32 encryptedMinutes = FHE.fromExternal(inputMinutes, inputProof);
        
        // Increment session count by 1 (using FHE arithmetic)
        euint32 one = FHE.asEuint32(1);
        _sessionCount[msg.sender] = FHE.add(_sessionCount[msg.sender], one);
        
        // Add minutes to total
        _totalMinutes[msg.sender] = FHE.add(_totalMinutes[msg.sender], encryptedMinutes);
        
        // Allow contract and user to access the data
        FHE.allowThis(_sessionCount[msg.sender]);
        FHE.allow(_sessionCount[msg.sender], msg.sender);
        FHE.allowThis(_totalMinutes[msg.sender]);
        FHE.allow(_totalMinutes[msg.sender], msg.sender);
        
        emit SessionLogged(msg.sender, block.timestamp);
    }

    /// @notice Set the weekly goal in encrypted minutes
    /// @param inputGoal The encrypted weekly goal in minutes
    /// @param inputProof The proof for the encrypted input
    function setWeeklyGoal(externalEuint32 inputGoal, bytes calldata inputProof) external {
        euint32 encryptedGoal = FHE.fromExternal(inputGoal, inputProof);
        
        _weeklyGoal[msg.sender] = encryptedGoal;
        
        // Allow contract and user to access the data
        FHE.allowThis(_weeklyGoal[msg.sender]);
        FHE.allow(_weeklyGoal[msg.sender], msg.sender);
        
        emit WeeklyGoalUpdated(msg.sender, block.timestamp);
    }

    /// @notice Add minutes directly to total (for manual adjustments)
    /// @param inputMinutes The encrypted minutes to add
    /// @param inputProof The proof for the encrypted input
    function addMinutes(externalEuint32 inputMinutes, bytes calldata inputProof) external {
        euint32 encryptedMinutes = FHE.fromExternal(inputMinutes, inputProof);
        
        _totalMinutes[msg.sender] = FHE.add(_totalMinutes[msg.sender], encryptedMinutes);
        
        FHE.allowThis(_totalMinutes[msg.sender]);
        FHE.allow(_totalMinutes[msg.sender], msg.sender);
    }

    /// @notice Reset all stats for the caller (for new tracking period)
    /// @dev Sets session count, total minutes, and weekly goal to zero
    function resetStats() external {
        euint32 zero = FHE.asEuint32(0);
        
        _sessionCount[msg.sender] = zero;
        _totalMinutes[msg.sender] = zero;
        _weeklyGoal[msg.sender] = zero;
        
        // Allow access
        FHE.allowThis(_sessionCount[msg.sender]);
        FHE.allow(_sessionCount[msg.sender], msg.sender);
        FHE.allowThis(_totalMinutes[msg.sender]);
        FHE.allow(_totalMinutes[msg.sender], msg.sender);
        FHE.allowThis(_weeklyGoal[msg.sender]);
        FHE.allow(_weeklyGoal[msg.sender], msg.sender);
    }
}

