// game.js
// Main game logic for Monetization Simulator.
// Assumes all other scripts (dom, staff, upgrades, achievements, events, ui) are loaded.

const emailContent = `Dear Valued Client,\n\nWe hope this message finds you well...`;
const adScriptContent = `// Monetization Script\nfunction showAd() {...}`;

class MonetizationGame {
    constructor() {
        this.isProcessingClick = false;
        this.load();
        this.activeIntervals = [];
        this.holdInterval = null;
        this.isKeyPressed = {};
    }

    // --- State Management ---
    getDefaultState() {
        return {
            leads: 0,
            money: 0,
            developClicks: 0,
            incomePerLead: 0.02,
            incomeRate: 0,
            clicksToDevelopLead: 100,
            hiredStaff: new Set(),
            staffCosts: {
                sales: staffData.sales.cost,
                accounts: staffData.accounts.cost,
                products: staffData.products.cost
            },
            upgrades: this.getInitialUpgradeState(),
            achievements: this.getInitialAchievementState(),
            stats: {
                totalMoneyEarned: 0,
                totalManualClicks: 0,
                totalLeadsGenerated: 0,
                playTime: 0,
                waitedOutServerCrash: false,
            },
            settings: {
                offlineProgress: false,
                staffTextAnimation: true,
                allStaffSpeedMultiplier: 1
            },
            lastSavedTime: Date.now(),
            activeEvent: null,
            eventCooldown: 180,
            isLeadDevelopmentHalted: false,
            isLeadGenerationHalted: false,
            emailCharIndex: 0,
            adCharIndex: 0,
        };
    }

    getInitialUpgradeState() {
        const state = {};
        for (const category in upgradeData) {
            for (const key in upgradeData[category].upgrades) {
                const u = upgradeData[category].upgrades[key];
                state[key] = u.oneTime ? { purchased: false } : { level: 0, ...u };
            }
        }
        return state;
    }

    getInitialAchievementState() {
        const state = {};
        for (const key in achievementData) {
            state[key] = { unlocked: false };
        }
        return state;
    }

    save() {
        const stateToSave = { ...this };
        delete stateToSave.activeIntervals;
        delete stateToSave.holdInterval;
        delete stateToSave.isKeyPressed;
        stateToSave.hiredStaff = Array.from(this.hiredStaff);
        stateToSave.lastSavedTime = Date.now();
        localStorage.setItem('monetizationSimSave_v2', JSON.stringify(stateToSave));
    }

    load() {
        const defaultState = this.getDefaultState();
        Object.assign(this, defaultState);
        const savedData = localStorage.getItem('monetizationSimSave_v2');
        if (!savedData) return;
        try {
            const savedState = JSON.parse(savedData);
            const finalState = { ...defaultState, ...savedState };
            const mergedUpgrades = { ...defaultState.upgrades };
            if (savedState.upgrades) {
                for (const key in mergedUpgrades) {
                    if (savedState.upgrades[key]) {
                        mergedUpgrades[key] = { ...mergedUpgrades[key], ...savedState.upgrades[key] };
                    }
                }
            }
            finalState.upgrades = mergedUpgrades;
            finalState.achievements = { ...defaultState.achievements, ...(savedState.achievements || {}) };
            finalState.stats = { ...defaultState.stats, ...(savedState.stats || {}) };
            finalState.settings = { ...defaultState.settings, ...(savedState.settings || {}) };
            Object.assign(this, finalState);
            this.hiredStaff = new Set(savedState.hiredStaff || []);
            this.handleOfflineProgress(savedState.lastSavedTime || Date.now());
        } catch (error) {
            console.error("Failed to load saved data, resetting.", error);
            Object.assign(this, defaultState);
        }
    }

    handleOfflineProgress(lastSavedTime) {
        if (!this.settings.offlineProgress) return;
        const timeDiffSeconds = Math.floor((Date.now() - lastSavedTime) / 1000);
        if (timeDiffSeconds > 5) {
            const offlineEarnings = (this.incomeRate || 0) * timeDiffSeconds * 0.5;
            if (offlineEarnings > 0) {
                this.money += offlineEarnings;
                this.stats.totalMoneyEarned += offlineEarnings;
                UI.showWelcomeBackModal(offlineEarnings);
            }
        }
    }

    reset() {
        localStorage.removeItem('monetizationSimSave_v2');
        location.reload();
    }

    // --- Core Gameplay ---
    getPassiveIncome() { return this.incomeRate; }

