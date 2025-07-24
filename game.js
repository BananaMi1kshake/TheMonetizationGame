// game.js
// Make sure dom.js, upgrades.js, achievements.js, events.js are loaded before this file.

const staffData = {
    sales: {
        name: 'Sales',
        cost: 5,
        costMultiplier: 3.5,
        members: ['Artyom', 'Alan', 'Aruna', 'Dora', 'Syrym', 'Aidos', 'Alimzhan', 'Anna', 'Bolat', 'Yerbol', 'Madi'],
    },
    accounts: {
        name: 'Accounts',
        cost: 5,
        costMultiplier: 3.5,
        members: ['Azret', 'Asiya', 'Daniil', 'Aizhan', 'Amir', 'Akzhan', 'Anuar', 'Hakim', 'Saniya', 'Sanzhar'],
    },
    products: {
        name: 'Products',
        cost: 100,
        costMultiplier: 1, // No multiplier for single member
        members: ['Emil'],
    }
};

const emailContent = `Dear Valued Client,\n\nWe hope this message finds you well. I'm writing to follow up on our previous conversation regarding the exciting monetization opportunities available to you...`;
const adScriptContent = `// Monetization Script\nfunction showAd() {\n  const ad = document.createElement('div');\n  ad.className = 'ad-banner';\n  ad.innerText = 'This space is monetized!';\n  document.body.appendChild(ad);\n}\nsetInterval(showAd, 5000);`;


