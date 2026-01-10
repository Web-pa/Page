function login() {
  window.location.href = "dashboard.html";
}

function logout() {
  window.location.href = "index.html";
}

function logout() {
  window.location.href = "index.html";
}

function sendMoney() {
  const recipient = document.getElementById("recipient").value;
  const amount = document.getElementById("amount").value;
  if(recipient && amount) {
    alert(`$${amount} sent to ${recipient}!`);
    // Clear inputs
    document.getElementById("recipient").value = '';
    document.getElementById("amount").value = '';
  } else {
    alert("Please fill in all fields.");
  }
}
