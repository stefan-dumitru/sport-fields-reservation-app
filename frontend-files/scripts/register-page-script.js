function validatePasswordComplexity() {
    const password = document.getElementById('password').value;
    document.getElementById('uppercase').classList.toggle('met', /[A-Z]/.test(password));
    document.getElementById('lowercase').classList.toggle('met', /[a-z]/.test(password));
    document.getElementById('number').classList.toggle('met', /[0-9]/.test(password));
    document.getElementById('special').classList.toggle('met', /[!@#$%^&*(),.?":{}|<>]/.test(password));
    document.getElementById('length').classList.toggle('met', password.length >= 8 && password.length <= 12);
}

function validateEmail(email) {
    if (email.endsWith("@gmail.com")) {
        return true;
    } else {
        return false;
    }
}

function isPasswordComplex(password) {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isCorrectLength = password.length >= 8 && password.length <= 12;
    
    return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && isCorrectLength;
}

function validateAccount(email, password, confirmPassword) {
    const alertMessageDuplicateEmail = document.getElementById("alert-message-duplicate-email");
    const alertMessageInvalidEmail = document.getElementById("alert-message-invalid-email");
    const alertMessageDifferentPasswords = document.getElementById("alert-message-different-passwords");
    const alertMessagePasswordComplexity = document.getElementById("alert-message-password-complexity");

    alertMessageDuplicateEmail.style.display = "none";

    if (!validateEmail(email)) {
        alertMessageInvalidEmail.style.display = "block";
        alertMessageDifferentPasswords.style.display = "none";
        alertMessagePasswordComplexity.style.display = "none";
        return false;
    }
    else {
        alertMessageInvalidEmail.style.display = "none";
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
}

async function register(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const nume = document.getElementById('nume').value;
    const prenume = document.getElementById('prenume').value;
    const parola = document.getElementById('password').value;
    const confirmaParola = document.getElementById("confirm_password").value;
    const alertMessageDuplicateEmail = document.getElementById("alert-message-duplicate-email");

    if (validateAccount(email, parola, confirmaParola)) {
        try {
            const response = await fetch('https://sport-fields-reservation-app-production.up.railway.app/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, nume, prenume, parola })
            });

            const data = await response.json();
            if (data.success) {
                localStorage.setItem("username", data.username);
                window.location.href = 'dashboard.html';
            }
            else {
                alertMessageDuplicateEmail.style.display = 'block';
            }
        } catch (error) {
            console.error('Error:', error);
            alertMessageDuplicateEmail.style.display = 'block';
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