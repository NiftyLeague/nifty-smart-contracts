import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('NiftyLaunchComics', function () {
  it("Should return the new greeting once it's changed", async function () {
    const NiftyLaunchComics = await ethers.getContractFactory('NiftyLaunchComics');
    const comics = await NiftyLaunchComics.deploy('https://api.nifty-league.com/rinkeby/launch-comics/');
    await comics.deployed();

    expect(await comics.uri()).to.equal('https://api.nifty-league.com/rinkeby/launch-comics/');

    const setGreetingTx = await comics.setGreeting('Hola, mundo!');

    // wait until the transaction is mined
    await setGreetingTx.wait();

    expect(await comics.greet()).to.equal('Hola, mundo!');
  });
});
