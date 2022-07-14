// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./IWhitelist.sol";

contract CryptoDevs is ERC721, ERC721Enumerable, Ownable {
    string _baseTokenURI;
    uint256 public _price = 0.01 ether; //  _price is the price of one Crypto Dev NFT
    bool public _paused; // _paused is used to pause the contract in case of an emergency
    uint256 public maxTokenIds = 20; //max number of tokens
    IWhitelist whitelist; // Whitelist contract instance
    bool public preSaleStarted; // boolean to keep track of whether presale started
    uint256 public preSaleEnded; // timestamp for when presale would end

    modifier onlyWhenNotPaused() {
        require(!_paused, "Contract currently paused.");
        _;
    }

    constructor(string memory baseURI, address whitelistContract)
        ERC721("CryptoDev", "CD")
    {
        _baseTokenURI = baseURI;
        whitelist = IWhitelist(whitelistContract);
    }

    function startPresale() public onlyOwner {
        preSaleStarted = true;
        preSaleEnded = block.timestamp + 5 minutes;
    }

    function preSaleMint() public payable onlyWhenNotPaused {
        require(
            preSaleStarted && block.timestamp < preSaleEnded,
            "Presale is not running"
        );
        require(
            whitelist.whitelistedAddresses(msg.sender),
            "You are not whitelisted"
        );
        require(tokenIds <= maxTokenIds, "Exceeded maximum Crypto Devs supply");
        require(msg.value >= _price, "Ether sent is not correct");
        tokenIds += 1;
        _safeMint(msg.sender, tokenIds);
    }

    function mint() public payable onlyWhenNotPaused {
        require(
            presaleStarted && block.timestamp >= presaleEnded,
            "Presale has not ended yet"
        );
        require(tokenIds < maxTokenIds, "Exceed maximum Crypto Devs supply");
        require(msg.value >= _price, "Ether sent is not correct");
        tokenIds += 1;
        _safeMint(msg.sender, tokenIds);
    }

    //  _baseURI overides the Openzeppelin's ERC721 implementation which by default
    //   returned an empty string for the baseURI
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function setPause(bool val) public onlyOwner {
        _paused = val;
    }

    // sends all the ether in the contract
    // to the owner of the contract
    function withdraw() public onlyOwner {
        address _owner = owner();
        uint256 amount = address(this).balance;
        (bool sent, ) = _owner.call{value: "amount"}("");
        require(sent, "Failed to send Ether");
    }

    //to receive ether when msg.value is empty
    receive() external payable {}

    //to receive ether when msg.value is not empty
    fallback() external payable {}
}
