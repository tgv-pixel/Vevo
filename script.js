// ============================================
// VEVOBet - Main JavaScript File
// Handles Authentication, Firebase, Dashboard, 
// Deposit, Withdraw, Invite System & More
// ============================================

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCAfsKcVP7OUo870TKkBnk4BfDEq9LnAK8",
    authDomain: "newporoject-c6f66.firebaseapp.com",
    databaseURL: "https://newporoject-c6f66-default-rtdb.firebaseio.com",
    projectId: "newporoject-c6f66",
    storageBucket: "newporoject-c6f66.appspot.com",
    messagingSenderId: "733557611631",
    appId: "1:733557611631:web:02c9377f56d614ff3b019a",
    measurementId: "G-53BEVW33FP"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// Global Variables
let currentUser = null;
let userData = null;
let currentPage = 'dashboard';

// ============================================
// Helper Functions
// ============================================

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#ff4757' : '#667eea'};
        color: white;
        padding: 12px 20px;
        border-radius: 10px;
        z-index: 2000;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Generate promo code from user ID
function generatePromoCode(userId) {
    return userId ? userId.substring(0, 8).toUpperCase() : '';
}

// Format date
function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString();
}

// ============================================
// User Interface Updates
// ============================================
function updateUserUI() {
    if (currentUser && userData) {
        const headerName = document.getElementById('headerUserName');
        const headerEmail = document.getElementById('headerUserEmail');
        const sidebarName = document.getElementById('sidebarUserName');
        const sidebarEmail = document.getElementById('sidebarUserEmail');
        const userBalance = document.getElementById('userBalance');
        const settingsName = document.getElementById('settingsName');
        const settingsEmail = document.getElementById('settingsEmail');
        const settingsInviteCount = document.getElementById('settingsInviteCount');
        const settingsRewards = document.getElementById('settingsRewards');
        
        if (headerName) headerName.textContent = userData.name || currentUser.displayName || 'User';
        if (headerEmail) headerEmail.textContent = currentUser.email;
        if (sidebarName) sidebarName.textContent = userData.name || currentUser.displayName || 'User';
        if (sidebarEmail) sidebarEmail.textContent = currentUser.email;
        if (userBalance) userBalance.textContent = userData.balance || 0;
        if (settingsName) settingsName.textContent = userData.name || '-';
        if (settingsEmail) settingsEmail.textContent = currentUser.email;
        if (settingsInviteCount) settingsInviteCount.textContent = userData.inviteCount || 0;
        if (settingsRewards) settingsRewards.textContent = userData.inviteRewards || 0;
    } else {
        const headerName = document.getElementById('headerUserName');
        const headerEmail = document.getElementById('headerUserEmail');
        const sidebarName = document.getElementById('sidebarUserName');
        const sidebarEmail = document.getElementById('sidebarUserEmail');
        const userBalance = document.getElementById('userBalance');
        
        if (headerName) headerName.textContent = 'Guest';
        if (headerEmail) headerEmail.textContent = 'Not logged in';
        if (sidebarName) sidebarName.textContent = 'Guest';
        if (sidebarEmail) sidebarEmail.textContent = 'Not logged in';
        if (userBalance) userBalance.textContent = '0';
    }
}

