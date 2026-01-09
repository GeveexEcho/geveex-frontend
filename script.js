let wallet = null;
const claimButton = document.getElementById('claim-button');
const status = document.getElementById('status');

document.getElementById('connect-wallet').onclick = async () => {
  if ('solana' in window) {
    wallet = window.solana;
    await wallet.connect();
    const pubkey = wallet.publicKey.toBase58();
    status.textContent = `Connected: ${pubkey.slice(0,8)}...`;
    enableClaimIfReady();
  } else {
    alert('Please install Phantom or Solflare wallet!');
  }
};

function enableClaimIfReady() {
  const verifies = document.querySelectorAll('[id^="task"]');
  const allVerified = Array.from(verifies).every(el => el.textContent === 'Verified');
  claimButton.disabled = !allVerified || !wallet;
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
      status.innerHTML = `Success! Your NFT minted: <a href="https://explorer.solana.com/address/\( {data.mint}?cluster=devnet" target="_blank"> \){data.mint}</a>`;
      document.getElementById('user-claimed').style.display = 'block';
      document.getElementById('claimed-info').textContent = 'You have claimed your unique Early Bird NFT (TESTNET ONLY – NO MAINNET VALUE)';
    } else {
      status.textContent = data.error || 'Claim failed';
      claimButton.disabled = false;
    }
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
    claimButton.disabled = false;
  }
};
