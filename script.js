document.addEventListener("DOMContentLoaded", () => {

  // ===== LOGIN HANDLER =====
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    const messageEl = document.getElementById("login-message");

    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const username = document.getElementById("username")?.value?.trim() || "";
      const password = document.getElementById("password")?.value || "";

      if (!username || !password) {
        alert("Please enter both username and password.");
        return;
      }

      if (messageEl) {
        messageEl.style.color = "blue";
        messageEl.textContent = "Checking credentials...";
      }

      setTimeout(() => {
        if (username === "John Williams" && password === "Password123") {
          if (messageEl) {
            messageEl.style.color = "green";
            messageEl.textContent = "Login successful! Redirecting...";
          }
          setTimeout(() => {
            window.location.href = "dashboard.html";
          }, 1000);
        } else {
          if (messageEl) {
            messageEl.style.color = "red";
            messageEl.textContent = "Invalid username or password.";
          }
          alert("Invalid username or password.");
        }
      }, 1500);
    });
  }

  // ===== DASHBOARD HANDLERS =====
  const sendForm = document.getElementById("send-money-form");
  const toggleBtn = document.getElementById("toggle-transfer-btn");
  const balanceEl = document.querySelector(".balance");
  const transactionsList = document.querySelector(".transactions-card ul");
  let totalBalance = balanceEl ? parseFloat(balanceEl.textContent.replace(/[$,]/g, "")) : 0;

  // Restore from localStorage
  let savedBalance = localStorage.getItem("totalBalance");
  if (savedBalance) totalBalance = parseFloat(savedBalance);

  let savedTransactions = JSON.parse(localStorage.getItem("transactions")) || [];
  savedTransactions.forEach(tx => {
    const li = document.createElement("li");
    li.classList.add(tx.type);
    li.innerHTML = `<span>${tx.text}</span><span>${tx.amount}</span>`;
    transactionsList.insertBefore(li, transactionsList.firstChild);
  });

  // Update balance display
  if (balanceEl) {
    balanceEl.textContent = "$" + totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Toggle Transfer Form
  if (toggleBtn && sendForm) {
    toggleBtn.addEventListener("click", () => {
      if (sendForm.style.display === "none") {
        sendForm.style.display = "block";
        toggleBtn.textContent = "Hide Transfer Form";
      } else {
        sendForm.style.display = "none";
        toggleBtn.textContent = "Transfer Funds";
      }
    });
  }

  // ===== Create Professional PIN Modal =====
  const pinModal = document.createElement("div");
  pinModal.id = "pinModal";
  pinModal.style.display = "none";
  pinModal.style.position = "fixed";
  pinModal.style.top = "0";
  pinModal.style.left = "0";
  pinModal.style.width = "100%";
  pinModal.style.height = "100%";
  pinModal.style.backgroundColor = "rgba(0,0,0,0.5)";
  pinModal.style.zIndex = "1000";
  pinModal.style.display = "flex";
  pinModal.style.justifyContent = "center";
  pinModal.style.alignItems = "center";
  pinModal.style.fontFamily = "Arial, sans-serif";

  pinModal.innerHTML = `
    <div style="
      background:#fff; 
      padding:25px 30px; 
      border-radius:15px; 
      width:320px; 
      text-align:center;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      position: relative;
    ">
      <h3 style="margin-bottom:15px; color:#333;">Enter Transfer PIN</h3>
      <p style="color:#666; font-size:14px; margin-bottom:15px;">For security, please enter your 4-digit transfer PIN.</p>
      <input type="password" id="transferPin" placeholder="••••" style="
        width:80%; 
        padding:10px; 
        font-size:16px; 
        border-radius:8px; 
        border:1px solid #ccc;
        text-align:center;
        letter-spacing:5px;
      ">
      <div style="margin-top:20px;">
        <button id="confirmPinBtn" style="
          padding:8px 20px; 
          background:#007bff; 
          color:#fff; 
          border:none; 
          border-radius:8px;
          cursor:pointer;
          font-size:14px;
        ">Confirm</button>
        <button id="cancelPinBtn" style="
          padding:8px 20px; 
          background:#ccc; 
          color:#333; 
          border:none; 
          border-radius:8px;
          cursor:pointer;
          font-size:14px;
          margin-left:10px;
        ">Cancel</button>
      </div>
      <div id="pinMessage" style="color:red; margin-top:10px; font-size:13px;"></div>
    </div>
  `;
  document.body.appendChild(pinModal);

  // Send Money Form Submission
  if (sendForm && balanceEl && transactionsList) {
  const amountInput = document.getElementById("amount");
  const recipientInput = document.getElementById("recipient");
  const bankSelect = document.getElementById("bank");
  const noteInput = document.getElementById("note");
  const sendBtn = document.getElementById("send-btn");

  sendForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const amount = parseFloat(amountInput.value);
    const recipient = recipientInput.value.trim();
    const bank = bankSelect.value;
    const note = noteInput.value.trim();

    if (!bank || !recipient || isNaN(amount) || amount <= 0) {
      alert("Please fill all required fields correctly.");
      return;
    }
    if (amount > totalBalance) {
      alert("Insufficient funds.");
      return;
    }

    // Show PIN modal only now
    pinModal.style.display = "flex";
    const pinInput = document.getElementById("transferPin");
    const pinMessage = document.getElementById("pinMessage");
    pinInput.value = "";
    pinMessage.textContent = "";
    pinInput.focus();

    // Confirm PIN button
    document.getElementById("confirmPinBtn").onclick = () => {
      const enteredPin = pinInput.value.trim();
      const correctPin = "2027"; // Change to whatever PIN you want

      if (enteredPin === correctPin) {
        pinModal.style.display = "none";

        // Proceed with transfer (balance, transaction, localStorage)
        sendBtn.disabled = true;
        const originalText = sendBtn.textContent;
        let dots = 0;
        sendBtn.textContent = "Processing";
        const loader = setInterval(() => {
          dots = (dots + 1) % 4;
          sendBtn.textContent = "Processing" + ".".repeat(dots);
        }, 400);

        setTimeout(() => {
          clearInterval(loader);

          totalBalance -= amount;
          balanceEl.textContent = "$" + totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

          const li = document.createElement("li");
          li.classList.add("expense");
          li.innerHTML = `<span>Transfer to ${recipient} (${bank})${note ? " — " + note : ""}</span><span>-$${amount.toLocaleString()}</span>`;
          transactionsList.insertBefore(li, transactionsList.firstChild);

          savedTransactions.unshift({
            type: "expense",
            text: `Transfer to ${recipient} (${bank})${note ? " — " + note : ""}`,
            amount: "-$" + amount.toLocaleString()
          });
          localStorage.setItem("totalBalance", totalBalance);
          localStorage.setItem("transactions", JSON.stringify(savedTransactions));

          alert(`Transfer of $${amount.toLocaleString()} to ${recipient}${note ? " — " + note : ""} successful ✔`);

          sendForm.reset();
          sendBtn.disabled = false;
          sendBtn.textContent = originalText;
        }, 2000);

      } else {
        pinMessage.textContent = "Incorrect PIN. Try again.";
      }
    };

    // Cancel button
    document.getElementById("cancelPinBtn").onclick = () => {
      pinModal.style.display = "none";
    };
  });
}

  // Logout Handler
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

});