// ============================================
// Load User Data from Firebase
// ============================================
async function loadUserData() {
    if (!currentUser) return null;
    
    try {
        const snapshot = await db.ref(`users/${currentUser.uid}`).once('value');
        if (snapshot.exists()) {
            userData = snapshot.val();
            updateUserUI();
            return userData;
        } else {
            // Create new user profile
            const newUserData = {
                email: currentUser.email,
                name: currentUser.displayName || currentUser.email.split('@')[0],
                balance: 100,
                withdrawCode: null,
                inviteCount: 0,
                inviteRewards: 0,
                invitees: [],
                depositRequests: [],
                withdrawRequests: [],
                createdAt: Date.now(),
                lastLogin: Date.now()
            };
            await db.ref(`users/${currentUser.uid}`).set(newUserData);
            userData = newUserData;
            updateUserUI();
            return userData;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        return null;
    }
}

async function updateUserBalance(newBalance) {
    if (!currentUser) return;
    await db.ref(`users/${currentUser.uid}`).update({ balance: newBalance });
    if (userData) userData.balance = newBalance;
    updateUserUI();
}

// ============================================
// Authentication
// ============================================
async function handleAuth(email, password, name) {
    try {
        // Try to sign in first
        let userCredential = await auth.signInWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        await loadUserData();
        hideModal(loginModal);
        loadPage(currentPage);
        showNotification('Login successful!', 'success');
        return true;
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            // Create new user
            try {
                let userCredential = await auth.createUserWithEmailAndPassword(email, password);
                currentUser = userCredential.user;
                
                // Update profile with name
                await currentUser.updateProfile({ displayName: name });
                
                // Create user data
                const newUserData = {
                    email: email,
                    name: name,
                    balance: 100,
                    withdrawCode: null,
                    inviteCount: 0,
                    inviteRewards: 0,
                    invitees: [],
                    depositRequests: [],
                    withdrawRequests: [],
                    createdAt: Date.now(),
                    lastLogin: Date.now()
                };
                await db.ref(`users/${currentUser.uid}`).set(newUserData);
                userData = newUserData;
                
                hideModal(loginModal);
                loadPage(currentPage);
                showNotification('Account created successfully! You received 100 VEVO bonus!', 'success');
                return true;
            } catch (createError) {
                console.error('Error creating user:', createError);
                showNotification(createError.message, 'error');
                return false;
            }
        } else {
            console.error('Error logging in:', error);
            showNotification(error.message, 'error');
            return false;
        }
    }
}

async function logout() {
    try {
        await auth.signOut();
        currentUser = null;
        userData = null;
        updateUserUI();
        showNotification('Logged out successfully', 'info');
        loadPage('dashboard');
    } catch (error) {
        console.error('Error logging out:', error);
        showNotification('Error logging out', 'error');
    }
}

// ============================================
// Deposit System
// ============================================
async function submitDeposit() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        showModal(loginModal);
        return;
    }
    
    const amount = document.getElementById('depositAmount').value;
    const currency = document.getElementById('depositCurrency').value;
    const screenshot = document.getElementById('depositScreenshot').files[0];
    
    if (!amount || amount <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return;
    }
    
    if (!screenshot) {
        showNotification('Please upload a screenshot of payment', 'error');
        return;
    }
    
    // Calculate VEVO tokens
    let vevoAmount = 0;
    if (currency === 'BIRR') {
        vevoAmount = parseInt(amount);
    } else {
        vevoAmount = parseInt(amount) * 157;
    }
    
    // Convert screenshot to base64 for storage
    const reader = new FileReader();
    reader.onloadend = async function() {
        const depositRequest = {
            id: Date.now(),
            userId: currentUser.uid,
            userName: userData.name,
            userEmail: currentUser.email,
            amount: parseFloat(amount),
            currency: currency,
            vevoAmount: vevoAmount,
            screenshot: reader.result,
            status: 'pending',
            createdAt: Date.now()
        };
        
        try {
            await db.ref(`deposits/${depositRequest.id}`).set(depositRequest);
            showNotification('Deposit request submitted! Waiting for admin approval.', 'success');
            hideModal(depositModal);
            document.getElementById('depositAmount').value = '';
            document.getElementById('depositScreenshot').value = '';
        } catch (error) {
            console.error('Error submitting deposit:', error);
            showNotification('Error submitting deposit', 'error');
        }
    };
    reader.readAsDataURL(screenshot);
}

// ============================================
// Withdraw System
// ============================================
async function submitWithdraw() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        showModal(loginModal);
        return;
    }
    
    const withdrawCode = document.getElementById('withdrawCode').value;
    const method = document.getElementById('withdrawMethod').value;
    const account = document.getElementById('withdrawAccount').value;
    const amount = parseInt(document.getElementById('withdrawAmount').value);
    
    if (!withdrawCode || withdrawCode.length !== 4) {
        showNotification('Please enter a valid 4-digit withdrawal code', 'error');
        return;
    }
    
    if (!account) {
        showNotification('Please enter account number', 'error');
        return;
    }
    
    if (!amount || amount <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return;
    }
    
    if (amount > (userData.balance || 0)) {
        showNotification('Insufficient balance', 'error');
        return;
    }
    
    if (userData.withdrawCode !== withdrawCode) {
        showNotification('Invalid withdrawal code', 'error');
        return;
    }
    
    const withdrawRequest = {
        id: Date.now(),
        userId: currentUser.uid,
        userName: userData.name,
        userEmail: currentUser.email,
        amount: amount,
        method: method,
        account: account,
        status: 'pending',
        createdAt: Date.now()
    };
    
    try {
        await db.ref(`withdraws/${withdrawRequest.id}`).set(withdrawRequest);
        showNotification('Withdrawal request submitted! Waiting for admin approval.', 'success');
        hideModal(withdrawModal);
        document.getElementById('withdrawAmount').value = '';
        document.getElementById('withdrawAccount').value = '';
        document.getElementById('withdrawCode').value = '';
    } catch (error) {
        console.error('Error submitting withdrawal:', error);
        showNotification('Error submitting withdrawal', 'error');
    }
}