    getLeadChance() {
        let chance = 0.02;
        chance += this.upgrades.betterLeadForms.level * this.upgrades.betterLeadForms.chanceIncrease;
        chance += 0.01 * this.getStaffCount('sales') * this.upgrades.betterEmailSubject.level;
        if (this.activeEvent && this.activeEvent.key === 'negativePR') chance /= 2;
        return chance;
    }

    tryGenerateLead(isManualClick = false) {
        if (this.isLeadGenerationHalted) return;
        if (isManualClick) this.stats.totalManualClicks++;
        if (isManualClick || this.settings.staffTextAnimation) {
            this.emailCharIndex = (this.emailCharIndex + 1) % (emailContent.length + 1);
        }
        const performAction = () => {
            if (Math.random() < this.getLeadChance()) {
                let leadsGained = this.upgrades.leadMagnet.multiplier;
                if (this.activeEvent && this.activeEvent.key === 'viralMarketing') leadsGained *= 5;
                this.leads += leadsGained;
                this.stats.totalLeadsGenerated += leadsGained;
                if (isManualClick) UI.createFeedbackPopup(`+${leadsGained} Lead`, DOM.generateLeadBtn);
            }
            if (isManualClick && Math.random() < this.upgrades.aggressiveFollowup.chance) this.developLead(false);
        };
        const clickMultiplier = isManualClick && this.upgrades.corporateCulture.purchased ? 2 : 1;
        for (let i = 0; i < clickMultiplier; i++) performAction();
        if (isManualClick) {
            UI.updateSalesScreen(this);
            UI.updateGlobalStats(this);
        }
    }

    developLead(isManualClick = false) {
        if (this.isLeadDevelopmentHalted) return;
        if (this.leads <= 0) {
             if (isManualClick || this.settings.staffTextAnimation) {
                this.adCharIndex = (this.adCharIndex + 1) % (adScriptContent.length + 1);
                if (isManualClick) UI.updateAccountScreen(this);
            }
            return;
        }
        if (isManualClick) this.stats.totalManualClicks++;
        if (isManualClick || this.settings.staffTextAnimation) {
             this.adCharIndex = (this.adCharIndex + 1) % (adScriptContent.length + 1);
        }
        let clickMultiplier = 1;
        if (isManualClick) {
            if (this.upgrades.secondMonitor.purchased) clickMultiplier *= 2;
            if (this.upgrades.corporateCulture.purchased) clickMultiplier *= 2;
        }
        this.developClicks += clickMultiplier;
        while (this.developClicks >= this.clicksToDevelopLead && this.leads > 0) {
            const incomeFromLead = this.getIncomeFromLead();
            this.incomeRate += incomeFromLead;
            this.developClicks -= this.clicksToDevelopLead;
            this.leads--;
            if (isManualClick) UI.createFeedbackPopup(`+$${incomeFromLead.toFixed(2)}/s`, DOM.developLeadBtn);
        }
        if (isManualClick) {
            UI.updateAccountScreen(this);
            UI.updateGlobalStats(this);
        }
    }
    
    getIncomeFromLead() {
        let income = this.incomePerLead;
        if (this.upgrades.sycGlobal.purchased) income *= upgradeData.global.upgrades.sycGlobal.multiplier;
        if (Math.random() < this.upgrades.cpmOptimization.chance) income *= 2;
        if (this.activeEvent && this.activeEvent.key === 'bullMarket') income *= 2;
        if (this.activeEvent && this.activeEvent.key === 'adNetworkOutage') income /= 2;
        return income;
    }

    hireStaff(type, name) {
        if (this.isProcessingClick) return;
        this.isProcessingClick = true;
        try {
            const cost = this.staffCosts[type];
            if (this.money < cost) return;
            this.money -= cost;
            this.hiredStaff.add(name);
            this.staffCosts[type] *= staffData[type].costMultiplier;
            if (type === 'products') this.incomeRate += 5;
            this.restartIntervals();
            UI.renderAll(this);
            checkAchievements(this);
        } finally {
            this.isProcessingClick = false;
        }
    }

    buyUpgrade(categoryKey, upgradeKey) {
        if (this.isProcessingClick) return;
        this.isProcessingClick = true;
        try {
            const upgradeDef = upgradeData[categoryKey].upgrades[upgradeKey];
            const upgradeState = this.upgrades[upgradeKey];
            const cost = upgradeDef.oneTime ? upgradeDef.cost : upgradeState.cost;
            if (this.money < cost) return;
            this.money -= cost;
            upgradeDef.onPurchase(this);
            if (!upgradeDef.oneTime) upgradeState.cost *= upgradeDef.costMultiplier;
            this.restartIntervals();
            UI.renderAll(this);
        } finally {
            this.isProcessingClick = false;
        }
    }
    
