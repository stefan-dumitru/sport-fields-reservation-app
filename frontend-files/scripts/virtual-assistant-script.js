const form = document.getElementById('training-form');
const chatbox = document.getElementById('chatbox');

const availabilityError = document.getElementById('availability-error');

const sportSelect = document.getElementById('sport');
const footballPositionsContainer = document.getElementById('football-positions-container');
const basketballPositionsContainer = document.getElementById('basketball-positions-container');
const footballPositionsSelect = document.getElementById('football-positions');
const basketballPositionsSelect = document.getElementById('basketball-positions');

sportSelect.addEventListener('change', () => {
    const selectedSport = sportSelect.value;

    footballPositionsContainer.style.display = 'none';
    basketballPositionsContainer.style.display = 'none';
    footballPositionsSelect.required = false;
    basketballPositionsSelect.required = false;

    if (selectedSport === 'fotbal') {
        footballPositionsContainer.style.display = 'block';
        footballPositionsSelect.required = true;
    } else if (selectedSport === 'baschet') {
        basketballPositionsContainer.style.display = 'block';
        basketballPositionsSelect.required = true;
    }
});

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const checkboxes = document.querySelectorAll('input[name="availability"]:checked');
    
    if (checkboxes.length === 0) {
        availabilityError.style.display = 'block';
        chatbox.scrollTop = chatbox.scrollHeight;
        return;
    } else {
        availabilityError.style.display = 'none';
    }

    if (!navigator.onLine) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'assistant-message';
        errorMessage.textContent = 'No internet connection. Please check your connection and try again.';
        chatbox.appendChild(errorMessage);
        return;
    }

    const sport = document.getElementById('sport').value;
    const experience = document.getElementById('experience').value;
    const age = document.getElementById('age').value;
    const gender = document.getElementById('gender').value;
    const lastPracticed = document.getElementById('last-practiced').value;
    const weight = document.getElementById('weight').value;
    const height = document.getElementById('height').value;
    const physicalLevel = document.getElementById('physical-level').value;
    const trainingHours = document.getElementById('training-hours').value;
    const objectives = document.getElementById('objectives').value;
    if (footballPositionsContainer.style.display === 'block')
        var preferredPosition = document.getElementById('football-positions').value;
    else var preferredPosition = document.getElementById('basketball-positions').value;
    const availabilityDays = Array.from(
        document.querySelectorAll('input[name="availability"]:checked')
    ).map((checkbox) => checkbox.value);

    const userInfo = {
        sport,
        experience,
        age,
        gender,
        lastPracticed,
        weight,
        height,
        physicalLevel,
        trainingHours,
        objectives,
        preferredPosition,
        availabilityDays,
    };
    
    const userMessage = document.createElement('div');
    userMessage.className = 'user-message';
    userMessage.textContent = `Sport: ${sport}, Nivel de experienta: ${experience}, Varsta: ${age}`;
    chatbox.appendChild(userMessage);

    chatbox.scrollTop = chatbox.scrollHeight;

    const typingAnimation = document.createElement('div');
    typingAnimation.className = 'typing-animation';
    typingAnimation.innerHTML = '<span></span><span></span><span></span>';
    
    typingAnimation.style.display = "flex";
    chatbox.appendChild(typingAnimation);

    const params = new URLSearchParams(userInfo).toString();
    const eventSource = new EventSource(`https://backend-production-47d1.up.railway.app/get-training-plan?${params}`);

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.success && data.trainingPlan) {
            typingAnimation.style.display = "none";

            renderTrainingPlan(data.trainingPlan);
            eventSource.close();
        } else {
            typingAnimation.style.display = "none";
            const errorMessage = document.createElement('div');
            errorMessage.className = 'assistant-message';
            errorMessage.textContent = data.message || 'Scuze, nu pot genera un program de antrenament acum.';
            chatbox.appendChild(errorMessage);
            eventSource.close();
        }
    };

    eventSource.onerror = () => {
        typingAnimation.style.display = "none";
        const errorMessage = document.createElement('div');
        errorMessage.className = 'assistant-message';
        errorMessage.textContent = navigator.onLine
            ? 'A apărut o eroare. Vă rugăm să încercați din nou mai târziu.'
            : 'No internet connection. Please try again.';
        chatbox.appendChild(errorMessage);
        eventSource.close();
    };
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