// ============================================
// Settings - Withdrawal Code Management
// ============================================
async function saveWithdrawCode() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    const newCode = document.getElementById('settingsWithdrawCode').value;
    
    if (!newCode || newCode.length !== 4 || isNaN(newCode)) {
        showNotification('Please enter a valid 4-digit code (numbers only)', 'error');
        return;
    }
    
    try {
        await db.ref(`users/${currentUser.uid}`).update({ withdrawCode: newCode });
        userData.withdrawCode = newCode;
        showNotification('Withdrawal code saved successfully!', 'success');
        hideModal(settingsModal);
    } catch (error) {
        console.error('Error saving withdrawal code:', error);
        showNotification('Error saving code', 'error');
    }
}

// ============================================
// Invite System
// ============================================
async function loadInviteInfo() {
    if (!currentUser || !userData) return;
    
    const promoCode = generatePromoCode(currentUser.uid);
    const promoElement = document.getElementById('userPromoCode');
    if (promoElement) promoElement.textContent = promoCode;
    
    const inviteCountElement = document.getElementById('inviteCount');
    if (inviteCountElement) inviteCountElement.textContent = userData.inviteCount || 0;
    
    const rewardsElement = document.getElementById('rewardsEarned');
    if (rewardsElement) rewardsElement.textContent = userData.inviteRewards || 0;
}

function copyPromoCode() {
    const code = document.getElementById('userPromoCode').textContent;
    navigator.clipboard.writeText(code);
    showNotification('Promo code copied!', 'success');
}

async function applyInviteCode(code) {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return false;
    }
    
    // Check if user already used a code
    if (userData.invitedBy) {
        showNotification('You have already used an invite code', 'error');
        return false;
    }
    
    // Find user with this promo code
    const usersRef = db.ref('users');
    const snapshot = await usersRef.once('value');
    let inviterId = null;
    
    snapshot.forEach(childSnapshot => {
        const user = childSnapshot.val();
        const userCode = generatePromoCode(childSnapshot.key);
        if (userCode === code && childSnapshot.key !== currentUser.uid) {
            inviterId = childSnapshot.key;
        }
    });
    
    if (!inviterId) {
        showNotification('Invalid promo code', 'error');
        return false;
    }
    
    try {
        // Update current user
        await db.ref(`users/${currentUser.uid}`).update({ invitedBy: inviterId });
        
        // Update inviter's invite count and check for reward
        const inviterRef = db.ref(`users/${inviterId}`);
        const inviterSnapshot = await inviterRef.once('value');
        const inviterData = inviterSnapshot.val();
        const newInviteCount = (inviterData.inviteCount || 0) + 1;
        const newInvitees = [...(inviterData.invitees || []), currentUser.uid];
        
        let reward = 0;
        if (newInviteCount % 5 === 0) {
            reward = 10;
            await inviterRef.update({
                balance: (inviterData.balance || 0) + reward,
                inviteRewards: (inviterData.inviteRewards || 0) + reward
            });
            showNotification(`You earned 10 VEVO for reaching ${newInviteCount} invites!`, 'success');
        }
        
        await inviterRef.update({
            inviteCount: newInviteCount,
            invitees: newInvitees
        });
        
        // Add 100 VEVO bonus to current user
        const newBalance = (userData.balance || 0) + 100;
        await db.ref(`users/${currentUser.uid}`).update({ balance: newBalance });
        userData.balance = newBalance;
        updateUserUI();
        
        showNotification('Invite code applied successfully! You received 100 VEVO!', 'success');
        await loadUserData();
        return true;
    } catch (error) {
        console.error('Error applying invite code:', error);
        showNotification('Error applying code', 'error');
        return false;
    }
}

