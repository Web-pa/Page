// Cleaned and improved main app JS (fixed reference bugs, standardized amounts, improved safety)
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
        password: "1346111",
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

    // Helper: compute total balance from transactions (income - expense)
    function computeBalanceFromTransactions(transactions) {
      return (transactions || []).reduce((acc, tx) => {
        const val = parseAmount(tx.amount);
        if (isNaN(val)) return acc;
        return tx.type === "expense" ? acc - val : acc + val;
      }, 0);
    }

     // ===== TOTAL BALANCE =====
    const balanceEl = document.querySelector(".balance");
    let totalBalance = parseFloat(localStorage.getItem("totalBalance"));

    // Only set manual balance if nothing is stored yet
    if (isNaN(totalBalance)) {
    totalBalance = 1500450.50; // <-- starting balance manually
    localStorage.setItem("totalBalance", String(totalBalance));
   }

    // Update display
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
          // Demo uses fullName as username (that's intentional in this demo)
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

    // Query modal elements after append
    const confirmPinBtn = $("confirmPinBtn");
    const cancelPinBtn = $("cancelPinBtn");
    const transactionPinInput = $("transactionPin");
    const pinMessage = $("pinMessage");
    const maxAttempts = 3;
    let attemptsLeft = maxAttempts;

    // pendingTransaction must be declared before any handler uses it
    // Standard shape: { action: "send"|"pay"|"request", details: {...} }
    let pendingTransaction = null;

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
        if (type) li.classList.add(type);
        const left = document.createElement("span");
        left.textContent = text;
        const right = document.createElement("span");
        right.textContent = (type === "expense" ? "-$" : "$") + Number(amtValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        li.appendChild(left);
        li.appendChild(right);
        transactionsList.insertBefore(li, transactionsList.firstChild);
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

        // Store pending transaction and open PIN modal. Use action "send" to match PIN handler
        pendingTransaction = {
          action: "send",
          details: {
            recipient: recipient,
            account: account,
            bank: bank,
            amount: amount,
            note: note
          }
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
          if (pinMessage) pinMessage.textContent = attemptsLeft > 0
            ? `Incorrect PIN. ${attemptsLeft} attempt(s) remaining.`
            : "Maximum attempts reached!";
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

        // Determine target button for processing animation
        let targetBtn = null;
        if (action === "send") targetBtn = sendBtn;
        else if (action === "pay") targetBtn = payBillForm ? payBillForm.querySelector("button[type='submit']") : null;
        else if (action === "request") targetBtn = requestMoneyForm ? requestMoneyForm.querySelector("button[type='submit']") : null;

        // Start processing animation
        if (targetBtn) {
          targetBtn.disabled = true;
          let dots = 0;
          const originalText = targetBtn.textContent;
          const loader = setInterval(() => {
            dots = (dots + 1) % 4;
            targetBtn.textContent = "Processing" + ".".repeat(dots);
          }, 400);

          setTimeout(() => {
            clearInterval(loader);

            // ===== SPECIAL CASE: Wells Fargo GOES TO ERROR PAGE =====
            if (action === "send" && details.bank === "WEF" && details.account === "15623948807") {
              if (sendForm) sendForm.reset();
              if (toggleTransferBtn) toggleTransferBtn.textContent = "Transfer Funds";
              targetBtn.disabled = false;
              window.location.href = "error.html";
              pendingTransaction = null;
              resetPinState();
              return;
            }

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
             successModal.style.display = "flex";
              // Store last transaction globally for PDF
              window.lastTransactionDetails = details;
              window.lastTransactionAction = action; // optional, for context
              successModal.style.position = "fixed";
              successModal.style.top = "50%";
              successModal.style.left = "50%";
              successModal.style.transform = "translate(-50%, -50%)";
              successModal.style.zIndex = 2000;

              const rid = $("r-id"); if (rid) rid.textContent = Math.floor(Math.random() * 1000000);
              const rref = $("r-ref");
              if (rref) rref.textContent = "REF" + Math.floor(100000000 + Math.random() * 900000000);
              const rname = $("r-name");
              if (rname) rname.textContent = action === "request" ? `Pending: ${details.recipient}` :
                (action === "send" ? details.recipient : details.billText);
              const rRecipient = $("r-recipient");
              if (rRecipient) {
                if (action === "send") rRecipient.textContent = `${details.recipient} — ${details.account} (${details.bank})`;
                else if (action === "pay") rRecipient.textContent = details.billText;
                else if (action === "request") rRecipient.textContent = details.recipient;
                else rRecipient.textContent = "[Insert Beneficiary Name / Account Details]";
              }

              const ramount = $("r-amount");
              if (ramount) {
                if (action === "send") ramount.textContent = Number(details.amount).toFixed(2);
                else if (action === "pay") ramount.textContent = Number(details.billAmount).toFixed(2);
                else if (action === "request") ramount.textContent = Number(details.amount).toFixed(2);
                else ramount.textContent = "0.00";
              }

              const rdate = $("r-date");
              const rtime = $("r-time");
              const now = new Date();

              if (rdate) rdate.textContent = now.toLocaleDateString(); // local date
              if (rtime) rtime.textContent = now.toLocaleTimeString('en-US', { hour12: false }); // local time

              const modalHeading = successModal.querySelector("h2");
              if (modalHeading) {
                modalHeading.textContent = action === "request" ? "Transaction Pending ⏳" : "Transaction Successful ✔";
              }
            }

            // Reset button and pending transaction
            targetBtn.disabled = false;
            // Restore original label
            if (originalText) targetBtn.textContent = originalText;

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
    const successModalEl = $("success-modal");
    const closeReceiptBtn = $("close-receipt");
    const downloadReceiptBtn = $("download-receipt");

    if (closeReceiptBtn && successModalEl) closeReceiptBtn.addEventListener("click", () => successModalEl.style.display = "none");
    document.addEventListener("click", e => {
      if (successModalEl && successModalEl.style.display === "flex" && !successModalEl.contains(e.target)) successModalEl.style.display = "none";
    });

    if (downloadReceiptBtn) {
      downloadReceiptBtn.addEventListener("click", () => {
        if (!window.jspdf) return alert("PDF export not available.");
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Auto-fill reference number if empty
        if ($("r-ref") && !$("r-ref").textContent) {
          $("r-ref").textContent = "REF" + Math.floor(100000000 + Math.random() * 900000000);
        }

        // Auto-fill time-stamp if empty (UTC)
        if ($("r-time") && !$("r-time").textContent) {
          const now = new Date();
          const hh = now.getUTCHours().toString().padStart(2, "0");
          const mm = now.getUTCMinutes().toString().padStart(2, "0");
          const ss = now.getUTCSeconds().toString().padStart(2, "0");
          $("r-time").textContent = `${hh}:${mm}:${ss} — UTC`;
        }

        // Get all values from the modal (ensures filled correctly)
        const id = $("r-id") ? $("r-id").textContent : "TX" + Math.floor(100000 + Math.random() * 900000);
        const ref = $("r-ref") ? $("r-ref").textContent : "REF" + Math.floor(100000000 + Math.random() * 900000000);
        const date = $("r-date") ? $("r-date").textContent : new Date().toLocaleDateString();
        const time = $("r-time") ? $("r-time").textContent : new Date().toLocaleTimeString("en-US", { hour12: false }) + " — UTC";
        const amount = $("r-amount") ? $("r-amount").textContent : "0.00";
        const fee = $("r-fee") ? $("r-fee").textContent : "0.00";
        const recipient = $("r-recipient") ? $("r-recipient").textContent : "[Insert Beneficiary Name / Account Details]";

        // PDF styling
        let y = 20; // vertical position start
        // Bank logo (top-left)
        const logo = new Image();
        logo.src = "chase-logo.png"; // path to your logo
        doc.addImage(logo, "PNG", 20, 12, 35, 12);
        // Watermark
        doc.setTextColor(220);
        doc.setFontSize(40);
        doc.text("CONFIDENTIAL", 105, 150, {
        align: "center",
        angle: 30
       });
        doc.setTextColor(0); // reset color
        doc.setFontSize(18);
        doc.setFontSize(18);
        doc.text("JPMORGAN CHASE BANK", 105, y, { align: "center" });
        y += 8;

        doc.setFontSize(14);
        doc.text("PAYMENT RECEIPT", 105, y, { align: "center" });
        y += 6;
        y += 10;
        doc.setLineWidth(0.5);
        doc.line(20, y, 190, y);
        y += 10;

        doc.setFontSize(12);
        // Transaction Info
        doc.text(`Transaction ID: ${id}`, 20, y); y += 8;
        doc.text(`Reference Number: ${ref}`, 20, y); y += 8;
        doc.text(`Payment Date: ${date}`, 20, y); y += 8;
        doc.text(`Time‑Stamp: ${time}`, 20, y); y += 12;

        // Transfer Details
        doc.setFontSize(14); doc.text("Transfer Details", 20, y); y += 8;
        doc.setFontSize(12);
        doc.text(`Payment Amount: ${formatCurrency(parseAmount(amount))}`, 20, y); y += 8;
        doc.text(`Transaction Fee: ${formatCurrency(parseAmount(fee))}`, 20, y); y += 8;

        // Account Info
        doc.setFontSize(14); doc.text("Account Information", 20, y); y += 8;
        doc.setFontSize(12);
        doc.text("From Account: JPMorgan Chase Bank, N.A. (****8433)", 20, y); y += 8;
        doc.text("SWIFT / BIC: CHASUS33", 20, y); y += 8;
        const details = window.lastTransactionDetails;
        if (!details) return alert("No transaction data available for PDF.");

        doc.text(`To Account: ${details.recipient} — ${details.account} (${details.bank || "N/A"})`, 20, y); 
        y += 12;
        
        // Authorization Statement
        doc.setFontSize(14); doc.text("Authorization Statement", 20, y); y += 8;
        doc.setFontSize(12);
        const authText = "I hereby confirm that I have authorized an electronic debit from my payment account in the amount stated above. This transaction was approved by the account holder and processed in accordance with applicable banking regulations.";
        const splitAuth = doc.splitTextToSize(authText, 170); // wrap text
        doc.text(splitAuth, 20, y);
        y += splitAuth.length * 7 + 4;

        // Transaction Status
        doc.setFontSize(12);
        doc.text("Transaction Status: Completed / Successful", 20, y); y += 12;

        // Footer
        doc.setLineWidth(0.5);
        doc.line(20, y, 190, y); y += 6;
        doc.setFontSize(10);
        doc.text("This receipt was generated electronically.", 105, y, { align: "center" });

        // Save PDF
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
