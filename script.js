let wallet = null;
let tasksCompleted = 0;
const totalTasks = 5;

const claimButton = document.getElementById('claim-button');
const statusDisplay = document.getElementById('status');
const connectBtn = document.getElementById('connect-wallet-btn');
const walletText = document.getElementById('wallet-text');

function saveClaimData(userWallet, mintAddress) {
    let claims = JSON.parse(localStorage.getItem('geveex_records') || '[]');
    const newEntry = {
        wallet: userWallet,
        mint: mintAddress,
        time: new Date().toLocaleString()
    };
    claims.push(newEntry);
    localStorage.setItem('geveex_records', JSON.stringify(claims));
}

if (connectBtn) {
    connectBtn.onclick = async () => {
        const provider = window.solana || window.solflare;
        if (provider) {
            try {
                walletText.textContent = "Connecting...";
                const resp = await provider.connect();
                wallet = provider;
                const pubkey = resp.publicKey.toString();
                walletText.textContent = pubkey.slice(0, 4) + '...' + pubkey.slice(-4);
                connectBtn.classList.remove('from-indigo-600', 'to-purple-600');
                connectBtn.classList.add('from-cyan-600', 'to-blue-600', 'border', 'border-cyan-400');
                checkEligibility();
            } catch (err) {
                walletText.textContent = "Connect Wallet";
                console.error("Connection failed", err);
            }
        } else {
            alert('Please install Phantom or Solflare wallet!');
        }
    };
}

document.querySelectorAll('[id^="btn-task-"]').forEach(btn => {
    btn.onclick = () => {
        const state = btn.getAttribute('data-state');
        const link = btn.getAttribute('data-link') || btn.getAttribute('onclick')?.match(/'([^']+)'/)[1];

        if (state === 'open') {
            window.open(link, '_blank');
            btn.setAttribute('data-state', 'verify');
            btn.textContent = 'Verify';
            btn.className = "min-w-[140px] px-5 py-2.5 rounded-lg font-bold text-sm bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white transition-all duration-200 shadow-lg animate-pulse";
        } else if (state === 'verify') {
            btn.setAttribute('data-state', 'verified');
            btn.innerHTML = 'Verified &check;';
            btn.disabled = true;
            btn.className = "min-w-[140px] px-5 py-2.5 rounded-lg font-bold text-sm bg-gradient-to-r from-emerald-600 to-green-600 text-white cursor-default shadow-neon-glow";
            tasksCompleted++;
            checkEligibility();
        }
    };
});

function checkEligibility() {
    const claimText = document.getElementById('claim-text');
    const claimGlow = document.getElementById('claim-glow');
    const statusMsg = document.getElementById('status-msg');
    const claimIcon = document.getElementById('claim-icon');

    const isWalletConnected = wallet && wallet.isConnected;

    if (isWalletConnected && tasksCompleted === totalTasks) {
        claimButton.disabled = false;
        claimButton.classList.remove('bg-gray-800', 'text-gray-500');
        claimButton.classList.add('bg-transparent', 'text-white', 'hover:scale-105');
        claimText.textContent = "CLAIM NFT";
        statusMsg.textContent = "You are eligible! Click to mint.";
        statusMsg.classList.add('text-cyan-400');
        claimGlow.classList.remove('opacity-0');
        claimGlow.classList.add('opacity-100');
        claimIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>';
    }
}

// Fixed Claim Logic with proper JSON Error handling
claimButton.onclick = async () => {
    if (!wallet) return;
    statusDisplay.textContent = 'Claiming your unique NFT...';
    claimButton.disabled = true;

    try {
        const response = await fetch('/api/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pubkey: wallet.publicKey.toBase58() })
        });

        // চেক করা হচ্ছে রেসপন্সটি JSON কি না
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const rawText = await response.text();
            throw new Error("Server returned non-JSON response. Check if /api/claim is correct.");
        }

        const data = await response.json();
        if (data.success) {
            statusDisplay.innerHTML = `Success! Your NFT minted: <a href="https://explorer.solana.com/address/${data.mint}?cluster=devnet" target="_blank" class="text-cyan-400 underline">${data.mint.slice(0,8)}...</a>`;
            saveClaimData(wallet.publicKey.toBase58(), data.mint);
            
            const claimedSection = document.getElementById('user-claimed');
            if(claimedSection) claimedSection.style.display = 'block';
            
            const claimedInfo = document.getElementById('claimed-info');
            if(claimedInfo) claimedInfo.textContent = 'You have claimed your unique Early Bird NFT (TESTNET ONLY)';
        } else {
            statusDisplay.textContent = data.error || 'Claim failed';
            claimButton.disabled = false;
        }
    } catch (err) {
        console.error("Detailed Error:", err);
        statusDisplay.textContent = 'Error: ' + err.message;
        claimButton.disabled = false;
    }
};
