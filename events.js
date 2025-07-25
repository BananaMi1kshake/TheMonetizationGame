// events.js
const eventData = {
    viralMarketing: {
        title: "Viral Marketing Campaign",
        description: (name) => `${name}’s latest email campaign went viral on social media! The leads are pouring in.`,
        effectDescription: "For the next 60 seconds, every lead generation action produces 5x the normal amount of leads.",
        duration: 60,
        type: 'good'
    },
    bullMarket: {
        title: "Bull Market",
        description: () => "The market is hot! Advertisers are paying a premium for ad space.",
        effectDescription: "All income from developing leads is doubled for the next 90 seconds.",
        duration: 90,
        type: 'good'
    },
    productivityGuru: {
        title: "Productivity Guru Visits",
        description: () => "A famous инфоцыган visited the office and motivated the team!",
        effectDescription: "All staff members work 50% faster for the next 3 minutes.",
        duration: 180,
        type: 'good'
    },
    foundInvoice: {
        title: "Found an Old Invoice",
        description: (name) => `While cleaning out a filing cabinet, ${name} found an old, unpaid invoice from a client.`,
        effectDescription: "Instantly gain a lump sum of money equal to 10% of your current balance.",
        duration: 0,
        type: 'good'
    },
    abTest: {
        title: "Successful A/B Test",
        description: (name) => `${name} ran an A/B test on a new ad format, and it's a huge success!`,
        effectDescription: "The base income per lead is temporarily increased by +$0.50 for the next 2 minutes.",
        duration: 120,
        type: 'good',
        onStart: (g) => { g.incomePerLead += 0.5; },
        onEnd: (g) => { g.incomePerLead -= 0.5; }
    },
    serverCrash: {
        title: "Server Crash!",
        description: () => "Oh no! Reports has crashed, halting all operations.",
        type: 'choice',
        choices: [
            { text: "Pay $500", action: (g) => { if(g.money >= 500) { g.money -= 500; } else { startEvent(g, 'serverCrashPenalty'); } } },
            { text: "Wait 60s", action: (g) => { startEvent(g, 'serverCrashPenalty'); g.stats.waitedOutServerCrash = true; } }
        ]
    },
    serverCrashPenalty: {
        title: "Server Down",
        effectDescription: "All income and lead development is halted.",
        duration: 60,
        type: 'bad'
    },
    adNetworkOutage: {
        title: "Ad Network Outage",
        description: () => "One of your biggest ad networks is experiencing a global outage.",
        effectDescription: "The money earned per lead is halved for the next 90 seconds.",
        duration: 90,
        type: 'bad',
        onStart: (g) => { g.incomePerLead /= 2; },
        onEnd: (g) => { g.incomePerLead *= 2; }
    },
    teamBurnout: {
        title: "Team Burnout",
        description: (name) => `${name} is feeling overworked and exhausted after a long week.`,
        effectDescription: "All staff members work 25% slower for the next 3 minutes.",
        duration: 180,
        type: 'bad'
    },
    officeExpense: {
        title: "Unexpected Office Expense",
        description: () => "The water cooler broke down and needs an immediate, expensive repair!",
        effectDescription: "Instantly lose 5% of your current money.",
        duration: 0,
        type: 'bad'
    },
    negativePR: {
        title: "Negative PR",
        description: () => "A competitor published a negative article about your company, hurting your reputation.",
        effectDescription: "Your chance to generate a lead is reduced by 50% for the next 2 minutes.",
        duration: 120,
        type: 'bad',
    }
};

