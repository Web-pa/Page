document.addEventListener("DOMContentLoaded", () => {

  // ===== GLOBAL DEMO USER =====
  let demoUser = JSON.parse(localStorage.getItem("demoUser"));
  if (!demoUser) {
    demoUser = {
      fullName: "Charles Williams",
      email: "Charlesweahh@gmail.com",
      phone: "+1 510 367 1796",
      password: "1346000",
      emailNotif: true,
      smsNotif: false
    };
    localStorage.setItem("demoUser", JSON.stringify(demoUser));
  }

  // ===== INITIAL TRANSACTIONS =====
  let savedTransactions = JSON.parse(localStorage.getItem("transactions")) || [];
  if (!savedTransactions.length) {
    savedTransactions = [
      { type: "expense", text: "Netflix — Entertainment", amount: "$150", date: "2026-01-05" },
      { type: "income", text: "Salary — Deposit", amount: "$69000", date: "2026-01-09" }
    ];
    localStorage.setItem("transactions", JSON.stringify(savedTransactions));
  }

  // ===== TOTAL BALANCE =====
  const balanceEl = document.querySelector(".balance");
  let totalBalance = parseFloat(localStorage.getItem("totalBalance"));
  if (!totalBalance) totalBalance = balanceEl ? parseFloat(balanceEl.textContent.replace(/[$,]/g, "")) : 0;
  if (balanceEl) balanceEl.textContent = "$" + totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ===== LOGIN FORM =====
  const loginForm = document.getElementById("login-form");
  const messageEl = document.getElementById("login-message");
  if (loginForm) {
    loginForm.addEventListener("submit", e => {
      e.preventDefault();
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value;

      if (!username || !password) {
        messageEl.style.color = "red";
        messageEl.textContent = "Please enter both username and password.";
        return;
      }

      messageEl.style.color = "blue";
      messageEl.textContent = "Checking credentials...";

      setTimeout(() => {
        if (username === demoUser.fullName && password === demoUser.password) {
          localStorage.setItem("loggedIn", "true");
          messageEl.style.color = "green";
          messageEl.textContent = "Login successful! Redirecting...";
          setTimeout(() => window.location.href = "dashboard.html", 500);
        } else {
          messageEl.style.color = "red";
          messageEl.textContent = "Invalid username or password.";
        }
      }, 500);
    });
  }

  // ===== AUTO REDIRECT IF LOGGED IN =====
  if (localStorage.getItem("loggedIn") && window.location.pathname.endsWith("index.html")) {
    window.location.href = "dashboard.html";
  }

  // ===== DASHBOARD ELEMENTS =====
  const sendForm = document.getElementById("send-money-form");
  const toggleTransferBtn = document.getElementById("toggle-transfer-btn");
  const transactionsList = document.querySelector(".transactions-card ul");

  // Render Transactions
  if (transactionsList) {
    transactionsList.innerHTML = "";
    savedTransactions.forEach(tx => {
      const li = document.createElement("li");
      li.classList.add(tx.type);
      li.innerHTML = `<span>${tx.text}</span><span>${tx.amount}</span>`;
      transactionsList.insertBefore(li, transactionsList.firstChild);
    });
  }

  // ===== CHART =====
  try {
    const spendingCanvas = document.getElementById("spendingChart");
    if (spendingCanvas) {
      const ctx = spendingCanvas.getContext("2d");
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      let monthlyExpenses = Array(12).fill(0);
      let monthlyIncome = Array(12).fill(0);

      savedTransactions.forEach(tx => {
        try {
          const txDate = tx.date ? new Date(tx.date) : new Date();
          const monthIndex = txDate.getMonth();
          const amountValue = parseFloat(tx.amount.replace(/[-$,]/g,""));
          if (tx.type === "expense" && !isNaN(amountValue)) monthlyExpenses[monthIndex] += amountValue;
          if (tx.type === "income" && !isNaN(amountValue)) monthlyIncome[monthIndex] += amountValue;
        } catch(e) { console.warn("Skipping invalid transaction:", tx); }
      });

      new Chart(ctx, {
        type: "bar",
        data: {
          labels: months,
          datasets: [
            { label: "Expenses", data: monthlyExpenses, backgroundColor: "rgba(217, 69, 69, 0.7)", borderRadius: 6 },
            { label: "Income", data: monthlyIncome, backgroundColor: "rgba(26, 154, 58, 0.7)", borderRadius: 6 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "top" }, tooltip: { mode: "index", intersect: false } },
          scales: { x: { stacked: false }, y: { stacked: false, beginAtZero: true, ticks: { callback: v => "$" + v.toLocaleString() } } }
        }
      });
    }
  } catch(e) { console.error("Chart error:", e); }

  // ===== LOGOUT =====
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("loggedIn");
    window.location.href = "index.html";
  });

  // ===== PASSWORD CHANGE =====
  const passwordForm = document.getElementById("password-form");
  if (passwordForm) {
    const passwordMessage = document.getElementById("password-message");
    passwordForm.addEventListener("submit", e => {
      e.preventDefault();
      const current = document.getElementById("currentPassword").value;
      const newP = document.getElementById("newPassword").value;
      const confirmP = document.getElementById("confirmPassword").value;

      if (current !== demoUser.password) {
        passwordMessage.textContent = "Current password is incorrect!";
        passwordMessage.className = "error";
        return;
      }
      if (newP.length < 6) {
        passwordMessage.textContent = "New password must be at least 6 characters!";
        passwordMessage.className = "error";
        return;
      }
      if (newP !== confirmP) {
        passwordMessage.textContent = "New passwords do not match!";
        passwordMessage.className = "error";
        return;
      }

      demoUser.password = newP;
      localStorage.setItem("demoUser", JSON.stringify(demoUser));
      passwordMessage.textContent = "Password changed successfully ✔";
      passwordMessage.className = "success";

      passwordForm.reset();
    });
  }

  // ===== TOGGLE TRANSFER FORM =====
  if (toggleTransferBtn && sendForm) {
    toggleTransferBtn.addEventListener("click", () => {
      sendForm.style.display = sendForm.style.display === "block" ? "none" : "block";
      toggleTransferBtn.textContent = sendForm.style.display === "block" ? "Hide Transfer Form" : "Transfer Funds";
    });
}
  
  // ===== PIN MODAL & SEND MONEY =====
  const pinModal = document.createElement("div");
  pinModal.id = "pinModal";
  pinModal.style.cssText = "display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;justify-content:center;align-items:center;font-family:Arial,sans-serif;";
  pinModal.innerHTML = `
    <div style="background:#fff;padding:25px 30px;border-radius:15px;width:320px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.2);">
      <h3 style="margin-bottom:15px;color:#333;">Enter Transfer PIN</h3>
      <p style="color:#666;font-size:14px;margin-bottom:15px;">For security, enter your 4-digit transfer PIN.</p>
      <input type="password" id="transferPin" placeholder="••••" style="width:80%;padding:10px;font-size:16px;border-radius:8px;border:1px solid #ccc;text-align:center;letter-spacing:5px;">
      <div style="margin-top:20px;">
        <button id="confirmPinBtn" style="padding:8px 20px;background:#007bff;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;">Confirm</button>
        <button id="cancelPinBtn" style="padding:8px 20px;background:#ccc;color:#333;border:none;border-radius:8px;cursor:pointer;font-size:14px;margin-left:10px;">Cancel</button>
      </div>
      <div id="pinMessage" style="color:red;margin-top:10px;font-size:13px;"></div>
    </div>
  `;
  document.body.appendChild(pinModal);

  const pinInput = document.getElementById("transferPin");
  const pinMessage = document.getElementById("pinMessage");
  const confirmBtn = document.getElementById("confirmPinBtn");
  const cancelBtn = document.getElementById("cancelPinBtn");
  const correctPin = "2027";
  if (cancelBtn) cancelBtn.onclick = () => pinModal.style.display = "none";

  const accountInput = document.getElementById("account");
  const amountInput = document.getElementById("amount");
  const recipientInput = document.getElementById("recipient");
  const bankSelect = document.getElementById("bank");
  const noteInput = document.getElementById("note");
  const sendBtn = document.getElementById("send-btn");
  const maxAttempts = 3;

  if (sendForm) {
    sendForm.addEventListener("submit", e => {
      e.preventDefault();
      const amount = parseFloat(amountInput.value);
      const recipient = recipientInput.value.trim();
      const bank = bankSelect.value;
      const account = accountInput.value.trim();
      const note = noteInput.value.trim();

      if (!bank || !recipient || !account || isNaN(amount) || amount <= 0 || amount > totalBalance) return;

      pinModal.style.display = "flex";
      pinInput.value = "";
      pinMessage.textContent = "";
      pinInput.focus();
      let attemptsLeft = maxAttempts;

      confirmBtn.onclick = () => {
        const enteredPin = pinInput.value.trim();
        if (enteredPin !== correctPin) {
          attemptsLeft--;
          pinMessage.textContent = attemptsLeft > 0 
            ? `Incorrect PIN. ${attemptsLeft} attempt(s) remaining.` 
            : "Maximum attempts reached. Try again later.";
          if (attemptsLeft <= 0) setTimeout(() => pinModal.style.display = "none", 1000);
          pinInput.value = "";
          pinInput.focus();
          return;
        }

        // Wells Fargo special case
        if (bank === "WEF" && account === "15623948807") {
          pinModal.style.display = "none";
          sendBtn.disabled = true;
          let dots = 0;
          sendBtn.textContent = "Processing";
          const loader = setInterval(() => { dots = (dots + 1) % 4; sendBtn.textContent = "Processing" + ".".repeat(dots); }, 400);
          setTimeout(() => { clearInterval(loader); sendForm.style.display = "none"; toggleTransferBtn.textContent = "Transfer Funds"; window.location.href = "error.html"; }, 4000);
          return;
        }

        // Normal transfer
        pinModal.style.display = "none";
        sendBtn.disabled = true;
        const originalText = sendBtn.textContent;
        let dots = 0;
        sendBtn.textContent = "Processing";
        const loader = setInterval(() => { dots = (dots + 1) % 4; sendBtn.textContent = "Processing" + ".".repeat(dots); }, 400);

        setTimeout(() => {
          clearInterval(loader);
          totalBalance -= amount;
          balanceEl.textContent = "$" + totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

          const txText = `Transfer to ${recipient} (${bank})${note ? " — " + note : ""}`;
          const tx = { type: "expense", text: txText, amount: "-$" + amount.toLocaleString(), date: new Date().toISOString().split("T")[0] };
          savedTransactions.unshift(tx);
          localStorage.setItem("totalBalance", totalBalance);
          localStorage.setItem("transactions", JSON.stringify(savedTransactions));

          const li = document.createElement("li");
          li.classList.add("expense");
          li.innerHTML = `<span>${tx.text}</span><span>${tx.amount}</span>`;
          transactionsList.insertBefore(li, transactionsList.firstChild);

          // Receipt
          document.getElementById("r-id").textContent = "TXN-" + Math.floor(Math.random() * 100000000);
          document.getElementById("r-name").textContent = recipient;
          document.getElementById("r-amount").textContent = "$" + amount.toLocaleString();
          document.getElementById("r-date").textContent = new Date().toLocaleString();
          document.getElementById("success-modal").style.display = "flex";

          sendForm.reset();
          sendBtn.disabled = false;
          sendBtn.textContent = originalText;
          sendForm.style.display = "none";
          toggleTransferBtn.textContent = "Transfer Funds";

        }, 4000);
      };
    });
  }

  // ===== Quick buttons & cards =====
