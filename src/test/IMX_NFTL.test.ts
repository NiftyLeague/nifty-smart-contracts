import { expect } from 'chai';
import { ethers } from 'hardhat';
import type { NFTL } from '~/types/typechain';

describe('IMX - NFTL', function () {
  async function deploy(owner: string, rootToken: string, name = 'Nifty League', symbol = 'NFTL') {
    const factory = await ethers.getContractFactory('NFTL');
    return (await factory.deploy(owner, rootToken, name, symbol)) as NFTL;
  }

  it('validates constructor arguments', async function () {
    const [owner, root] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('NFTL');

    await expect(deploy(owner.address, ethers.ZeroAddress)).to.be.revertedWithCustomError(
      factory,
      'InvalidInitialization',
    );
    await expect(deploy(owner.address, root.address, '', 'NFTL')).to.be.revertedWithCustomError(
      factory,
      'InvalidInitialization',
    );
    await expect(deploy(owner.address, root.address, 'Nifty League', '')).to.be.revertedWithCustomError(
      factory,
      'InvalidInitialization',
    );
  });

  it('restricts bridge minting and burning while exposing the root token', async function () {
    const [owner, bridge, holder, outsider] = await ethers.getSigners();
    const token = await deploy(owner.address, bridge.address);
    const bridgeRole = await token.BRIDGE_ROLE();

    expect(await token.rootToken()).to.equal(bridge.address);
    await expect(token.connect(outsider).mint(holder.address, 10)).to.be.reverted;

    await token.connect(owner).grantRole(bridgeRole, bridge.address);
    await token.connect(bridge).mint(holder.address, 10);
    expect(await token.balanceOf(holder.address)).to.equal(10);

    await expect(token.connect(outsider)['burn(address,uint256)'](holder.address, 1)).to.be.reverted;
    await token.connect(bridge)['burn(address,uint256)'](holder.address, 4);
    expect(await token.balanceOf(holder.address)).to.equal(6);
  });
});
