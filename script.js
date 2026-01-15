// Cleaned and improved main app JS
// Notes:
// - Keeps demo/localStorage behavior for demo purposes.
// - In production, do NOT store passwords / PINs in localStorage in plaintext.

(function () {
  // Helper
  const $ = id => document.getElementById(id);
  const formatCurrency = (n) => "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const parseAmount = (v) => {
    if (v == null) return NaN;
    if (typeof v === "number") return v;
    try {
      return parseFloat(String(v).replace(/[^0-9.-]+/g, ""));
    } catch (e) { return NaN; }
  };

  // Redirect to login if trying to access dashboard while not logged in
  if (window.location.pathname.endsWith("dashboard.html") && !localStorage.getItem("loggedIn")) {
    window.location.href = "index.html";
    return;
  }

  document.addEventListener("DOMContentLoaded", () => {
    // ===== GLOBAL DEMO USER =====
    let demoUser = JSON.parse(localStorage.getItem("demoUser"));
    if (!demoUser) {
      demoUser = {
        fullName: "Charles Williams",
        email: "Charlesweahh@gmail.com",
        phone: "+1 510 367 1796",
        password: "1346000",
        transferPin: "1234",
        emailNotif: true,
        smsNotif: false
      };
      localStorage.setItem("demoUser", JSON.stringify(demoUser));
    }

    // ===== INITIAL TRANSACTIONS =====
    let savedTransactions = JSON.parse(localStorage.getItem("transactions")) || [];
    if (!Array.isArray(savedTransactions) || savedTransactions.length === 0) {
      savedTransactions = [
        { type: "expense", text: "Netflix — Entertainment", amount: "$150", date: "2026-01-05" },
        { type: "income", text: "Salary — Deposit", amount: "$69000", date: "2026-01-09" }
      ];
      localStorage.setItem("transactions", JSON.stringify(savedTransactions));
    }

    // ===== TOTAL BALANCE =====
    const balanceEl = document.querySelector(".balance");
    let totalBalance = parseFloat(localStorage.getItem("totalBalance"));
    if (isNaN(totalBalance)) {
      totalBalance = balanceEl ? parseAmount(balanceEl.textContent) || 0 : 0;
    }
    if (balanceEl) balanceEl.textContent = formatCurrency(totalBalance);

    // ===== LOGIN FORM =====
    const loginForm = $("login-form");
    const messageEl = $("login-message");
    if (loginForm) {
      loginForm.addEventListener("submit", e => {
        e.preventDefault();
        const username = $("username").value.trim();
        const password = $("password").value;

        if (!username || !password) {
          if (messageEl) {
            messageEl.style.color = "red";
            messageEl.textContent = "Please enter both username and password.";
          }
          return;
        }

        if (messageEl) {
          messageEl.style.color = "blue";
          messageEl.textContent = "Checking credentials...";
        }

        setTimeout(() => {
          if (username === demoUser.fullName && password === demoUser.password) {
            localStorage.setItem("loggedIn", "true");
            if (messageEl) {
              messageEl.style.color = "green";
              messageEl.textContent = "Login successful! Redirecting...";
            }
            setTimeout(() => window.location.href = "dashboard.html", 500);
          } else {
            if (messageEl) {
              messageEl.style.color = "red";
              messageEl.textContent = "Invalid username or password.";
            }
          }
        }, 500);
      });
    }

    // ===== AUTO REDIRECT IF ALREADY LOGGED IN =====
    if (localStorage.getItem("loggedIn") && window.location.pathname.endsWith("index.html")) {
      window.location.href = "dashboard.html";
      return;
    }

    // ===== DASHBOARD ELEMENTS =====
    const sendForm = $("send-money-form");
    const toggleTransferBtn = $("toggle-transfer-btn");
    const transactionsList = document.querySelector(".transactions-card ul");
    const payBillForm = $("pay-bill-form");
    const requestMoneyForm = $("request-money-form");
    const sendBtn = $("send-btn");

    // Render Transactions (safe: use textContent)
    function renderTransactions() {
      if (!transactionsList) return;
      transactionsList.innerHTML = "";
      savedTransactions.forEach(tx => {
        // Normalize amount into a number
        const amt = parseAmount(tx.amount);
        const li = document.createElement("li");
        if (tx.type) li.classList.add(tx.type);
        const left = document.createElement("span");
        left.textContent = tx.text || "";
        const right = document.createElement("span");
        // show negative sign for expense
        right.textContent = (tx.type === "expense" ? "-" : "") + formatCurrency(isNaN(amt) ? 0 : amt).replace(/^\$/, "");
        // Prepend "$"
        right.textContent = (tx.type === "expense" ? "-$" : "$") + (isNaN(amt) ? "0.00" : Number(amt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        li.appendChild(left);
        li.appendChild(right);
        transactionsList.insertBefore(li, transactionsList.firstChild);
      });
    }
    renderTransactions();

    // ===== CHART =====
    try {
      const spendingCanvas = $("spendingChart");
      if (spendingCanvas && window.Chart) {
        const ctx = spendingCanvas.getContext("2d");
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        let monthlyExpenses = Array(12).fill(0);
        let monthlyIncome = Array(12).fill(0);

        savedTransactions.forEach(tx => {
          try {
            const txDate = tx.date ? new Date(tx.date) : new Date();
            const monthIndex = txDate.getMonth();
            const amountValue = parseAmount(tx.amount);
            if (tx.type === "expense" && !isNaN(amountValue)) monthlyExpenses[monthIndex] += amountValue;
            if (tx.type === "income" && !isNaN(amountValue)) monthlyIncome[monthIndex] += amountValue;
          } catch (e) { console.warn("Skipping invalid transaction:", tx); }
        });

        // Keep previous chart instance if re-rendering? For simplicity we create a new one.
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
    const logoutBtn = $("logout-btn");
    if (logoutBtn) logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("loggedIn");
      window.location.href = "index.html";
    });

    // ===== PIN MODAL (created once) =====
    const pinModal = document.createElement("div");
    pinModal.id = "pinModal";
    pinModal.style.cssText = "display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;justify-content:center;align-items:center;font-family:Arial,sans-serif;";
    pinModal.innerHTML = `
      <div style="background:#fff;padding:25px 30px;border-radius:15px;width:320px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.2);">
        <h3 style="margin-bottom:15px;color:#333;">Enter PIN</h3>
        <p style="color:#666;font-size:14px;margin-bottom:15px;">For security, enter your 4-digit PIN.</p>
        <input type="password" id="transactionPin" placeholder="••••" style="width:80%;padding:10px;font-size:16px;border-radius:8px;border:1px solid #ccc;text-align:center;letter-spacing:5px;">
        <div style="margin-top:20px;">
          <button id="confirmPinBtn" style="padding:8px 20px;background:#007bff;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;">Confirm</button>
          <button id="cancelPinBtn" style="padding:8px 20px;background:#ccc;color:#333;border:none;border-radius:8px;cursor:pointer;font-size:14px;margin-left:10px;">Cancel</button>
        </div>
        <div id="pinMessage" style="color:red;margin-top:10px;font-size:13px;"></div>
      </div>
    `;
    document.body.appendChild(pinModal);

    const confirmPinBtn = $("confirmPinBtn");
    const cancelPinBtn = $("cancelPinBtn");
    const transactionPinInput = $("transactionPin");
    const pinMessage = $("pinMessage");
    const maxAttempts = 3;
    let attemptsLeft = maxAttempts;
    let pendingTransaction = null; // { action: "send"|"pay"|"request", details: {...} }

    function resetPinState() {
      attemptsLeft = maxAttempts;
      if (pinMessage) pinMessage.textContent = "";
      if (transactionPinInput) transactionPinInput.value = "";
      if (confirmPinBtn) confirmPinBtn.disabled = false;
    }

    function saveTransactionsAndBalance() {
      localStorage.setItem("transactions", JSON.stringify(savedTransactions));
      localStorage.setItem("totalBalance", String(totalBalance));
    }

    function processTransaction(type, text, amount, status = "completed") {
      const amtValue = Number(amount) || 0;
      if (type === "expense") totalBalance -= amtValue;
      if (type === "income") totalBalance += amtValue;

      // Prepend to savedTransactions as an object (keep original shape for demo)
      const txObj = {
        type: type,
        text: text,
        amount: amtValue, // store numeric amount
        date: new Date().toISOString().split('T')[0],
        status: status
      };
      savedTransactions.unshift(txObj);
      saveTransactionsAndBalance();

      // Update balance display
      if (balanceEl) balanceEl.textContent = formatCurrency(totalBalance);

      // Add to transaction list (safe DOM)
      if (transactionsList) {
        const li = document.createElement("li");
        li.classList.add(type);
        const left = document.createElement("span");
        left.textContent = text;
        const right = document.createElement("span");
        right.textContent = (type === "expense" ? "-$" : "$") + Number(amtValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        li.appendChild(left);
        li.appendChild(right);
        transactionsList.insertBefore(li, transactionsList.firstChild);
      }

      // Show success modal if present
      const successModal = $("success-modal");
      if (status === "completed" && successModal) {
        successModal.style.display = "flex";
        const rid = $("r-id"); if (rid) rid.textContent = Math.floor(Math.random() * 1000000);
        const rname = $("r-name"); if (rname) rname.textContent = text;
        const ramount = $("r-amount"); if (ramount) ramount.textContent = Number(amtValue).toFixed(2);
        const rdate = $("r-date"); if (rdate) rdate.textContent = new Date().toLocaleDateString();
      }
    }

    // ===== SEND MONEY =====
    if (sendForm) {
      sendForm.addEventListener("submit", e => {
        e.preventDefault();

        const bankEl = $("bank");
        const accountEl = $("account");
        const recipientEl = $("recipient");
        const amountEl = $("amount");
        const noteEl = $("note");

        if (!bankEl || !accountEl || !recipientEl || !amountEl) return alert("Form is missing fields.");

        const bank = bankEl.value;
        const account = accountEl.value.trim();
        const recipient = recipientEl.value.trim();
        const amount = parseAmount(amountEl.value);
        const note = noteEl ? noteEl.value.trim() : "";

        if (!bank || !account || !recipient || isNaN(amount) || amount <= 0) return alert("Fill all fields correctly.");
        if (amount > totalBalance) return alert("Insufficient funds.");

        // Wells Fargo special case
        if (bank === "WEF" && account === "15623948807") {
          if (sendBtn) sendBtn.disabled = true;
          let dots = 0;
          if (sendBtn) sendBtn.textContent = "Processing";
          const loader = setInterval(() => {
            dots = (dots + 1) % 4;
            if (sendBtn) sendBtn.textContent = "Processing" + ".".repeat(dots);
          }, 400);
          setTimeout(() => {
            clearInterval(loader);
            if (sendForm) sendForm.style.display = "none";
            if (toggleTransferBtn) toggleTransferBtn.textContent = "Transfer Funds";
            window.location.href = "error.html";
          }, 4000);
          return;
        }

        // Store pending transaction and open PIN modal
        pendingTransaction = {
          action: "send",
          details: { bank, account, recipient, amount, note }
        };

        if (pinModal) {
          pinModal.style.display = "flex";
          if (transactionPinInput) transactionPinInput.value = "";
          if (pinMessage) pinMessage.textContent = "";
          attemptsLeft = maxAttempts;
        }
      });
    }

    // ===== PAY BILL =====
    if (payBillForm) {
      payBillForm.addEventListener("submit", e => {
        e.preventDefault();
        const billerEl = $("biller");
        const billAmountEl = $("bill-amount");
        if (!billerEl || !billAmountEl) return alert("Form missing fields.");
        const billText = billerEl.value.trim();
        const billAmount = parseAmount(billAmountEl.value);
        if (!billText || isNaN(billAmount) || billAmount <= 0) return alert("Fill all fields correctly.");
        if (billAmount > totalBalance) return alert("Insufficient funds.");

        pendingTransaction = { action: "pay", details: { billText, billAmount } };
        if (pinModal) {
          pinModal.style.display = "flex";
          if (transactionPinInput) transactionPinInput.value = "";
          if (pinMessage) pinMessage.textContent = "";
          attemptsLeft = maxAttempts;
        }
      });
    }

    // ===== REQUEST MONEY =====
    if (requestMoneyForm) {
      requestMoneyForm.addEventListener("submit", e => {
        e.preventDefault();
        const recipientEl = $("request-recipient");
        const amountEl = $("request-amount");
        if (!recipientEl || !amountEl) return alert("Form missing fields.");
        const recipient = recipientEl.value.trim();
        const amount = parseAmount(amountEl.value);
        if (!recipient || isNaN(amount) || amount <= 0) return alert("Fill all fields correctly.");

        pendingTransaction = { action: "request", details: { recipient, amount } };
        if (pinModal) {
          pinModal.style.display = "flex";
          if (transactionPinInput) transactionPinInput.value = "";
          if (pinMessage) pinMessage.textContent = "";
          attemptsLeft = maxAttempts;
        }
      });
    }

     // ===== PIN CONFIRM =====
    if (confirmPinBtn) {
    confirmPinBtn.addEventListener("click", () => {
    if (!transactionPinInput) return;

    // ===== PIN VALIDATION =====
    if (transactionPinInput.value !== demoUser.transferPin) {
      attemptsLeft--;
      if (pinMessage) pinMessage.textContent = attemptsLeft > 0 ? `Incorrect PIN. ${attemptsLeft} attempt(s) remaining.` : "Maximum attempts reached!";
      transactionPinInput.value = "";
      if (attemptsLeft <= 0) {
        confirmPinBtn.disabled = true;
        setTimeout(() => resetPinState(), 5000);
        setTimeout(() => { if (pinModal) pinModal.style.display = "none"; }, 1000);
      }
      return;
    }

    // PIN correct: hide PIN modal immediately
    if (pinModal) pinModal.style.display = "none";

    if (!pendingTransaction) {
      if (pinMessage) pinMessage.textContent = "No pending transaction.";
      return;
    }

    const { action, details } = pendingTransaction;

    // Determine which button triggers processing
    let targetBtn = null;
    if (action === "send") targetBtn = sendBtn;
    else if (action === "pay") targetBtn = payBillForm ? payBillForm.querySelector("button[type='submit']") : null;
    else if (action === "request") targetBtn = requestMoneyForm ? requestMoneyForm.querySelector("button[type='submit']") : null;

    // Start processing animation
    if (targetBtn) {
      targetBtn.disabled = true;
      let dots = 0;
      const loader = setInterval(() => {
        dots = (dots + 1) % 4;
        targetBtn.textContent = "Processing" + ".".repeat(dots);
      }, 400);

      setTimeout(() => {
        clearInterval(loader);
        targetBtn.disabled = false;

        // ===== PERFORM TRANSACTION =====
        if (action === "send") {
          const { bank, recipient, amount, note } = details;
          processTransaction(
            "expense",
            `Transfer to ${recipient} (${bank})${note ? " — " + note : ""}`,
            amount,
            "completed"
          );
          if (sendForm) sendForm.reset();
          if (toggleTransferBtn) toggleTransferBtn.textContent = "Transfer Funds";
        } else if (action === "pay") {
          const { billText, billAmount } = details;
          processTransaction("expense", billText, billAmount, "completed");
          if (payBillForm) payBillForm.reset();
        } else if (action === "request") {
          const { recipient, amount } = details;
          // Add pending transaction
          const txObj = {
            type: "income",
            text: `Money Requested from ${recipient}`,
            amount: amount,
            date: new Date().toISOString().split("T")[0],
            status: "pending"
          };
          savedTransactions.unshift(txObj);
          saveTransactionsAndBalance();
          if (transactionsList) renderTransactions();
          if (requestMoneyForm) requestMoneyForm.reset();
        }

        // ===== SHOW SUCCESS MODAL =====
        const successModal = $("success-modal");
        if (successModal) {
          successModal.style.display = "flex";  // Centered and visible
          successModal.style.position = "fixed";
          successModal.style.top = "50%";
          successModal.style.left = "50%";
          successModal.style.transform = "translate(-50%, -50%)";
          successModal.style.zIndex = 2000;

          const rid = $("r-id"); if (rid) rid.textContent = Math.floor(Math.random() * 1000000);
          const rname = $("r-name");
          if (rname) rname.textContent = action === "request" ? `Pending: ${details.recipient}` : 
            (action === "send" ? details.recipient : details.billText);
          const ramount = $("r-amount");
          if (ramount) ramount.textContent = Number(action === "request" ? details.amount : (details.amount || details.billAmount)).toFixed(2);
          const rdate = $("r-date"); if (rdate) rdate.textContent = new Date().toLocaleDateString();

          const modalHeading = successModal.querySelector("h2");
          if (modalHeading) {
            modalHeading.textContent = action === "request" ? "Transaction Pending ⏳" : "Transaction Successful ✔";
          }
        }

        pendingTransaction = null;
        resetPinState();
      }, 4000); // 4 seconds processing
    }
  });
}

// ===== PIN CANCEL =====
if (cancelPinBtn) {
  cancelPinBtn.addEventListener("click", () => {
    if (pinModal) pinModal.style.display = "none";
    pendingTransaction = null;
    resetPinState();
  });
}

    // ===== TOGGLE TRANSFER FORM =====
    if (toggleTransferBtn && sendForm) {
      toggleTransferBtn.addEventListener("click", () => {
        const isVisible = sendForm.style.display === "block";
        sendForm.style.display = isVisible ? "none" : "block";
        toggleTransferBtn.textContent = sendForm.style.display === "block" ? "Hide Transfer Form" : "Transfer Funds";
      });
    }

    // ===== BALANCE TOGGLE =====
    const balanceToggleBtn = $("toggle-balance");
    const sensitiveBalances = document.querySelectorAll(".sensitive");
    let visible = true;
    const originalValues = [];
    sensitiveBalances.forEach(el => originalValues.push(el.textContent));
    if (balanceToggleBtn) balanceToggleBtn.addEventListener("click", () => {
      sensitiveBalances.forEach((el, index) => {
        el.textContent = visible ? "••••••" : originalValues[index];
        el.classList.toggle("hidden", visible);
      });
      balanceToggleBtn.textContent = visible ? "👁‍🗨" : "👁";
      visible = !visible;
    });

    // ===== SUCCESS MODAL & DOWNLOAD RECEIPT =====
    const successModal = $("success-modal");
    const closeReceiptBtn = $("close-receipt");
    const downloadReceiptBtn = $("download-receipt");

    if (closeReceiptBtn && successModal) closeReceiptBtn.addEventListener("click", () => successModal.style.display = "none");
    document.addEventListener("click", e => {
      if (successModal && successModal.style.display === "flex" && !successModal.contains(e.target)) successModal.style.display = "none";
    });

    if (downloadReceiptBtn) {
      downloadReceiptBtn.addEventListener("click", () => {
        if (!window.jspdf) return alert("PDF export not available.");
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const id = $("r-id") ? $("r-id").textContent : "";
        const name = $("r-name") ? $("r-name").textContent : "";
        const amount = $("r-amount") ? $("r-amount").textContent : "";
        const date = $("r-date") ? $("r-date").textContent : "";

        doc.setFontSize(18);
        doc.text("Transaction Receipt", 105, 20, { align: "center" });
        doc.setLineWidth(0.5);
        doc.line(20, 25, 190, 25);
        doc.setFontSize(12);
        doc.text(`Transaction ID: ${id}`, 20, 40);
        doc.text(`Recipient: ${name}`, 20, 50);
        doc.text(`Amount: ${amount}`, 20, 60);
        doc.text(`Date: ${date}`, 20, 70);
        doc.setFontSize(10);
        doc.text("Thank you for using our service!", 105, 280, { align: "center" });
        doc.save(`${id || "receipt"}.pdf`);
      });
    }

    // ===== QUICK ACTION CARDS =====
    const quickButtons = document.querySelectorAll(".quick-btn");
    quickButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        const payCard = document.querySelector(".pay-bill-card");
        const sendCard = document.querySelector(".send-money-card");
        const requestCard = document.querySelector(".request-money-card");

        if (action === "pay-bill") {
          if (payCard) payCard.style.display = payCard.style.display === "block" ? "none" : "block";
          if (payCard && payCard.style.display === "block") payCard.scrollIntoView({behavior:"smooth",block:"start"});
          if (sendCard) sendCard.style.display = "none";
          if (requestCard) requestCard.style.display = "none";
        }
        if (action === "send-money") {
          if (sendCard) sendCard.style.display = sendCard.style.display === "block" ? "none" : "block";
          if (sendCard && sendCard.style.display === "block") sendCard.scrollIntoView({behavior:"smooth",block:"start"});
          if (payCard) payCard.style.display = "none";
          if (requestCard) requestCard.style.display = "none";
        }
        if (action === "request-money") {
          if (requestCard) requestCard.style.display = requestCard.style.display === "block" ? "none" : "block";
          if (requestCard && requestCard.style.display === "block") requestCard.scrollIntoView({ behavior: "smooth", block: "start" });
          if (sendCard) sendCard.style.display = "none";
          if (payCard) payCard.style.display = "none";
        }
      });
    });

    // ===== PASSWORD CHANGE FORM =====
    const passwordForm = $("password-form");
    if (passwordForm) {
      const passwordMessage = $("password-message");
      passwordForm.addEventListener("submit", e => {
        e.preventDefault();
        const current = $("currentPassword").value;
        const newP = $("newPassword").value;
        const confirmP = $("confirmPassword").value;

        if (current !== demoUser.password) {
          if (passwordMessage) { passwordMessage.textContent = "Current password is incorrect!"; passwordMessage.classList.remove("success"); passwordMessage.classList.add("error"); }
          return;
        }

        if (newP.length < 6) {
          if (passwordMessage) { passwordMessage.textContent = "New password must be at least 6 characters!"; passwordMessage.classList.remove("success"); passwordMessage.classList.add("error"); }
          return;
        }

        if (newP !== confirmP) {
          if (passwordMessage) { passwordMessage.textContent = "New passwords do not match!"; passwordMessage.classList.remove("success"); passwordMessage.classList.add("error"); }
          return;
        }

        demoUser.password = newP;
        localStorage.setItem("demoUser", JSON.stringify(demoUser));
        if (passwordMessage) { passwordMessage.textContent = "Password successfully updated ✔"; passwordMessage.classList.remove("error"); passwordMessage.classList.add("success"); }
        passwordForm.reset();
      });
    }

    // ===== PROFILE PANEL =====
    const profileBtn = $("profile-btn");
    const profilePanel = $("profile-panel");
    const closeProfileBtn = $("close-profile");
    const editProfileBtn = $("edit-profile");
    const accountSettingsBtn = $("account-settings");

    if (profileBtn && profilePanel) {
      profileBtn.addEventListener("click", e => {
        e.stopPropagation();
        profilePanel.style.display = profilePanel.style.display === "block" ? "none" : "block";
      });
    }

    if (closeProfileBtn) closeProfileBtn.addEventListener("click", () => { if (profilePanel) profilePanel.style.display = "none"; });

    document.addEventListener("click", e => {
      if (profilePanel && profilePanel.style.display === "block" && !profilePanel.contains(e.target) && profileBtn && !profileBtn.contains(e.target)) {
        profilePanel.style.display = "none";
      }
    });

    if (editProfileBtn) editProfileBtn.addEventListener("click", () => window.location.href = "profile.html");
    if (accountSettingsBtn) accountSettingsBtn.addEventListener("click", () => window.location.href = "account.html");
  });
})();
