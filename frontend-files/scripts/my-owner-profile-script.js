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

document.addEventListener("DOMContentLoaded", async () => {
    const username = localStorage.getItem("username");
    if (!username) {
        alert("Trebuie sa fii logat mai intai");
        window.location.href = "log-in-page.html";
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/get-user-profile/${username}`);
        const data = await response.json();

        if (data.success) {
            document.getElementById("username").textContent = data.user.username;
            document.getElementById("nume").textContent = data.user.nume;
            document.getElementById("prenume").textContent = data.user.prenume;
            document.getElementById("email").textContent = data.user.email;
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error("Error fetching profile data:", error);
    }
});