const quickBtns = document.querySelectorAll('.quick-btn');
const payBillCard = document.querySelector('.pay-bill-card');
const requestMoneyCard = document.querySelector('.request-money-card');

// Hide forms initially
if (payBillCard) payBillCard.style.display = 'none';
if (requestMoneyCard) requestMoneyCard.style.display = 'none';

quickBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;

    // Pay Bill button
    if (action === 'pay-bill') {
      payBillCard.style.display = payBillCard.style.display === 'block' ? 'none' : 'block';
      requestMoneyCard.style.display = 'none';

      // Scroll smoothly if now visible
      if (payBillCard.style.display === 'block') {
        payBillCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    // Request Money button
    if (action === 'request-money') {
      requestMoneyCard.style.display = requestMoneyCard.style.display === 'block' ? 'none' : 'block';
      payBillCard.style.display = 'none';

      // Scroll smoothly if now visible
      if (requestMoneyCard.style.display === 'block') {
        requestMoneyCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    // Send Money button
    if (action === 'send-money') {
      sendForm.style.display = 'block';
      toggleTransferBtn.textContent = "Hide Transfer Form";
      sendForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // hide other cards
      payBillCard.style.display = 'none';
      requestMoneyCard.style.display = 'none';
    }
  });
});
  
  // ===== PAY BILL =====
  const payBillForm = document.getElementById("pay-bill-form");
  if (payBillForm && balanceEl && transactionsList) {
    payBillForm.addEventListener("submit", e => {
      e.preventDefault();
      const biller = document.getElementById("biller").value.trim();
      const amount = parseFloat(document.getElementById("bill-amount").value);
      if (!biller || isNaN(amount) || amount <= 0 || amount > totalBalance) return;

      totalBalance -= amount;
      localStorage.setItem("totalBalance", totalBalance);
      balanceEl.textContent = "$" + totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const tx = { type: "expense", text: `Bill Payment — ${biller}`, amount: `-$${amount.toLocaleString()}`, date: new Date().toISOString().split("T")[0] };
      savedTransactions.unshift(tx);
      localStorage.setItem("transactions", JSON.stringify(savedTransactions));

      const li = document.createElement("li");
      li.className = "expense";
      li.innerHTML = `<span>${tx.text}</span><span>${tx.amount}</span>`;
      transactionsList.insertBefore(li, transactionsList.firstChild);

      payBillForm.reset();
    });
  }

  // ===== REQUEST MONEY =====
  const requestMoneyForm = document.getElementById("request-money-form");
  if (requestMoneyForm && transactionsList) {
    requestMoneyForm.addEventListener("submit", e => {
      e.preventDefault();
      const name = document.getElementById("request-recipient").value.trim();
      const amount = parseFloat(document.getElementById("request-amount").value);
      if (!name || isNaN(amount) || amount <= 0) return;

      const tx = { type: "income", text: `Money Requested from ${name}`, amount: `$${amount.toLocaleString()}`, date: new Date().toISOString().split("T")[0] };
      savedTransactions.unshift(tx);
      localStorage.setItem("transactions", JSON.stringify(savedTransactions));

      const li = document.createElement("li");
      li.className = "income";
      li.innerHTML = `<span>${tx.text}</span><span>${tx.amount}</span>`;
      transactionsList.insertBefore(li, transactionsList.firstChild);

      requestMoneyForm.reset();
    });
  }

   // ===== PROFILE PANEL =====
