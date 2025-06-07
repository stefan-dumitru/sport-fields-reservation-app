document.addEventListener("DOMContentLoaded", () => {
    const username = localStorage.getItem("username");
    if (!username) {
        alert("Trebuie sa fii logat mai intai!");
        window.location.href = "log-in-page.html";
        return;
    }

    const form = document.getElementById("addFieldForm");
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const denumireSport = document.getElementById("denumireSport").value;
        const adresa = document.getElementById("adresa").value;
        const pretOra = document.getElementById("pretOra").value;
        const denumireTeren = document.getElementById("denumireTeren").value;
        const program = document.getElementById("program").value;
        const sector = document.getElementById("sector").value;

        try {
            const response = await fetch("https://sport-fields-reservation-app-production.up.railway.app/add-field", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, denumire_sport: denumireSport, adresa, pret_ora: pretOra, denumire_teren: denumireTeren, program, sector })
            });

            const data = await response.json();
            if (data.success) {
                alert(data.message);
                form.reset();
            } else {
                alert(data.message || "A aparut o eroare. Incearca din nou");
            }
        } catch (error) {
            console.error("Error adding field:", error);
            alert("Terenul nu a putut fi adaugat. Incearca din nou.");
        }
    });
});