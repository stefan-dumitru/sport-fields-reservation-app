document.addEventListener("DOMContentLoaded", () => {
    const username = localStorage.getItem("username");
    if (!username) {
        alert("You must log in first!");
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
            const response = await fetch("http://localhost:3000/add-field", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, denumire_sport: denumireSport, adresa, pret_ora: pretOra, denumire_teren: denumireTeren, program, sector })
            });

            const data = await response.json();
            if (data.success) {
                alert(data.message);
                form.reset();
            } else {
                alert(data.message || "An error occurred.");
            }
        } catch (error) {
            console.error("Error adding field:", error);
            alert("An error occurred while adding the field.");
        }
    });
});