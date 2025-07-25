// dom.js
const DOM = {
    globalLeadCount: document.getElementById('globalLeadCount'),
    globalMoneyCount: document.getElementById('globalMoneyCount'),
    globalRate: document.getElementById('globalRate'),
    salesLeadGenRate: document.getElementById('salesLeadGenRate'),
    accountsLeadDevRate: document.getElementById('accountsLeadDevRate'),
    salesOffice: document.getElementById('salesOffice'),
    accountsOffice: document.getElementById('accountsOffice'),
    navButtons: document.getElementById('nav-buttons'),
    screens: document.querySelectorAll('.screen'),
    generateLeadBtn: document.getElementById('generateLeadBtn'),
    developLeadBtn: document.getElementById('developLeadBtn'),
    emailText: document.getElementById('emailText'),
    adScriptText: document.getElementById('adScriptText'),
    progressBar: document.getElementById('progressBar'),
    hiredStaffList: document.getElementById('hiredStaffList'),
    staffForHire: document.getElementById('staff-for-hire'),
    upgradesContainer: document.getElementById('upgrades-container'),
    achievementsList: document.getElementById('achievementsList'),
    statisticsList: document.getElementById('statisticsList'),
    manualSaveBtn: document.getElementById('manualSaveBtn'),
    resetProgressBtn: document.getElementById('resetProgressBtn'),
    toggleOfflineProgress: document.getElementById('toggleOfflineProgress'),
    toggleStaffAnimation: document.getElementById('toggleStaffAnimation'),
    helpButtons: document.querySelectorAll('.help-icon-button'),
    companyNameDisplay: document.getElementById('companyNameDisplay'),
    // Modals & Popups
    achievementPopup: {
        el: document.getElementById('achievement-popup'),
        title: document.getElementById('achievement-title'),
        desc: document.getElementById('achievement-desc'),
    },
    welcomeModal: {
        el: document.getElementById('welcome-back-modal'),
        earnings: document.getElementById('offline-earnings'),
        closeBtn: document.getElementById('close-welcome-modal'),
    },
    eventModal: {
        el: document.getElementById('event-modal'),
        title: document.getElementById('event-title'),
        description: document.getElementById('event-description'),
        choices: document.getElementById('event-choices'),
        closeBtn: document.getElementById('close-event-modal'),
    },
    eventDetailsModal: {
        el: document.getElementById('event-details-modal'),
        title: document.getElementById('event-details-title'),
        description: document.getElementById('event-details-description'),
        closeBtn: document.getElementById('close-event-details-modal'),
    },
    tutorialModal: {
        el: document.getElementById('tutorial-modal'),
        closeBtn: document.getElementById('close-tutorial-modal'),
        startBtn: document.getElementById('start-game-btn'),
    },
    nameInputModal: {
        el: document.getElementById('name-input-modal'),
        form: document.getElementById('name-input-form'),
        playerNameInput: document.getElementById('playerNameInput'),
        companyNameInput: document.getElementById('companyNameInput'),
        confirmBtn: document.getElementById('confirmNameBtn')
    },
    activeEventTimer: {
        el: document.getElementById('active-event-timer'),
        title: document.getElementById('active-event-title'),
        timeLeft: document.getElementById('active-event-time-left'),
    }
};