// ============================================
// Dashboard Content
// ============================================
function renderDashboard() {
    const inviteCount = userData?.inviteCount || 0;
    const inviteRewards = userData?.inviteRewards || 0;
    const promoCode = generatePromoCode(currentUser?.uid || '');
    
    return `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-coins"></i></div>
                <div class="stat-info">
                    <h3>VEVO Balance</h3>
                    <div class="stat-number">${userData?.balance || 0}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-users"></i></div>
                <div class="stat-info">
                    <h3>Friends Invited</h3>
                    <div class="stat-number">${inviteCount}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-gift"></i></div>
                <div class="stat-info">
                    <h3>Invite Rewards</h3>
                    <div class="stat-number">${inviteRewards} VEVO</div>
                </div>
            </div>
        </div>
        
        <h2 style="color: white; margin: 30px 0 20px 0;"><i class="fas fa-gamepad"></i> Available Games</h2>
        <div class="games-grid">
            <a href="game1.html" class="game-card">
                <div class="game-card-image"><i class="fas fa-sync-alt"></i></div>
                <div class="game-card-info">
                    <h3>Lucky Spin</h3>
                    <p>Spin the wheel and win up to 10x your bet!</p>
                    <button class="play-btn">Play Now →</button>
                </div>
            </a>
            <a href="Dice-dual.html" class="game-card">
                <div class="game-card-image"><i class="fas fa-dice"></i></div>
                <div class="game-card-info">
                    <h3>Dice Duel</h3>
                    <p>Predict over or under 50 for 1.95x payout!</p>
                    <button class="play-btn">Play Now →</button>
                </div>
            </a>
            <a href="Coin-clash.html" class="game-card">
                <div class="game-card-image"><i class="fas fa-coins"></i></div>
                <div class="game-card-info">
                    <h3>Coin Clash</h3>
                    <p>Heads or tails? Build your win streak!</p>
                    <button class="play-btn">Play Now →</button>
                </div>
            </a>
            <a href="Number-ninja.html" class="game-card">
                <div class="game-card-image"><i class="fas fa-calculator"></i></div>
                <div class="game-card-info">
                    <h3>Number Ninja</h3>
                    <p>Guess the number, closer = higher multiplier!</p>
                    <button class="play-btn">Play Now →</button>
                </div>
            </a>
            <a href="Card-clash.html" class="game-card">
                <div class="game-card-image"><i class="fas fa-club"></i></div>
                <div class="game-card-info">
                    <h3>Card Clash</h3>
                    <p>Beat the dealer in this Blackjack-style game!</p>
                    <button class="play-btn">Play Now →</button>
                </div>
            </a>
            <a href="Royal.html" class="game-card">
                <div class="game-card-image"><i class="fas fa-circle"></i></div>
                <div class="game-card-info">
                    <h3>Roulette Royale</h3>
                    <p>Classic European roulette with multiple bets!</p>
                    <button class="play-btn">Play Now →</button>
                </div>
            </a>
            <a href="solt-main.html" class="game-card">
                <div class="game-card-image"><i class="fas fa-slot-machine"></i></div>
                <div class="game-card-info">
                    <h3>Slot Mania</h3>
                    <p>3-reel slots with progressive jackpot!</p>
                    <button class="play-btn">Play Now →</button>
                </div>
            </a>
        </div>
        
        <div class="invite-section" style="background: rgba(255,255,255,0.1); border-radius: 15px; padding: 20px; margin-top: 30px;">
            <h3 style="color: white;"><i class="fas fa-user-plus"></i> Invite Friends & Earn!</h3>
            <p style="color: white; margin: 10px 0;">Share your promo code: <strong style="color: #ffd700;">${promoCode}</strong></p>
            <p style="color: white; font-size: 14px;">For every 5 friends who join using your code, you get 10 VEVO tokens!</p>
            <button class="play-btn" onclick="window.location.href='refferal.html'" style="margin-top: 10px;"><i class="fas fa-share-alt"></i> Invite Friends</button>
        </div>
    `;
}