function triggerRandomEvent(game) {
    if (game.hiredStaff.size === 0) return;
    const eventKeys = Object.keys(eventData).filter(k => eventData[k].type !== 'bad' || game.hiredStaff.size > 2);
    const randomKey = eventKeys[Math.floor(Math.random() * eventKeys.length)];
    const event = eventData[randomKey];

    let description = event.description();
    if (['viralMarketing', 'teamBurnout'].includes(randomKey)) {
        const salesStaff = [...game.hiredStaff].filter(s => staffData.sales.members.includes(s));
        description = salesStaff.length > 0 ? event.description(salesStaff[Math.floor(Math.random() * salesStaff.length)]) : event.description("Someone from Sales");
    } else if (['foundInvoice', 'abTest'].includes(randomKey)) {
        const accountsStaff = [...game.hiredStaff].filter(s => staffData.accounts.members.includes(s));
        description = accountsStaff.length > 0 ? event.description(accountsStaff[Math.floor(Math.random() * accountsStaff.length)]) : event.description("Someone from Accounts");
    }

    DOM.eventModal.title.textContent = event.title;
    DOM.eventModal.description.textContent = description;
    DOM.eventModal.choices.innerHTML = '';

    if (event.type === 'choice') {
        event.choices.forEach(choice => {
            const button = document.createElement('button');
            button.textContent = choice.text;
            button.className = 'px-4 py-2 rounded-md bg-gray-300 hover:bg-gray-400';
            button.onclick = () => {
                choice.action(game);
                DOM.eventModal.el.classList.add('hidden');
            };
            DOM.eventModal.choices.appendChild(button);
        });
    } else {
        const okButton = document.createElement('button');
        okButton.textContent = "Okay";
        okButton.className = 'px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600';
        okButton.onclick = () => {
            startEvent(game, randomKey);
            DOM.eventModal.el.classList.add('hidden');
        };
        DOM.eventModal.choices.appendChild(okButton);
    }
    
    DOM.eventModal.el.classList.remove('hidden');
    game.eventCooldown = 180 + Math.random() * 120; // 3-5 minutes
}

function startEvent(game, key) {
    const event = eventData[key];
    if (event.onStart) event.onStart(game);

    if (key === 'coreFeatureBug') game.isLeadDevelopmentHalted = true;
    if (key === 'dataBreach') game.isLeadGenerationHalted = true;
    if (key === 'staffQuitting') game.settings.allStaffSpeedMultiplier = 1.1;

    if (event.duration > 0) {
        game.activeEvent = { key: key, timeLeft: event.duration };
        updateActiveEventTimer(game);
        DOM.activeEventTimer.el.classList.remove('hidden');
    } else {
        if (key === 'foundInvoice') game.money += game.money * 0.10;
        if (key === 'officeExpense') game.money *= 0.95;
    }
    game.restartIntervals();
}

function endEvent(game) {
    if (!game.activeEvent) return;
    const event = eventData[game.activeEvent.key];
    if (event.onEnd) event.onEnd(game);

    if (game.activeEvent.key === 'coreFeatureBug') game.isLeadDevelopmentHalted = false;
    if (game.activeEvent.key === 'dataBreach') game.isLeadGenerationHalted = false;
    if (game.activeEvent.key === 'staffQuitting') game.settings.allStaffSpeedMultiplier = 1;

    game.activeEvent = null;
    DOM.activeEventTimer.el.classList.add('hidden');
    game.restartIntervals();
}

function updateActiveEventTimer(game) {
    if (!game.activeEvent) return;
    const event = eventData[game.activeEvent.key];
    DOM.activeEventTimer.title.textContent = event.title;
    const minutes = Math.floor(game.activeEvent.timeLeft / 60);
    const seconds = (game.activeEvent.timeLeft % 60).toString().padStart(2, '0');
    DOM.activeEventTimer.timeLeft.textContent = `${minutes}:${seconds}`;
}

function showEventDetails(game) {
    if (!game.activeEvent) return;
    const event = eventData[game.activeEvent.key];
    DOM.eventDetailsModal.title.textContent = event.title;
    DOM.eventDetailsModal.description.textContent = event.effectDescription;
    DOM.eventDetailsModal.el.classList.remove('hidden');
}
