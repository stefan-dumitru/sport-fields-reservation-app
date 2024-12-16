const form = document.getElementById('training-form');
const chatbox = document.getElementById('chatbox');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const sport = document.getElementById('sport').value;
    const experience = document.getElementById('experience').value;
    const age = document.getElementById('age').value;

    const userMessage = document.createElement('div');
    userMessage.className = 'user-message';
    userMessage.textContent = `Sport: ${sport}, Nivel de experienta: ${experience}, Varsta: ${age}`;
    chatbox.appendChild(userMessage);

    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'assistant-message';
    chatbox.appendChild(typingIndicator);

    let dots = 0;
    const typingInterval = setInterval(() => {
        typingIndicator.textContent = `Generare program de antrenament${'.'.repeat(dots)}`;
        dots = (dots + 1) % 4;
    }, 500);

    chatbox.scrollTop = chatbox.scrollHeight;

    try {
        const response = await fetch('http://localhost:3000/get-training-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sport, experience, age }),
        });

        const data = await response.json();

        clearInterval(typingInterval);
        chatbox.removeChild(typingIndicator);

        if (data.success && data.trainingPlan) {
            renderTrainingPlan(data.trainingPlan);
        } else {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'assistant-message';
            errorMessage.textContent = data.message || 'Scuze, nu pot genera un program de antrenament acum.';
            chatbox.appendChild(errorMessage);
        }

    } catch (error) {
        console.error('Error:', error);

        clearInterval(typingInterval);
        chatbox.removeChild(typingIndicator);

        const errorMessage = document.createElement('div');
        errorMessage.className = 'assistant-message';
        errorMessage.textContent = 'A apărut o eroare. Vă rugăm să încercați din nou mai târziu.';
        chatbox.appendChild(errorMessage);
    }
});

function renderTrainingPlan(trainingPlan) {
    const assistantMessage = document.createElement('div');
    assistantMessage.className = 'assistant-message';

    Object.entries(trainingPlan).forEach(([day, exercises]) => {
        const card = document.createElement('div');
        card.className = 'card mb-3';

        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header';
        cardHeader.innerHTML = `<button class="btn btn-link" data-bs-toggle="collapse" data-bs-target="#${day}" aria-expanded="false">${day}</button>`;
        card.appendChild(cardHeader);

        const cardBody = document.createElement('div');
        cardBody.id = day;
        cardBody.className = 'collapse';
        cardBody.innerHTML = exercises.length
            ? `<ul>${exercises.map((exercise) => `<li>${exercise}</li>`).join('')}</ul>`
            : `<p>No exercises scheduled.</p>`;

        card.appendChild(cardBody);
        card.style.marginBottom = '10px';

        assistantMessage.appendChild(card);
    });

    chatbox.appendChild(assistantMessage);
    chatbox.scrollTop = chatbox.scrollHeight;
}