function renderGamesPage() {
    return `
        <h2 style="color: white; margin-bottom: 20px;"><i class="fas fa-gamepad"></i> All Games</h2>
        <div class="games-grid">
            <a href="game1.html" class="game-card">
                <div class="game-card-image"><i class="fas fa-sync-alt"></i></div>
                <div class="game-card-info"><h3>Lucky Spin</h3><p>Spin the wheel, win up to 10x!</p><button class="play-btn">Play</button></div>
            </a>
            <a href="Dice-dual.html" class="game-card">
                <div class="game-card-image"><i class="fas fa-dice"></i></div>
                <div class="game-card-info"><h3>Dice Duel</h3><p>Over/Under 50 - 1.95x payout</p><button class="play-btn">Play</button></div>
            </a>
            <a href="Coin-clash.html" class="game-card">
                <div class="game-card-image"><i class="fas fa-coins"></i></div>
                <div class="game-card-info"><h3>Coin Clash</h3><p>Heads or Tails with streak bonus</p><button class="play-btn">Play</button></div>
            </a>
            <a href="Number-ninja.html" class="game-card">
                <div class="game-card-image"><i class="fas fa-calculator"></i></div>
                <div class="game-card-info"><h3>Number Ninja</h3><p>Guess the number, up to 10x!</p><button class="play-btn">Play</button></div>
            </a>
            <a href="Card-clash.html" class="game-card">
                <div class="game-card-image"><i class="fas fa-club"></i></div>
                <div class="game-card-info"><h3>Card Clash</h3><p>Blackjack-style card game</p><button class="play-btn">Play</button></div>
            </a>
            <a href="Royal.html" class="game-card">
                <div class="game-card-image"><i class="fas fa-circle"></i></div>
                <div class="game-card-info"><h3>Roulette Royale</h3><p>European roulette, multiple bets</p><button class="play-btn">Play</button></div>
            </a>
            <a href="solt-main.html" class="game-card">
                <div class="game-card-image"><i class="fas fa-slot-machine"></i></div>
                <div class="game-card-info"><h3>Slot Mania</h3><p>3-reel slots + progressive jackpot!</p><button class="play-btn">Play</button></div>
            </a>
        </div>
    `;
}

function renderDepositPage() {
    return `
        <div style="background: white; border-radius: 20px; padding: 30px;">
            <h2><i class="fas fa-money-bill-wave"></i> Deposit Funds</h2>
            <p style="color: #666; margin: 10px 0 20px 0;">Send payment to any of our accounts and submit your screenshot</p>
            
            <div class="payment-details" style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
                <h3>Payment Methods:</h3>
                <div><strong>📱 M-Pesa:</strong> 0725032395 (Abenezer Shigute)</div>
                <div><strong>📱 TeleBirr:</strong> 0940980555 (Tenaye Hutalo)</div>
                <div><strong>🏦 CBE Birr:</strong> 0940980555</div>
                <div><strong>🏦 CBE Bank:</strong> 1000612391754</div>
                <div><strong>💎 TRC20 (USDT):</strong> TWym3qg8TUNTyutMxvPpnatjeWs8C7jsLY</div>
                <div style="margin-top: 15px;"><strong>Exchange Rate:</strong> 1 Birr = 1 VEVO | 1 USDT = 157 VEVO</div>
            </div>
            
            <div class="deposit-form">
                <label style="display: block; margin-bottom: 8px; font-weight: bold;">Amount:</label>
                <input type="number" id="depositAmountPage" placeholder="Enter amount" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 15px;">
                
                <label style="display: block; margin-bottom: 8px; font-weight: bold;">Currency:</label>
                <select id="depositCurrencyPage" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 15px;">
                    <option value="BIRR">Birr (ETB) - 1:1</option>
                    <option value="USDT">USDT - 1 USDT = 157 VEVO</option>
                </select>
                
                <label style="display: block; margin-bottom: 8px; font-weight: bold;">Payment Screenshot:</label>
                <input type="file" id="depositScreenshotPage" accept="image/*" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px;">
                
                <button onclick="submitDepositFromPage()" style="width: 100%; background: linear-gradient(135deg, #48bb78, #38a169); color: white; padding: 14px; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer;">Submit Deposit Request</button>
            </div>
        </div>
    `;
}

async function submitDepositFromPage() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        showModal(loginModal);
        return;
    }
    
    const amount = document.getElementById('depositAmountPage').value;
    const currency = document.getElementById('depositCurrencyPage').value;
    const screenshot = document.getElementById('depositScreenshotPage').files[0];
    
    if (!amount || amount <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return;
    }
    
    if (!screenshot) {
        showNotification('Please upload a screenshot of payment', 'error');
        return;
    }
    
    let vevoAmount = 0;
    if (currency === 'BIRR') {
        vevoAmount = parseInt(amount);
    } else {
        vevoAmount = parseInt(amount) * 157;
    }
    
    const reader = new FileReader();
    reader.onloadend = async function() {
        const depositRequest = {
            id: Date.now(),
            userId: currentUser.uid,
            userName: userData.name,
            userEmail: currentUser.email,
            amount: parseFloat(amount),
            currency: currency,
            vevoAmount: vevoAmount,
            screenshot: reader.result,
            status: 'pending',
            createdAt: Date.now()
        };
        
        try {
            await db.ref(`deposits/${depositRequest.id}`).set(depositRequest);
            showNotification('Deposit request submitted! Waiting for admin approval.', 'success');
            document.getElementById('depositAmountPage').value = '';
            document.getElementById('depositScreenshotPage').value = '';
            loadPage('deposit');
        } catch (error) {
            console.error('Error submitting deposit:', error);
            showNotification('Error submitting deposit', 'error');
        }
    };
    reader.readAsDataURL(screenshot);
}

