const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { expectRevert, BN } = require("@openzeppelin/test-helpers");

describe("HODLpacGov Token Contract", function () {
  let HODLpacGov;
  let token;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    HODLpacGov = await ethers.getContractFactory("HODLpacGov");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    token = await upgrades.deployProxy(HODLpacGov, {
      kind: "uups",
    });
  });

  describe("Deployment", function () {
    it("Should assign the total supply of tokens to the owner.", async function () {
      const ownerBalance = await token.balanceOf(owner.address);
      expect(await token.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe("Mint", function () {
    it("Should mint 100 tokens to the owner.", async function () {
      await token.mint(owner.address, 100);
      const ownerBalance = await token.balanceOf(owner.address);
      expect(ownerBalance).to.equal(100);
    });

    it("Should mint 100 tokens to addr1.", async function () {
      await token.mint(addr1.address, 100);
      const addr1Balance = await token.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(100);
    });

    it("Should not allow addr1 to mint 100 tokens to addr1.", async function () {
      // await token.connect(addr1).mint(addr1.address, 100);
      await expectRevert.unspecified(
        token.connect(addr1).mint(addr1.address, 100)
      );
    });

    it("Should not allow addr2 to mint 100 tokens to addr1.", async function () {
      // await token.connect(addr1).mint(addr1.address, 100);
      await expectRevert.unspecified(
        token.connect(addr2).mint(addr1.address, 100)
      );
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between owner and accounts.", async function () {
      await token.mint(owner.address, 100);
      await token.transfer(addr1.address, 50);
      const addr1Balance = await token.balanceOf(addr1.address);
      let ownerBalance = await token.balanceOf(owner.address);
      expect(addr1Balance).to.equal(50);
      expect(ownerBalance).to.equal(50);
      await token.transfer(addr2.address, 25);
      const addr2Balance = await token.balanceOf(addr2.address);
      ownerBalance = await token.balanceOf(owner.address);
      expect(addr2Balance).to.equal(25);
      expect(ownerBalance).to.equal(25);
    });
    it("Should not transfer tokens between non-owner accounts.", async function () {
      await token.mint(owner.address, 100);
      await token.transfer(addr1.address, 50);
      let addr1Balance = await token.balanceOf(addr1.address);
      let ownerBalance = await token.balanceOf(owner.address);
      expect(addr1Balance).to.equal(50);
      expect(ownerBalance).to.equal(50);
      await token.transfer(addr2.address, 25);
      let addr2Balance = await token.balanceOf(addr2.address);
      ownerBalance = await token.balanceOf(owner.address);
      expect(addr2Balance).to.equal(25);
      expect(ownerBalance).to.equal(25);
      expectRevert.unspecified(
        token.connect(addr1).transfer(addr2.address, 25)
      );
      expectRevert.unspecified(
        token.connect(addr1).transfer(owner.address, 25)
      );
      expectRevert.unspecified(
        token.connect(addr2).transfer(addr1.address, 25)
      );
      addr1Balance = await token.balanceOf(addr1.address);
      addr2Balance = await token.balanceOf(addr2.address);
      ownerBalance = await token.balanceOf(owner.address);
      expect(addr1Balance).to.equal(50);
      expect(addr2Balance).to.equal(25);
      expect(ownerBalance).to.equal(25);
    });

    it("Should not allow owner to transfer more tokens than it has.", async function () {
      expectRevert(
        token.transfer(addr1.address, 250),
        "ERC20: transfer amount exceeds balance"
      );
      let ownerBalance = await token.balanceOf(owner.address);
      expect(ownerBalance).to.equal(0);

      await token.mint(owner.address, 100);
      expectRevert(
        token.transfer(addr1.address, 250),
        "ERC20: transfer amount exceeds balance"
      );
      ownerBalance = await token.balanceOf(owner.address);
      expect(ownerBalance).to.equal(100);
    });

    it("Should allow owner to transfer from one account to another.", async function () {
      await token.mint(owner.address, 100);
      await token.transfer(addr1.address, 50);
      await token.connect(addr1).approve(owner.address, 25);
      await token.transferFrom(addr1.address, addr2.address, 25);
      const ownerBalance = await token.balanceOf(owner.address);
      const addr1Balance = await token.balanceOf(addr1.address);
      const addr2Balance = await token.balanceOf(addr2.address);
      expect(ownerBalance).to.equal(50);
      expect(addr1Balance).to.equal(25);
      expect(addr2Balance).to.equal(25);
    });

    it("Should not allow other accounts to transfer from one account to another.", async function () {
      await token.mint(owner.address, 100);
      await token.transfer(addr1.address, 50);
      await token.connect(addr1).approve(addr2.address, 25);
      expectRevert.unspecified(
        token.connect(addr2).transferFrom(addr1.address, owner.address, 25)
      );
      const ownerBalance = await token.balanceOf(owner.address);
      const addr1Balance = await token.balanceOf(addr1.address);
      const addr2Balance = await token.balanceOf(addr2.address);
      expect(ownerBalance).to.equal(50);
      expect(addr1Balance).to.equal(50);
      expect(addr2Balance).to.equal(0);
    });

    it("Should not allow owner account to transfer more tokens than an account currently owns.", async function () {
      await token.connect(addr1).approve(owner.address, 25);
      await expectRevert.unspecified(
        token.transferFrom(addr1.address, addr2.address, 25)
      );
      await token.mint(owner.address, 100);
      await token.transfer(addr1.address, 1);
      await expectRevert.unspecified(
        token.transferFrom(addr1.address, addr2.address, 25)
      );
    });
  });
  describe("Pause", function () {
    it("Should pause transactions.", async function () {
      await token.mint(owner.address, 100);
      await token.pause();
      await expectRevert.unspecified(token.transfer(addr1.address, 50));
      const ownerBalance = await token.balanceOf(owner.address);
      const addr1Balance = await token.balanceOf(addr1.address);
      const addr2Balance = await token.balanceOf(addr2.address);
      expect(ownerBalance).to.equal(100);
      expect(addr1Balance).to.equal(0);
      expect(addr2Balance).to.equal(0);
    });

    it("Should unpause transactions.", async function () {
      await token.mint(owner.address, 100);
      await token.pause();
      await expectRevert.unspecified(token.transfer(addr1.address, 50));
      await token.unpause();
      await token.transfer(addr1.address, 50);
      const ownerBalance = await token.balanceOf(owner.address);
      const addr1Balance = await token.balanceOf(addr1.address);
      const addr2Balance = await token.balanceOf(addr2.address);
      expect(ownerBalance).to.equal(50);
      expect(addr1Balance).to.equal(50);
      expect(addr2Balance).to.equal(0);
    });
  });

  describe("Burn", function () {
    it("Should burn specified number of tokens.", async function () {
      await token.mint(owner.address, 100);
      await token.burn(50);
      const ownerBalance = await token.balanceOf(owner.address);
      expect(ownerBalance).to.equal(50);
    });
    it("Owner should burn specified number of tokens in acct1.", async function () {
      await token.mint(owner.address, 100);
      await token.transfer(addr1.address, 50);
      await token.connect(addr1).approve(owner.address, 500);
      await token.burnFrom(addr1.address, 25);
      const ownerBalance = await token.balanceOf(owner.address);
      const addr1Balance = await token.balanceOf(addr1.address);
      const addr2Balance = await token.balanceOf(addr2.address);
      expect(ownerBalance).to.equal(50);
      expect(addr1Balance).to.equal(25);
      expect(addr2Balance).to.equal(0);
    });
  });
});
