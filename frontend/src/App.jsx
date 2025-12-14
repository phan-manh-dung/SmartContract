import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI, SEPOLIA_CHAIN_ID } from './contractConfig';
import './App.css';

function App() {
    // ===== STATE MANAGEMENT =====
    const [account, setAccount] = useState(null);
    const [contract, setContract] = useState(null);
    const [provider, setProvider] = useState(null);
    const [messages, setMessages] = useState([]);
    const [recipientAddress, setRecipientAddress] = useState('');
    const [messageContent, setMessageContent] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [txHash, setTxHash] = useState('');

    // ===== WALLET CONNECTION =====
    const connectWallet = async () => {
        try {
            setError('');

            if (!window.ethereum) {
                setError('Vui lòng cài đặt MetaMask!');
                return;
            }

            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            // Check if on Sepolia network
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (chainId !== SEPOLIA_CHAIN_ID) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: SEPOLIA_CHAIN_ID }]
                    });
                } catch (switchError) {
                    setError('Vui lòng chuyển sang mạng Sepolia trong MetaMask!');
                    return;
                }
            }

            // Setup provider and contract
            const browserProvider = new ethers.BrowserProvider(window.ethereum);
            const signer = await browserProvider.getSigner();
            const chatContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

            setProvider(browserProvider);
            setAccount(accounts[0]);
            setContract(chatContract);

        } catch (err) {
            console.error('Connection error:', err);
            setError('Lỗi kết nối ví: ' + err.message);
        }
    };

    // ===== DISCONNECT WALLET =====
    const disconnectWallet = () => {
        setAccount(null);
        setContract(null);
        setProvider(null);
        setMessages([]);
        setRecipientAddress('');
    };

    // ===== LOAD MESSAGES =====
    const loadMessages = useCallback(async () => {
        if (!contract || !recipientAddress) return;

        try {
            setIsLoading(true);
            setError('');

            if (!ethers.isAddress(recipientAddress)) {
                setError('Địa chỉ người nhận không hợp lệ!');
                return;
            }

            const msgs = await contract.getMessages(recipientAddress);
            const formattedMessages = msgs.map((msg, index) => ({
                id: index,
                sender: msg.sender,
                content: msg.content,
                timestamp: Number(msg.timestamp),
                isMine: msg.sender.toLowerCase() === account?.toLowerCase()
            }));

            setMessages(formattedMessages);
        } catch (err) {
            console.error('Load messages error:', err);
            setError('Lỗi tải tin nhắn: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    }, [contract, recipientAddress, account]);

    // ===== SEND MESSAGE =====
    const sendMessage = async (e) => {
        e.preventDefault();

        if (!contract || !recipientAddress || !messageContent.trim()) {
            setError('Vui lòng điền đầy đủ thông tin!');
            return;
        }

        if (!ethers.isAddress(recipientAddress)) {
            setError('Địa chỉ người nhận không hợp lệ!');
            return;
        }

        try {
            setIsSending(true);
            setError('');
            setTxHash('');

            const tx = await contract.sendMessage(recipientAddress, messageContent.trim());
            setTxHash(tx.hash);

            // Wait for transaction confirmation
            await tx.wait();

            // Clear input and reload messages
            setMessageContent('');
            await loadMessages();

        } catch (err) {
            console.error('Send message error:', err);
            if (err.code === 'ACTION_REJECTED') {
                setError('Giao dịch bị từ chối bởi người dùng');
            } else {
                setError('Lỗi gửi tin nhắn: ' + err.message);
            }
        } finally {
            setIsSending(false);
            setTxHash('');
        }
    };

    // ===== REAL-TIME EVENT LISTENER =====
    useEffect(() => {
        if (!contract || !account) return;

        const handleMessageSent = (from, to, content, timestamp) => {
            // Check if this message is relevant to current chat
            const fromLower = from.toLowerCase();
            const toLower = to.toLowerCase();
            const accountLower = account.toLowerCase();
            const recipientLower = recipientAddress?.toLowerCase();

            const isRelevant =
                (fromLower === accountLower && toLower === recipientLower) ||
                (fromLower === recipientLower && toLower === accountLower);

            if (isRelevant) {
                const newMessage = {
                    id: Date.now(),
                    sender: from,
                    content: content,
                    timestamp: Number(timestamp),
                    isMine: fromLower === accountLower
                };

                setMessages(prev => {
                    // Avoid duplicates
                    const exists = prev.some(m =>
                        m.sender.toLowerCase() === from.toLowerCase() &&
                        m.content === content &&
                        m.timestamp === Number(timestamp)
                    );
                    if (exists) return prev;
                    return [...prev, newMessage];
                });
            }
        };

        // Subscribe to MessageSent event
        contract.on('MessageSent', handleMessageSent);

        // Cleanup
        return () => {
            contract.off('MessageSent', handleMessageSent);
        };
    }, [contract, account, recipientAddress]);

    // ===== LOAD MESSAGES WHEN RECIPIENT CHANGES =====
    useEffect(() => {
        if (recipientAddress && ethers.isAddress(recipientAddress)) {
            loadMessages();
        }
    }, [recipientAddress, loadMessages]);

    // ===== LISTEN FOR ACCOUNT CHANGES =====
    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                } else {
                    disconnectWallet();
                }
            });

            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });
        }
    }, []);

    // ===== FORMAT UTILITIES =====
    const formatAddress = (addr) => {
        if (!addr) return '';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const formatTimestamp = (ts) => {
        return new Date(ts * 1000).toLocaleString('vi-VN');
    };

    // ===== RENDER =====
    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="header-content">
                    <h1 className="logo">
                        <span className="logo-icon">💬</span>
                        DeChat
                    </h1>

                    {account ? (
                        <div className="wallet-info">
                            <span className="network-badge">Sepolia</span>
                            <span className="address">{formatAddress(account)}</span>
                            <button className="btn btn-disconnect" onClick={disconnectWallet}>
                                Ngắt kết nối
                            </button>
                        </div>
                    ) : (
                        <button className="btn btn-connect" onClick={connectWallet}>
                            🔗 Kết nối Ví
                        </button>
                    )}
                </div>
            </header>

            <main className="main">
                {!account ? (
                    // ===== NOT CONNECTED STATE =====
                    <div className="connect-prompt">
                        <div className="connect-card">
                            <div className="connect-icon">🦊</div>
                            <h2>Chào mừng đến DeChat</h2>
                            <p>Ứng dụng chat phi tập trung trên Blockchain</p>
                            <button className="btn btn-connect-large" onClick={connectWallet}>
                                Kết nối MetaMask
                            </button>
                        </div>
                    </div>
                ) : (
                    // ===== CONNECTED STATE =====
                    <div className="chat-container">
                        {/* Recipient Input */}
                        <div className="recipient-section">
                            <label htmlFor="recipient">Địa chỉ người nhận:</label>
                            <input
                                id="recipient"
                                type="text"
                                placeholder="0x..."
                                value={recipientAddress}
                                onChange={(e) => setRecipientAddress(e.target.value)}
                                className="input-recipient"
                            />
                            {recipientAddress && ethers.isAddress(recipientAddress) && (
                                <button className="btn btn-refresh" onClick={loadMessages} disabled={isLoading}>
                                    {isLoading ? '⏳' : '🔄'} Tải lại
                                </button>
                            )}
                        </div>

                        {/* Error Display */}
                        {error && (
                            <div className="error-message">
                                ⚠️ {error}
                            </div>
                        )}

                        {/* Transaction Pending */}
                        {txHash && (
                            <div className="tx-pending">
                                <span className="spinner"></span>
                                Đang xử lý giao dịch...
                                <a
                                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Xem trên Etherscan
                                </a>
                            </div>
                        )}

                        {/* Messages Area */}
                        <div className="messages-area">
                            {isLoading ? (
                                <div className="loading">
                                    <span className="spinner"></span>
                                    Đang tải tin nhắn...
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="no-messages">
                                    {recipientAddress ? (
                                        <>
                                            <span>📭</span>
                                            <p>Chưa có tin nhắn nào</p>
                                            <p className="hint">Gửi tin nhắn đầu tiên!</p>
                                        </>
                                    ) : (
                                        <>
                                            <span>👆</span>
                                            <p>Nhập địa chỉ người nhận để bắt đầu chat</p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="messages-list">
                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`message ${msg.isMine ? 'message-mine' : 'message-other'}`}
                                        >
                                            <div className="message-content">{msg.content}</div>
                                            <div className="message-meta">
                                                <span className="message-sender">
                                                    {msg.isMine ? 'Bạn' : formatAddress(msg.sender)}
                                                </span>
                                                <span className="message-time">{formatTimestamp(msg.timestamp)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Message Input */}
                        <form className="message-form" onSubmit={sendMessage}>
                            <input
                                type="text"
                                placeholder="Nhập tin nhắn..."
                                value={messageContent}
                                onChange={(e) => setMessageContent(e.target.value)}
                                disabled={isSending || !recipientAddress}
                                className="input-message"
                                maxLength={1000}
                            />
                            <button
                                type="submit"
                                className="btn btn-send"
                                disabled={isSending || !recipientAddress || !messageContent.trim()}
                            >
                                {isSending ? (
                                    <>
                                        <span className="spinner-small"></span>
                                        Đang gửi...
                                    </>
                                ) : (
                                    '📤 Gửi'
                                )}
                            </button>
                        </form>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="footer">
                <p>Built with ❤️ ManhDung</p>
            </footer>
        </div>
    );
}

export default App;
