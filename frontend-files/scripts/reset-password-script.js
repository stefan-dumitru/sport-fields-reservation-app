function validateEmail(email) {
    if (email.endsWith("@gmail.com")) {
        return true;
    } else {
        return false;
    }
}

async function resetPassword(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const alertMessageNonExistentEmail = document.getElementById("alert-message-non-existent-email");
    const alertMessageInvalidEmail = document.getElementById("alert-message-invalid-email");
    const alertMessageEmailSent = document.getElementById("alert-message-email-sent");

    if (validateEmail(email)) {
        alertMessageInvalidEmail.style.display = 'none';

        try {
            const response = await fetch(`https://bookfield.up.railway.app/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            if (data.success) {
                alertMessageEmailSent.style.display = 'block';
                alertMessageNonExistentEmail.style.display = 'none';
            }
            else {
                alertMessageNonExistentEmail.style.display = 'block';
                alertMessageEmailSent.style.display = 'none';
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
    else {
        alertMessageInvalidEmail.style.display = 'block';
        alertMessageNonExistentEmail.style.display = 'none';
        alertMessageEmailSent.style.display = 'none';
    }
}