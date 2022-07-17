import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import { Contract, providers, utils } from "ethers";
import React, { useEffect, useState, useRef } from "react";
import { abi, CONTRACT_ADDRESS } from "../constants";
import Web3Modal from "web3modal";

export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [preSaleStarted, setPreSaleStarted] = useState(false);
  const [preSaleEnded, setPreSaleEnded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [tokenIdsMinted, setTokenIdsMinted] = useState(0);
  const web3ModalRef = useRef();

  const getSignerOrProvider = async (needSigner = false) => {
    // Connect to Metamask
    // Since we store `web3Modal` as a reference, we need to access the `current` value
    // to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert("Change the network to Rinkeby");
      throw new Error("Change network to Rinkeby");
    }
    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  const connectWallet = async () => {
    try {
      await getSignerOrProvider();
      setWalletConnected(true);
    } catch (error) {
      console.error(error);
    }
  };

  const preSaleMint = async () => {
    try {
      const signer = await getSignerOrProvider(true); // We need a Signer here since this is a 'write' transaction
      // Create a new instance of the Contract with a Signer, which allows
      // update methods
      const nftContract = new Contract(CONTRACT_ADDRESS, abi, signer);
      const tx = await nftContract.preSaleMint({
        // value signifies the cost of one crypto dev which is "0.01" eth.
        // We are parsing `0.01` string to ether using the utils library from ethers.js
        value: utils.parseEther("0.01"),
      });
      setLoading(true);
      await tx.wait();
      setLoading(false);
      window.alert("You successfully minted a Crypto Dev!");
    } catch (error) {
      console.error(error);
    }
  };

  const publicSaleMint = async () => {
    try {
      const signer = await getSignerOrProvider(true); // We need a Signer here since this is a 'write' transaction
      const nftContract = new Contract(CONTRACT_ADDRESS, abi, signer);
      const tx = await nftContract.mint({
        // value signifies the cost of one crypto dev which is "0.01" eth.
        // We are parsing `0.01` string to ether using the utils library from ethers.js
        value: utils.parseEther("0.01"),
      });
      setLoading(true);
      await tx.wait();
      setLoading(false);
      window.alert("You successfully minted a Crypto Dev!");
    } catch (error) {
      console.error(error);
    }
  };

  const getOwner = async () => {
    try {
      const provider = await getSignerOrProvider(); // have read-only access to the Contract
      const nftContract = new Contract(CONTRACT_ADDRESS, abi, provider);
      const _owner = await nftContract.owner();
      const signer = await getSignerOrProvider(true); // We will get the signer now to extract the address
      const address = await signer.getAddress();
      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const checkIfPreSaleStarted = async () => {
    try {
      const provider = await getSignerOrProvider(); // have read-only access to the Contract
      const nftContract = new Contract(CONTRACT_ADDRESS, abi, provider);
      const _preSaleStarted = await nftContract.preSaleStarted();
      if (!_preSaleStarted) {
        await getOwner();
      }
      setPreSaleStarted(_preSaleStarted);
      return _preSaleStarted;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const startPreSale = async () => {
    try {
      const signer = await getSignerOrProvider(true);
      const nftContract = new Contract(CONTRACT_ADDRESS, abi, signer);
      const tx = await nftContract.startPresale();
      setLoading(true);
      await tx.wait();
      setLoading(false);
      await checkIfPreSaleStarted();
    } catch (error) {
      console.error(error);
    }
  };

  const checkIfPreSaleEnded = async () => {
    try {
      const provider = await getSignerOrProvider();
      const nftContract = new Contract(CONTRACT_ADDRESS, abi, provider);
      const _preSaleEnded = await nftContract.preSaleEnded();
      // preSaleEnded is a Big Number, so we are using the lt(less than function) instead of `<`
      // Date.now()/1000 returns the current time in seconds
      // We compare if the _preSaleEnded timestamp is less than the current time
      const hasEnded = _preSaleEnded.lt(Math.floor(Date.now() / 1000));
      if (hasEnded) {
        setPreSaleEnded(true);
      } else {
        setPreSaleEnded(false);
      }
      return hasEnded;
    } catch (error) {
      console.error(error);
    }
  };

  const getTokenIds = async () => {
    try {
      const provider = await getSignerOrProvider();
      const nftContract = new Contract(CONTRACT_ADDRESS, abi, provider);
      const _tokenIds = await nftContract.tokenIds();
      setTokenIdsMinted(_tokenIds.toString());
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
    }
    const _preSaleStarted = checkIfPreSaleStarted();
    if (_preSaleStarted) {
      checkIfPreSaleEnded();
    }

    getTokenIds();

    // Set an interval which gets called every 5 seconds to check presale has ended
    const preSaleEndedInterval = setInterval(async function () {
      const _preSaleStarted = await checkIfPreSaleStarted();
      if (_preSaleStarted) {
        const _preSaleEnded = checkIfPreSaleEnded();
        if (_preSaleEnded) {
          clearInterval(preSaleEndedInterval);
        }
      }
    }, 5 * 1000);

    // set an interval to get the number of token Ids minted every 5 seconds
    setInterval(async function () {
      await getTokenIds();
    }, 5 * 1000);
  }, [walletConnected]);

  const renderButton = () => {
    // If wallet is not connected, return a button which allows them to connect their wllet
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      );
    }

    // If we are currently waiting for something, return a loading button
    if (loading) {
      return <button className={styles.button}>Loading...</button>;
    }

    // If connected user is the owner, and presale hasnt started yet, allow them to start the presale
    if (isOwner && !preSaleStarted) {
      return (
        <button className={styles.button} onClick={startPreSale}>
          Start Presale!
        </button>
      );
    }

    // If connected user is not the owner but presale hasn't started yet, tell them that
    if (!preSaleStarted) {
      return (
        <div>
          <div className={styles.description}>Presale hasnt started!</div>
        </div>
      );
    }

    // If presale started, but hasn't ended yet, allow for minting during the presale period
    if (preSaleStarted && !preSaleEnded) {
      return (
        <div>
          <div className={styles.description}>
            Presale has started!!! If your address is whitelisted, Mint a Crypto
            Dev 🥳
          </div>
          <button className={styles.button} onClick={preSaleMint}>
            Presale Mint 🚀
          </button>
        </div>
      );
    }

    // If presale started and has ended, its time for public minting
    if (preSaleStarted && preSaleEnded) {
      return (
        <button className={styles.button} onClick={publicSaleMint}>
          Public Mint 🚀
        </button>
      );
    }
  };

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="Whitelist-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
          <div className={styles.description}>
            Its an NFT collection for developers in Crypto.
          </div>
          <div className={styles.description}>
            {tokenIdsMinted}/20 have been minted
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="./cryptodevs/0.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  );
}
