  const { expect } = require('chai');
  const { ethers } = require('hardhat');
  
  describe("Pension Contract", () => {
    const setup = async () => {
      const [owner, addr1] = await ethers.getSigners();
      const Pension = await ethers.getContractFactory("Pension")
      const deployed = await Pension.deploy();
  
      // getting timestamp
      const blockNumBefore = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockNumBefore);
      const timestampBefore = blockBefore.timestamp;
  
      return {
        owner: owner,
        addr1: addr1,
        deployed,
        timestampBefore
      }
    }
  
    it("Address Contract", async () => {
      const { deployed } = await setup();
      console.log('contract address:', deployed.address);
    });
  
    it("Should Mint a pension and assigns it to owner", async () => {
      const { owner, deployed, timestampBefore } = await setup();
  
      const firstQuote = 30;
      const birthYear = 1996
      const biologicalSex = "male"
      const age = 26

      const initBalance = await ethers.provider.getBalance(owner.address);

      await deployed.safeMint(biologicalSex, age, birthYear, firstQuote, { value: ethers.utils.parseUnits(firstQuote.toString(),"wei") });
  
      const alreadyMinted = await deployed.verifyIfTheContributorAlreadyMinted(owner.address)
      // eslint-disable-next-line no-unused-expressions
      expect(alreadyMinted).to.be.true;
  
      const ownerPensionBalance = await deployed.getOwnerPensionsBalance(0);
      const cutoffDate = await deployed.cutoffDate();
      const retirentmentAge = await deployed.retirentmentAge(); // Expected retirement age in days
      const daysAge = ownerPensionBalance.age * 365 * 86400;
      const quoteTime = retirentmentAge - daysAge;
      const retirementDate = parseInt(quoteTime) + parseInt(ownerPensionBalance.pensionCreatedTime);
      const totalSavings = Math.floor(firstQuote * 24 / 100);
      const totalSolidary = firstQuote - totalSavings;
      const finalBalance = await ethers.provider.getBalance(owner.address);
      // Expect the pension creation date to be equal to the block timestamp
      // Round it to handle the small difference between the block and the minted time
      expect(Math.round(ownerPensionBalance.pensionCreatedTime/10)*10).to.be.closeTo(Math.round(timestampBefore/10)*10,1);
      expect(ownerPensionBalance.retirentmentDate).to.be.equal(retirementDate);
      expect(ownerPensionBalance.totalSavings).to.be.equal(totalSavings);
      expect(ownerPensionBalance.totalSolidary).to.be.equal(totalSolidary);
      expect(finalBalance).to.be.below(initBalance);
  
    })
  
  
    it("Should validate the minimum amount to Mint", async () => {
      const { owner, deployed } = await setup();
      await expect(deployed.safeMint("male", 26, 1996, 30, { value: ethers.utils.parseUnits("24","wei") }))
      .to.be.revertedWith('The amount doesn\'t reach the minimum required');
    
    })
  
    it("Should validate the minimum age to Mint", async () => {
      const { owner, deployed } = await setup();
      await expect(deployed.safeMint("male", 17, 1996, 30, { value: ethers.utils.parseUnits("25","wei") })
      ).to.be.revertedWith('You must be 18 years or older to generate a pension');
    
    })
  
    it("Should verify that the owner that already minted the pension can't mint it again", async() => {
      const { deployed } = await setup();
      await deployed.safeMint("male", 26, 1996, 30, { value: ethers.utils.parseEther("1") });
      await expect(deployed.safeMint("male", 26, 1996, 30, { value: ethers.utils.parseEther("1") })).to.be.revertedWith('Already generated his pension')
    })
  
    it("Should deposit amount", async() => {
      const { deployed, owner } = await setup();
      const firstamount = 30;
      const secondamount = 40;
  
      await deployed.safeMint("male", 26, 1996, firstamount, { value: ethers.utils.parseUnits(firstamount.toString(),"wei") });
      
      await deployed.depositAmount(0,secondamount,{ value: ethers.utils.parseUnits(secondamount.toString(),"wei") });
      
      const ownerPensionBalance = await deployed.getOwnerPensionsBalance(0);
      const totalSavings = Math.floor((firstamount+secondamount) * 24 / 100);
      const totalSolidary = (firstamount+secondamount) - totalSavings;
      expect(ownerPensionBalance.totalSavings).to.be.equal(totalSavings);
      expect(ownerPensionBalance.totalSolidary).to.be.equal(totalSolidary);
    })
  
    it("Should not deposit amount to wrong pension id", async() => {
      const { deployed, addr1 } = await setup();
      const firstamount = 30;
      const secondamount = 40;
      await deployed.safeMint("male", 26, 1996, firstamount, { value: ethers.utils.parseUnits(firstamount.toString(),"wei") });
      await expect(deployed.connect(addr1).depositAmount(0,secondamount,{ value: ethers.utils.parseUnits(secondamount.toString(),"wei") }))
      .to.be.revertedWith('You don\'t own this pension');
    })
  
    it("Should update the cuttdate and amouonts for next cycle", async() => {
      const { deployed, addr1 } = await setup();
      const firstamount = 100;
      const secondamount = 200;
      // Mint a contributor
      await deployed.safeMint("male", 26, 1996, firstamount, { value: ethers.utils.parseUnits(firstamount.toString(),"wei") });
      const cutoffDate1 = await deployed.cutoffDate();
      // Move to next cycle
      await new Promise(r => setTimeout(r, 2000));
      await deployed.updateCutoffDate();
      const cutoffDate2 = await deployed.cutoffDate();
      // Current cutoff should be greater than the previous
      expect(cutoffDate2).to.be.above(cutoffDate1);
      await deployed.depositAmount(0,secondamount,{ value: ethers.utils.parseUnits(secondamount.toString(),"wei") });
      // Get the monthly balance for each cutoff
      const monthlybalance = await deployed.getMonthlyBalanceFromMonthlyGeneralBalance(cutoffDate1);
      const monthlybalance2 = await deployed.getMonthlyBalanceFromMonthlyGeneralBalance(cutoffDate2);
      // Amount for each cutoff should match with mint and deposit amounts
      expect(monthlybalance.monthlyQuotes[0].totalAmount).to.be.equal(firstamount);
      expect(monthlybalance2.monthlyQuotes[0].totalAmount).to.be.equal(secondamount);
    })

    it("Should register a new retired", async() => {
      const { deployed, owner, addr1 } = await setup();
      const firstamount = 1000;
      const secondamount = 1000;

      // Mint a contributor
      await deployed.connect(addr1).safeMint("male", 61, 1950, firstamount, { value: ethers.utils.parseUnits(firstamount.toString(),"wei") });
      const cutoffDate1 = await deployed.cutoffDate();

      // Move to next cycle
      await new Promise(r => setTimeout(r, 3000));
      await deployed.connect(owner).updateCutoffDate();
      const cutoffDate2 = await deployed.connect(owner).cutoffDate();

      // Current cutoff should be greater than the previous
      expect(cutoffDate2).to.be.above(cutoffDate1);
      await deployed.connect(addr1).depositAmount(0,secondamount,{ value: ethers.utils.parseUnits(secondamount.toString(),"wei") });

      // Move to next cycle
      await new Promise(r => setTimeout(r, 3000));
      await deployed.connect(owner).updateCutoffDate();

      const monthlybalance2 = await deployed.connect(owner).getMonthlyBalanceFromMonthlyGeneralBalance(cutoffDate2);
      
      // Amount for each cutoff should match with mint and deposit amounts
      expect(monthlybalance2.monthlyQuotes[0].totalAmount).to.be.equal(secondamount);
      let retiredBalance = await deployed.connect(owner).getRetiredRecord(cutoffDate2);
      // Retired balance object should have the address
      expect(retiredBalance.retairedQuotes[0].owner).to.be.eq(addr1.address);

    })
  
  
  });