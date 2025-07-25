// achievements.js
const achievementData = {
    mukhtarSatisfied: { name: "Mukhtar is satisfied", description: "Earn $50 total.", condition: (g) => g.stats.totalMoneyEarned >= 50 },
    mukhtarHappy: { name: "Mukhtar is happy", description: "Earn $100 total.", condition: (g) => g.stats.totalMoneyEarned >= 100 },
    mukhtarReallyHappy: { name: "Mukhtar is REALLY happy", description: "Earn $1,000 total.", condition: (g) => g.stats.totalMoneyEarned >= 1000 },
    someonePromoted: { name: "Someone is getting promoted", description: "Earn $5,000 total.", condition: (g) => g.stats.totalMoneyEarned >= 5000 },
    syc: { name: "100% СУЦ", description: "Earn $10,000 total.", condition: (g) => g.stats.totalMoneyEarned >= 10000 },
    carpalTunnel: { name: "Carpal Tunnel Syndrome", description: "Manually click 10,000 times.", condition: (g) => g.stats.totalManualClicks >= 10000 },
    buyMyUSDT: { name: "Buy my USDT", description: "Hire Emil.", condition: (g) => g.hiredStaff.has('Emil') },
    salesDivision: { name: "Sales Division Assembled", description: "Hire every staff member from the Sales department.", condition: (g) => staffData.sales.members.every(name => g.hiredStaff.has(name)) },
    accountsDivision: { name: "Accounts Division Assembled", description: "Hire every staff member from the Accounts department.", condition: (g) => staffData.accounts.members.every(name => g.hiredStaff.has(name)) },
    peakEfficiency: { name: "Peak Efficiency", description: "Purchase all of the one-time Global Upgrades.", condition: (g) => Object.keys(upgradeData.global.upgrades).every(key => g.upgrades[key].purchased) },
    shapkaGang: { name: "Шапка gang", description: "Hire all staff.", condition: (g) => {
        const totalStaff = Object.values(staffData).reduce((sum, type) => sum + type.members.length, 0);
        return g.hiredStaff.size === totalStaff;
    }},
    crisisAverted: { name: "Crisis Averted", description: "Successfully navigate a \"Server Crash\" event by waiting it out instead of paying.", condition: (g) => g.stats.waitedOutServerCrash }
};

function checkAchievements(game) {
    let changed = false;
    for (const key in achievementData) {
        if (!game.achievements[key].unlocked && achievementData[key].condition(game)) {
            game.achievements[key].unlocked = true;
            showAchievementPopup(achievementData[key]);
            changed = true;
        }
    }
    if (changed) UI.renderAchievements(game);
}

function showAchievementPopup(achievement) {
    const popup = DOM.achievementPopup;
    popup.title.textContent = achievement.name;
    popup.desc.textContent = achievement.description;
    popup.el.classList.remove('opacity-0', 'translate-y-10');
    popup.el.classList.add('opacity-100', 'translate-y-0');
    setTimeout(() => {
        popup.el.classList.remove('opacity-100', 'translate-y-0');
        popup.el.classList.add('opacity-0', 'translate-y-10');
    }, 4000);
}
