import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FocusSession, FocusSession__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FocusSession")) as FocusSession__factory;
  const focusSessionContract = (await factory.deploy()) as FocusSession;
  const focusSessionContractAddress = await focusSessionContract.getAddress();

  return { focusSessionContract, focusSessionContractAddress };
}

describe("FocusSession", function () {
  let signers: Signers;
  let focusSessionContract: FocusSession;
  let focusSessionContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ focusSessionContract, focusSessionContractAddress } = await deployFixture());
  });

  it("encrypted session count should be uninitialized after deployment", async function () {
    const encryptedCount = await focusSessionContract.connect(signers.alice).getSessionCount();
    // Expect initial count to be bytes32(0) after deployment
    expect(encryptedCount).to.eq(ethers.ZeroHash);
  });

  it("encrypted total minutes should be uninitialized after deployment", async function () {
    const encryptedMinutes = await focusSessionContract.connect(signers.alice).getTotalMinutes();
    expect(encryptedMinutes).to.eq(ethers.ZeroHash);
  });

  it("encrypted weekly goal should be uninitialized after deployment", async function () {
    const encryptedGoal = await focusSessionContract.connect(signers.alice).getWeeklyGoal();
    expect(encryptedGoal).to.eq(ethers.ZeroHash);
  });

  it("log a focus session with 25 minutes", async function () {
    // Encrypt 25 minutes
    const clearMinutes = 25;
    const encryptedMinutes = await fhevm
      .createEncryptedInput(focusSessionContractAddress, signers.alice.address)
      .add32(clearMinutes)
      .encrypt();

    // Log the session
    const tx = await focusSessionContract
      .connect(signers.alice)
      .logSession(encryptedMinutes.handles[0], encryptedMinutes.inputProof);
    await tx.wait();

    // Verify session count is 1
    const encryptedCountAfter = await focusSessionContract.connect(signers.alice).getSessionCount();
    const clearCountAfter = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCountAfter,
      focusSessionContractAddress,
      signers.alice,
    );
    expect(clearCountAfter).to.eq(1);

    // Verify total minutes is 25
    const encryptedMinutesAfter = await focusSessionContract.connect(signers.alice).getTotalMinutes();
    const clearMinutesAfter = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedMinutesAfter,
      focusSessionContractAddress,
      signers.alice,
    );
    expect(clearMinutesAfter).to.eq(clearMinutes);
  });

  it("log multiple focus sessions and accumulate minutes", async function () {
    // First session: 25 minutes
    const firstSession = await fhevm
      .createEncryptedInput(focusSessionContractAddress, signers.alice.address)
      .add32(25)
      .encrypt();
    
    let tx = await focusSessionContract
      .connect(signers.alice)
      .logSession(firstSession.handles[0], firstSession.inputProof);
    await tx.wait();

    // Second session: 30 minutes
    const secondSession = await fhevm
      .createEncryptedInput(focusSessionContractAddress, signers.alice.address)
      .add32(30)
      .encrypt();
    
    tx = await focusSessionContract
      .connect(signers.alice)
      .logSession(secondSession.handles[0], secondSession.inputProof);
    await tx.wait();

    // Verify session count is 2
    const encryptedCount = await focusSessionContract.connect(signers.alice).getSessionCount();
    const clearCount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCount,
      focusSessionContractAddress,
      signers.alice,
    );
    expect(clearCount).to.eq(2);

    // Verify total minutes is 55 (25 + 30)
    const encryptedMinutes = await focusSessionContract.connect(signers.alice).getTotalMinutes();
    const clearMinutes = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedMinutes,
      focusSessionContractAddress,
      signers.alice,
    );
    expect(clearMinutes).to.eq(55);
  });

  it("set weekly goal", async function () {
    // Set goal to 600 minutes
    const clearGoal = 600;
    const encryptedGoal = await fhevm
      .createEncryptedInput(focusSessionContractAddress, signers.alice.address)
      .add32(clearGoal)
      .encrypt();

    const tx = await focusSessionContract
      .connect(signers.alice)
      .setWeeklyGoal(encryptedGoal.handles[0], encryptedGoal.inputProof);
    await tx.wait();

    // Verify goal is set correctly
    const encryptedGoalAfter = await focusSessionContract.connect(signers.alice).getWeeklyGoal();
    const clearGoalAfter = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedGoalAfter,
      focusSessionContractAddress,
      signers.alice,
    );
    expect(clearGoalAfter).to.eq(clearGoal);
  });

  it("different users have separate session data", async function () {
    // Alice logs a session with 25 minutes
    const aliceMinutes = await fhevm
      .createEncryptedInput(focusSessionContractAddress, signers.alice.address)
      .add32(25)
      .encrypt();
    
    let tx = await focusSessionContract
      .connect(signers.alice)
      .logSession(aliceMinutes.handles[0], aliceMinutes.inputProof);
    await tx.wait();

    // Bob logs a session with 30 minutes
    const bobMinutes = await fhevm
      .createEncryptedInput(focusSessionContractAddress, signers.bob.address)
      .add32(30)
      .encrypt();
    
    tx = await focusSessionContract
      .connect(signers.bob)
      .logSession(bobMinutes.handles[0], bobMinutes.inputProof);
    await tx.wait();

    // Verify Alice's data
    const aliceEncryptedMinutes = await focusSessionContract.connect(signers.alice).getTotalMinutes();
    const aliceClearMinutes = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      aliceEncryptedMinutes,
      focusSessionContractAddress,
      signers.alice,
    );
    expect(aliceClearMinutes).to.eq(25);

    // Verify Bob's data
    const bobEncryptedMinutes = await focusSessionContract.connect(signers.bob).getTotalMinutes();
    const bobClearMinutes = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      bobEncryptedMinutes,
      focusSessionContractAddress,
      signers.bob,
    );
    expect(bobClearMinutes).to.eq(30);
  });

  it("add minutes manually", async function () {
    // First log a session
    const sessionMinutes = await fhevm
      .createEncryptedInput(focusSessionContractAddress, signers.alice.address)
      .add32(25)
      .encrypt();
    
    let tx = await focusSessionContract
      .connect(signers.alice)
      .logSession(sessionMinutes.handles[0], sessionMinutes.inputProof);
    await tx.wait();

    // Add 10 more minutes manually
    const additionalMinutes = await fhevm
      .createEncryptedInput(focusSessionContractAddress, signers.alice.address)
      .add32(10)
      .encrypt();
    
    tx = await focusSessionContract
      .connect(signers.alice)
      .addMinutes(additionalMinutes.handles[0], additionalMinutes.inputProof);
    await tx.wait();

    // Verify total is 35 minutes
    const encryptedTotal = await focusSessionContract.connect(signers.alice).getTotalMinutes();
    const clearTotal = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedTotal,
      focusSessionContractAddress,
      signers.alice,
    );
    expect(clearTotal).to.eq(35);
  });

  it("reset stats clears all user data", async function () {
    // Log a session first
    const sessionMinutes = await fhevm
      .createEncryptedInput(focusSessionContractAddress, signers.alice.address)
      .add32(25)
      .encrypt();
    
    let tx = await focusSessionContract
      .connect(signers.alice)
      .logSession(sessionMinutes.handles[0], sessionMinutes.inputProof);
    await tx.wait();

    // Set a goal
    const goalMinutes = await fhevm
      .createEncryptedInput(focusSessionContractAddress, signers.alice.address)
      .add32(600)
      .encrypt();
    
    tx = await focusSessionContract
      .connect(signers.alice)
      .setWeeklyGoal(goalMinutes.handles[0], goalMinutes.inputProof);
    await tx.wait();

    // Reset stats
    tx = await focusSessionContract.connect(signers.alice).resetStats();
    await tx.wait();

    // Verify all values are reset to 0
    const encryptedCount = await focusSessionContract.connect(signers.alice).getSessionCount();
    const clearCount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCount,
      focusSessionContractAddress,
      signers.alice,
    );
    expect(clearCount).to.eq(0);

    const encryptedMinutes = await focusSessionContract.connect(signers.alice).getTotalMinutes();
    const clearMinutes = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedMinutes,
      focusSessionContractAddress,
      signers.alice,
    );
    expect(clearMinutes).to.eq(0);

    const encryptedGoal = await focusSessionContract.connect(signers.alice).getWeeklyGoal();
    const clearGoal = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedGoal,
      focusSessionContractAddress,
      signers.alice,
    );
    expect(clearGoal).to.eq(0);
  });

  it("can log session with 1 minute (minimum value)", async function () {
    const minMinutes = 1;
    const encryptedMinutes = await fhevm
      .createEncryptedInput(focusSessionContractAddress, signers.alice.address)
      .add32(minMinutes)
      .encrypt();

    const tx = await focusSessionContract
      .connect(signers.alice)
      .logSession(encryptedMinutes.handles[0], encryptedMinutes.inputProof);
    await tx.wait();

    const encryptedTotal = await focusSessionContract.connect(signers.alice).getTotalMinutes();
    const clearTotal = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedTotal,
      focusSessionContractAddress,
      signers.alice,
    );
    expect(clearTotal).to.eq(minMinutes);
  });

  it("can log session with large value (stress test)", async function () {
    const largeMinutes = 1440; // 24 hours
    const encryptedMinutes = await fhevm
      .createEncryptedInput(focusSessionContractAddress, signers.alice.address)
      .add32(largeMinutes)
      .encrypt();

    const tx = await focusSessionContract
      .connect(signers.alice)
      .logSession(encryptedMinutes.handles[0], encryptedMinutes.inputProof);
    await tx.wait();

    const encryptedTotal = await focusSessionContract.connect(signers.alice).getTotalMinutes();
    const clearTotal = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedTotal,
      focusSessionContractAddress,
      signers.alice,
    );
    expect(clearTotal).to.eq(largeMinutes);
  });

  it("can accumulate many sessions without overflow", async function () {
    // Log 10 sessions of 60 minutes each
    const sessionCount = 10;
    const minutesPerSession = 60;

    for (let i = 0; i < sessionCount; i++) {
      const encrypted = await fhevm
        .createEncryptedInput(focusSessionContractAddress, signers.alice.address)
        .add32(minutesPerSession)
        .encrypt();

      const tx = await focusSessionContract
        .connect(signers.alice)
        .logSession(encrypted.handles[0], encrypted.inputProof);
      await tx.wait();
    }

    // Verify session count
    const encryptedCount = await focusSessionContract.connect(signers.alice).getSessionCount();
    const clearCount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCount,
      focusSessionContractAddress,
      signers.alice,
    );
    expect(clearCount).to.eq(sessionCount);

    // Verify total minutes
    const encryptedTotal = await focusSessionContract.connect(signers.alice).getTotalMinutes();
    const clearTotal = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedTotal,
      focusSessionContractAddress,
      signers.alice,
    );
    expect(clearTotal).to.eq(sessionCount * minutesPerSession);
  });

  it("weekly goal can be updated multiple times", async function () {
    // Set initial goal
    const firstGoal = 300;
    let encrypted = await fhevm
      .createEncryptedInput(focusSessionContractAddress, signers.alice.address)
      .add32(firstGoal)
      .encrypt();

    let tx = await focusSessionContract
      .connect(signers.alice)
      .setWeeklyGoal(encrypted.handles[0], encrypted.inputProof);
    await tx.wait();

    // Update to new goal
    const secondGoal = 500;
    encrypted = await fhevm
      .createEncryptedInput(focusSessionContractAddress, signers.alice.address)
      .add32(secondGoal)
      .encrypt();

    tx = await focusSessionContract
      .connect(signers.alice)
      .setWeeklyGoal(encrypted.handles[0], encrypted.inputProof);
    await tx.wait();

    // Verify final goal is the second one
    const encryptedGoal = await focusSessionContract.connect(signers.alice).getWeeklyGoal();
    const clearGoal = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedGoal,
      focusSessionContractAddress,
      signers.alice,
    );
    expect(clearGoal).to.eq(secondGoal);
  });

  it("reset can be called multiple times safely", async function () {
    // Log session
    const encrypted = await fhevm
      .createEncryptedInput(focusSessionContractAddress, signers.alice.address)
      .add32(25)
      .encrypt();

    let tx = await focusSessionContract
      .connect(signers.alice)
      .logSession(encrypted.handles[0], encrypted.inputProof);
    await tx.wait();

    // Reset first time
    tx = await focusSessionContract.connect(signers.alice).resetStats();
    await tx.wait();

    // Reset again (should work even with zero values)
    tx = await focusSessionContract.connect(signers.alice).resetStats();
    await tx.wait();

    // Verify still zero
    const encryptedCount = await focusSessionContract.connect(signers.alice).getSessionCount();
    const clearCount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCount,
      focusSessionContractAddress,
      signers.alice,
    );
    expect(clearCount).to.eq(0);
  });
});

