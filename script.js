let wallet = null;
const claimButton = document.getElementById('claim-button');
const status = document.getElementById('status');

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

document.getElementById('connect-wallet').onclick = async () => {
  const provider = window.solana || window.solflare;
  if (provider) {
    wallet = provider;
    await wallet.connect();
    const pubkey = wallet.publicKey.toBase58();
    status.textContent = `Connected: ${pubkey.slice(0,8)}...`;
    enableClaimIfReady();
  } else {
    alert('Please install Phantom or Solflare wallet!');
  }
};

function enableClaimIfReady() {
  const taskButtons = document.querySelectorAll('[id^="btn-task-"]');
  const allVerified = Array.from(taskButtons).every(btn => btn.getAttribute('data-state') === 'verified');
  
  const provider = window.solana || window.solflare;
  const isWalletConnected = provider && provider.isConnected;

  if (allVerified && isWalletConnected) {
    claimButton.disabled = false;
  }
}

claimButton.onclick = async () => {
  if (!wallet) return;
  status.textContent = 'Claiming your unique NFT...';
  claimButton.disabled = true;

  try {
    const response = await fetch('/.netlify/functions/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pubkey: wallet.publicKey.toBase58() })
    });
    const data = await response.json();
    if (data.success) {
      status.innerHTML = `Success! Your NFT minted: <a href="https://explorer.solana.com/address/${data.mint}?cluster=devnet" target="_blank" class="text-cyan-400 underline">${data.mint.slice(0,8)}...</a>`;
      
      saveClaimData(wallet.publicKey.toBase58(), data.mint);
      
      const claimedSection = document.getElementById('user-claimed');
      if (claimedSection) claimedSection.style.display = 'block';
      
      const infoDisplay = document.getElementById('claimed-info');
      if (infoDisplay) infoDisplay.textContent = 'You have claimed your unique Early Bird NFT (TESTNET ONLY – NO MAINNET VALUE)';
    } else {
      status.textContent = data.error || 'Claim failed';
      claimButton.disabled = false;
    }
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
    claimButton.disabled = false;
  }
};
