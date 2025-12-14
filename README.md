# 💬 DeChat - Decentralized Chat DApp

Ứng dụng chat phi tập trung chạy 100% trên Blockchain. Không server, không database truyền thống.

## 🌐 Live Demo

**[https://smartcontract-chat-fe.vercel.app](https://smartcontract-chat-fe.vercel.app)**

## 🧪 Hướng dẫn Test

### Yêu cầu
- Trình duyệt có cài [MetaMask](https://metamask.io/)
- Một ít SepoliaETH (lấy miễn phí tại [Google Cloud Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia))

### Các bước test

1. **Kết nối ví**
   - Truy cập link demo
   - Click "Kết nối MetaMask"
   - Chuyển sang mạng **Sepolia** nếu được yêu cầu

2. **Gửi tin nhắn**
   - Nhập địa chỉ ví người nhận (bất kỳ địa chỉ Ethereum nào) hoặc
   Gửi tin nhắn đến địa chỉ của tác giả:`0x3C31bA23041af2d5Ab89c22EeF754252f48023d0`
   - Gõ tin nhắn và click "Gửi"
   - Confirm giao dịch trong MetaMask
   - Đợi ~10-15s để giao dịch được xác nhận

3. **Test chat 2 chiều** (cần 2 tài khoản)
   - Tạo Account 2 trong MetaMask
   - Gửi tin từ Account 1 → Account 2
   - Chuyển sang Account 2, nhập địa chỉ Account 1
   - Xem tin nhắn và trả lời

## 🔧 Chạy Local

```bash
cd frontend
npm install
npm run dev
```

Mở http://localhost:3000

## 📋 Thông tin kỹ thuật

| Thành phần | Chi tiết |
|------------|----------|
| Smart Contract | Solidity 0.8.20, UUPS Proxy |
| Frontend | React 18, Ethers.js v6, Vite |
| Network | Sepolia Testnet |
| Contract Address | `0x0E40f2Ba71342BA746E1861E1481cC2371162F43` |

Built with ❤️ by ManhDung