class MonetizationGame {
    constructor() {
        this.isProcessingClick = false;
        this.load(); // Load game state or set defaults
        this.activeIntervals = [];
        this.holdInterval = null;
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
                allStaffSpeedMultiplier: 1 // For global staff speed events like 'Staff Quitting'
            },
            lastSavedTime: Date.now(),
            activeEvent: null,
            eventCooldown: 180,
            // Add these for events that halt actions
            isLeadDevelopmentHalted: false, // For 'Core Feature Bug'
            isLeadGenerationHalted: false,  // For 'Data Breach'
            // Non-saved transient state
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
        stateToSave.hiredStaff = Array.from(this.hiredStaff);
        stateToSave.lastSavedTime = Date.now();
        localStorage.setItem('monetizationSimSave_v2', JSON.stringify(stateToSave));
    }

    load() {
        const savedData = localStorage.getItem('monetizationSimSave_v2');
        const defaultState = this.getDefaultState();

        if (savedData) {
            try {
                const savedState = JSON.parse(savedData);
                // Start with the default state to ensure all properties exist
                Object.assign(this, defaultState);
                // Overwrite with saved top-level properties
                Object.assign(this, savedState);

                // Perform a deep merge for nested objects to prevent issues with old saves
                this.hiredStaff = new Set(savedState.hiredStaff || []);
                
                const defaultUpgrades = defaultState.upgrades;
                const savedUpgrades = savedState.upgrades || {};
                const mergedUpgrades = {};
                for (const key in defaultUpgrades) {
                    if (defaultUpgrades.hasOwnProperty(key)) {
                        mergedUpgrades[key] = { ...defaultUpgrades[key], ...(savedUpgrades[key] || {}) };
                    }
                }
                this.upgrades = mergedUpgrades;

                this.achievements = { ...defaultState.achievements, ...savedState.achievements };
                this.stats = { ...defaultState.stats, ...savedState.stats };
                this.staffCosts = { ...defaultState.staffCosts, ...savedState.staffCosts };
                this.settings = { ...defaultState.settings, ...savedState.settings };

                this.handleOfflineProgress(savedState.lastSavedTime || Date.now());
            } catch (error) {
                console.error("Failed to load saved data, starting fresh.", error);
                Object.assign(this, defaultState);
            }
        } else {
            Object.assign(this, defaultState);
        }
    }
    
    handleOfflineProgress(lastSavedTime) {
        if (!this.settings.offlineProgress) return;

        const timeDiffSeconds = Math.floor((Date.now() - (lastSavedTime || Date.now())) / 1000);
        if (timeDiffSeconds > 5) {
            const offlineEarnings = (this.incomeRate || 0) * timeDiffSeconds * 0.5;
            if (offlineEarnings > 0) {
                this.money += offlineEarnings;
                this.stats.totalMoneyEarned += offlineEarnings;
                this.showWelcomeBackModal(offlineEarnings);
            }
        }
    }

    reset() {
        if (confirm("Are you sure you want to reset all your progress? This cannot be undone.")) {
            localStorage.removeItem('monetizationSimSave_v2');
            location.reload();
        }
    }

    // --- Core Gameplay ---
    getLeadChance() {
        let chance = 0.02; // Increased base chance
        chance += this.upgrades.betterLeadForms.level * this.upgrades.betterLeadForms.chanceIncrease;
        chance += 0.01 * this.getStaffCount('sales') * this.upgrades.betterEmailSubject.level;
        if (this.activeEvent && this.activeEvent.key === 'negativePR') {
            chance /= 2;
        }
        return chance;
    }

    getPassiveIncome() {
        return this.incomeRate;
    }

    tryGenerateLead(isManualClick = false) {
        if (this.isLeadGenerationHalted) { // For Data Breach event
            if (isManualClick || this.settings.staffTextAnimation) {
                if (this.emailCharIndex >= emailContent.length) {
                    this.emailCharIndex = 0;
                }
                this.emailCharIndex++;
                if (isManualClick) this.updateSalesScreen(); // Update only if manual click
            }
            return;
        }

        if (isManualClick) {
            this.stats.totalManualClicks++;
        }

        if (isManualClick || this.settings.staffTextAnimation) {
            if (this.emailCharIndex >= emailContent.length) {
                this.emailCharIndex = 0;
            }
            this.emailCharIndex++;
        }

        const performAction = () => {
            if (Math.random() < this.getLeadChance()) {
                let leadsGained = this.upgrades.leadMagnet.multiplier;
                if (this.activeEvent && this.activeEvent.key === 'viralMarketing') {
                    leadsGained *= 5;
                }
                this.leads += leadsGained;
                this.stats.totalLeadsGenerated += leadsGained;
                if (isManualClick) this.createFeedbackPopup(`+${leadsGained} Lead`, DOM.generateLeadBtn);
            }
            if (isManualClick && Math.random() < this.upgrades.aggressiveFollowup.chance) {
                this.developLead(false);
            }
        };

        const clickMultiplier = isManualClick && this.upgrades.corporateCulture.purchased ? 2 : 1;
        for (let i = 0; i < clickMultiplier; i++) performAction();
        
        if (isManualClick) {
            this.updateSalesScreen();
            this.updateGlobalStats();
        }
    }

    developLead(isManualClick = false) {
        if (this.isLeadDevelopmentHalted) { // For Core Feature Bug event
            if (this.leads <= 0 && (isManualClick || this.settings.staffTextAnimation)) {
                 if (this.adCharIndex >= adScriptContent.length) {
                    this.adCharIndex = 0;
                }
                this.adCharIndex++;
                if (isManualClick) this.updateAccountScreen(); // Update only if manual click
            }
            return;
        }

        if (this.leads <= 0) {
            if (isManualClick) {
                 if (this.adCharIndex >= adScriptContent.length) {
                    this.adCharIndex = 0;
                }
                this.adCharIndex++;
                this.updateAccountScreen();
            }
            return;
        }
        
        if (isManualClick) {
            this.stats.totalManualClicks++;
        }

        if (isManualClick || this.settings.staffTextAnimation) {
            if (this.adCharIndex >= adScriptContent.length) {
                this.adCharIndex = 0;
            }
            this.adCharIndex++;
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
            if (isManualClick) this.createFeedbackPopup(`+$${incomeFromLead.toFixed(2)}/s`, DOM.developLeadBtn);
        }
        
        if (isManualClick) {
            this.updateAccountScreen();
            this.updateGlobalStats();
        }
    }
    
    getIncomeFromLead() {
        let income = this.incomePerLead;
        // Fix for СУЦ NaN error: Access multiplier directly from upgradeData definition
        if (this.upgrades.sycGlobal.purchased) {
            income *= upgradeData.global.upgrades.sycGlobal.multiplier;
        }
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
            if (this.money < cost) {
                return;
            }
            this.money -= cost;
            this.hiredStaff.add(name);
            this.staffCosts[type] *= staffData[type].costMultiplier;

            if (type === 'products') {
                this.incomeRate += 5; // Emil's direct income
            }

            this.restartIntervals();
            this.renderAll();
            this.checkAchievements();
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

            if (this.money < cost) {
                return;
            }
            this.money -= cost;
            upgradeDef.onPurchase(this);

            if (!upgradeDef.oneTime) {
                upgradeState.cost *= upgradeDef.costMultiplier;
            }

            this.restartIntervals();
            this.renderAll();
        } finally {
            this.isProcessingClick = false;
        }
    }
    
    isStaffUnlocked(name) {
        if (name === 'Azret') return true;
        if (name === 'Artyom') return this.hiredStaff.has('Azret');
        if (name === 'Asiya') return this.hiredStaff.has('Artyom');
        if (name === 'Emil') return this.hiredStaff.has('Asiya');

        // All other staff are unlocked after Asiya
        if (name !== 'Azret' && name !== 'Artyom' && name !== 'Asiya' && name !== 'Emil') {
            return this.hiredStaff.has('Asiya');
        }
        return false;
    }

    // --- NEW HELPER METHODS FOR CALCULATING STAFF INTERVALS ---

    // Gets the base interval for staff, considering global speed effects
    getBaseStaffInterval() {
        let baseInterval = 500; // Original base speed in ms
        if (this.upgrades.amirsAutomation.purchased) {
            baseInterval /= 2; // 'Amir’s Automation' makes automated staff twice as fast
        }
        // Apply global speed modifiers from events
        if (this.activeEvent) {
            if (this.activeEvent.key === 'productivityGuru') baseInterval *= 0.5; // 'Productivity Guru Visits' makes all staff 50% faster
            if (this.activeEvent.key === 'teamBurnout') baseInterval *= 1.25; // 'Team Burnout' makes all staff 25% slower (500 * 1.25 = 625ms)
        }
        // Apply general allStaffSpeedMultiplier from events like 'Staff Quitting'
        if (this.settings.allStaffSpeedMultiplier) {
            baseInterval *= this.settings.allStaffSpeedMultiplier;
        }
        return baseInterval;
    }

    // Gets the effective interval for Sales staff
    getEffectiveSalesStaffInterval() {
        let interval = this.getBaseStaffInterval() * 1.5; // Sales staff base interval is 1.5x the base
        // Add any sales-specific event modifiers here if you implement them
        return interval;
    }

    // Gets the effective interval for Accounts staff
    getEffectiveAccountsStaffInterval() {
        let interval = this.getBaseStaffInterval(); // Accounts staff base interval
        // 'Account Revitalization' specifically speeds up Accounts staff
        if (this.activeEvent && this.activeEvent.key === 'accountRevitalization') {
            interval *= 0.75; // 25% faster for accounts staff
        }
        return interval;
    }

    // --- NEW RATE CALCULATION METHODS ---

    // Calculates the total passive Lead Generation Rate (Successful Leads per Second)
    getLeadGenerationRatePerSecond() {
        let totalPassiveLeadsPerSecond = 0;
        const salesStaffCount = this.getStaffCount('sales');
        const effectiveSalesInterval = this.getEffectiveSalesStaffInterval();
        const effectiveLeadChance = this.getLeadChance(); // Get current calculated lead chance

        // Contribution from Sales Staff
        if (salesStaffCount > 0 && effectiveSalesInterval > 0 && isFinite(effectiveSalesInterval)) {
            // Clicks per second from staff * chance per click = successful leads per second
            totalPassiveLeadsPerSecond += (salesStaffCount * 1000) / effectiveSalesInterval * effectiveLeadChance;
        }

        // Contribution from 'Referral Program' upgrade
        if (this.upgrades.referralProgram.level > 0) {
            totalPassiveLeadsPerSecond += this.upgrades.referralProgram.level / 10; // 1 lead per 10 seconds per level
        }

        // Apply 'Viral Marketing Campaign' multiplier if active
        if (this.activeEvent && this.activeEvent.key === 'viralMarketing') {
            totalPassiveLeadsPerSecond *= 5; // Generates 5x leads
        }

        // Apply 'Negative PR' effect if active (its impact is already factored into getLeadChance())

        // If 'Data Breach' event is active, lead generation is halted
        if (this.isLeadGenerationHalted) {
            return 0;
        }

        return totalPassiveLeadsPerSecond;
    }

    // Calculates the total passive Lead Development Rate (Clicks per Second)
    getLeadDevelopmentRatePerSecond() {
        let totalClicksPerSecond = 0;
        const accountsStaffCount = this.getStaffCount('accounts');
        const effectiveAccountsInterval = this.getEffectiveAccountsStaffInterval();

        // Contribution from Accounts Staff
        if (accountsStaffCount > 0 && effectiveAccountsInterval > 0 && isFinite(effectiveAccountsInterval)) {
            totalClicksPerSecond += (accountsStaffCount * 1000) / effectiveAccountsInterval;
        }

        // Contribution from 'Background Music' upgrade
        if (this.upgrades.backgroundMusic.level > 0) {
            totalClicksPerSecond += accountsStaffCount * this.upgrades.backgroundMusic.level; // Extra clicks per second per Accounts staff
        }

        // If 'Server Crash Penalty' event is active, all income and lead development is halted
        if (this.activeEvent && this.activeEvent.key === 'serverCrashPenalty') {
            return 0;
        }

        // If 'Core Feature Bug' event is active, lead development is halted
        if (this.isLeadDevelopmentHalted) {
            return 0;
        }

        // This rate is in "clicks per second". If you want "leads developed per second",
        // you'd divide by this.clicksToDevelopLead, but that would make it more complex
        // due to fractional leads. Displaying clicks/sec is often clearer for development rate.
        return totalClicksPerSecond;
    }


    // --- UI & Rendering ---
    renderAll() {
        this.updateGlobalStats();
        this.updateSalesScreen();
        this.updateAccountScreen();
        this.renderStaff();
        this.renderOfficeStaff(); // ADD THIS
        this.renderUpgrades();
        this.renderAchievements();
        this.renderStatistics();
        this.renderSettings();
    }

    updateGlobalStats() {
        DOM.globalLeadCount.textContent = this.leads;
        DOM.globalMoneyCount.textContent = this.money.toFixed(2);
        DOM.globalRate.textContent = this.getPassiveIncome().toFixed(2);

        // Update NEW rate displays
        DOM.globalLeadGenRate.textContent = this.getLeadGenerationRatePerSecond().toFixed(2) + '/s';
        DOM.globalLeadDevRate.textContent = this.getLeadDevelopmentRatePerSecond().toFixed(2) + '/s';
    }
    
    updateSalesScreen() {
        DOM.emailText.textContent = emailContent.substring(0, this.emailCharIndex);
    }

    updateAccountScreen() {
        DOM.adScriptText.textContent = adScriptContent.substring(0, this.adCharIndex);
        const progress = this.clicksToDevelopLead > 0 ? (this.developClicks / this.clicksToDevelopLead) * 100 : 0;
        DOM.progressBar.style.width = `${progress}%`;
    }

    renderStaff() {
        DOM.hiredStaffList.innerHTML = '';
        this.hiredStaff.forEach(staffName => {
            const li = document.createElement('li');
            const type = Object.keys(staffData).find(t => staffData[t].members.includes(staffName));
            
            // Add safeguard for unknown staff names (e.g., from old/corrupt saves)
            if (!type) {
                console.warn(`Hired staff member "${staffName}" not found in staffData. Skipping render for this staff.`);
                // You might choose to remove the invalid staff from hiredStaff here if you want to clean up saves
                // this.hiredStaff.delete(staffName);
                return; 
            }

            li.textContent = `${staffName} (${staffData[type].name})`;
            li.className = 'text-gray-700';
            DOM.hiredStaffList.appendChild(li);
        });

        DOM.staffForHire.innerHTML = '';
        for (const typeKey in staffData) {
            const typeInfo = staffData[typeKey];
            
            const unlockedMembers = typeInfo.members.filter(name => this.isStaffUnlocked(name));
            if (unlockedMembers.length === 0) continue;

            const categoryDiv = document.createElement('div');
            categoryDiv.innerHTML = `<h3 class="text-xl font-semibold mb-2">${typeInfo.name}</h3>`;
            const listDiv = document.createElement('div');
            listDiv.className = 'staff-list flex flex-wrap gap-2';

            unlockedMembers.forEach(name => {
                const btn = document.createElement('button');
                btn.className = 'px-3 py-1.5 rounded-md bg-yellow-400 text-yellow-900 font-semibold hover:bg-yellow-500 text-sm';
                btn.dataset.type = typeKey;
                btn.dataset.name = name;
                
                if (this.hiredStaff.has(name)) {
                    btn.textContent = 'Hired';
                    btn.disabled = true;
                } else {
                    btn.textContent = `Hire ${name} ($${this.staffCosts[typeKey].toFixed(2)})`;
                    btn.disabled = this.money < this.staffCosts[typeKey];
                }
                listDiv.appendChild(btn);
            });
            categoryDiv.appendChild(listDiv);
            DOM.staffForHire.appendChild(categoryDiv);
        }
    }

    // NEW FUNCTION TO RENDER STAFF IN OFFICE
    renderOfficeStaff() {
        DOM.salesOffice.innerHTML = '';
        DOM.accountsOffice.innerHTML = '';

        this.hiredStaff.forEach(name => {
            const staffChar = document.createElement('div');
            staffChar.className = 'staff-char';
            staffChar.id = `staff-visual-${name}`; // Unique ID for animation
            staffChar.innerHTML = `
                <div class="staff-head"></div>
                <div class="staff-body"></div>
                <div class="staff-name">${name}</div>
            `;

            if (staffData.sales.members.includes(name)) {
                DOM.salesOffice.appendChild(staffChar);
            } else if (staffData.accounts.members.includes(name)) {
                DOM.accountsOffice.appendChild(staffChar);
            }
            // "Products" staff like Emil won't be shown in these offices, but you could add a third office if desired.
        });
    }


    renderUpgrades() {
        DOM.upgradesContainer.innerHTML = '';
        for (const categoryKey in upgradeData) {
            const category = upgradeData[categoryKey];
            const categoryDiv = document.createElement('div');
            categoryDiv.innerHTML = `<h3 class="text-xl font-semibold border-b-2 border-gray-200 pb-2 mb-3">${category.name}</h3>`;
            const listDiv = document.createElement('div');
            listDiv.className = 'space-y-3';
            listDiv.dataset.category = categoryKey;

            for (const upgradeKey in category.upgrades) {
                const upgradeDef = category.upgrades[upgradeKey];

                if (upgradeKey === 'cpmOptimization' && !this.hiredStaff.has('Amir')) {
                    continue; 
                }

                const upgradeState = this.upgrades[upgradeKey];
                
                const isPurchased = upgradeDef.oneTime && upgradeState.purchased;
                const isMaxed = upgradeDef.isMaxed && upgradeDef.isMaxed(this);
                const cost = upgradeDef.oneTime ? upgradeDef.cost : upgradeState.cost;

                const item = document.createElement('div');
                item.className = 'bg-gray-50 p-4 rounded-lg shadow-sm flex justify-between items-center';
                item.innerHTML = `
                    <div>
                        <h4 class="font-bold text-lg">${upgradeDef.name} ${!upgradeDef.oneTime ? `<span class="text-sm font-normal bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">${upgradeState.level}</span>` : ''}</h4>
                        <p class="text-sm text-gray-600">${upgradeDef.desc(this)}</p>
                    </div>
                    <div class="text-right flex-shrink-0 ml-4">
                        <button data-upgrade="${upgradeKey}" class="px-4 py-2 rounded-md bg-blue-500 text-white font-semibold hover:bg-blue-600">Buy</button>
                        <p class="text-sm font-semibold mt-1">Cost: $${cost.toFixed(2)}</p>
                    </div>`;
                
                const button = item.querySelector('button');
                if (isPurchased || isMaxed || this.money < cost) {
                    button.disabled = true;
                    if(isPurchased) button.textContent = 'Purchased';
                    if(isMaxed) button.textContent = 'Maxed';
                }
                listDiv.appendChild(item);
            }
            categoryDiv.appendChild(listDiv);
            DOM.upgradesContainer.appendChild(categoryDiv);
        }
    }
    
    renderAchievements() {
        DOM.achievementsList.innerHTML = '';
        for (const key in achievementData) {
            const achDef = achievementData[key];
            const achState = this.achievements[key];
            const item = document.createElement('div');
            item.className = 'p-4 rounded-lg shadow-sm transition-all';
            if (achState.unlocked) {
                item.classList.add('bg-yellow-100', 'border', 'border-yellow-400');
                item.innerHTML = `<h4 class="font-bold text-yellow-800">${achDef.name}</h4><p class="text-sm text-yellow-700">${achDef.description}</p>`;
            } else {
                item.classList.add('bg-gray-200');
                item.innerHTML = `<h4 class="font-bold text-gray-500">Locked</h4><p class="text-sm text-gray-400">???</p>`;
            }
            DOM.achievementsList.appendChild(item);
        }
    }

    renderStatistics() {
        DOM.statisticsList.innerHTML = '';
        const createStat = (label, value) => {
            const statDiv = document.createElement('div');
            statDiv.className = 'bg-gray-200 p-3 rounded-lg';
            statDiv.innerHTML = `<span class="font-semibold">${label}:</span> ${value}`;
            DOM.statisticsList.appendChild(statDiv);
        };
        const formatTime = (seconds) => {
            const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
            const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
            const s = Math.floor(seconds % 60).toString().padStart(2, '0');
            return `${h}:${m}:${s}`;
        };
        createStat('Total Money Earned', `$${this.stats.totalMoneyEarned.toFixed(2)}`);
        createStat('Total Leads Generated', this.stats.totalLeadsGenerated);
        createStat('Manual Clicks', this.stats.totalManualClicks);
        createStat('Play Time', formatTime(this.stats.playTime));
    }

    renderSettings() {
        if (this.settings.offlineProgress) {
            DOM.toggleOfflineProgress.textContent = 'ON';
            DOM.toggleOfflineProgress.className = 'px-4 py-1 rounded-full font-semibold text-sm bg-green-500 text-white';
        } else {
            DOM.toggleOfflineProgress.textContent = 'OFF';
            DOM.toggleOfflineProgress.className = 'px-4 py-1 rounded-full font-semibold text-sm bg-red-500 text-white';
        }

        if (this.settings.staffTextAnimation) {
            DOM.toggleStaffAnimation.textContent = 'ON';
            DOM.toggleStaffAnimation.className = 'px-4 py-1 rounded-full font-semibold text-sm bg-green-500 text-white';
        } else {
            DOM.toggleStaffAnimation.textContent = 'OFF';
            DOM.toggleStaffAnimation.className = 'px-4 py-1 rounded-full font-semibold text-sm bg-red-500 text-white';
        }
    }

    // --- Achievements & Popups ---
    checkAchievements() {
        let changed = false;
        for (const key in achievementData) {
            if (!this.achievements[key].unlocked && achievementData[key].condition(this)) {
                this.achievements[key].unlocked = true;
                this.showAchievementPopup(achievementData[key]);
                changed = true;
            }
        }
        if (changed) this.renderAchievements();
    }
    
    // NEW function to trigger animation on a staff character
    triggerStaffAnimation(name) {
        const staffVisual = document.getElementById(`staff-visual-${name}`);
        if (staffVisual) {
            staffVisual.classList.add('is-working');
            // Remove the class after the animation finishes to allow re-triggering
            setTimeout(() => {
                staffVisual.classList.remove('is-working');
            }, 400); // Must match animation duration in CSS
        }
    }

    showAchievementPopup(achievement) {
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
    
    showWelcomeBackModal(earnings) {
        DOM.welcomeModal.earnings.textContent = `$${earnings.toFixed(2)}`;
        DOM.welcomeModal.el.classList.remove('hidden');
    }

    createFeedbackPopup(text, element) {
        const rect = element.getBoundingClientRect();
        const popup = document.createElement('div');
        popup.textContent = text;
        popup.className = 'feedback-popup font-bold text-lg';
        popup.style.left = `${rect.left + rect.width / 2 - 20}px`;
        popup.style.top = `${rect.top - 30}px`;
        popup.style.color = text.includes('+') ? (text.includes('$') ? '#10B981' : '#84CC16') : '#EF4444';
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 1000);
    }

    // --- Event System ---
    triggerRandomEvent() {
        if (this.hiredStaff.size === 0) return;
        const eventKeys = Object.keys(eventData).filter(k => eventData[k].type !== 'bad' || this.hiredStaff.size > 2);
        const randomKey = eventKeys[Math.floor(Math.random() * eventKeys.length)];
        const event = eventData[randomKey];
        
        let description = event.description();
        // Updated staff member selection for new events
        if (['viralMarketing', 'teamBurnout', 'strategicPartnership', 'regulatoryChange'].includes(randomKey)) {
            const salesStaff = [...this.hiredStaff].filter(s => staffData.sales.members.includes(s));
            description = salesStaff.length > 0 ? event.description(salesStaff[Math.floor(Math.random() * salesStaff.length)]) : event.description("Someone from Sales");
        } else if (['foundInvoice', 'abTest', 'accountRevitalization', 'clientBacklash', 'dataBreach'].includes(randomKey)) {
            const accountsStaff = [...this.hiredStaff].filter(s => staffData.accounts.members.includes(s));
            description = accountsStaff.length > 0 ? event.description(accountsStaff[Math.floor(Math.random() * accountsStaff.length)]) : event.description("Someone from Accounts");
        } else if (['productFeatureLaunch', 'hackathonSuccess', 'coreFeatureBug'].includes(randomKey)) {
            description = event.description("Emil"); // Emil is unique
        } else if (randomKey === 'staffQuitting') {
            const allHiredStaff = [...this.hiredStaff]; // Any hired staff
            description = allHiredStaff.length > 0 ? event.description(allHiredStaff[Math.floor(Math.random() * allHiredStaff.length)]) : event.description("A staff member");
        } else {
            // Default description for other events that don't need a specific staff member
            description = event.description();
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
                    choice.action(this);
                    DOM.eventModal.el.classList.add('hidden');
                };
                DOM.eventModal.choices.appendChild(button);
            });
        } else {
            const okButton = document.createElement('button');
            okButton.textContent = "Okay";
            okButton.className = 'px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600';
            okButton.onclick = () => {
                this.startEvent(randomKey);
                DOM.eventModal.el.classList.add('hidden');
            };
            DOM.eventModal.choices.appendChild(okButton);
        }
        
        DOM.eventModal.el.classList.remove('hidden');
        this.eventCooldown = 180 + Math.random() * 120; // 3-5 minutes
    }

    startEvent(key) {
        const event = eventData[key];
        if (event.onStart) event.onStart(this);
        
        // Handle temporary effect flags/multipliers
        if (key === 'coreFeatureBug') this.isLeadDevelopmentHalted = true;
        if (key === 'dataBreach') this.isLeadGenerationHalted = true;
        if (key === 'staffQuitting') this.settings.allStaffSpeedMultiplier = 1.1; // Slower

        if (event.duration > 0) {
            this.activeEvent = { key: key, timeLeft: event.duration };
            this.updateActiveEventTimer();
            DOM.activeEventTimer.el.classList.remove('hidden');
            this.restartIntervals(); // Restart to apply speed changes
        } else {
            // Instant effects
            if (key === 'foundInvoice') this.money += this.money * 0.10;
            if (key === 'officeExpense') this.money *= 0.95;
            if (key === 'clientBacklash') this.money *= 0.85; // Lost 15%
            if (key === 'regulatoryChange') this.leads = Math.floor(this.leads * 0.5); // Lost 50% leads
            if (key === 'productFeatureLaunch') {
                this.money += this.leads * this.getIncomeFromLead() * 0.25; // Gain 25% of current leads' potential value
            }
        }
    }

    endEvent() {
        if (!this.activeEvent) return;
        const event = eventData[this.activeEvent.key];
        if (event.onEnd) event.onEnd(this);

        // Revert temporary effect flags/multipliers
        if (this.activeEvent.key === 'coreFeatureBug') this.isLeadDevelopmentHalted = false;
        if (this.activeEvent.key === 'dataBreach') this.isLeadGenerationHalted = false;
        if (this.activeEvent.key === 'staffQuitting') this.settings.allStaffSpeedMultiplier = 1; // Reset to normal

        this.activeEvent = null;
        DOM.activeEventTimer.el.classList.add('hidden');
        this.restartIntervals(); // Restart to remove speed changes
    }

    updateActiveEventTimer() {
        if (!this.activeEvent) return;
        const event = eventData[this.activeEvent.key];
        DOM.activeEventTimer.title.textContent = event.title;
        const minutes = Math.floor(this.activeEvent.timeLeft / 60);
        const seconds = (this.activeEvent.timeLeft % 60).toString().padStart(2, '0');
        DOM.activeEventTimer.timeLeft.textContent = `${minutes}:${seconds}`;
    }
    
    showEventDetails() {
        if (!this.activeEvent) return;
        const event = eventData[this.activeEvent.key];
        DOM.eventDetailsModal.title.textContent = event.title;
        DOM.eventDetailsModal.description.textContent = event.effectDescription;
        DOM.eventDetailsModal.el.classList.remove('hidden');
    }

    // --- Game Loop & Intervals ---
    mainLoop() {
        let incomeThisTick = this.incomeRate;
        if (this.activeEvent && this.activeEvent.key === 'serverCrashPenalty') {
            incomeThisTick = 0;
        }
        this.money += incomeThisTick;
        this.stats.totalMoneyEarned += incomeThisTick;

        if (this.activeEvent) {
            this.activeEvent.timeLeft--;
            this.updateActiveEventTimer();
            if (this.activeEvent.timeLeft <= 0) {
                this.endEvent();
            }
        } else if (this.hiredStaff.size > 0) {
            this.eventCooldown--;
            if (this.eventCooldown <= 0) {
                this.triggerRandomEvent();
            }
        }
        
        this.stats.playTime++;
        this.checkAchievements();
        this.renderAll();
        this.save();
    }
    
    // REFACTORED to create specific intervals for each staff member
    restartIntervals() {
        this.activeIntervals.forEach(clearInterval);
        this.activeIntervals = [];

        const effectiveSalesInterval = this.getEffectiveSalesStaffInterval();
        const effectiveAccountsInterval = this.getEffectiveAccountsStaffInterval();

        // Create specific intervals for each hired staff member
        this.hiredStaff.forEach(name => {
            // Is this a Sales member?
            if (staffData.sales.members.includes(name)) {
                if (effectiveSalesInterval > 0 && isFinite(effectiveSalesInterval)) {
                    const interval = setInterval(() => {
                        this.tryGenerateLead(false);
                        this.triggerStaffAnimation(name);
                    }, effectiveSalesInterval);
                    this.activeIntervals.push(interval);
                }
            }
            // Is this an Accounts member?
            else if (staffData.accounts.members.includes(name)) {
                if (effectiveAccountsInterval > 0 && isFinite(effectiveAccountsInterval)) {
                    const interval = setInterval(() => {
                        this.developLead(false);
                        this.triggerStaffAnimation(name);
                    }, effectiveAccountsInterval);
                    this.activeIntervals.push(interval);
                }
            }
        });


        // Existing intervals for upgrades that provide passive adds, not just speed multipliers
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
    
    getStaffCount(type) {
        let count = 0;
        this.hiredStaff.forEach(name => {
            if (staffData[type].members.includes(name)) {
                count++;
            }
        });
        return count;
    }

    // --- Event Listeners ---
    setupEventListeners() {
        DOM.navButtons.addEventListener('click', e => {
            if (e.target.tagName === 'BUTTON') {
                this.showScreen(e.target.dataset.screen);
            }
        });

        DOM.generateLeadBtn.addEventListener('click', () => this.tryGenerateLead(true));
        DOM.developLeadBtn.addEventListener('click', () => this.developLead(true));
        
        document.addEventListener('keydown', (event) => {
            const activeScreen = document.querySelector('.screen.active');
            if (!activeScreen) return;
            switch (activeScreen.id) {
                case 'salesScreen':
                    this.tryGenerateLead(true);
                    break;
                case 'accountScreen':
                    this.developLead(true);
                    break;
            }
        });

        DOM.staffForHire.addEventListener('click', e => {
            if (e.target.tagName === 'BUTTON' && e.target.dataset.name) {
                this.hireStaff(e.target.dataset.type, e.target.dataset.name);
            }
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
        
        DOM.toggleOfflineProgress.addEventListener('click', () => {
            this.settings.offlineProgress = !this.settings.offlineProgress;
            this.renderSettings();
        });
        DOM.toggleStaffAnimation.addEventListener('click', () => {
            this.settings.staffTextAnimation = !this.settings.staffTextAnimation;
            this.renderSettings();
        });

        DOM.welcomeModal.closeBtn.addEventListener('click', () => DOM.welcomeModal.el.classList.add('hidden'));
        DOM.eventModal.closeBtn.addEventListener('click', () => DOM.eventModal.el.classList.add('hidden'));
        DOM.eventDetailsModal.closeBtn.addEventListener('click', () => DOM.eventDetailsModal.el.classList.add('hidden'));
        
        const timer = DOM.activeEventTimer.el;
        timer.onmouseover = () => this.showEventDetails();
        timer.onclick = () => this.showEventDetails();
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

    showScreen(id) {
        DOM.screens.forEach(screen => screen.classList.toggle('active', screen.id === id));
        DOM.navButtons.querySelectorAll('button').forEach(btn => {
            const isActive = btn.dataset.screen === id;
            btn.classList.toggle('bg-blue-500', isActive);
            btn.classList.toggle('text-white', isActive);
            btn.classList.toggle('bg-gray-200', !isActive);
            btn.classList.toggle('text-gray-700', !isActive);
        });
    }

    start() {
        this.setupEventListeners();
        if (this.upgrades.coffeeMachine.purchased) {
            this.applyCoffeeMachineListeners();
        }
        this.restartIntervals();
        this.renderAll();
        setInterval(() => this.mainLoop(), 1000);
    }
}

window.onload = () => {
    const game = new MonetizationGame();
    game.start();
};