function renderWithdrawPage() {
    return `
        <div style="background: white; border-radius: 20px; padding: 30px;">
            <h2><i class="fas fa-hand-holding-usd"></i> Withdraw Funds</h2>
            <p style="color: #666; margin: 10px 0 20px 0;">Withdraw your VEVO tokens to your preferred payment method</p>
            
            <div class="withdraw-form">
                <label style="display: block; margin-bottom: 8px; font-weight: bold;">4-Digit Security Code:</label>
                <input type="password" id="withdrawCodePage" maxlength="4" placeholder="Enter your 4-digit code" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 15px;">
                
                <label style="display: block; margin-bottom: 8px; font-weight: bold;">Withdrawal Method:</label>
                <select id="withdrawMethodPage" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 15px;">
                    <option value="TeleBirr">📱 TeleBirr</option>
                    <option value="M-Pesa">📱 M-Pesa</option>
                    <option value="CBE">🏦 CBE Bank</option>
                </select>
                
                <label style="display: block; margin-bottom: 8px; font-weight: bold;">Account Number / Phone:</label>
                <input type="text" id="withdrawAccountPage" placeholder="Enter your account number" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 15px;">
                
                <label style="display: block; margin-bottom: 8px; font-weight: bold;">Amount (VEVO):</label>
                <input type="number" id="withdrawAmountPage" placeholder="Enter amount" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px;">
                
                <div style="background: #f0f0f0; padding: 10px; border-radius: 8px; margin-bottom: 20px;">
                    <strong>Available Balance:</strong> ${userData?.balance || 0} VEVO
                </div>
                
                <button onclick="submitWithdrawFromPage()" style="width: 100%; background: linear-gradient(135deg, #ff6b6b, #ff4757); color: white; padding: 14px; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer;">Request Withdrawal</button>
                
                <p style="font-size: 12px; color: #999; margin-top: 15px; text-align: center;">
                    <i class="fas fa-info-circle"></i> If you forgot your code, contact admin to reset it.
                </p>
            </div>
        </div>
    `;
}

async function submitWithdrawFromPage() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        showModal(loginModal);
        return;
    }
    
    const withdrawCode = document.getElementById('withdrawCodePage').value;
    const method = document.getElementById('withdrawMethodPage').value;
    const account = document.getElementById('withdrawAccountPage').value;
    const amount = parseInt(document.getElementById('withdrawAmountPage').value);
    
    if (!withdrawCode || withdrawCode.length !== 4) {
        showNotification('Please enter a valid 4-digit withdrawal code', 'error');
        return;
    }
    
    if (!account) {
        showNotification('Please enter account number', 'error');
        return;
    }
    
    if (!amount || amount <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return;
    }
    
    if (amount > (userData?.balance || 0)) {
        showNotification('Insufficient balance', 'error');
        return;
    }
    
    if (userData?.withdrawCode !== withdrawCode) {
        showNotification('Invalid withdrawal code', 'error');
        return;
    }
    
    const withdrawRequest = {
        id: Date.now(),
        userId: currentUser.uid,
        userName: userData.name,
        userEmail: currentUser.email,
        amount: amount,
        method: method,
        account: account,
        status: 'pending',
        createdAt: Date.now()
    };
    
    try {
        await db.ref(`withdraws/${withdrawRequest.id}`).set(withdrawRequest);
        showNotification('Withdrawal request submitted! Waiting for admin approval.', 'success');
        document.getElementById('withdrawAmountPage').value = '';
        document.getElementById('withdrawAccountPage').value = '';
        document.getElementById('withdrawCodePage').value = '';
        loadPage('withdraw');
    } catch (error) {
        console.error('Error submitting withdrawal:', error);
        showNotification('Error submitting withdrawal', 'error');
    }
}