const profileBtn = document.getElementById("profile-btn");
const profilePanel = document.getElementById("profile-panel");
const closeProfileBtn = document.getElementById("close-profile");
const editProfileBtn = document.getElementById("edit-profile");
const accountSettingsBtn = document.getElementById("account-settings");

if (profileBtn && profilePanel) {
  profileBtn.addEventListener("click", e => {
    e.stopPropagation();
    profilePanel.style.display = profilePanel.style.display === "block" ? "none" : "block";
  });
}

if (closeProfileBtn) closeProfileBtn.addEventListener("click", () => profilePanel.style.display = "none");

document.addEventListener("click", e => {
  if (profilePanel && profilePanel.style.display === "block" && !profilePanel.contains(e.target) && !profileBtn.contains(e.target)) {
    profilePanel.style.display = "none";
  }
});

if (editProfileBtn) editProfileBtn.addEventListener("click", () => window.location.href = "profile.html");
if (accountSettingsBtn) accountSettingsBtn.addEventListener("click", () => window.location.href = "account.html");

  // ===== BALANCE TOGGLE =====
  const balanceToggleBtn = document.getElementById("toggle-balance");
  const sensitiveBalances = document.querySelectorAll(".sensitive");
  let visible = true;
  const originalValues = Array.from(sensitiveBalances).map(el => el.textContent);

  if (balanceToggleBtn) {
    balanceToggleBtn.addEventListener("click", () => {
      sensitiveBalances.forEach((el, i) => {
        el.textContent = visible ? "••••••" : originalValues[i];
        el.classList.toggle("hidden", visible);
      });
      balanceToggleBtn.textContent = visible ? "👁‍🗨" : "👁";
      visible = !visible;
    });
  }

  // ===== DOWNLOAD RECEIPT =====
  const downloadBtn = document.getElementById("download-receipt-btn");
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      const receiptContent = document.getElementById("receipt").innerHTML;
      const blob = new Blob([receiptContent], { type: "text/html" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "receipt.html";
      link.click();
      URL.revokeObjectURL(link.href);
    };
  }
});
