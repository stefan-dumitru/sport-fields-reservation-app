localStorage.clear();

function togglePasswordVisibility(inputId) {
    const passwordInput = document.getElementById(inputId);
    passwordInput.type = passwordInput.type === "password" ? "text" : "password";
}

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

async function login(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');

    try {
        const response = await fetch(`${BACKEND_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (data.success) {
            localStorage.setItem("username", data.username);
            localStorage.setItem("statut", data.statut);

            if (data.statut === 1 || data.statut === 0) {
                window.location.href = 'dashboard.html';
            } else if (data.statut === 2) {
                window.location.href = 'field-owner-dashboard.html';
            }
        } else {
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        alert("A aparut o eroare. Incearca din nou.");
    }
}