function renderInvitePage() {
    const promoCode = generatePromoCode(currentUser?.uid || '');
    return `
        <div style="background: white; border-radius: 20px; padding: 30px; text-align: center;">
            <i class="fas fa-user-plus" style="font-size: 60px; color: #48bb78; margin-bottom: 20px;"></i>
            <h2>Invite Friends & Earn Rewards!</h2>
            <p style="color: #666; margin: 10px 0;">Share your unique promo code with friends. When they sign up, you earn rewards!</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 15px; margin: 25px 0;">
                <h3 style="color: #333;">Your Promo Code:</h3>
                <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 2px; margin: 15px 0;">${promoCode}</div>
                <button onclick="copyPromoCode()" style="background: linear-gradient(135deg, #48bb78, #38a169); color: white; padding: 10px 30px; border: none; border-radius: 25px; cursor: pointer;"><i class="fas fa-copy"></i> Copy Code</button>
            </div>
            
            <div class="invite-stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0;">
                <div style="background: #f0f0f0; padding: 15px; border-radius: 10px;">
                    <div style="font-size: 28px; font-weight: bold; color: #667eea;">${userData?.inviteCount || 0}</div>
                    <div style="color: #666;">Friends Invited</div>
                </div>
                <div style="background: #f0f0f0; padding: 15px; border-radius: 10px;">
                    <div style="font-size: 28px; font-weight: bold; color: #ffd700;">${userData?.inviteRewards || 0}</div>
                    <div style="color: #666;">Rewards Earned</div>
                </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #ffd700, #ff8c00); border-radius: 10px; padding: 15px;">
                <h3 style="color: #2c3e50;">🎁 Reward System</h3>
                <p style="color: #2c3e50;">For every 5 friends you invite, you get <strong>10 VEVO Tokens</strong>!</p>
                <p style="color: #2c3e50; font-size: 14px; margin-top: 5px;">Your friends also get 100 VEVO on signup!</p>
            </div>
        </div>
    `;
}

function renderSettingsPage() {
    return `
        <div style="background: white; border-radius: 20px; padding: 30px;">
            <h2><i class="fas fa-cog"></i> Account Settings</h2>
            
            <div class="settings-section">
                <h3>Withdrawal Security Code</h3>
                <p>Set a 4-digit code for withdrawals. This code is required every time you withdraw funds.</p>
                <div style="margin-top: 15px;">
                    <input type="password" id="settingsWithdrawCodePage" maxlength="4" placeholder="Enter 4-digit code" style="padding: 10px; border: 1px solid #ddd; border-radius: 8px; width: 200px;">
                    <button onclick="saveSettingsCode()" style="background: #48bb78; color: white; padding: 10px 20px; border: none; border-radius: 8px; margin-left: 10px; cursor: pointer;">Save Code</button>
                </div>
                ${userData?.withdrawCode ? '<p style="color: green; margin-top: 10px;"><i class="fas fa-check-circle"></i> Withdrawal code is set</p>' : '<p style="color: red; margin-top: 10px;"><i class="fas fa-exclamation-triangle"></i> No withdrawal code set. Please set one to withdraw funds.</p>'}
            </div>
            
            <div class="settings-section">
                <h3>Account Information</h3>
                <p><strong>Name:</strong> ${userData?.name || 'Not set'}</p>
                <p><strong>Email:</strong> ${currentUser?.email || 'Not set'}</p>
                <p><strong>Member Since:</strong> ${userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Total Invited:</strong> ${userData?.inviteCount || 0}</p>
                <p><strong>Invite Rewards:</strong> ${userData?.inviteRewards || 0} VEVO</p>
            </div>
        </div>
    `;
}

async function saveSettingsCode() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    const newCode = document.getElementById('settingsWithdrawCodePage').value;
    
    if (!newCode || newCode.length !== 4 || isNaN(newCode)) {
        showNotification('Please enter a valid 4-digit code (numbers only)', 'error');
        return;
    }
    
    try {
        await db.ref(`users/${currentUser.uid}`).update({ withdrawCode: newCode });
        userData.withdrawCode = newCode;
        showNotification('Withdrawal code saved successfully!', 'success');
        loadPage('settings');
    } catch (error) {
        console.error('Error saving withdrawal code:', error);
        showNotification('Error saving code', 'error');
    }
}

