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