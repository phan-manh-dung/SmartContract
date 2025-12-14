// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================
// CÁCH DEPLOY TRÊN REMIX:
// 1. Compile với Solidity 0.8.20+
// 2. Deploy contract "Chat" trước (Implementation)
// 3. Copy địa chỉ Implementation
// 4. Deploy contract "ChatProxy" với:
//    - _implementation: địa chỉ từ bước 2
//    - _data: 0x8129fc1c (calldata của initialize())
// 5. Sử dụng "At Address" với địa chỉ Proxy để tương tác
// ============================================

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title Chat
 * @dev Decentralized chat with UUPS upgradeable pattern
 */
contract Chat is 
    Initializable, 
    UUPSUpgradeable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable 
{
    struct Message {
        address sender;
        string content;
        uint256 timestamp;
    }

    mapping(bytes32 => Message[]) private chatHistory;

    event MessageSent(
        address indexed from,
        address indexed to,
        string content,
        uint256 timestamp
    );

    uint256[50] private __gap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
    }

    function version() public pure returns (string memory) {
        return "1.0.0";
    }

    function _getChatId(address _addr1, address _addr2) private pure returns (bytes32) {
        if (_addr1 < _addr2) {
            return keccak256(abi.encodePacked(_addr1, _addr2));
        }
        return keccak256(abi.encodePacked(_addr2, _addr1));
    }

    function sendMessage(address _to, string calldata _content) external nonReentrant {
        require(_to != address(0), "Cannot send to zero address");
        require(_to != msg.sender, "Cannot send to yourself");
        require(bytes(_content).length > 0, "Message cannot be empty");
        require(bytes(_content).length <= 1000, "Message too long");

        bytes32 chatId = _getChatId(msg.sender, _to);
        
        chatHistory[chatId].push(Message({
            sender: msg.sender,
            content: _content,
            timestamp: block.timestamp
        }));

        emit MessageSent(msg.sender, _to, _content, block.timestamp);
    }

    function getMessages(address _user) external view returns (Message[] memory) {
        require(_user != address(0), "Invalid user address");
        return chatHistory[_getChatId(msg.sender, _user)];
    }

    function getMessageCount(address _user) external view returns (uint256) {
        return chatHistory[_getChatId(msg.sender, _user)].length;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}

/**
 * @title ChatProxy
 * @dev Proxy contract for Chat - Deploy this after deploying Chat
 */
contract ChatProxy is ERC1967Proxy {
    constructor(
        address _implementation,
        bytes memory _data
    ) ERC1967Proxy(_implementation, _data) {}
}
