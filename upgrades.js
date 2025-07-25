// upgrades.js
const upgradeData = {
    sales: {
        name: 'Sales Upgrades',
        upgrades: {
            betterLeadForms: { name: 'Better Lead Forms', desc: (g) => `Increases manual lead gen chance by ${(g.upgrades.betterLeadForms.chanceIncrease * 100).toFixed(1)}pp. Current: ${(g.getLeadChance() * 100).toFixed(2)}%`, cost: 1, costMultiplier: 5, maxLevel: 0, chanceIncrease: 0.002, onPurchase: (g) => { g.upgrades.betterLeadForms.level++; } },
            leadMagnet: { name: 'Lead Magnet', desc: (g) => `Manual clicks generate ${g.upgrades.leadMagnet.multiplier}x leads.`, cost: 50, costMultiplier: 10, maxLevel: 0, multiplier: 1, onPurchase: (g) => { g.upgrades.leadMagnet.level++; g.upgrades.leadMagnet.multiplier *= 2; } },
            betterEmailSubject: { name: 'Better Email Subject', desc: (g) => `+1% bonus lead chance per Sales staff.`, cost: 20, costMultiplier: 3, maxLevel: 0, onPurchase: (g) => { g.upgrades.betterEmailSubject.level++; } },
            referralProgram: { name: 'Referral Program', desc: (g) => `Passively generate ${g.upgrades.referralProgram.level} lead(s) every 10 seconds.`, cost: 15, costMultiplier: 3, maxLevel: 0, onPurchase: (g) => { g.upgrades.referralProgram.level++; } },
            aggressiveFollowup: { name: 'Aggressive Followup', desc: (g) => `+5% chance per click to instantly develop a lead. Current: ${(g.upgrades.aggressiveFollowup.chance * 100).toFixed(0)}%`, cost: 7, costMultiplier: 3, maxLevel: 0, chance: 0, onPurchase: (g) => { g.upgrades.aggressiveFollowup.level++; g.upgrades.aggressiveFollowup.chance += 0.05; } },
        }
    },
    accounts: {
        name: 'Accounts Upgrades',
        upgrades: {
            asiyasHelp: { name: 'Asiya’s Help', desc: (g) => `Reduces clicks needed to develop a lead by ${g.upgrades.asiyasHelp.clicksReduction}. Current: ${g.clicksToDevelopLead}`, cost: 3, costMultiplier: 5, maxLevel: 0, clicksReduction: 15, onPurchase: (g) => { g.upgrades.asiyasHelp.level++; g.clicksToDevelopLead = Math.max(10, g.clicksToDevelopLead - g.upgrades.asiyasHelp.clicksReduction); }, isMaxed: (g) => g.clicksToDevelopLead <= 10 },
            secondMonitor: { name: '2nd Monitor', desc: () => `Each manual click on "Develop Lead" counts as two.`, cost: 10, oneTime: true, onPurchase: (g) => { g.upgrades.secondMonitor.purchased = true; } },
            newAdNetworks: { name: 'New Ad Networks', desc: (g) => `Each developed lead earns +$${g.upgrades.newAdNetworks.incomeBonus.toFixed(2)} more. Current: $${g.incomePerLead.toFixed(2)}`, cost: 10, costMultiplier: 2, maxLevel: 0, incomeBonus: 0.01, onPurchase: (g) => { g.upgrades.newAdNetworks.level++; g.incomePerLead += g.upgrades.newAdNetworks.incomeBonus; } },
            backgroundMusic: { name: 'Background Music', desc: (g) => `+${g.upgrades.backgroundMusic.level} click/sec to each Accounts staff.`, cost: 80, costMultiplier: 15, maxLevel: 0, onPurchase: (g) => { g.upgrades.backgroundMusic.level++; } },
            cpmOptimization: { name: 'CPM Optimization', desc: (g) => `${(g.upgrades.cpmOptimization.chance * 100).toFixed(0)}% chance to double money from a lead.`, cost: 500, costMultiplier: 3, maxLevel: 0, chance: 0, onPurchase: (g) => { g.upgrades.cpmOptimization.level++; g.upgrades.cpmOptimization.chance = Math.min(1, g.upgrades.cpmOptimization.chance + 0.2); }, isMaxed: (g) => g.upgrades.cpmOptimization.chance >= 1 },
        }
    },
    global: {
        name: 'Global Upgrades',
        upgrades: {
            nytPuzzles: { name: 'NYT Puzzles', desc: (g) => `Boosts Sales/Account upgrade effectiveness by x1.5.`, cost: 15, oneTime: true, onPurchase: (g) => { g.upgrades.nytPuzzles.purchased = true; g.upgrades.betterLeadForms.chanceIncrease *= 1.5; g.upgrades.asiyasHelp.clicksReduction = Math.round(g.upgrades.asiyasHelp.clicksReduction * 1.5); } },
            corporateCulture: { name: 'Corporate Culture', desc: () => `All manual clicks count as two.`, cost: 50, oneTime: true, onPurchase: (g) => { g.upgrades.corporateCulture.purchased = true; } },
            sycGlobal: { name: 'СУЦ', desc: () => `All income from developing leads is increased by 20%.`, cost: 250, oneTime: true, multiplier: 1.2, onPurchase: (g) => { g.upgrades.sycGlobal.purchased = true; } },
            amirsAutomation: { name: 'Amir’s Automation', desc: () => `Automated staff work twice as fast.`, cost: 5000, oneTime: true, onPurchase: (g) => { g.upgrades.amirsAutomation.purchased = true; } },
            coffeeMachine: { name: 'Coffee Machine', desc: () => `Allows holding down the mouse button to click rapidly.`, cost: 100, oneTime: true, onPurchase: (g) => { g.upgrades.coffeeMachine.purchased = true; /* Call a method on the game instance later */ } },
        }
    }
};
