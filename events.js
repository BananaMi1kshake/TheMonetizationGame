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
            { text: "Pay $500", action: (g) => { if(g.money >= 500) { g.money -= 500; } else { g.startEvent('serverCrashPenalty'); } } },
            { text: "Wait 60s", action: (g) => { g.startEvent('serverCrashPenalty'); g.stats.waitedOutServerCrash = true; } }
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
        onStart: (g) => { g.leadGenerationChance /= 2; },
        onEnd: (g) => { g.leadGenerationChance *= 2; }
    }
};