    isStaffUnlocked(name) {
        if (name === 'Azret') return true;
        if (name === 'Artyom') return this.hiredStaff.has('Azret');
        if (name === 'Asiya') return this.hiredStaff.has('Artyom');
        if (name === 'Emil') return this.hiredStaff.has('Asiya');
        if (!['Azret', 'Artyom', 'Asiya', 'Emil'].includes(name)) return this.hiredStaff.has('Asiya');
        return false;
    }

    // --- Rate & Interval Calculation ---
    getBaseStaffInterval() {
        let baseInterval = 500;
        if (this.upgrades.amirsAutomation.purchased) baseInterval /= 2;
        if (this.activeEvent) {
            if (this.activeEvent.key === 'productivityGuru') baseInterval *= 0.5;
            if (this.activeEvent.key === 'teamBurnout') baseInterval *= 1.25;
        }
        if (this.settings.allStaffSpeedMultiplier) baseInterval *= this.settings.allStaffSpeedMultiplier;
        return baseInterval;
    }

    getEffectiveSalesStaffInterval() { return this.getBaseStaffInterval() * 1.5; }
    getEffectiveAccountsStaffInterval() {
        let interval = this.getBaseStaffInterval();
        if (this.activeEvent && this.activeEvent.key === 'accountRevitalization') interval *= 0.75;
        return interval;
    }

    getLeadGenerationRatePerSecond() {
        if (this.isLeadGenerationHalted) return 0;
        let rate = 0;
        const salesStaffCount = this.getStaffCount('sales');
        const interval = this.getEffectiveSalesStaffInterval();
        if (salesStaffCount > 0 && interval > 0) {
            rate += (salesStaffCount * 1000 / interval) * this.getLeadChance();
        }
        if (this.upgrades.referralProgram.level > 0) rate += this.upgrades.referralProgram.level / 10;
        if (this.activeEvent && this.activeEvent.key === 'viralMarketing') rate *= 5;
        return rate;
    }

    getLeadDevelopmentRatePerSecond() {
        if (this.isLeadDevelopmentHalted || (this.activeEvent && this.activeEvent.key === 'serverCrashPenalty')) return 0;
        let rate = 0;
        const accountsStaffCount = this.getStaffCount('accounts');
        const interval = this.getEffectiveAccountsStaffInterval();
        if (accountsStaffCount > 0 && interval > 0) {
            rate += (accountsStaffCount * 1000) / interval;
        }
        if (this.upgrades.backgroundMusic.level > 0) rate += accountsStaffCount * this.upgrades.backgroundMusic.level;
        return rate;
    }
    
    getStaffCount(type) {
        return [...this.hiredStaff].filter(name => staffData[type].members.includes(name)).length;
    }

    // --- Game Loop & Intervals ---
    mainLoop() {
        let incomeThisTick = this.incomeRate;
        if (this.activeEvent && this.activeEvent.key === 'serverCrashPenalty') incomeThisTick = 0;
        this.money += incomeThisTick;
        this.stats.totalMoneyEarned += incomeThisTick;

        if (this.activeEvent) {
            this.activeEvent.timeLeft--;
            if (this.activeEvent.timeLeft <= 0) endEvent(this);
        } else if (this.hiredStaff.size > 0) {
            this.eventCooldown--;
            if (this.eventCooldown <= 0) triggerRandomEvent(this);
        }
        
        this.stats.playTime++;
        checkAchievements(this);
        UI.renderAll(this);
        this.save();
    }
    
    restartIntervals() {
        this.activeIntervals.forEach(clearInterval);
        this.activeIntervals = [];
        const salesInterval = this.getEffectiveSalesStaffInterval();
        const accountsInterval = this.getEffectiveAccountsStaffInterval();
        this.hiredStaff.forEach(name => {
            if (staffData.sales.members.includes(name) && salesInterval > 0) {
                this.activeIntervals.push(setInterval(() => { this.tryGenerateLead(false); UI.triggerStaffAnimation(name); }, salesInterval));
            } else if (staffData.accounts.members.includes(name) && accountsInterval > 0) {
                this.activeIntervals.push(setInterval(() => { this.developLead(false); UI.triggerStaffAnimation(name); }, accountsInterval));
            }
        });
        if (this.upgrades.referralProgram.level > 0) {
            this.activeIntervals.push(setInterval(() => { this.leads += this.upgrades.referralProgram.level; }, 10000));
        }
        if (this.upgrades.backgroundMusic.level > 0) {
            this.activeIntervals.push(setInterval(() => {
                const clicks = this.getStaffCount('accounts') * this.upgrades.backgroundMusic.level;
                for (let i = 0; i < clicks; i++) this.developLead(false);
            }, 1000));
        }
    }

