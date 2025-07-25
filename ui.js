// ui.js
const emailContent = `Dear Valued Client,\n\nWe hope this message finds you well...`;
const adScriptContent = `// Monetization Script\nfunction showAd() {...}`;

// This file contains all functions related to updating the DOM and rendering game state.
const UI = {
    renderAll(game) {
        this.updateGlobalStats(game);
        this.updateSalesScreen(game);
        this.updateAccountScreen(game);
        this.renderStaff(game);
        this.renderOfficeStaff(game);
        this.renderUpgrades(game);
        this.renderAchievements(game);
        this.renderStatistics(game);
        this.renderSettings(game);
        this.renderCompanyName(game);
    },

    updateGlobalStats(game) {
        DOM.globalLeadCount.textContent = game.leads;
        DOM.globalMoneyCount.textContent = game.money.toFixed(2);
        DOM.globalRate.textContent = game.getPassiveIncome().toFixed(2);
    },

    updateSalesScreen(game) {
        DOM.emailText.textContent = emailContent.substring(0, game.emailCharIndex);
        DOM.salesLeadGenRate.textContent = game.getLeadGenerationRatePerSecond().toFixed(2) + '/s';
    },

    updateAccountScreen(game) {
        DOM.adScriptText.textContent = adScriptContent.substring(0, game.adCharIndex);
        const progress = game.clicksToDevelopLead > 0 ? (game.developClicks / game.clicksToDevelopLead) * 100 : 0;
        DOM.progressBar.style.width = `${progress}%`;
        DOM.accountsLeadDevRate.textContent = game.getLeadDevelopmentRatePerSecond().toFixed(2) + '/s';
    },

    renderStaff(game) {
        DOM.hiredStaffList.innerHTML = '';
        game.hiredStaff.forEach(staffName => {
            const li = document.createElement('li');
            const type = Object.keys(staffData).find(t => staffData[t].members.includes(staffName));
            if (!type) return;
            li.textContent = `${staffName} (${staffData[type].name})`;
            li.className = 'text-gray-700';
            DOM.hiredStaffList.appendChild(li);
        });

        DOM.staffForHire.innerHTML = '';
        for (const typeKey in staffData) {
            const typeInfo = staffData[typeKey];
            const unlockedMembers = typeInfo.members.filter(name => game.isStaffUnlocked(name));
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

                if (game.hiredStaff.has(name)) {
                    btn.textContent = 'Hired';
                    btn.disabled = true;
                } else {
                    btn.textContent = `Hire ${name} ($${game.staffCosts[typeKey].toFixed(2)})`;
                    btn.disabled = game.money < game.staffCosts[typeKey];
                }
                listDiv.appendChild(btn);
            });
            categoryDiv.appendChild(listDiv);
            DOM.staffForHire.appendChild(categoryDiv);
        }
    },

    renderOfficeStaff(game) {
        DOM.salesOffice.innerHTML = '';
        DOM.accountsOffice.innerHTML = '';

        game.hiredStaff.forEach(name => {
            const staffChar = document.createElement('div');
            staffChar.className = 'staff-char';
            staffChar.id = `staff-visual-${name}`;
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
        });
    },

    renderUpgrades(game) {
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
                if (upgradeKey === 'cpmOptimization' && !game.hiredStaff.has('Amir')) {
                    continue;
                }
                const upgradeState = game.upgrades[upgradeKey];
                const isPurchased = upgradeDef.oneTime && upgradeState.purchased;
                const isMaxed = upgradeDef.isMaxed && upgradeDef.isMaxed(game);
                const cost = upgradeDef.oneTime ? upgradeDef.cost : upgradeState.cost;

                const item = document.createElement('div');
                item.className = 'bg-gray-50 p-4 rounded-lg shadow-sm flex justify-between items-center';
                item.innerHTML = `
                    <div>
                        <h4 class="font-bold text-lg">${upgradeDef.name} ${!upgradeDef.oneTime ? `<span class="text-sm font-normal bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">${upgradeState.level}</span>` : ''}</h4>
                        <p class="text-sm text-gray-600">${upgradeDef.desc(game)}</p>
                    </div>
                    <div class="text-right flex-shrink-0 ml-4">
                        <button data-upgrade="${upgradeKey}" class="px-4 py-2 rounded-md bg-blue-500 text-white font-semibold hover:bg-blue-600">Buy</button>
                        <p class="text-sm font-semibold mt-1">Cost: $${cost.toFixed(2)}</p>
                    </div>`;
                
                const button = item.querySelector('button');
                if (isPurchased || isMaxed || game.money < cost) {
                    button.disabled = true;
                    if(isPurchased) button.textContent = 'Purchased';
                    if(isMaxed) button.textContent = 'Maxed';
                }
                listDiv.appendChild(item);
            }
            categoryDiv.appendChild(listDiv);
            DOM.upgradesContainer.appendChild(categoryDiv);
        }
    },

    renderAchievements(game) {
        DOM.achievementsList.innerHTML = '';
        for (const key in achievementData) {
            const achDef = achievementData[key];
            const achState = game.achievements[key];
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
    },

    renderStatistics(game) {
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
        createStat('Total Money Earned', `$${game.stats.totalMoneyEarned.toFixed(2)}`);
        createStat('Total Leads Generated', game.stats.totalLeadsGenerated);
        createStat('Manual Clicks', game.stats.totalManualClicks);
        createStat('Play Time', formatTime(game.stats.playTime));
    },

    renderSettings(game) {
        // Toggle buttons
        DOM.toggleOfflineProgress.textContent = game.settings.offlineProgress ? 'ON' : 'OFF';
        DOM.toggleOfflineProgress.className = `px-4 py-1 rounded-full font-semibold text-sm ${game.settings.offlineProgress ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`;
        
        DOM.toggleStaffAnimation.textContent = game.settings.staffTextAnimation ? 'ON' : 'OFF';
        DOM.toggleStaffAnimation.className = `px-4 py-1 rounded-full font-semibold text-sm ${game.settings.staffTextAnimation ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`;

        // Set current names in input fields
        DOM.editPlayerNameInput.value = game.playerName;
        DOM.editCompanyNameInput.value = game.companyName;
    },

    showScreen(id) {
        DOM.screens.forEach(screen => screen.classList.toggle('active', screen.id === id));
        DOM.navButtons.querySelectorAll('button').forEach(btn => {
            const isActive = btn.dataset.screen === id;
            btn.classList.toggle('bg-blue-500', isActive);
            btn.classList.toggle('text-white', isActive);
            btn.classList.toggle('bg-gray-200', !isActive);
            btn.classList.toggle('text-gray-700', !isActive);
        });
    },

    triggerStaffAnimation(name) {
        const staffVisual = document.getElementById(`staff-visual-${name}`);
        if (staffVisual) {
            staffVisual.classList.add('is-working');
            setTimeout(() => {
                staffVisual.classList.remove('is-working');
            }, 400);
        }
    },

    showWelcomeBackModal(earnings) {
        DOM.welcomeModal.earnings.textContent = `$${earnings.toFixed(2)}`;
        DOM.welcomeModal.el.classList.remove('hidden');
    },

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
    },

    showTutorial() {
        DOM.tutorialModal.el.classList.remove('hidden');
    },

    hideTutorial() {
        DOM.tutorialModal.el.classList.add('hidden');
    },

    showNameInputModal() {
        DOM.nameInputModal.el.classList.remove('hidden');
    },

    hideNameInputModal() {
        DOM.nameInputModal.el.classList.add('hidden');
    },

    renderCompanyName(game) {
        DOM.companyNameDisplay.textContent = game.companyName;
    },

    renderLeaderboard(companies) {
        DOM.leaderboardBody.innerHTML = '';
        if (companies.length === 0) {
            DOM.leaderboardBody.innerHTML = `<tr><td colspan="4" class="text-center py-4">No companies on the leaderboard yet!</td></tr>`;
            return;
        }
        companies.forEach((company, index) => {
            const row = document.createElement('tr');
            row.className = 'border-b border-gray-200 hover:bg-gray-100';
            row.innerHTML = `
                <td class="py-3 px-4">${index + 1}</td>
                <td class="py-3 px-4">${company.companyName}</td>
                <td class="py-3 px-4">${company.ownerName}</td>
                <td class="py-3 px-4">$${company.money.toFixed(2)}</td>
            `;
            DOM.leaderboardBody.appendChild(row);
        });
    }
};