// ============================================
// Page Loading
// ============================================
async function loadPage(page) {
    currentPage = page;
    
    // Update active nav item
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.dataset.page === page) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Render page content
    if (!currentUser) {
        if (page === 'dashboard') {
            const pageContent = document.getElementById('pageContent');
            if (pageContent) {
                pageContent.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px;">
                        <i class="fas fa-user-lock" style="font-size: 80px; color: white; margin-bottom: 20px;"></i>
                        <h2 style="color: white;">Welcome to VEVOBet!</h2>
                        <p style="color: white; margin: 20px 0;">Please login or register to start playing and winning!</p>
                        <button onclick="showModal(loginModal)" style="background: #ffd700; color: #1a1a2e; padding: 12px 30px; border: none; border-radius: 25px; font-size: 16px; font-weight: bold; cursor: pointer;">Login / Register</button>
                    </div>
                `;
            }
        } else {
            const pageContent = document.getElementById('pageContent');
            if (pageContent) {
                pageContent.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px;">
                        <i class="fas fa-sign-in-alt" style="font-size: 80px; color: white; margin-bottom: 20px;"></i>
                        <h2 style="color: white;">Please Login First</h2>
                        <p style="color: white; margin: 20px 0;">You need to be logged in to access this page.</p>
                        <button onclick="showModal(loginModal)" style="background: #ffd700; color: #1a1a2e; padding: 12px 30px; border: none; border-radius: 25px; font-size: 16px; font-weight: bold; cursor: pointer;">Login / Register</button>
                    </div>
                `;
            }
        }
        return;
    }
    
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) return;
    
    switch(page) {
        case 'dashboard':
            pageContent.innerHTML = renderDashboard();
            break;
        case 'games':
            pageContent.innerHTML = renderGamesPage();
            break;
        case 'deposit':
            pageContent.innerHTML = renderDepositPage();
            break;
        case 'withdraw':
            pageContent.innerHTML = renderWithdrawPage();
            break;
        case 'invite':
            pageContent.innerHTML = renderInvitePage();
            break;
        case 'settings':
            pageContent.innerHTML = renderSettingsPage();
            break;
        default:
            pageContent.innerHTML = renderDashboard();
    }
}

// ============================================
// Modal Functions
// ============================================
function showModal(modal) {
    if (modal) modal.style.display = 'block';
}

function hideModal(modal) {
    if (modal) modal.style.display = 'none';
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

// ============================================
// Event Listeners
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (page) {
                loadPage(page);
            }
        });
    });
    
    // Auth form
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('authName').value;
            const email = document.getElementById('authEmail').value;
            const password = document.getElementById('authPassword').value;
            await handleAuth(email, password, name);
        });
    }
    
    // Deposit modal
    const submitDepositBtn = document.getElementById('submitDepositBtn');
    if (submitDepositBtn) {
        submitDepositBtn.addEventListener('click', submitDeposit);
    }
    
    // Withdraw modal
    const submitWithdrawBtn = document.getElementById('submitWithdrawBtn');
    if (submitWithdrawBtn) {
        submitWithdrawBtn.addEventListener('click', submitWithdraw);
    }
    
    // Settings modal
    const saveWithdrawCodeBtn = document.getElementById('saveWithdrawCodeBtn');
    if (saveWithdrawCodeBtn) {
        saveWithdrawCodeBtn.addEventListener('click', saveWithdrawCode);
    }
    
    // Copy promo code
    const copyPromoBtn = document.getElementById('copyPromoBtn');
    if (copyPromoBtn) {
        copyPromoBtn.addEventListener('click', copyPromoCode);
    }
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtnSidebar');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Close modals
    const closeModals = document.querySelectorAll('.close-modal');
    closeModals.forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeAllModals();
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModal(e.target);
        }
    });
});

// ============================================
// Auth State Listener
// ============================================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData();
        loadPage(currentPage);
    } else {
        currentUser = null;
        userData = null;
        updateUserUI();
        loadPage(currentPage);
    }
});

// ============================================
// Export functions for global use
// ============================================
window.showModal = showModal;
window.hideModal = hideModal;
window.copyPromoCode = copyPromoCode;
window.loadInviteInfo = loadInviteInfo;
window.applyInviteCode = applyInviteCode;
window.submitDepositFromPage = submitDepositFromPage;
window.submitWithdrawFromPage = submitWithdrawFromPage;
window.saveSettingsCode = saveSettingsCode;
window.loadPage = loadPage;
window.logout = logout;
window.showNotification = showNotification;
