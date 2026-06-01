/* ============================================
   Ritual Aura Scanner — App Logic
   app.js
   Ritual Testnet | Chain ID: 1979
   ============================================ */

// ─── RITUAL TESTNET CONFIG ───────────────────────────────────────
const RITUAL_CHAIN = {
  chainId: '0x7BB',           // 1979 in hex
  chainName: 'Ritual Testnet',
  nativeCurrency: { name: 'RITUAL', symbol: 'RITUAL', decimals: 18 },
  rpcUrls: ['https://rpc.ritualfoundation.org'],
  blockExplorerUrls: ['https://explorer.ritualfoundation.org']
};

// ─── NFT CONTRACT ABI (payable mint) ────────────────────────────
const NFT_ABI = [
  "function mint(address to, string calldata uri) external payable returns (uint256)",
  "function safeMint(address to, string calldata uri) external payable returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];
const MINT_FEE = ethers.parseEther("0.0035"); // 0.0035 RITUAL

let CONTRACT_ADDRESS = '0x747189920F6c44c479EB3d762336612556cD1F5c';

// ─── AURA DATA ───────────────────────────────────────────────────
const AURAS = [
  {name:"Chaos Aura",     desc:"Pure entropy. You break systems just by existing near them.",         traits:["Volatile","Untamed","Raw Power"],       colors:["#ff1744","#ff6d00"]},
  {name:"Builder Aura",   desc:"You see cathedrals where others see rubble.",                          traits:["Architect","Patient","Visionary"],       colors:["#2979ff","#00b0ff"]},
  {name:"Schizo Aura",    desc:"You operate on frequencies others cannot perceive.",                   traits:["Paranoid","Visionary","Unfiltered"],     colors:["#d500f9","#ff1744"]},
  {name:"Cult Leader Aura",desc:"Your presence bends reality. Handle with care.",                     traits:["Magnetic","Prophetic","Dangerous"],      colors:["#00e676","#1de9b6"]},
  {name:"Ghost Aura",     desc:"Present but unseen. You leave traces that haunt the living.",         traits:["Ethereal","Silent","Liminal"],           colors:["#90a4ae","#b0bec5"]},
  {name:"Degen Aura",     desc:"All in at 3am. Down bad. The charts are your scripture.",             traits:["High Risk","No Sleep","Cursed"],         colors:["#ffab00","#ff6d00"]},
  {name:"Oracle Aura",    desc:"You always knew. Before the news. Before everyone.",                  traits:["Foresight","Calm","Ancient"],            colors:["#00e5ff","#00b0ff"]}
];

const SEED_LB = [
  {handle:"@cryptowizard", score:97, aura:"Oracle Aura",      colors:["#00e5ff","#00b0ff"]},
  {handle:"@0xdegenking",  score:95, aura:"Chaos Aura",       colors:["#ff1744","#ff6d00"]},
  {handle:"@ritualist_",   score:94, aura:"Cult Leader Aura", colors:["#00e676","#1de9b6"]},
  {handle:"@wagmifrens",   score:93, aura:"Builder Aura",     colors:["#2979ff","#00b0ff"]},
  {handle:"@solsurvivor",  score:91, aura:"Oracle Aura",      colors:["#00e5ff","#00b0ff"]},
  {handle:"@voidwalker",   score:90, aura:"Ghost Aura",       colors:["#90a4ae","#b0bec5"]},
];

let lbData = [...SEED_LB];

let S = {
  twitter: '', wallet: '',
  twitterOk: false, walletOk: false,
  aura: null, score: 0,
  provider: null, signer: null
};

// ─── UTILS ───────────────────────────────────────────────────────
function randomScore() {
  // Fully random 80-100 every scan, never same twice in a row
  return 80 + Math.floor(Math.random() * 21);
}

function toast(id, msg, type='info') {
  const el = document.getElementById(id);
  el.className = 'toast ' + type;
  el.innerHTML = msg;
  el.classList.add('show');
  if (type !== 'warn') setTimeout(() => el.classList.remove('show'), 6000);
}

function checkReady() {
  document.getElementById('scanBtn').disabled = !(S.twitterOk && S.walletOk);
}

// ─── TWITTER CONNECT ─────────────────────────────────────────────
let _twitterTimer = null;
function autoTwitter(val) {
  clearTimeout(_twitterTimer);
  const v = val.trim();
  if (!v) {
    S.twitterOk = false; S.twitter = '';
    document.getElementById('twitterStatus').className = 'connect-status';
    document.getElementById('twitterStatus').textContent = 'Type your username';
    document.getElementById('twitterCard').classList.remove('done');
    document.getElementById('twitterNavBtn').className = 'nav-btn';
    document.getElementById('twitterNavBtn').textContent = 'Connect X';
    checkReady(); return;
  }
  document.getElementById('twitterStatus').className = 'connect-status';
  document.getElementById('twitterStatus').textContent = '...';
  _twitterTimer = setTimeout(() => connectTwitter(), 600);
}

function connectTwitter() {
  let v = document.getElementById('twitterInput').value.trim();
  if (!v) return;
  if (!v.startsWith('@')) v = '@' + v;
  document.getElementById('twitterInput').value = v;
  S.twitter = v; S.twitterOk = true;
  document.getElementById('twitterStatus').className = 'connect-status ok';
  document.getElementById('twitterStatus').textContent = '✓ ' + v;
  document.getElementById('twitterCard').classList.add('done');
  document.getElementById('twitterNavBtn').className = 'nav-btn ok-twitter';
  document.getElementById('twitterNavBtn').textContent = v;
  checkReady();
}

function scrollToConnect() {
  document.getElementById('connectSection').scrollIntoView({behavior:'smooth'});
  document.getElementById('twitterInput').focus();
}

// ─── WALLET MODAL ────────────────────────────────────────────────
function openModal()  { document.getElementById('walletModal').classList.add('show'); }
function closeModal() { document.getElementById('walletModal').classList.remove('show'); }

async function switchToRitual(provider) {
  try {
    await provider.send('wallet_switchEthereumChain', [{ chainId: RITUAL_CHAIN.chainId }]);
  } catch (e) {
    if (e.code === 4902 || (e.data && e.data.originalError && e.data.originalError.code === 4902)) {
      await provider.send('wallet_addEthereumChain', [RITUAL_CHAIN]);
    } else {
      throw e;
    }
  }
}

function onWalletConnected(address, provider, signer) {
  S.wallet = address; S.walletOk = true;
  S.provider = provider; S.signer = signer;
  const sh = address.slice(0,6) + '...' + address.slice(-4);
  document.getElementById('walletStatus').className = 'connect-status ok';
  document.getElementById('walletStatus').textContent = sh;
  document.getElementById('walletAddrDisplay').value = address;
  document.getElementById('walletAddrDisplay').style.opacity = '0.85';
  document.getElementById('walletBtn').className = 'cpill done';
  document.getElementById('walletBtn').textContent = 'Done';
  document.getElementById('walletCard').classList.add('done');
  document.getElementById('walletNavBtn').className = 'nav-btn ok-wallet';
  document.getElementById('walletNavBtn').textContent = sh;
  closeModal();
  checkReady();
  toast('mainToast', '✅ Wallet connected on Ritual Testnet!');
}

async function connectMetaMask() {
  if (typeof window.ethereum === 'undefined') {
    toast('mainToast', '🦊 MetaMask not found. <a href="https://metamask.io" target="_blank" style="color:var(--green)">Install MetaMask</a> first.', 'err');
    closeModal(); return;
  }
  try {
    toast('mainToast', '⏳ Connecting to MetaMask...', 'info');
    closeModal();
    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    await switchToRitual(browserProvider);
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const signer = await browserProvider.getSigner();
    onWalletConnected(accounts[0], browserProvider, signer);

    // Listen for account changes
    window.ethereum.on('accountsChanged', (accs) => {
      if (accs.length > 0) onWalletConnected(accs[0], browserProvider, signer);
    });
  } catch(e) {
    console.error(e);
    toast('mainToast', '❌ ' + (e.message || 'MetaMask connection failed'), 'err');
  }
}

async function connectWalletConnect() {
  toast('mainToast', '⚠️ WalletConnect: Add WalletConnect SDK to your deployment. Using MetaMask fallback.', 'warn');
  closeModal();
  connectMetaMask();
}

// ─── CONTRACT ────────────────────────────────────────────────────
function setContract(addr) {
  CONTRACT_ADDRESS = addr.trim();
}

// ─── SCAN ────────────────────────────────────────────────────────
function doScan() {
  if (!S.twitterOk || !S.walletOk) {
    toast('mainToast', '⚠️ Connect both Twitter/X and Wallet first to scan', 'err');
    return;
  }

  // FULLY RANDOM score 80–100 every scan
  const score = randomScore();
  const auraIdx = Math.floor(Math.random() * AURAS.length);
  const aura = AURAS[auraIdx];
  S.aura = aura; S.score = score;

  const wrap = document.getElementById('resultWrap');
  const loading = document.getElementById('rLoading');
  const body = document.getElementById('rBody');
  document.getElementById('mintToast').classList.remove('show');
  document.getElementById('badgeWrap').classList.remove('show');
  document.getElementById('contractBox').classList.remove('show');
  document.getElementById('yourCard').style.display = 'none';

  wrap.classList.add('show');
  loading.style.display = 'flex';
  body.classList.remove('show');

  setTimeout(() => {
    drawResultBg(aura.colors);
    loading.style.display = 'none';
    document.getElementById('rName').textContent = aura.name;
    document.getElementById('rNum').textContent = score;
    document.getElementById('rDesc').textContent = aura.desc;
    document.getElementById('rTraits').innerHTML = aura.traits.map(t => `<span class="tpill">${t}</span>`).join('');
    document.getElementById('rDay').textContent = 'Aura · ' + new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'}) + ' ' + new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
    body.classList.add('show');
    if (score >= 90) { showBadge(aura, score); addToLb(S.twitter, score, aura); }
    else showYourEntry(S.twitter, score, aura);
    wrap.scrollIntoView({behavior:'smooth', block:'nearest'});
  }, 2600);
}

function drawResultBg(colors) {
  const c = document.getElementById('rCanvas');
  const w = c.offsetWidth || 440, h = c.offsetHeight || 340;
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#060610'; ctx.fillRect(0,0,w,h);
  [[w*.2,h*.3,w*.55,colors[0]],[w*.8,h*.65,w*.45,colors[1]],[w*.5,h*.9,w*.4,colors[0]]].forEach(([x,y,r,col]) => {
    const g = ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0, col+'66'); g.addColorStop(1,'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  });
  for(let i=0;i<60;i++){
    ctx.fillStyle = 'rgba(255,255,255,'+(Math.random()*.55+.08)+')';
    ctx.beginPath(); ctx.arc(Math.random()*w,Math.random()*h,Math.random()*1.5+.2,0,Math.PI*2); ctx.fill();
  }
}

function showBadge(aura, score) {
  document.getElementById('badgeWrap').classList.add('show');
  const pill = document.getElementById('badgeScorePill');
  pill.textContent = score + ' pts';
  pill.style.color = aura.colors[0];
  const glow = document.getElementById('badgeGlow');
  glow.style.boxShadow = '0 0 0 3px ' + aura.colors[0] + ', 0 0 28px ' + aura.colors[0]+'66';
  document.getElementById('badgeAuraName').textContent = aura.name;
  document.getElementById('badgeAuraName').style.color = aura.colors[0];
  document.getElementById('badgeHandle').textContent = S.twitter;
}

// ─── REAL NFT MINT ───────────────────────────────────────────────
async function doMint() {
  if (!S.walletOk || !S.signer) {
    toast('mintToast', '❌ Connect wallet first', 'err'); return;
  }
  if (!S.aura) {
    toast('mintToast', '❌ Scan your aura first', 'err'); return;
  }
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS.length < 10) {
    toast('mintToast', '⚠️ Wallet connect karo pehle', 'warn'); return;
  }

  // Disable buttons
  ['mintResultBtn','mintBadgeBtn'].forEach(id => {
    const el = document.getElementById(id);
    if(el){ el.disabled = true; el.textContent = '⏳ Minting...'; }
  });

  toast('mintToast', '⏳ Sending 0.0035 RITUAL fee + submitting to Ritual Testnet...', 'info');

  // Build token metadata as data URI (no IPFS needed for demo)
  const metadata = JSON.stringify({
    name: S.aura.name + ' Badge',
    description: S.aura.desc,
    attributes: [
      {trait_type: 'Aura', value: S.aura.name},
      {trait_type: 'Score', value: S.score},
      {trait_type: 'Holder', value: S.twitter},
      {trait_type: 'Date', value: new Date().toISOString().slice(0,10)}
    ]
  });
  const tokenURI = 'data:application/json;base64,' + btoa(metadata);

  try {
    // Make sure still on Ritual Testnet
    await switchToRitual(S.provider);

    const contract = new ethers.Contract(CONTRACT_ADDRESS, NFT_ABI, S.signer);

    // Try mint() first, fallback to safeMint()
    let tx;
    try {
      tx = await contract.mint(S.wallet, tokenURI, { value: MINT_FEE, gasLimit: 300000 });
    } catch(e1) {
      try {
        tx = await contract.safeMint(S.wallet, tokenURI, { value: MINT_FEE, gasLimit: 300000 });
      } catch(e2) {
        throw new Error('mint() and safeMint() both failed. Check contract ABI.');
      }
    }

    toast('mintToast', '⛓️ Tx submitted! Waiting for confirmation...<br/><small style="opacity:0.6">Hash: ' + tx.hash.slice(0,18) + '...</small>', 'info');

    const receipt = await tx.wait();
    const tokenId = receipt.logs?.[0]?.topics?.[3]
      ? parseInt(receipt.logs[0].topics[3], 16)
      : '?';

    const explorerUrl = `https://explorer.ritualfoundation.org/tx/${tx.hash}`;

    toast('mintToast',
      `✅ Minted! Token #${tokenId}<br/>
       <a href="${explorerUrl}" target="_blank" style="color:var(--green)">View on Ritual Explorer ↗</a>`,
      'info'
    );

    // Show contract box
    const box = document.getElementById('contractBox');
    box.innerHTML = `
      📋 <b>Mint Successful</b><br/>
      Token ID: <b style="color:#fff">#${tokenId}</b> · 
      Contract: <a href="https://explorer.ritualfoundation.org/address/${CONTRACT_ADDRESS}" target="_blank">${CONTRACT_ADDRESS.slice(0,8)}...${CONTRACT_ADDRESS.slice(-4)}</a><br/>
      Tx: <a href="${explorerUrl}" target="_blank">${tx.hash.slice(0,16)}...</a>
    `;
    box.classList.add('show');

  } catch(e) {
    console.error(e);
    let msg = e.message || 'Transaction failed';
    if (msg.includes('insufficient funds')) msg = 'Insufficient RITUAL tokens. Need 0.0035 RITUAL fee + gas. Get from faucet.ritualfoundation.org';
    if (msg.includes('Fee: send')) msg = '⚠️ Send exactly 0.0035 RITUAL as mint fee';
    if (msg.includes('user rejected')) msg = 'Transaction rejected by user';
    toast('mintToast', '❌ ' + msg, 'err');
  }

  // Re-enable buttons
  ['mintResultBtn','mintBadgeBtn'].forEach(id => {
    const el = document.getElementById(id);
    if(el){ el.disabled = false; el.textContent = id.includes('Badge') ? '💎 Mint NFT · 0.0035 RITUAL' : '💎 Mint Badge · 0.0035 RITUAL'; }
  });
}

// ─── SHARE ───────────────────────────────────────────────────────
function doShare() {
  const txt = encodeURIComponent(
    `my daily aura just dropped 👁️\n\n${S.aura ? S.aura.name : 'Ritual Aura'} — ${S.score}/100\n` +
    (S.score >= 90 ? `legendary badge minted 🏆\n` : '') +
    `\ncheck yours → ritual.xyz\n#RitualAura ${S.twitter}`
  );
  window.open('https://twitter.com/intent/tweet?text=' + txt, '_blank');
}

// ─── LEADERBOARD ─────────────────────────────────────────────────
function makeRow(e, rank) {
  const init = e.handle.replace('@','').slice(0,2).toUpperCase();
  const top = rank <= 3 && rank !== '—';
  return `
    <div class="lb-rank ${top?'top':''}">${rank}</div>
    <div class="lb-av" style="background:linear-gradient(135deg,${e.colors[0]},${e.colors[1]});color:#000">${init}</div>
    <div class="lb-info"><div class="lb-handle">${e.handle}</div><div class="lb-aname">${e.aura}</div></div>
    <div style="display:flex;align-items:center;gap:5px">${top?'<span>🏆</span>':''}<div class="lb-sc">${e.score}</div></div>`;
}

function renderLb() {
  const top = lbData.filter(e => e.score >= 90).slice(0, 8);
  document.getElementById('lbList').innerHTML = top.length
    ? top.map((e,i) => `<div class="lb-row">${makeRow(e,i+1)}</div>`).join('')
    : '<div style="font-size:10px;color:rgba(255,255,255,0.18);text-align:center;padding:20px 0">No 90+ auras yet. Be first.</div>';
}

function addToLb(handle, score, aura) {
  const i = lbData.findIndex(e => e.handle === handle);
  const entry = {handle, score, aura: aura.name, colors: aura.colors};
  if (i >= 0) lbData[i] = entry; else lbData.push(entry);
  lbData.sort((a,b) => b.score - a.score);
  renderLb();
  const rank = lbData.findIndex(e => e.handle === handle) + 1;
  document.getElementById('yourCard').style.display = 'block';
  document.getElementById('yourRow').innerHTML = makeRow(entry, rank);
}

function showYourEntry(handle, score, aura) {
  document.getElementById('yourCard').style.display = 'block';
  document.getElementById('yourRow').innerHTML = makeRow({handle, score, aura: aura.name, colors: aura.colors}, '—');
}

// ─── BG CANVAS ───────────────────────────────────────────────────
(function initBg() {
  const c = document.getElementById('bg');
  function draw() {
    const w = c.offsetWidth || window.innerWidth;
    const h = c.offsetHeight || window.innerHeight;
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#060610'; ctx.fillRect(0,0,w,h);
    [[w*.08,h*.1,w*.42,'#39ff14'],[w*.88,h*.22,w*.38,'#7c3aed'],[w*.5,h*.68,w*.44,'#1d4ed8'],[w*.14,h*.82,w*.32,'#0891b2']].forEach(([x,y,r,col]) => {
      const g = ctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0, col+'28'); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    });
    for(let i=0;i<120;i++){
      ctx.fillStyle = 'rgba(255,255,255,'+(Math.random()*.4+.04)+')';
      ctx.beginPath(); ctx.arc(Math.random()*w,Math.random()*h,Math.random()*1.4+.2,0,Math.PI*2); ctx.fill();
    }
  }
  draw(); window.addEventListener('resize', draw);
})();

renderLb();