    // --- Event Listeners ---
    setupEventListeners() {
        DOM.navButtons.addEventListener('click', e => {
            if (e.target.tagName === 'BUTTON') UI.showScreen(e.target.dataset.screen);
        });
        DOM.generateLeadBtn.addEventListener('click', () => this.tryGenerateLead(true));
        DOM.developLeadBtn.addEventListener('click', () => this.developLead(true));
        document.addEventListener('keydown', (event) => {
            if (this.isKeyPressed[event.code]) return;
            this.isKeyPressed[event.code] = true;
            const activeScreen = document.querySelector('.screen.active');
            if (!activeScreen) return;
            switch (activeScreen.id) {
                case 'salesScreen': this.tryGenerateLead(true); break;
                case 'accountScreen': this.developLead(true); break;
            }
        });
        document.addEventListener('keyup', (event) => { this.isKeyPressed[event.code] = false; });
        DOM.staffForHire.addEventListener('click', e => {
            if (e.target.tagName === 'BUTTON' && e.target.dataset.name) this.hireStaff(e.target.dataset.type, e.target.dataset.name);
        });
        DOM.upgradesContainer.addEventListener('click', e => {
            const button = e.target.closest('button[data-upgrade]');
            if (button) {
                const upgradeKey = button.dataset.upgrade;
                const categoryKey = button.closest('[data-category]').dataset.category;
                this.buyUpgrade(categoryKey, upgradeKey);
            }
        });
        DOM.manualSaveBtn.addEventListener('click', () => {
            this.save();
            const originalText = DOM.manualSaveBtn.textContent;
            DOM.manualSaveBtn.textContent = 'Saved!';
            setTimeout(() => { DOM.manualSaveBtn.textContent = originalText; }, 1500);
        });
        DOM.resetProgressBtn.addEventListener('click', () => this.reset());
        DOM.toggleOfflineProgress.addEventListener('click', () => { this.settings.offlineProgress = !this.settings.offlineProgress; UI.renderSettings(this); });
        DOM.toggleStaffAnimation.addEventListener('click', () => { this.settings.staffTextAnimation = !this.settings.staffTextAnimation; UI.renderSettings(this); });
        DOM.welcomeModal.closeBtn.addEventListener('click', () => DOM.welcomeModal.el.classList.add('hidden'));
        DOM.eventModal.closeBtn.addEventListener('click', () => DOM.eventModal.el.classList.add('hidden'));
        DOM.eventDetailsModal.closeBtn.addEventListener('click', () => DOM.eventDetailsModal.el.classList.add('hidden'));
        const timer = DOM.activeEventTimer.el;
        timer.onmouseover = () => showEventDetails(this);
        timer.onclick = () => showEventDetails(this);
    }
    
    applyCoffeeMachineListeners() {
        const setupHold = (btn, action) => {
            const startHold = (e) => {
                e.preventDefault();
                if (this.holdInterval) clearInterval(this.holdInterval);
                action();
                this.holdInterval = setInterval(action, 100);
            };
            const stopHold = () => clearInterval(this.holdInterval);
            btn.onmousedown = startHold;
            btn.onmouseup = stopHold;
            btn.onmouseleave = stopHold;
            btn.ontouchstart = startHold;
            btn.ontouchend = stopHold;
        };
        setupHold(DOM.generateLeadBtn, () => this.tryGenerateLead(true));
        setupHold(DOM.developLeadBtn, () => this.developLead(true));
    }

    start() {
        this.setupEventListeners();
        if (this.upgrades.coffeeMachine.purchased) {
            this.applyCoffeeMachineListeners();
        }
        this.restartIntervals();
        UI.renderAll(this);
        setInterval(() => this.mainLoop(), 1000);
    }
}

// --- Game Initialization ---
window.onload = () => {
    const game = new MonetizationGame();
    game.start();
};
