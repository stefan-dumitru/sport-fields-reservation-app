function validatePasswordComplexity() {
    const password = document.getElementById('password').value;
    document.getElementById('uppercase').classList.toggle('met', /[A-Z]/.test(password));
    document.getElementById('lowercase').classList.toggle('met', /[a-z]/.test(password));
    document.getElementById('number').classList.toggle('met', /[0-9]/.test(password));
    document.getElementById('special').classList.toggle('met', /[!@#$%^&*(),.?":{}|<>]/.test(password));
    document.getElementById('length').classList.toggle('met', password.length >= 8 && password.length <= 12);
}

function isPasswordComplex(password) {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isCorrectLength = password.length >= 8 && password.length <= 12;
    
    return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && isCorrectLength;
}

function validatePasswords(password, confirmPassword) {
    const alertMessageDifferentPasswords = document.getElementById("alert-message-different-passwords");
    const alertMessagePasswordComplexity = document.getElementById("alert-message-password-complexity");

    if (!isPasswordComplex(password)) {
        alertMessageDifferentPasswords.style.display = "none";
        alertMessagePasswordComplexity.style.display = "block";
        return false;
    }
    else {
        alertMessagePasswordComplexity.style.display = "none";
        if (password !== confirmPassword) {
            alertMessageDifferentPasswords.style.display = "block";
            return false;
        } else {
            alertMessageDifferentPasswords.style.display = "none";
            return true;
        }
    }
}

async function setNewPassword(event) {
    event.preventDefault();
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;

    if (validatePasswords(password, confirmPassword)) {
        try {
            const response = await fetch('https://sport-fields-reservation-app-production.up.railway.app/confirm-password-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            const data = await response.json();
            if (data.success) {
                alert('Password updated successfully!');
                // window.location.href = 'http://localhost:8080/login-page';
                window.location.href = 'index.html';
            } else {
                alert('Invalid or expired token.');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

function togglePasswordVisibility(inputId) {
    const passwordInput = document.getElementById(inputId);

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
    } else {
        passwordInput.type = "password";
    }
}