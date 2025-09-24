async function getBackendUrl() {
    try {
        let backendBaseUrl = "";

        if (window.location.hostname.includes("rezervareteren.up.railway.app")) {
            backendBaseUrl = "https://backend-production-47d1.up.railway.app";
        }

        const response = await fetch(`${backendBaseUrl}/get-backend-route`);
        if (!response.ok) {
            throw new Error(`Failed to fetch backend URL: ${response.status}`);
        }

        const data = await response.json();
        return data.backendUrl;
    } catch (error) {
        console.error("Error fetching backend URL:", error);
        return null;
    }
}

const BACKEND_URL = await getBackendUrl();

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
            const response = await fetch(`${BACKEND_URL}/reset-password`, {
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