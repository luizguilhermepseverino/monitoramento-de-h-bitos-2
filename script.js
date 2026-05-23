// ==========================================
// --- ESTADO DE PROGRESSÃO E INIMIGOS ---
// ==========================================
let currentStage = 0;
let gold = 0; 
let shopFromProgression = false; // 🔥 Nova linha: rastreia se a loja abriu sozinha na progressão
let shopUnlocked = false;
let shopAlreadyOpened = false;
let justClosedShop = false;
const enemiesList = [
    { name: "Globin", hp: 45, maxHp: 45, color: "#27ae60", img: "globin.png" },
    { name: "Golem", hp: 90, maxHp: 90, color: "#e67e22", img: "golem.png" },
    { name: "Cavaleiro Sombrio", hp: 200, maxHp: 200, color: "#2c3e50", img: "cavaleiro.png" },
    { name: "Feiticeira", hp: 150, maxHp: 150, color: "#8e44ad", img: "feiticeira.png" },
    { name: "Líder dos Ladrões", hp: 120, maxHp: 120, color: "#f39c12", img: "liderladrao.png" }, // NOVO INIMIGO
    { name: "Cientista", hp: 270, maxHp: 270, color: "#9b59b6", img: "cientista.png" },
    { name: "Dragão do Prazo Final", hp: 300, maxHp: 300, color: "#c0392b", img: "dragao.png" }
];
// ... Role um pouco para baixo até a área do --- SISTEMA DE LACAIO E ALVOS --- e adicione:
const witchState = {
    realTarget: "enemy",
    thornedClone: null
};

// Controle de Tempo e Histórico
const weekDays = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
let currentDayIndex = 0;
let habitHistoryData = [0, 0, 0, 0, 0, 0, 0];
let habitChart;
// ==========================================
// --- SISTEMA DE GRÁFICO (HISTÓRICO) ---
// ==========================================

function initChart() {
    const canvas = document.getElementById('habitChart');
    if (!canvas) return;

    // 🔥 Melhora nitidez do gráfico
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Remove gráfico antigo
    if (habitChart) {
        habitChart.destroy();
    }

    habitChart = new Chart(ctx, {
        type: 'bar',

        data: {
            labels: weekDays,

            datasets: [{
                label: 'Hábitos Concluídos',
                data: habitHistoryData,

                backgroundColor: '#3498db',
                borderColor: '#5dade2',
                borderWidth: 2,
                borderRadius: 8,

                // 🔥 melhora visual
                maxBarThickness: 55
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            animation: {
                duration: 500
            },

            plugins: {
                legend: {
                    labels: {
                        color: 'white',
                        font: {
                            size: 15
                        }
                    }
                }
            },

            scales: {
                y: {
                    beginAtZero: true,

                    // 🔥 REMOVE 0.1 0.2 0.3
                    ticks: {
                        stepSize: 1,
                        precision: 0,
                        color: 'white',

                        callback: function(value) {
                            return Number.isInteger(value)
                                ? value
                                : null;
                        }
                    },

                    grid: {
                        color: 'rgba(255,255,255,0.08)'
                    }
                },

                x: {
                    ticks: {
                        color: 'white',
                        font: {
                            size: 14
                        }
                    },

                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}
function updateChart() { 
    if (habitChart) { 
        // Forçamos a atualização dos dados
        habitChart.data.datasets[0].data = [...habitHistoryData]; 
        habitChart.update(); 
    } else {
        initChart(); 
    }
}

// --- SISTEMA DE RESERVA DE ENERGIA ---
let energyBank = 0;
const AUTO_PULL_AMOUNT = 3; 
let inBattle = false;

// --- ESTADO DO JOGADOR E INIMIGO ---
let player = { 
    hp: 100, shield: 0, energy: 0, name: "Herói", 
    dmgBuff: 0, gender: "Masculino", burnTurns: 0, 
    tookDamageThisTurn: false 
};
let overloadedNextTurn = false;
let lastPlayedCard = null;

let enemy = {
    ...enemiesList[currentStage],
    nextAction: null,
    bleedTurns: 0,
    stunned: false,
    enemyShield: 0,
    hasSummoned: false,
    weakened: false
};
// --- SISTEMA DE LACAIO E ALVOS ---
let minion = null;
let minion2 = null;
let currentTarget = "enemy"; 

let selectedIcon = "🏃";
let currentHand = [];
let drawPile = []; 
let pendingRewardCard = null;
let lastEnemyActionType = null; 

// --- SISTEMA DE PARRY ---
let skillCheckActive = false;
let skillCheckAngle = 0;
let targetZone = { start: 0, end: 0 };
let skillCheckAnim;

// --- SISTEMA DE MINIGAME (CIENTISTA) ---
let minigameTimer;
let minigameTimeLeft = 100;
let minigameAnswer = "";

// --- CARTAS ---
let availableRewards = [
    { name: "Foco", type: "energy", cost: 0, power: 2, img: "foco.png", colorClass: "card-raio" },
    { name: "Determinação", type: "retaliation", cost: 0, power: 20, img: "determinação.png", colorClass: "card-raio" },
    { name: "Reciclar Mão", type: "recycle", cost: 0, power: 0, img: "reciclar.png", colorClass: "card-defesa" },
    { name: "Tempo Parado", type: "time_stop", cost: 0, power: 0, img: "tempo.png", colorClass: "card-magia" },
    { name: "Boss Killer", type: "execute", cost: 2, power: 40, img: "bosskiller.png", colorClass: "card-espada" },
    { name: "Ataque Sombrio", type: "dark_atk", cost: 2, power: 50, selfDamage: 10, img: "ataquesombrio.png", colorClass: "card-ataque" },
    { name: "Lâmina Sombria", type: "sang", effect: "bleed", cost: 2, power: 20, img: "laminasombria.png", colorClass: "card-espada" },
    { name: "Veredito do Arcanjo", type: "magia", cost: 3, power: 60, img: "veredito.png", colorClass: "card-magia" },
    { name: "Preciso", type: "pierce", cost: 1, power: 20, img: "preciso.png", colorClass: "card-espada" },
    { name: "Bola de Fogo", type: "magia", cost: 2, power: 35, img: "boladefogo.png", colorClass: "card-magia" },
    { name: "Loop", type: "loop", cost: 0, power: 0, img: "loop.png", colorClass: "card-magia" },
    { name: "Sobrecarga", type: "sobrecarga", cost: 0, power: 0, img: "sobrecarga.png", colorClass: "card-raio" },
    { name: "Ataque Calculado", type: "ataque_calculado", cost: 1, power: 8, img: "ataquecalculado.png", colorClass: "card-ataque" },
    
    // --- NOVAS CARTAS ADICIONADAS ---
    { name: "Ataque Final", type: "ataque_final", cost: 0, power: 30, img: "ataquefinal.png", colorClass: "card-ataque" },
    { name: "descarte ataque", type: "descarte_atk", cost: 2, power: 50, img: "descarte.png", colorClass: "card-espada" },
    { name: "Golpe Vampírico", type: "vampiric_atk", cost: 2, power: 25, img: "vampirico.png", colorClass: "card-magia" },
    // =====================================
// NOVAS CARTAS
// =====================================

{ name: "Corte Duplo", type: "multi_atk", hits: 2, cost: 2, power: 14, img: "corteduplo.png", colorClass: "card-ataque" },

// RUPTURA
{
    name: "Ruptura",
    type: "ruptura",
    cost: 1,
    power: 18,
    img: "ruptura.png",
    colorClass: "card-ataque"
},

// TEMPESTADE ARCANA
{
    name: "Tempestade Arcana",
    type: "arcane_storm",
    cost: 3,
    power: 23,
    img: "tempestadearcana.png",
    colorClass: "card-magia"
},

// MALDIÇÃO
{
    name: "Maldição",
    type: "curse",
    cost: 1,
    power: 0,
    img: "maldicao.png",
    colorClass: "card-magia"
},

// GAMBITO
{
    name: "Gambito",
    type: "gambit",
    cost: 0,
    power: 0,
    img: "gambito.png",
    colorClass: "card-raio"
},

// ECLIPSE
{
    name: "Eclipse",
    type: "eclipse",
    cost: 4,
    power: 100,
    selfDamage: 5,
    img: "eclipse.png",
    colorClass: "card-magia"
},
{ 
    name: "Estocada Rápida", 
    type: "pierce_attack", // Tipo customizado para garantir o efeito
    cost: 0, 
    power: 12, 
    img: "estocada.png", 
    colorClass: "card-espada" 
},
{ 
    name: "Frenesi de Lâminas", 
    type: "multi_hit", 
    hits: 4, 
    cost: 3, 
    power: 15, 
    img: "frenesi.png", 
    colorClass: "card-ataque" 
},
{ 
    name: "Adaga Envenenada", 
    type: "poison_dagger", 
    cost: 1, 
    power: 10, 
    img: "adaga_veneno.png", 
    colorClass: "card-espada" 
}
];
const masterDeck = [
    { name: "Golpe", type: "atk", cost: 1, power: 15, img: "golpe.png", colorClass: "card-ataque" },
    { name: "Golpe", type: "atk", cost: 1, power: 15, img: "golpe.png", colorClass: "card-ataque" },
    { name: "Golpe", type: "atk", cost: 1, power: 15, img: "golpe.png", colorClass: "card-ataque" },
    { name: "Golpe", type: "atk", cost: 1, power: 15, img: "golpe.png", colorClass: "card-ataque" },
    { name: "Golpe", type: "atk", cost: 1, power: 15, img: "golpe.png", colorClass: "card-ataque" },
    { name: "Golpe", type: "atk", cost: 1, power: 15, img: "golpe.png", colorClass: "card-ataque" },
    { name: "Escudo", type: "def", cost: 1, power: 15, img: "escudo.png", colorClass: "card-defesa" },
    { name: "Escudo", type: "def", cost: 1, power: 15, img: "escudo.png", colorClass: "card-defesa" },
    { name: "Escudo", type: "def", cost: 1, power: 15, img: "escudo.png", colorClass: "card-defesa" },
    { name: "Escudo", type: "def", cost: 1, power: 15, img: "escudo.png", colorClass: "card-defesa" },
    { name: "Escudo", type: "def", cost: 1, power: 15, img: "escudo.png", colorClass: "card-defesa" },
    { name: "Escudo", type: "def", cost: 1, power: 15, img: "escudo.png", colorClass: "card-defesa" }
];

const DOM = {
    playerHp: null, playerHpText: null, enemyHp: null, enemyHpText: null,
    energyStat: null, energyBank: null, shieldPlayer: null, shieldEnemy: null,
    battleLog: null, playerHand: null, intentText: null, enemySprite: null,
    playerSprite: null, loginScreen: null, mainApp: null
};

document.addEventListener('DOMContentLoaded', () => {

    Object.keys(DOM).forEach(key => {
        const id = key.replace(/[A-Z]/g, m => m.toLowerCase() === 'hp' ? 'Hp' : m);
        DOM[key] = document.getElementById(
            key === 'energyBank'
                ? 'energyBankDisplay'
                : key === 'shieldPlayer'
                ? 'shieldDisplay'
                : key === 'shieldEnemy'
                ? 'shieldDisplayEnemy'
                : key
        );
    });

    setupEmojiSelection();
    initChart();

    document.addEventListener('mousedown', handleParryClick);

    // =====================================
    // SISTEMA DE NAVEGAÇÃO
    // =====================================

    const sidebarButtons = document.querySelectorAll(".sidebar-btn");
    const screens = document.querySelectorAll(".screen");



            const screenName = button.dataset.screen;
            // BLOQUEIO DA LOJA
if (screenName === "shop" && !shopUnlocked) {
    log("🔒 Derrote o Cavaleiro Sombrio ou o Cientista para liberar a Loja!");
    return;
}

            const targetScreen = document.getElementById(
                `screen-${screenName}`
            );

            if(targetScreen) {
                targetScreen.classList.add("active-screen");
                
if(screenName === "cards"){
    renderCardsScreen();
}

if(screenName === "deckview"){
    renderDeckView();
}
                // Atualiza gráfico quando abrir histórico
if(screenName === "history") {

    setTimeout(() => {

        if(habitChart){
            habitChart.destroy();
        }

        initChart();

    }, 50);
}
            }

        });




    Object.keys(DOM).forEach(key => {
        const id = key.replace(/[A-Z]/g, m => m.toLowerCase() === 'hp' ? 'Hp' : m);
        DOM[key] = document.getElementById(key === 'energyBank' ? 'energyBankDisplay' : key === 'shieldPlayer' ? 'shieldDisplay' : key === 'shieldEnemy' ? 'shieldDisplayEnemy' : key);
    });
    setupEmojiSelection(); 
    initChart();
    document.addEventListener('mousedown', handleParryClick);


// --- LÓGICA DA LOJA ---
function buyItem(type, cost) {
    if (gold >= cost) {
        gold -= cost;
        if (type === 'hp') {
            player.hp = Math.min(100, player.hp + 50);
            log("❤️ Você bebeu uma poção! +50 HP.");
        } else if (type === 'energy') {
            energyBank += 3;
            log("⚡ Energia reserva expandida! +3⚡.");
        }
        updateUI();
    } else {
        log("❌ Moedas insuficientes!");
    }
}

function login() {
    const nameInput = document.getElementById("userName").value;
    const genderInput = document.getElementById("userGender").value;

    if (!nameInput || !genderInput) {
        return alert("Por favor, preencha seu nome e escolha um gênero!");
    }

    player.name = nameInput;
    player.gender = genderInput;

    // ALTERA O PERSONAGEM
    const playerSprite = document.getElementById("playerSprite");

    if (player.gender === "Masculino") {
        playerSprite.src = "heroi_homem.png";
    } else {
        playerSprite.src = "heroi_mulher.png";
    }

    document.getElementById("playerNameDisplay").innerText = player.name;

    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("mainApp").classList.remove("hidden");

    renderHabitsForToday();
    updateUI();
}

function startBattle() {
    if (inBattle) return; 
    inBattle = true;
    overloadedNextTurn = false;
    lastPlayedCard = null;
    log("A batalha começou!");
    
    // --- NOVO: SE FOR O LÍDER DOS LADRÕES, A GANGUE JÁ VEM JUNTO CORRENDO ---
    if (enemy.name.includes("Líder dos Ladrões")) {
        minion = { name: "Ladrão Furtivo", hp: 70, maxHp: 70, img: "ladraof.png", nextAction: null, bleedTurns: 0, stunned: false, enemyShield: 0 };
        minion2 = { name: "Ladrão Bruto", hp: 150, maxHp: 150, img: "ladraob.png", nextAction: null, bleedTurns: 0, stunned: false, enemyShield: 0 };
        log(`💰 O Líder dos Ladrões emboscou você junto com sua Gangue!`);
    } else {
        // Garante que eles comecem vazios em outros estágios
        minion = null;
        minion2 = null;
    }

    const btnStart = document.getElementById('btnStartBattle');
    if(btnStart) btnStart.classList.add('hidden');
    shuffleDeck();
    drawHand(); 
    prepareEnemyAction();
    if (player.energy === 0) refillEnergyFromBank();
    updateUI();
}
// ==========================================
// --- LÓGICA DE PRÉ-BATALHA E UPGRADE ---
// ==========================================

function tryStartBattle() {

    // =====================================
    // TELA DE UPGRADE
    // =====================================
    if (currentStage === 2 || currentStage === 5) {

        openUpgradeScreen();
        return;
    }

    // =====================================
    // LOJA AUTOMÁTICA
    // =====================================
    else if (currentStage === 3 || currentStage === 6) {

        shopUnlocked = true;

        // avisa que veio da progressão
        shopFromProgression = true;

        // pausa qualquer estado de batalha
        battleStarted = false;
        isPlayerTurn = false;
        isProcessingTurn = false;

        // abre a loja correta
        toggleShop(true);

        return;
    }

    // =====================================
    // BATALHA NORMAL
    // =====================================
    else {

        shopUnlocked = false;

        startBattle();
    }
}
// --- FUNÇÃO PARA ABRIR A LOJA AUTOMATICAMENTE ---
function openShop() {
    // 1. Remove a classe ativa de todas as telas principais para escondê-las
    const screens = document.querySelectorAll(".screen");
    screens.forEach(screen => screen.classList.remove("active-screen"));

    // 2. Localiza a tela da loja e a exibe adicionando a classe ativa
    const shopScreen = document.getElementById("screen-shop");
    if (shopScreen) {
        shopScreen.classList.add("active-screen");
        log("🏪 Uma loja apareceu na sua jornada! Prepare suas moedas.");
    } else {
        console.error("Erro: O elemento HTML 'screen-shop' não foi encontrado.");
    }
}

function openUpgradeScreen() {
    const screen = document.getElementById('upgradeScreen');
    const container = document.getElementById('upgradeCardDisplay');
    
    // --- ADICIONADO: Esconder os botões da tela de batalha ---
    const gameControls = document.querySelector('.game-controls');
    const btnStartBattle = document.getElementById('btnStartBattle');
    
    if (gameControls) gameControls.classList.add('hide-during-modal');
    if (btnStartBattle) btnStartBattle.classList.add('hide-during-modal');
    // ---------------------------------------------------------
    
    screen.classList.remove('hidden');
    container.innerHTML = '';
    
    masterDeck.forEach((card, index) => {
        // Criamos o wrapper principal do card
        const wrapper = document.createElement('div');
        wrapper.className = 'upgrade-card-wrapper';
        
        if (card.isUpgraded) {
            wrapper.classList.add('maxed');
        } else {
            wrapper.onclick = () => selectUpgrade(index);
        }
        
        // Buscamos o texto explicativo do que vai mudar
        const textoPrevia = obterTextoPreviaUpgrade(card);
        
        // Injetamos a estrutura montada de forma limpa e scannável
        wrapper.innerHTML = `
            <div class="card ${card.colorClass}" style="transform: scale(0.95); margin: 0; pointer-events: none;">
                <div class="card-cost">${card.cost}</div>
                <img src="${card.img}" alt="${card.name}">
                <div style="position: absolute; bottom: 5px; width: 100%; text-align: center; color: white; font-size: 11px; font-weight: bold; text-shadow: 1px 1px 2px black;">${card.name}</div>
            </div>
            
            <div class="upgrade-preview-box">
                <div style="color: ${card.isUpgraded ? '#e74c3c' : '#f1c40f'}; font-weight: bold; margin-bottom: 4px; font-size: 10px; text-transform: uppercase;">
                    ${card.isUpgraded ? 'Nível Máximo' : '✨ Evolução'}
                </div>
                <div style="color: #bdc3c7; min-height: 32px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    ${textoPrevia}
                </div>
            </div>
        `;
        
        container.appendChild(wrapper);
    });
}
function selectUpgrade(index) {
    const card = masterDeck[index];
    
    // Chama a nossa nova função de upgrade
    const sucesso = aplicarEfeitoDeUpgrade(card);
    
    if (!sucesso) {
        alert("Escolha outra carta, esta já está no máximo!");
        return; // Impede que a tela feche se a carta já estiver melhorada
    }
    
    // Atualiza a tela pra dar aquele feedback visual
    log(`✨ PERFEIÇÃO! Você aprimorou: ${card.name}!`);
    alert(`Evolução concluída! Você aprimorou: ${card.name}!`);
    
    // Fecha a tela de upgrade
    document.getElementById('upgradeScreen').classList.add('hidden');
    
    // 👇 ADICIONADO: Restaura os botões de controle e de iniciar batalha 👇
    const gameControls = document.querySelector('.game-controls');
    const btnStartBattle = document.getElementById('btnStartBattle');
    
    if (gameControls) gameControls.classList.remove('hide-during-modal');
    if (btnStartBattle) btnStartBattle.classList.remove('hide-during-modal');
    // ---------------------------------------------------------------------
    
    // Tranca a loja e inicia a batalha contra o Boss
    shopUnlocked = false; 
    startBattle();
}

function refillEnergyFromBank() {
    player.energy = 0; 
    let pullLimit = overloadedNextTurn ? 2 : AUTO_PULL_AMOUNT;
    let amountToTake = Math.min(energyBank, pullLimit);
    energyBank -= amountToTake;
    player.energy = amountToTake; 
    
    if (overloadedNextTurn) {
        log(`Sobrecarga! Energia limitada a ${amountToTake}⚡ neste turno.`);
        overloadedNextTurn = false;
    } else if (amountToTake > 0) {
        log(`Energia carregada: +${amountToTake}⚡.`);
    } else {
        log(`Reserva vazia! Complete hábitos.`);
    }
    updateUI();
}

function completeHabit(id) {
    const h = meusHabitos.find(h => h.id === id);
    // Impede completar o mesmo hábito no mesmo dia
    if (!h || h.lastDoneIndex === currentDayIndex) return;

    // Lógica de Streak
    let ontemIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;
    h.streak = (h.lastDoneIndex === ontemIndex) ? h.streak + 1 : 1;

    h.lastDoneIndex = currentDayIndex; // Importante: salvar o índice do dia

    let bonus = Math.floor(h.streak / 3);
    let totalGanhado = Math.min(h.recompensa + bonus, 8);
    energyBank += totalGanhado;
    
    
    showEnergyGain(totalGanhado);
    log(`✔ ${h.nome} concluído! +${totalGanhado}⚡`);
    
    renderHabitsForToday();
    updateUI();
    updateChart(); // Chama a atualização do gráfico
}

// --- SISTEMA DE PARRY E MINIGAMES ---
function startSkillCheck() {
    skillCheckActive = true;
    skillCheckAngle = 0;
    let start = 180 + Math.random() * 80;
    targetZone = { start: start, end: start + 45 };
    document.getElementById('parryOverlay').classList.remove('hidden');
    animateSkillCheck();
}

function animateSkillCheck() {
    if (!skillCheckActive) return;
    skillCheckAngle += 5;
    const needle = document.getElementById('skillNeedle');
    const zone = document.getElementById('skillZone');
    if(needle) needle.style.transform = `rotate(${skillCheckAngle}deg)`;
    if(zone) zone.style.transform = `rotate(${targetZone.start}deg)`;
    if (skillCheckAngle > 360) failParry();
    else skillCheckAnim = requestAnimationFrame(animateSkillCheck);
}

function handleParryClick(e) {
    if (!skillCheckActive || e.target.id === 'minigameInput') return;
    if (skillCheckAngle >= targetZone.start && skillCheckAngle <= targetZone.end) successParry();
    else failParry();
}

function successParry() {
    skillCheckActive = false;
    cancelAnimationFrame(skillCheckAnim);
    document.getElementById('parryOverlay').classList.add('hidden');
    let intendedDmg = enemy.nextAction.val;
    let finalDmg = Math.floor(intendedDmg / 2);
    applyDamageToPlayer(finalDmg); 
    log(`✨ PARRY SUCESSO! Dano reduzido para ${finalDmg}.`);
    executeMinionActionAndFinish(); 
}

function failParry() {
    skillCheckActive = false;
    cancelAnimationFrame(skillCheckAnim);
    document.getElementById('parryOverlay').classList.add('hidden');
    let intendedDmg = enemy.nextAction.val;
    applyDamageToPlayer(intendedDmg);
    log(`❌ FALHA NO PARRY! Recebeu ${intendedDmg} de dano.`);
    executeMinionActionAndFinish();
}

function applyDamageToPlayer(dmg) {
    let finalDmg = Math.max(0, dmg - player.shield);
    if (finalDmg > 0) {
        player.hp -= finalDmg;
        player.tookDamageThisTurn = true; 
        shakeElement(document.getElementById('playerSprite'));
    }
}

function startMinigame(type) {
    const overlay = document.getElementById('minigameOverlay');
    const input = document.getElementById('minigameInput');
    const prompt = document.getElementById('minigamePrompt');
    const title = document.getElementById('minigameTitle');
    
    overlay.classList.remove('hidden');
    input.value = "";
    input.focus();
    minigameTimeLeft = 100;

    // Bloqueia o colar (Paste)
    input.onpaste = (e) => {
        e.preventDefault();
        log("🚫 Sem trapaças! O Cientista exige digitação manual.");
        return false;
    };

    // Bloqueia o arrastar e soltar texto (Drop)
    input.ondrop = (e) => {
        e.preventDefault();
        return false;
    };

    // Bloqueia o menu de contexto (botão direito do mouse) para evitar o "Colar" por lá
    input.oncontextmenu = (e) => {
        e.preventDefault();
        return false;
    };

    if (type === "math") {
        let a = Math.floor(Math.random() * 15) + 5;
        let b = Math.floor(Math.random() * 15) + 5;
        title.innerText = "Cálculo Rápido!";
        prompt.innerText = `Quanto é ${a} + ${b}?`;
        minigameAnswer = (a + b).toString();
    } else if (type === "typing") {
        const frases = ["Cada segundo é fundamental para a sobrevivência", "Erros sucessivos quebram sua concentração", "O inimigo avança enquanto você falha", "Três tigres tristes lutam no tempo", "Dominar o tempo exige foco absoluto"];
        let frase = frases[Math.floor(Math.random() * frases.length)];
        title.innerText = "Transcrição Genética!";
        prompt.innerText = frase;
        minigameAnswer = frase;
    }

    // Define a verificação da resposta
    input.oninput = () => {
        if (input.value.toLowerCase().trim() === minigameAnswer.toLowerCase()) {
            winMinigame();
        }
    };

    // O CRONÔMETRO PRECISA FICAR AQUI DENTRO!
    clearInterval(minigameTimer);
    minigameTimer = setInterval(() => {
        // Ajustei a velocidade para o modo escrita ser um desafio justo
        minigameTimeLeft -= (type === "math" ? 1 : 0.42);
        
        const timerBar = document.getElementById('minigameTimerBar');
        if (timerBar) {
            timerBar.style.width = minigameTimeLeft + "%";
        }

        if (minigameTimeLeft <= 0) {
            loseMinigame();
        }
    }, 50);
} // Esta é a única chave que deve fechar a função principal

function winMinigame() {
    clearInterval(minigameTimer);
    document.getElementById('minigameOverlay').classList.add('hidden');

    // Agora pegamos o dano da intenção do Boss e dividimos por 2
    let mitigatedDmg = Math.floor(enemy.nextAction.val / 2);
    
    // Aplicamos o dano reduzido ao jogador
    applyDamageToPlayer(mitigatedDmg);

    log(`🔬 Reação contida! Você mitigou o impacto, mas recebeu ${mitigatedDmg} de dano.`);
    executeMinionActionAndFinish();
}

function loseMinigame() {
    clearInterval(minigameTimer);
    document.getElementById('minigameOverlay').classList.add('hidden');
    applyDamageToPlayer(50);
    log("💥 ERRO CIENTÍFICO! 50 de dano crítico recebido!");
    executeMinionActionAndFinish();
}

// --- COMBATE ---
function shuffleDeck() {
    drawPile = masterDeck.map(card => ({ ...card, id: Math.random().toString(36).substr(2, 9) }));
    for (let i = drawPile.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [drawPile[i], drawPile[j]] = [drawPile[j], drawPile[i]];
    }
}

function drawHand(amount = 5) {

    const basicCards = ["Golpe", "Escudo"];

    for(let x = 0; x < amount; x++) {

        if(currentHand.length >= 6) break;

        if(drawPile.length === 0) {
            shuffleDeck();
        }

        const nextCard = drawPile[0];

        if(!nextCard) break;

        const alreadyInHand =
            currentHand.some(c => c.name === nextCard.name);

        if(
            !basicCards.includes(nextCard.name)
            && alreadyInHand
        ) {

            drawPile.push(drawPile.shift());

            continue;
        }

        currentHand.push(drawPile.shift());
    }

    // 🔥 FORÇA RENDER
    updateUI();
}


function setTarget(target) {
    if (!minion && target === 'minion') return;
    if (!minion2 && target === 'minion2') return;
    currentTarget = target;
    updateUI();
    log(`🎯 Mirando no ${target === 'enemy' ? enemy.name : (target === 'minion' ? minion.name : minion2.name)}!`);
}
function playCard(index) {
    if (!inBattle || skillCheckActive || !document.getElementById('minigameOverlay').classList.contains('hidden')) return;
    let cardIndex = index;
    const card = currentHand[cardIndex];

    if (!card) return;

    if (player.energy >= card.cost) {
        player.energy -= card.cost;
        let finalPower = (card.power || 0) + player.dmgBuff;
        
        // Define quem vai tomar o dano baseado no alvo atual!
        let targetEnt = enemy;
        let targetType = 'enemy';
        if (currentTarget === 'minion' && minion && minion.hp > 0) { targetEnt = minion; targetType = 'minion'; }
        if (currentTarget === 'minion2' && minion2 && minion2.hp > 0) { targetEnt = minion2; targetType = 'minion2'; }

        // --- FUNÇÃO AUXILIAR INTELIGENTE PARA FILTRAR O DANOS DOS CLONES/FEITICEIRA ---
      function aplicarDanoComFiltro(entidade, tipoAlvo, dano, nomeAtaque) {

    // =====================================
    // FEITICEIRA
    // =====================================

    if(enemy.name.includes("Feiticeira")) {

        // ACERTOU A VERDADEIRA
        if(tipoAlvo === witchRealTarget) {

            let danoFinal =
                Math.max(0, dano - enemy.enemyShield);

            enemy.enemyShield =
    Math.max(0, enemy.enemyShield - dano);

// TODOS COMPARTILHAM O ESCUDO
if(minion) minion.enemyShield = enemy.enemyShield;
if(minion2) minion2.enemyShield = enemy.enemyShield;

            enemy.hp -= danoFinal;

            // TODOS COMPARTILHAM A MESMA VIDA
            if(minion) minion.hp = enemy.hp;
            if(minion2) minion2.hp = enemy.hp;

            shakeElement(
                document.getElementById('enemySprite')
            );

            log(`✨ ${nomeAtaque} acertou a VERDADEIRA causando ${danoFinal}!`);
        }

        // ACERTOU CLONE
        else {

            log(`💨 ${nomeAtaque} atravessou uma ilusão!`);

            // ESPINHOS
            if(tipoAlvo === thornedClone) {

let refletido = dano;

                applyDamageToPlayer(refletido);

                log(`🌵 Os espinhos refletiram ${refletido} dano!`);
            }
        }

        return;
    }

    // =====================================
    // NORMAL
    // =====================================

    let danoFinal =
        Math.max(0, dano - (entidade.enemyShield || 0));

    entidade.enemyShield =
        Math.max(0, (entidade.enemyShield || 0) - dano);

    entidade.hp -= danoFinal;

    shakeElement(document.getElementById('enemySprite'));

    log(`${nomeAtaque} causou ${danoFinal} dano.`);
}
        switch(card.type) {
            case "retaliation":
                let baseDmg = player.tookDamageThisTurn ? (card.power * 2) : card.power;
                aplicarDanoComFiltro(targetEnt, targetType, baseDmg + player.dmgBuff, card.name || "Determinação");
                player.dmgBuff = 0;
                break;

            case "atk": 
            case "pierce": 
                aplicarDanoComFiltro(targetEnt, targetType, finalPower, card.name);
                if (card.effect === "bleed" && (!enemy.name.includes("Feiticeira") || targetType === (enemy.realIdentity || "enemy"))) { 
                    targetEnt.bleedTurns = 3; log("Sangramento aplicado!"); 
                }
                player.dmgBuff = 0;
                break;
                case "magia":
    targetEnt.hp -= finalPower;

    shakeElement(document.getElementById('enemySprite'));

    log(`✨ ${card.name} lançou magia em ${targetEnt.name} causando ${finalPower} dano mágico!`);

    player.dmgBuff = 0;
    break;

            case "def": 
                player.shield += card.power; 
                log(`Defesa +${card.power}`);
                break;

            case "buff":
                player.dmgBuff += card.power;
                log(`Concentração! Próximo ataque terá +${card.power} de dano.`);
                break;

            case "heal": 
                player.hp = Math.min(100, player.hp + card.power); 
                log(`Curou ${card.power} HP`);
                break;

                case "sang":
            // Aplica o dano básico da Lâmina Sombria
            enemyHp += card.power;
            log(`⚔️ Você usa ${card.name} e causa ${card.power} de dano!`);

            // Aplica o efeito de sangramento (bleed) igual você já tinha programado
            if (card.effect === "bleed") {
                enemyBleedTurns = 3;
                log("🩸 O inimigo está sangrando! (Perderá 10 de vida por rodada durante 3 turnos)");
            }
            break;

            case "energy": 
                player.energy += card.power; 
                log(`Foco! +${card.power}⚡.`);
                for(let i=0; i<2; i++) {
                    if (drawPile.length === 0) shuffleDeck();
                    currentHand.push(drawPile.shift());
                }
                break;

case "recycle":
                currentHand = []; 
                // Se estiver upada, compra 6 cartas (5 padrão + 1 extra), senão compra 5
                let cartasParaComprar = card.extraCards ? 6 : 5;
                drawHand(cartasParaComprar);
                log(card.extraCards ? "Mão reciclada com +1 carta extra!" : "Mão reciclada!");
                break;

            case "time_stop":
                enemy.stunned = true; 
                if(minion) minion.stunned = true;
                if(minion2) minion2.stunned = true;
                player.energy += 1;
                log("O tempo parou!");
                break;
                case "pierce_attack":
    // Calcula o dano considerando os buffs temporários do jogador
    let danoEstocada = card.power + player.dmgBuff;
    
    // Aplica o dano usando o sistema nativo do seu jogo
    aplicarDanoComFiltro(targetEnt, targetType, danoEstocada, card.name);
    
    log(`⚔️ Estocada Rápida! Um ataque relâmpago sem custo causou ${danoEstocada} de dano!`);
    player.dmgBuff = 0; // Consome o buff de dano após atacar
    break;
    case "multi_hit":
    let golpes = card.hits || 4;
    let danoPorCadaGolpe = card.power + player.dmgBuff;
    let danoTotalAcumulado = danoPorCadaGolpe * golpes;

    log(`🌪️ Frenesi de Lâminas! Iniciando uma sequência implacável de ${golpes} golpes!`);
    
    // Executa o laço de repetição para golpear múltiplas vezes
    for (let i = 0; i < golpes; i++) {
        aplicarDanoComFiltro(targetEnt, targetType, danoPorCadaGolpe, `${card.name} (Golpe ${i+1}/${golpes})`);
    }

    log(`💥 Combo Finalizado! Causal total de ${danoTotalAcumulado} de dano.`);
    player.dmgBuff = 0; // Consome o buff de dano
    break;
    case "poison_dagger":
    let danoInicial = card.power + player.dmgBuff;
    
    // Causa o dano físico da lâmina
    aplicarDanoComFiltro(targetEnt, targetType, danoInicial, card.name);
    
    // Aplica ou acumula os turnos de sangramento no inimigo usando o sistema do seu jogo
    targetEnt.bleedTurns = (targetEnt.bleedTurns || 0) + 3;
    
    log(`☣️ Adaga Envenenada! Causou ${danoInicial} de dano cortante e infectou o alvo com Sangramento por 3 turnos!`);
    player.dmgBuff = 0; // Consome o buff de dano
    break;

            case "execute":
                if (enemy.name.includes("Feiticeira") && targetType !== (enemy.realIdentity || "enemy")) {
                    log("🚫 Execução falhou: Você tentou executar uma ilusão da Feiticeira!");
                } else {
                    let execDmg = card.power + player.dmgBuff;
                    targetEnt.hp -= execDmg;
                    log(`Boss Killer causou ${execDmg} de dano!`);
                    if (targetEnt.hp > 0 && targetEnt.hp < 60) {
                        targetEnt.hp = 0;
                        log(`🎯 LIMIAR ATINGIDO! O inimigo tinha menos de 60 HP e foi executado!`);
                    } else if (targetEnt.hp <= 0) {
                        log(`O golpe foi fatal!`);
                    } else {
                        log(`O alvo resistiu à execução.`);
                    }
                }
                player.dmgBuff = 0;
                shakeElement(document.getElementById('enemySprite'));
                break;

            case "dark_atk":
                aplicarDanoComFiltro(targetEnt, targetType, finalPower, card.name || "Ataque Sombrio");
                // Só aplica o recuo se não bater em ilusões vazias sem espinhos
                applyDamageToPlayer(card.selfDamage);
                player.dmgBuff = 0;
                break;

            case "multi_atk":
                for(let i = 0; i < card.hits; i++) {
                    aplicarDanoComFiltro(targetEnt, targetType, card.power + player.dmgBuff, `${card.name} (Hit ${i+1})`);
                }
                player.dmgBuff = 0;
                break;

            case "ruptura":
                if (enemy.name.includes("Feiticeira") && targetType !== (enemy.realIdentity || "enemy")) {
                    log(`💥 Ruptura atingiu um clone falso! Nenhuma defesa foi destruída.`);
                } else {
                    targetEnt.enemyShield = 0;
                    targetEnt.hp -= card.power;
                    log(`💥 Ruptura destruiu toda a defesa inimiga! Causou ${card.power} na vida.`);
                }
                shakeElement(document.getElementById('enemySprite'));
                break;

            case "arcane_storm":
                for(let i = 0; i < 3; i++) {
                    aplicarDanoComFiltro(targetEnt, targetType, card.power, `Tempestade Arcana (Raio ${i+1})`);
                }
                break;

            case "curse":
                enemy.weakened = true;
                log(`☠️ O inimigo foi amaldiçoado!`);
                break;

            case "gambit":
                player.hp -= 10;
                for(let i = 0; i < 2; i++) {
                    if(drawPile.length === 0) shuffleDeck();
                    currentHand.push(drawPile.shift());
                }
                log(`🎲 Gambito: +2 cartas, -10 HP.`);
                break;

            case "eclipse":
                aplicarDanoComFiltro(targetEnt, targetType, card.power, "Eclipse");
                player.hp -= card.selfDamage;
                break;

            case "ataque_final":
                let hasOtherAttacks = currentHand.some((c, i) => i !== cardIndex && ["atk", "pierce", "magia", "retaliation", "execute", "dark_atk", "ataque_calculado", "descarte_atk", "vampiric_atk", "multi_atk", "arcane_storm", "eclipse"].includes(c.type));
                if (hasOtherAttacks) {
                    log(`${card.name} falhou: Você ainda tem outras cartas de ataque na mão!`);
                    player.energy += card.cost; 
                    return; 
                }
                aplicarDanoComFiltro(targetEnt, targetType, finalPower, "Ataque Final");
                player.dmgBuff = 0;
                break;

            case "descarte_atk":
                if (currentHand.length <= 1) {
                    log(`${card.name} falhou: Nenhuma carta na mão para sacrificar!`);
                    player.energy += card.cost; 
                    return;
                }
                let idxToDiscard = currentHand.findIndex((c, i) => i !== cardIndex);
                let discardedCard = currentHand.splice(idxToDiscard, 1)[0];
                if (idxToDiscard < cardIndex) cardIndex -= 1;
                
                aplicarDanoComFiltro(targetEnt, targetType, finalPower, "Ataque Brutal");
                log(`Sacrificou ${discardedCard.name}!`);
                player.dmgBuff = 0;
                break;

case "vampiric_atk":
                if (enemy.name.includes("Feiticeira") && targetType !== (enemy.realIdentity || "enemy")) {
                    log(`💨 Golpe Vampírico errou a feiticeira real! Você não sugou vida.`);
                    aplicarDanoComFiltro(targetEnt, targetType, finalPower, "Golpe Vampírico");
                } else {
                    aplicarDanoComFiltro(targetEnt, targetType, finalPower, "Golpe Vampírico");
                    
                    let healAmt;
                    // Se tiver o upgrade aplicado, cura fixo 20, senão calcula os 50% tradicionais
                    if (card.fixedHeal) {
                        healAmt = card.fixedHeal;
                    } else {
                        let hpVampDmg = Math.max(0, finalPower - (targetEnt.enemyShield || 0));
                        healAmt = Math.floor(hpVampDmg * 0.5);
                    }
                    
                    player.hp = Math.min(100, player.hp + healAmt);
                    if(healAmt > 0) log(`🍷 Sugou ${healAmt} de HP.`);
                }
                player.dmgBuff = 0;
                break;

case "loop":
                if (lastPlayedCard && lastPlayedCard.type !== "loop") {
                    let copiedCard = { ...lastPlayedCard, id: Math.random().toString(36).substr(2, 9) };
                    
                    // Se a carta Loop tiver o upgrade aplicado, diminui o custo da cópia em 1
                    if (card.reduceCost) {
                        copiedCard.cost = Math.max(0, copiedCard.cost - card.reduceCost);
                        log(`Loop Perfeito! Retornou ${copiedCard.name} custando ${copiedCard.cost}⚡!`);
                    } else {
                        log(`Loop! Retornou ${copiedCard.name} para sua mão.`);
                    }
                    
                    currentHand.push(copiedCard);
                } else {
                    log("Loop falhou.");
                }
                break;

case "sobrecarga":
                player.energy += 3;
                // Se tiver o upgrade, evita ativar o bloqueio do próximo turno
                if (card.noOverloadPenalty) {
                    overloadedNextTurn = false;
                    log("Sobrecarga Estabilizada! +3⚡ agora e sem penalidades no próximo turno!");
                } else {
                    overloadedNextTurn = true;
                    log("Sobrecarga! +3⚡ agora. Mas você terá limite de energia no próximo turno.");
                }
                break;

            case "ataque_calculado":
                let cardsInHand = currentHand.length - 1; 
                let calcDamage = card.power + (card.power * cardsInHand) + player.dmgBuff;
                aplicarDanoComFiltro(targetEnt, targetType, calcDamage, `Ataque Calculado (${cardsInHand} cartas)`);
                player.dmgBuff = 0;
                break;
        }

        if (card.type !== "loop") {
            lastPlayedCard = card;
        }

        currentHand.splice(cardIndex, 1);
        updateUI();
        
        // Remove lacaios comuns mortos se NÃO for a fase da Feiticeira
        if (!enemy.name.includes("Feiticeira")) {
            if (minion && minion.hp <= 0) {
                log(`${minion.name} foi derrotado!`);
                if (currentTarget === 'minion') currentTarget = 'enemy';
                minion = null;
            }
            if (minion2 && minion2.hp <= 0) {
                log(`${minion2.name} foi derrotado!`);
                if (currentTarget === 'minion2') currentTarget = 'enemy';
                minion2 = null;
            }
        }
        
        updateUI();
        checkGameOver();
    } else {
        log("Sem energia!");
    }
}

function endTurn() {
    const minigameOverlay = document.getElementById('minigameOverlay');

    // DEBUG: Veja no console (F12) o que está impedindo o turno
    if (!inBattle) {
        console.warn("Fim de turno ignorado: inBattle está false.");
        return;
    }
    if (skillCheckActive) {
        console.warn("Fim de turno ignorado: skillCheckActive está true.");
        return;
    }
    if (minigameOverlay && !minigameOverlay.classList.contains('hidden')) {
        console.warn("Fim de turno ignorado: Minigame ainda está aberto.");
        log("🚫 Finalize o desafio primeiro!");
        return;
    }

    // Se passou, prossegue...
    log("Turno encerrado.");
    // ... restante do seu código

     
    
    // 1. Limpeza de escudos e aplicação de status negativos (Sangramento/Queimadura)
    enemy.enemyShield = 0;
    if (minion) minion.enemyShield = 0;
    if (minion2) minion2.enemyShield = 0;
    
    if (minion2 && minion2.bleedTurns > 0) { minion2.hp -= 10; minion2.bleedTurns--; }
    if (enemy.bleedTurns > 0) { enemy.hp -= 10; enemy.bleedTurns--; }
    if (minion && minion.bleedTurns > 0) { minion.hp -= 10; minion.bleedTurns--; }
    if (player.burnTurns > 0) { player.hp -= 8; player.burnTurns--; }
    updateUI();

// 2. Inicia o processamento do Boss
    setTimeout(() => {
        if (enemy.hp <= 0) { 
            // Verifica se a batalha realmente acabou
            let jogoAcabou = checkGameOver(); 
            
            if (jogoAcabou) {
                return; // Acabou a fase, para tudo por aqui.
            } else {
                // O chefe morreu, mas a batalha continua (lacaios vivos).
                // Pula a ação do chefe e passa o turno direto para a gangue!
                executeMinionActionAndFinish();
                return; 
            }
        }
        
        // A) Regras de Convocação (Invocação de Lacaios)  
        
        // A) Regras de Convocação (Invocação de Lacaios)
        if (enemy.nextAction.type === "summon_knight") {
            enemy.hasSummoned = true;
            log(`🐉 O Dragão convocou o Cavaleiro Sombrio!`);
            minion = { name: "Lacaio Cavaleiro", hp: 170, maxHp: 170, img: "cavaleiro.png", nextAction: null, bleedTurns: 0, stunned: false, enemyShield: 0 };
            prepareMinionAction();
            updateUI();
            executeMinionActionAndFinish();
            return;
        }

        if (enemy.nextAction.type === "summon_thieves") {
            enemy.hasSummoned = true;
            log(`💰 O Líder convocou a sua Gangue!`);
            minion = { name: "Ladrão Furtivo", hp: 70, maxHp: 70, img: "ladrao.png", nextAction: null, bleedTurns: 0, stunned: false, enemyShield: 0 };
            minion2 = { name: "Ladrão Bruto", hp: 150, maxHp: 150, img: "ladrao.png", nextAction: null, bleedTurns: 0, stunned: false, enemyShield: 0 };
            prepareMinionAction();
            updateUI();
            executeMinionActionAndFinish();
            return;
        }

        // B) Minigame: Cavaleiro (Ataque Pesado)
        if (enemy.name.includes("Cavaleiro") && enemy.nextAction.type === "dmg_heavy") {
            log("⚠️ DEFESA DE IMPACTO!");
            startSkillCheck();
            return; 
        } 
        
        // C) Minigame: Cientista
        if (enemy.name.includes("Cientista") && (enemy.nextAction.type.startsWith("sci_") || enemy.nextAction.type === "dmg")) {
            log("🔬 REAÇÃO QUÍMICA!");
            startMinigame(enemy.nextAction.type === "sci_math" ? "math" : "typing");
            return;
        }

        // D) Ações comuns e Dreno (Só executa se não estiver atordoado)
        if (!enemy.stunned) {
            switch(enemy.nextAction.type) {
                case "dmg":
                    let dmg = enemy.nextAction.val;
                    if (enemy.weakened) {
                        dmg = Math.floor(dmg * 0.5);
                        log("☠️ A maldição reduziu o dano!");
                        enemy.weakened = false;
                    }
                    applyDamageToPlayer(dmg);
                    log(`${enemy.name} atacou causando ${dmg} de dano!`);
                    break;

                case "steal_gold":
                    let stolenBoss = Math.floor(Math.random() * 5) + 3; // Rouba de 3 a 7
                    if (gold >= stolenBoss) gold -= stolenBoss; else { stolenBoss = gold; gold = 0; }
                    if (stolenBoss > 0) log(`💸 ${enemy.name} atacou e roubou ${stolenBoss} moedas!`);
                    break;

                case "shield":
enemy.enemyShield += enemy.nextAction.val;

if(minion) minion.enemyShield = enemy.enemyShield;
if(minion2) minion2.enemyShield = enemy.enemyShield;
                    log(`${enemy.name} defendeu e ganhou +${enemy.nextAction.val}🛡️!`);
                    break;

                case "knight_drain":
                    if (player.shield > 0) {
                        let stolenShield = player.shield;
                        enemy.enemyShield += stolenShield;
                        player.shield = 0;
                        log(`🛡️ O Cavaleiro drenou ${stolenShield} de seu escudo!`);
                    } else {
                        applyDamageToPlayer(enemy.nextAction.val);
                        log(`🍷 DRENO! ${enemy.name} sugou ${enemy.nextAction.val} da sua vida!`);
                    }
                    enemy.hp = Math.min(enemy.maxHp, enemy.hp + 20); 
                    log(`+20 HP para o Cavaleiro.`);
                    break;

                case "dragon_fire":
                    applyDamageToPlayer(enemy.nextAction.val);
                    enemy.enemyShield += 30;
                    log(`${enemy.name} soprou fogo causando ${enemy.nextAction.val} de dano e ganhou +30🛡️!`);
                    break;

                case "dragon_rest":
                    enemy.hp = Math.min(enemy.maxHp, enemy.hp + 50);
                    log(`${enemy.name} descansou e recuperou +50 HP.`);
                    break;

                case "ativar_espinhos":
                    log(`🌵 A Feiticeira preparou uma barreira de espinhos mágicos em todos os alvos!`);
                    enemy.espinhosAtivos = true;
                    if (minion) minion.espinhosAtivos = true;
                    if (minion2) minion2.espinhosAtivos = true;
                    break;
            }

        }
        
        // 3. Finaliza a ação do Boss e passa para os Lacaios
        executeMinionActionAndFinish();
        
    }, 600);
}


function executeMinionActionAndFinish() {
    // 1. Processa o Primeiro Lacaio (Furtivo / Cavaleiro do Dragão)
    if (minion && minion.hp > 0 && !minion.stunned) {
        setTimeout(() => {
            processSingleMinionAction(minion);
            // Depois que o lacaio 1 agir, vai para o lacaio 2
            checkMinion2();
        }, 500);
    } else {
        checkMinion2();
    }

    // 2. Função interna para checar e rodar o Ladrão Bruto
    function checkMinion2() {
        if (minion2 && minion2.hp > 0 && !minion2.stunned) {
            setTimeout(() => {
                processSingleMinionAction(minion2);
                // Depois que o lacaio 2 agir, finalmente encerra o turno
                finishEnemyTurn();
            }, 500);
        } else {
            finishEnemyTurn();
        }
    }
}

// 3. Nova função auxiliar para executar as ações de qualquer lacaio no jogo
function processSingleMinionAction(m) {
    if (!m || !m.nextAction) return;

    switch(m.nextAction.type) {
        case "dmg":
            applyDamageToPlayer(m.nextAction.val);
            log(`⚔️ ${m.name} atacou! Causou ${m.nextAction.val} de dano.`);
            break;
        case "shield_boss":
            enemy.enemyShield += m.nextAction.val;
            log(`🛡️ ${m.name} protegeu o Chefe! +${m.nextAction.val} de escudo para o líder.`);
            break;
        case "shield_self":
            m.enemyShield = (m.enemyShield || 0) + m.nextAction.val;
            log(`🛡️ ${m.name} defendeu-se e ganhou +${m.nextAction.val} de escudo.`);
            break;
        case "steal_gold":
            let amt = Math.floor(Math.random() * 5) + 3; // Entre 3 e 7 moedas
            gold = Math.max(0, gold - amt);
            log(`💰 ${m.name} roubou ${amt} moedas de ouro da sua bolsa!`);
            break;
    }
    updateUI();
}

function finishEnemyTurn() {
    enemy.stunned = false;
    if(minion) minion.stunned = false;
    if(minion2) minion2.stunned = false;
    player.shield = 0; 
    player.tookDamageThisTurn = false;
    currentHand = [];
    refillEnergyFromBank(); 
    drawHand();
    prepareEnemyAction();
    updateUI();
    checkGameOver();
}
function getCardDescription(card) {

    switch(card.type) {

        case "atk":
            return `Causa ${card.power} de dano ao inimigo`;

        case "pierce":
            return `Ignora parte da defesa e causa ${card.power} de dano.`;

        case "def":
            return `Ganha ${card.power} de escudo.`;

        case "magia":
            return `Causa ${card.power} de dano.`;

        case "energy":
            return `Ganha ${card.power}⚡ e compra 2 cartas.`;

        case "execute":
            return `Causa ${card.power} de dano. Executa inimigos abaixo de 60 HP.`;

        case "dark_atk":
            return `Causa ${card.power} de dano, mas você recebe dano de volta.`;

        case "retaliation":
            return `Causa ${card.power} de dano. Dobra se você sofreu dano neste turno.`;

        case "time_stop":
            return `Atordoa os inimigos por 1 turno e ganha +1⚡.`;

        case "loop":
            return `Retorna a última carta usada para sua mão.`;

        case "sobrecarga":
            return `Ganha +3⚡ agora, mas terá menos energia no próximo turno.`;

        case "ataque_calculado":
            return `Dano base ${card.power}. Fica mais forte conforme sua mão aumenta.`;

        case "recycle":
            return `Descarta toda sua mão e compra novas cartas.`;

        case "ataque_final":
            return `Causa ${card.power} de dano. Só pode ser usada se não houver outros ataques na mão.`;

        case "descarte_atk":
            return `Causa ${card.power} de dano e destrói uma carta aleatória da sua mão.`;

case "vampiric_atk":
            // Se a carta já tiver a propriedade fixedHeal (ou seja, foi upada), mostra o texto novo
            if (card.fixedHeal) {
                return `Causa ${card.power} de dano e cura exatamente 20 HP.`;
            }
            // Caso contrário, mostra o texto da carta normal
            return `Causa ${card.power} de dano e recupera 50% do dano causado.`;
            case "sang":
            return `Causa ${card.power} de dano e aplica 3 turnos de Sangramento.`;

        // =========================
        // NOVAS CARTAS
        // =========================

        case "multi_atk":
            return `Ataca 2 vezes causando ${card.power} de dano por golpe.`;

        case "ruptura":
            return `Destrói toda a defesa inimiga e causa ${card.power} de dano.`;

        case "arcane_storm":
            return `Dispara 3 explosões mágicas de ${card.power} de dano.`;

        case "curse":
            return `Amaldiçoa o inimigo reduzindo seu próximo ataque.`;

        case "gambit":
            return `Compra 2 cartas, mas perde 10 HP.`;

        case "eclipse":
            return `Causa ${card.power} de dano massivo, mas você perde ${card.selfDamage} HP.`;
// --- INJETAR DENTRO DO SWITCH NA FUNÇÃO getCardDescription(card) ---

case "pierce_attack":
    return `⚔️ Um ataque relâmpago que causa ${card.power} de dano. Excelente para esticar combos por custar 0⚡!`;

case "multi_hit":
    let qteGolpes = card.hits || 4;
    return `🌪️ Desfere uma sequência implacável de ${qteGolpes} golpes, causando ${card.power} de dano em cada um. (Seus buffs de dano se aplicam a cada golpe!)`;

case "poison_dagger":
    return `🧪 Fere o inimigo causando ${card.power} de dano físico e o infecta com 3 turnos de Sangramento (Bleed).`;

        default:
            return `Um efeito misterioso...`;
    }
}
// --- INTERFACE ---
function updateUI() {
    // ==========================================
    // --- REFERÊNCIAS BASE ---
    // ==========================================
    const handDiv = document.getElementById('playerHand');
    const enemyName = document.getElementById('enemyNameDisplay');
    const intentText = document.getElementById('intentText');

    // Define qual inimigo está selecionado para atualizar o painel principal superior
    const activeEnemy = (currentTarget === 'minion' && minion) ? minion : 
                        (currentTarget === 'minion2' && minion2) ? minion2 : enemy;

    // ==========================================
    // --- INIMIGO (PAINEL PRINCIPAL) ---
    // ==========================================
    if (enemyName) enemyName.innerText = activeEnemy.name;

    if (DOM.enemySprite) DOM.enemySprite.src = activeEnemy.img || "dragao.png";

    if (DOM.enemyHp) {
        const hpPct = (activeEnemy.hp / activeEnemy.maxHp) * 100;
        DOM.enemyHp.style.width = Math.max(0, hpPct) + "%";
    }

    if (DOM.enemyHpText) {
        DOM.enemyHpText.innerText = `${Math.max(0, Math.floor(activeEnemy.hp))} / ${activeEnemy.maxHp}`;
    }

    if (DOM.shieldEnemy) {
        DOM.shieldEnemy.innerText = `🛡️ ${activeEnemy.enemyShield || 0}`;
    }

    // ==========================================
    // --- PLAYER ---
    // ==========================================
    if (DOM.playerHp) DOM.playerHp.style.width = Math.max(0, player.hp) + "%";
    if (DOM.playerHpText) DOM.playerHpText.innerText = `${Math.max(0, Math.floor(player.hp))} / 100`;
    if (DOM.energyStat) DOM.energyStat.innerText = player.energy;
    if (DOM.shieldPlayer) DOM.shieldPlayer.innerText = `🛡️ ${player.shield}`;
    if (DOM.energyBank) DOM.energyBank.innerText = `Reserva: ${energyBank}⚡`;

    // ==========================================
    // --- OURO ---
    // ==========================================
    const goldUI = document.getElementById('goldValue');
    const goldBtn = document.getElementById('btnGoldDisplay');

    if (goldUI) goldUI.innerText = gold;
    if (goldBtn) goldBtn.innerText = gold;

// ==========================================
    // --- INTENÇÃO DO INIMIGO ---
    // ==========================================
    let combinedIntent = enemy.nextAction
        ? `Inimigo: ${enemy.nextAction.text}`
        : "Aguardando...";

// =====================================
// FEITICEIRA NÃO DUPLICA AÇÕES
// =====================================

if (!enemy.name.includes("Feiticeira")) {

    if (minion && minion.hp > 0 && minion.nextAction) {
        combinedIntent += ` | ${minion.name}: ${minion.nextAction.text}`;
    }

    if (minion2 && minion2.hp > 0 && minion2.nextAction) {
        combinedIntent += ` | ${minion2.name}: ${minion2.nextAction.text}`;
    }
}

    if (intentText) intentText.innerText = combinedIntent;

// =========================
    // --- SELETOR DE ALVO ---
    // =========================
    let targetUI = document.getElementById('targetSelectorContainer');

    if ((minion && minion.hp > 0) || (minion2 && minion2.hp > 0)) {
        if (!targetUI) {
            targetUI = document.createElement('div');
            targetUI.id = 'targetSelectorContainer';
            targetUI.style.margin = '10px auto';
            handDiv.parentNode.insertBefore(targetUI, handDiv);
        }
        targetUI.style.display = 'block';

        let htmlBotao = `<div style="display:flex; gap:15px; align-items:center; justify-content:center; background:#222; padding:8px 15px; border-radius:8px; border:1px solid #444;">`;
        
        // Botão do Boss (Sempre vivo se o grupo existe)
        htmlBotao += `<button onclick="setTarget('enemy')" style="background:${currentTarget === 'enemy' ? '#c0392b' : '#333'}; color:white; padding:8px 12px; border:none; border-radius:5px; cursor:pointer;">🎯 ${enemy.name}</button>`;

        // PROTEÇÃO: Só desenha o botão do Lacaio 1 se ele ainda existir e tiver vida
        if (minion && minion.hp > 0) {
            htmlBotao += `<button onclick="setTarget('minion')" style="background:${currentTarget === 'minion' ? '#2c3e50' : '#333'}; color:white; padding:8px 12px; border:none; border-radius:5px; cursor:pointer;">🎯 ${minion.name}</button>`;
        }
        
        // PROTEÇÃO: Só desenha o botão do Lacaio 2 se ele ainda existir e tiver vida
        if (minion2 && minion2.hp > 0) {
            htmlBotao += `<button onclick="setTarget('minion2')" style="background:${currentTarget === 'minion2' ? '#e67e22' : '#333'}; color:white; padding:8px 12px; border:none; border-radius:5px; cursor:pointer;">🎯 ${minion2.name}</button>`;
        }

        htmlBotao += `</div>`;
        targetUI.innerHTML = htmlBotao;
    } else if (targetUI) {
        targetUI.style.display = 'none';
    }

    // ==========================================
    // --- CARTAS NA MÃO ---
    // ==========================================
    if (handDiv) {
        handDiv.innerHTML = '';

        currentHand.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = `card ${card.colorClass}`;

            if (player.energy < card.cost) {
                cardEl.classList.add('disabled');
            } else {
                cardEl.onclick = () => playCard(index);
            }

            cardEl.innerHTML = `
                <div class="card-cost">${card.cost}</div>
                <img src="${card.img}" alt="${card.name}">
                <div class="card-name">${card.name}</div>
                <div class="card-tooltip">
                    <b>${card.name}</b><br>
                    ${getCardDescription(card)}
                </div>
            `;
            handDiv.appendChild(cardEl);
        });
    }
}
   // Substitua o loop currentHand.forEach inteiro dentro de updateUI() por este:
// === FUNÇÃO PARA ADICIONAR HÁBITOS ===



// Essa função serve para preparar os cliques nos emojis do menu
function setupEmojiSelection() {
    const emojis = document.querySelectorAll('.emoji-item');
    emojis.forEach(emoji => {
        emoji.onclick = () => {
            // Remove a seleção dos outros e coloca neste
            emojis.forEach(e => e.classList.remove('selected'));
            emoji.classList.add('selected');
            // Atualiza a variável global que o addHabit usa
            selectedIcon = emoji.dataset.icon;
        };
    });
}

function prepareEnemyAction() {
    let actions;

if (enemy.name.includes("Feiticeira")) {

    // PRIMEIRA VEZ
    if (!enemy.hasSummoned) {

        enemy.hasSummoned = true;

        log("🔮 A Feiticeira criou duas ilusões perfeitas!");

        minion = {
            name: "Feiticeira",
            hp: enemy.hp,
            maxHp: enemy.maxHp,
            img: "feiticeira.png",
            nextAction: null,
            bleedTurns: 0,
            stunned: false,
            enemyShield: 0
        };

        minion2 = {
            name: "Feiticeira",
            hp: enemy.hp,
            maxHp: enemy.maxHp,
            img: "feiticeira.png",
            nextAction: null,
            bleedTurns: 0,
            stunned: false,
            enemyShield: 0
        };
    }

    // DEFINE QUAL É A VERDADEIRA
    const targets = ["enemy", "minion", "minion2"];

    witchRealTarget =
        targets[Math.floor(Math.random() * targets.length)];

    // REMOVE ESPINHOS ANTIGOS
    thornedClone = null;

    const actions = [

        {
            text: "Explosão Arcana (40 dano)",
            type: "dmg",
            val: 40
        },

        {
            text: "Escudo Espelhado (30🛡️)",
            type: "shield",
            val: 30
        },

        {
            text: "Espinhos Ilusórios 🌵",
            type: "thorns",
            val: 15
        }
    ];

    enemy.nextAction =
        actions[Math.floor(Math.random() * actions.length)];

    // DEFINE QUAL CLONE TERÁ ESPINHOS
    if(enemy.nextAction.type === "thorns") {

        const fakeTargets =
            targets.filter(t => t !== witchRealTarget);

        thornedClone =
            fakeTargets[Math.floor(Math.random() * fakeTargets.length)];
    }

    prepareMinionAction();

    return;


    } else if (enemy.name.includes("Ladrão")) {
        if (!enemy.hasSummoned) { 
            enemy.nextAction = { text: "Emboscar! 🗡️", type: "summon_thieves", val: 0 }; 
            return; 
        }
        actions = [
            { text: "Ataque Sujo (35 dano)", type: "dmg", val: 35 }, 
            { text: "Roubar Ouro 💰", type: "steal_gold", val: 0 }
        ];
    
    } else if (enemy.name.includes("Dragão")) {
        if (!enemy.hasSummoned) {
            enemy.nextAction = { text: "Chamar Guarda! 🐉", type: "summon_knight", val: 0 };
            return;
        }
        actions = [
            { text: "Sopro de Fogo (35 dano + 30🛡️)", type: "dragon_fire", val: 35 },
            { text: "Mordida Brutal (25 dano)", type: "dmg", val: 40 },
            { text: "Descanso do Dragão (+50 HP)", type: "dragon_rest", val: 0 }
        ];

    } else if (enemy.name.includes("Cavaleiro")) {
        actions = [
            { text: "Ataque Pesado (30 dano) ⚠️", type: "dmg_heavy", val: 40 },
            { text: "Dreno Vital (30 dano) 🍷", type: "knight_drain", val: 30 },
        ];

    } else if (enemy.name.includes("Cientista")) {
        actions = [
            { text: "Fórmula Matemática 🔬", type: "sci_math", val: 0 },
            { text: "Composto Volátil 🧪", type: "sci_typing", val: 0 },
            { text: "Ataque Químico (15 dano)", type: "dmg", val: 15 }
        ];

    } else {
        // Inimigos básicos (Goblin, Golem, etc.)
        actions = [
            { text: "Ataque Básico (20 dano)", type: "dmg", val: 20 },
            { text: "Defender (15🛡️)", type: "shield", val: 15 }
        ];
    }

    // Sorteia a ação do Boss baseada no array definido acima
    let randomAction = actions[Math.floor(Math.random() * actions.length)];
    enemy.nextAction = randomAction;

    // Prepara a ação dos lacaios/clones (se existirem)
    if (typeof prepareMinionAction === "function") {
        prepareMinionAction();
    }
}

function prepareMinionAction() {
    if (enemy.name.includes("Feiticeira")) {
        if (minion) minion.nextAction = { text: enemy.nextAction.text, type: "clone_copy" };
        if (minion2) minion2.nextAction = { text: enemy.nextAction.text, type: "clone_copy" };
        return;
    }

    if (minion) {
        let mActions = minion.name.includes("Furtivo") 
            ? [{ text: "Ataque Furtivo (12 dano)", type: "dmg", val: 12 }, { text: "Roubar Ouro 💰", type: "steal_gold", val: 0 }]
            : [{ text: "Ataque (15 dano)", type: "dmg", val: 15 }, { text: "Proteção", type: "shield_boss", val: 15 }];
        minion.nextAction = mActions[Math.floor(Math.random() * mActions.length)];
    }
    if (minion2) {
        let m2Actions = [{ text: "Esmagar (20 dano)", type: "dmg", val: 20 }, { text: "Roubar Ouro 💰", type: "steal_gold", val: 0 }];
        minion2.nextAction = m2Actions[Math.floor(Math.random() * m2Actions.length)];
    }
}

function processSingleMinionAction(m) {
    switch(m.nextAction.type) {
        case "dmg":
            applyDamageToPlayer(m.nextAction.val); log(`⚔️ ${m.name} atacou!`); break;
        case "shield_boss":
            enemy.enemyShield += m.nextAction.val; log(`🛡️ ${m.name} protegeu o Chefe!`); break;
        case "steal_gold":
            let amt = Math.floor(Math.random() * 5) + 3;
            if (gold >= amt) gold -= amt; else { amt = gold; gold = 0; }
            if (amt > 0) log(`💰 ${m.name} roubou ${amt} moedas!`);
            break;
    }
    updateUI();
}

function checkGameOver() {

    // =========================
    // MORTE DO LACAIO
    // =========================
    if (minion && minion.hp <= 0) {
        log(`${minion.name} foi derrotado!`);
        minion = null;
        currentTarget = "enemy";
        updateUI();
    }

    // =========================
    // VITÓRIA CONTRA O BOSS
    // =========================
    // A batalha termina APENAS quando o boss morrer.
    // Não importa se ainda existe clone/lacaio.
    if (enemy.hp <= 0) {

        inBattle = false;

        const reward = Math.floor(Math.random() * 11) + 15;
        gold += reward;

        log(`Vitória! Você coletou 💰 ${reward} moedas.`);

        // limpa tudo da batalha
        minion = null;
        currentTarget = "enemy";
        currentHand = [];
        overloadedNextTurn = false;
        lastPlayedCard = null;

        updateUI();
        showRewardChoice();
        return;
    }

    // =========================
    // GAME OVER PLAYER
    // =========================
    if (player.hp <= 0) {
        alert("GAME OVER!");
        location.reload();
    }
}
function processSingleMinionAction(m) {
    if (!m || !m.nextAction) return;

    switch(m.nextAction.type) {
        case "dmg":
            applyDamageToPlayer(m.nextAction.val); 
            log(`⚔️ ${m.name} atacou!`); 
            break;
        case "shield_boss":
            enemy.enemyShield += m.nextAction.val; 
            log(`🛡️ ${m.name} protegeu o Chefe!`); 
            break;
        case "steal_gold":
            let amt = Math.floor(Math.random() * 5) + 3;
            if (gold >= amt) {
                gold -= amt;
            } else {
                amt = gold;
                gold = 0;
            }
            if (amt > 0) log(`💰 ${m.name} roubou ${amt} moedas!`);
            break;
    }
    updateUI();
}
// ==========================================
// --- RECOMPENSAS E ESTÁGIOS ---
// ==========================================

function showRewardChoice() {
    if (availableRewards.length < 2) {
        nextStageSetup();
        return;
    }

    let idx1 = Math.floor(Math.random() * availableRewards.length);
    let idx2;
    do { idx2 = Math.floor(Math.random() * availableRewards.length); } while (idx1 === idx2);

    const card1 = availableRewards[idx1];
    const card2 = availableRewards[idx2];

    const screen = document.getElementById('rewardScreen');
    const container = document.getElementById('rewardCardDisplay');

    screen.classList.remove('hidden');

    container.innerHTML = `
        <h3 style="color: white; margin-bottom: 20px;">Escolha sua Recompensa:</h3>
        <div style="display: flex; gap: 30px; justify-content: center; align-items: center;">
            <div onclick="claimSpecificReward(${idx1})" style="cursor:pointer; text-align:center;">
                <div class="card ${card1.colorClass}">
                    <div class="card-cost">${card1.cost}</div>
                    <img src="${card1.img}">
                    <div class="card-tooltip">
                        <b>${card1.name}</b><br>
                        ${getCardDescription(card1)}
                    </div>
                </div>
                <p style="color:white; font-weight:bold; margin-top:10px;">${card1.name}</p>
            </div>
            <div onclick="claimSpecificReward(${idx2})" style="cursor:pointer; text-align:center;">
                <div class="card ${card2.colorClass}">
                    <div class="card-cost">${card2.cost}</div>
                    <img src="${card2.img}">
                    <div class="card-tooltip">
                        <b>${card2.name}</b><br>
                        ${getCardDescription(card2)}
                    </div>
                </div>
                <p style="color:white; font-weight:bold; margin-top:10px;">${card2.name}</p>
            </div>
        </div>
    `;
}

function claimSpecificReward(index) {
    const selected = availableRewards.splice(index, 1)[0];
    masterDeck.push(selected);
    log(`Você aprendeu: ${selected.name}!`);
    document.getElementById('rewardScreen').classList.add('hidden');
    currentStage++;
    if (currentStage >= enemiesList.length) {
        alert("JORNADA CONCLUÍDA!"); location.reload();
    } else {
        nextStageSetup();
    }
}

function nextStageSetup() {
    player.energy = 3;
    player.shield = 0;
    player.burnTurns = 0;
    player.tookDamageThisTurn = false; 
    overloadedNextTurn = false;
    lastPlayedCard = null;
    minion = null;
    currentTarget = "enemy";
    enemy = { ...enemiesList[currentStage], nextAction: null, bleedTurns: 0, stunned: false, enemyShield: 0, hasSummoned: false };
    const btnStart = document.getElementById('btnStartBattle');
    if(btnStart) btnStart.classList.remove('hidden');
    minion = null;  // Limpa o lacaio 1 da fase anterior
    minion2 = null; // Limpa o lacaio 2 da fase anterior
    currentTarget = 'enemy'; // Força a sua mira voltar para o Boss novo
    updateUI();
}

// ==========================================
// --- UTILITÁRIOS E FEEDBACK ---
// ==========================================

function log(msg) { 
    if(typeof DOM !== 'undefined' && DOM.battleLog) {
        DOM.battleLog.innerText = msg;
        DOM.battleLog.scrollTop = DOM.battleLog.scrollHeight;
    } else {
        console.log(msg);
    }
}

function shakeElement(el) {
    if(!el) return;
    el.classList.add('shake-anim');
    setTimeout(() => el.classList.remove('shake-anim'), 300);
}

function showEnergyGain(amount) {
    const el = document.createElement('div');
    el.className = "energy-gain";
    el.innerText = `+${amount}⚡`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

// ==========================================
// --- GERENCIAMENTO DE HÁBITOS ---
// ==========================================

let meusHabitos = []; 
let consecutiveDays = 1; 
let editingHabitId = null;


function renderHabitsForToday() {
    const pendingContainer = document.getElementById('habitList');
    const doneContainer = document.getElementById('doneHabitList');
    
    if (!pendingContainer || !doneContainer) return;
    
    pendingContainer.innerHTML = '';
    doneContainer.innerHTML = '';

    meusHabitos.forEach(h => {
        const eDiaDeMostrar = (h.tipo === "diario") || (h.tipo === "semanal" && h.dias.includes(currentDayIndex));
        const jaFeitoHoje = (h.lastDoneIndex === currentDayIndex);
        
        let streakPrevisto = h.streak;
        if (!jaFeitoHoje) {
            let ontemIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;
            streakPrevisto = (h.lastDoneIndex === ontemIndex) ? h.streak + 1 : 1;
        }

        const bonusStreak = Math.floor(streakPrevisto / 3);
        const valorQueSeraGanho = Math.min(h.recompensa + bonusStreak, 8);
        
        if (eDiaDeMostrar) {
            const li = document.createElement('li');
            if (!jaFeitoHoje) {
                li.className = 'habit-item';
                li.innerHTML = `
                    <div class="habit-info">
                        <div>
    <span class="habit-name">${h.nome}</span>

    ${
        h.descricao
            ? `<div class="habit-description">${h.descricao}</div>`
            : ""
    }
</div>
                        <span class="habit-meta">🔥 Streak: ${h.streak} | Ganhe +${valorQueSeraGanho}⚡</span>
                    </div>
                    <button onclick="completeHabit(${h.id})">✔</button>
                `;
                pendingContainer.appendChild(li);
            } else {
                const bonusEfetivo = Math.floor(h.streak / 3);
                const valorFinal = Math.min(h.recompensa + bonusEfetivo, 8);

                li.className = 'habit-item habit-done';
                li.innerHTML = `<span class="habit-name">✅ ${h.nome} (Ganhou +${valorFinal}⚡)</span>`;
                doneContainer.appendChild(li);
            }
        }
    });
}

function completeHabit(id) {
    const h = meusHabitos.find(h => h.id === id);
    if (!h || h.lastDoneIndex === currentDayIndex) return;

    let ontemIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;
    if (h.lastDoneIndex === ontemIndex) {
        h.streak++;
    } else {
        h.streak = 1;
    }

    h.lastDoneIndex = currentDayIndex;
    h.lastDone = new Date().toDateString(); 

    let bonus = Math.floor(h.streak / 3);
    let totalGanhado = Math.min(h.recompensa + bonus, 8);
    energyBank += totalGanhado;

    if(habitHistoryData[currentDayIndex] !== undefined) {
        habitHistoryData[currentDayIndex]++;
        let missedHabitsHistory = [];
    }
    
    showEnergyGain(totalGanhado);
    log(`✔ ${h.nome} concluído! +${totalGanhado}⚡ (Streak: ${h.streak})`);
    
    renderHabitsForToday();
    if(typeof updateUI === 'function') updateUI();
    updateChart();
    // soma quantidade concluída
    h.completedCount = (h.completedCount || 0) + 1;
        // 🔥 FALTAVA ISSO
    updateHistoryStats();
}

// ==========================================
// --- INTERFACE E NAVEGAÇÃO ---
// ==========================================

/**
 * Alterna a visibilidade do menu de hábitos
 */
function toggleHabitMenu(forceOpen = false) { 
    const menu = document.getElementById('habitMenu');

    if (!menu) return;

    if (forceOpen) {
        menu.classList.remove('hidden');
        return;
    }

    menu.classList.toggle('hidden');

    if (menu.classList.contains('hidden')) {
        resetHabitMenu();
    }
}



function toggleDaysSelector() {
    const tipo = document.getElementById('habitType').value;
    const selector = document.getElementById('weekDaysSelector');
    if (selector) {
        selector.classList.toggle('hidden', tipo !== 'semanal');
    }
}
// ==========================================
// HISTÓRICO DE HÁBITOS PERDIDOS
// ==========================================

let missedHabitsHistory = [];

function nextDay() {

    // =========================================
    // VERIFICA HÁBITOS PERDIDOS
    // =========================================

    meusHabitos.forEach(h => {

        const eraDiaDoHabito =

            h.tipo === "diario" ||

            (
                h.tipo === "semanal" &&
                h.dias.includes(currentDayIndex)
            );

        const naoFoiFeitoHoje =
            h.lastDoneIndex !== currentDayIndex;

        // 🔥 PERDEU O HÁBITO
        if (eraDiaDoHabito && naoFoiFeitoHoje) {

            // RESET DA STREAK
            h.streak = 0;

            // SALVA NO HISTÓRICO
            missedHabitsHistory.push({

                nome: h.nome,

                dia: weekDays[currentDayIndex],

                data: new Date().toLocaleDateString()

            });

            log(`❌ Hábito perdido: ${h.nome}`);
            updateChart();
            updateHistoryStats();
        }
    });

    // =========================================
    // AVANÇA O DIA
    // =========================================

    currentDayIndex =
        (currentDayIndex + 1) % 7;

    // =========================================
    // RESETA O GRÁFICO TODA SEGUNDA
    // =========================================

    if (currentDayIndex === 0) {

        habitHistoryData =
            [0, 0, 0, 0, 0, 0, 0];

        log("📊 Novo ciclo semanal iniciado!");
    }

    // =========================================
    // BÔNUS DIÁRIO
    // =========================================

    const dailyBonus =
        Math.min(3 + consecutiveDays, 15);

    energyBank += dailyBonus;

    consecutiveDays++;

    // =========================================
    // UI
    // =========================================

    const display =
        document.getElementById('currentDayDisplay');

    if (display) {

        display.innerText =
            `📅 ${weekDays[currentDayIndex]}`;
    }

    showEnergyGain(dailyBonus);

    log(
        `🌅 Amanheceu em ${weekDays[currentDayIndex]}! +${dailyBonus}⚡`
    );

    renderHabitsForToday();

    if (typeof updateUI === 'function') {

        updateUI();
    }

    updateChart();

    // Atualiza histórico visual
    if (typeof updateHistoryList === "function") {

        updateHistoryList();
    }
}
function updateHistoryList() {

    const historyContainer =
        document.getElementById("historyList");

    if (!historyContainer) return;

    historyContainer.innerHTML = "";

    // Nenhum hábito perdido
    if (missedHabitsHistory.length === 0) {

        historyContainer.innerHTML = `

            <div style="
                color:white;
                padding:10px;
            ">
                Nenhum hábito perdido 🎉
            </div>

        `;

        return;
    }

    // Renderiza histórico
    missedHabitsHistory
        .slice()
        .reverse()
        .forEach(item => {

            const div =
                document.createElement("div");

            div.className = "history-item";

            div.innerHTML = `

                <div style="
                    background:#2c0b0e;
                    border:1px solid #c0392b;
                    border-radius:10px;
                    padding:12px;
                    margin-bottom:10px;
                    color:white;
                ">

                    ❌ <b>${item.nome}</b><br>

                    <small>
                        Perdido em:
                        ${item.dia}
                        (${item.data})
                    </small>

                </div>

            `;

            historyContainer.appendChild(div);
        });
}

// ==========================================
// --- CRIAÇÃO E INTERFACE ---
// ==========================================

function toggleDaysSelector() {
    const tipo = document.getElementById('habitType').value;
    const selector = document.getElementById('weekDaysSelector');
    if (selector) {
        selector.classList.toggle('hidden', tipo !== 'semanal');
    }
}

function getSelectedDays() {
    const checkboxes = document.querySelectorAll('.day-checkbox:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
}

function addHabit() {

    const input = document.getElementById('habitInput');
    const tipo = document.getElementById('habitType').value;
    const dificuldade = document.getElementById('habitDifficulty');
    const description = document.getElementById("habitDescription").value;

    const nome = input.value.trim();

    if (!nome) {
        return alert("Digite o nome do hábito!");
    }

    const diasSelecionados =
        tipo === "semanal"
            ? getSelectedDays()
            : [];

    if (tipo === "semanal" && diasSelecionados.length === 0) {
        return alert("Selecione os dias da semana!");
    }

    const novoHabito = {

        id: Date.now(),

        nome: `${selectedIcon} ${nome}`,

        descricao: description, // 🔥 NOVA DESCRIÇÃO

        tipo: tipo,

        recompensa: parseInt(dificuldade.value),

        dias: diasSelecionados,

        streak: 0,

        lastDone: null,
        lastDoneIndex: null,
        completedCount: 0
    };

    meusHabitos.push(novoHabito);

    // limpa campos
    input.value = "";
    document.getElementById("habitDescription").value = "";

    document.querySelectorAll('.day-checkbox')
        .forEach(cb => cb.checked = false);

    toggleDaysSelector();

    log("✅ Hábito adicionado!");

    renderHabitsForToday();

    // fecha modal
    fecharModalHabito();
}
function openEditHabitMenu() {

    if (meusHabitos.length === 0) {
        alert("Você ainda não possui hábitos.");
        return;
    }

    let nomes = meusHabitos.map((h, i) => {
        return `${i + 1} - ${h.nome}`;
    }).join("\n");

    let escolha = prompt(
        "Escolha o número do hábito:\n\n" + nomes
    );

    let index = parseInt(escolha) - 1;

    if (isNaN(index) || !meusHabitos[index]) return;

    loadHabitToEditor(meusHabitos[index]);
}

function loadHabitToEditor(habit) {

    editingHabitId = habit.id;

    toggleHabitMenu(true);

    document.getElementById('habitMenuTitle').innerText =
        "Editar Hábito";

    document.getElementById('saveHabitBtn').innerText =
        "💾 Salvar Alterações";

    document.getElementById('deleteHabitBtn')
        .classList.remove('hidden');

    // REMOVE O EMOJI DO NOME
    let nomeSemEmoji = habit.nome.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u, '');

    document.getElementById('habitInput').value =
        nomeSemEmoji;

    document.getElementById('habitDifficulty').value =
        habit.recompensa;

    document.getElementById('habitType').value =
        habit.tipo;

    selectedIcon = habit.nome.split(" ")[0];

    document.querySelectorAll('.emoji-item').forEach(el => {

        el.classList.remove('selected');

        if (
            el.dataset.icon === selectedIcon ||
            el.textContent === selectedIcon
        ) {
            el.classList.add('selected');
        }
    });

    toggleDaysSelector();

    document.querySelectorAll('.day-checkbox')
        .forEach(box => {

            box.checked = false;

            if (
                habit.dias &&
                habit.dias.includes(parseInt(box.value))
            ) {
                box.checked = true;
            }
        });
}

function saveHabit() {

    if (editingHabitId !== null) {
        updateHabit();
    } else {
        addHabit();
    }
}

function updateHabit() {

    const habit =
        meusHabitos.find(h => h.id === editingHabitId);

    if (!habit) return;

    const nome =
        document.getElementById('habitInput')
            .value.trim();

    if (!nome) {
        alert("Digite o nome do hábito!");
        return;
    }

    const tipo =
        document.getElementById('habitType').value;

    const diasSelecionados =
        tipo === "semanal"
            ? getSelectedDays()
            : [];

    if (
        tipo === "semanal" &&
        diasSelecionados.length === 0
    ) {
        alert("Selecione os dias.");
        return;
    }

    habit.nome = `${selectedIcon} ${nome}`;

    habit.tipo = tipo;

    habit.recompensa = parseInt(
        document.getElementById('habitDifficulty').value
    );

    habit.dias = diasSelecionados;

    resetHabitMenu();

    renderHabitsForToday();

    log(`✏️ Hábito atualizado!`);
}

// =====================================
// SISTEMA DE NAVEGAÇÃO
// =====================================

const sidebarButtons = document.querySelectorAll(".sidebar-btn");
const screens = document.querySelectorAll(".screen");

sidebarButtons.forEach(button => {

    button.addEventListener("click", () => {

        // Remove active de todos
        sidebarButtons.forEach(btn => {
            btn.classList.remove("active");
        });

        // Ativa botão atual
        button.classList.add("active");

        // Esconde todas as telas
        screens.forEach(screen => {
            screen.classList.remove("active-screen");
        });

        // Mostra tela correta
        const target = button.dataset.screen;
        const targetScreen = document.getElementById(`screen-${target}`);

        if (targetScreen) {
            targetScreen.classList.add("active-screen");

            // Atualiza histórico
if (target === "history") {

    updateHistoryList();

    updateHistoryStats();

    setTimeout(() => {

        if (habitChart) {
            habitChart.destroy();
        }

        initChart();

    }, 50);
}

            // Atualiza batalha
            if (target === "battle") {
                updateUI();

                if (inBattle) {
                    renderHand();
                }
            }
        }

    });

});

// Funções para controlar o Modal de Hábitos
function abrirModalHabito() {
    document.getElementById('modalNovoHabito').classList.remove('hidden');
}

function fecharModalHabito() {
    document.getElementById('modalNovoHabito').classList.add('hidden');
}
function renderCardsScreen() {

    const container =
        document.getElementById("cardsContainer");

    if (!container) return;

    container.innerHTML = "";

    // Junta todas as cartas
    const allCards = [
        ...masterDeck,
        ...availableRewards
    ];

    // REMOVE REPETIDAS
    const uniqueCards = [];
    const addedNames = new Set();

    allCards.forEach(card => {

        if (!addedNames.has(card.name)) {

            addedNames.add(card.name);

            uniqueCards.push(card);

        }

    });

    // RENDERIZA
    uniqueCards.forEach(card => {

        const cardEl =
            document.createElement("div");

        cardEl.className =
            `card-collection ${card.colorClass}`;

        cardEl.innerHTML = `

            <div class="card-cost">
                ${card.cost}
            </div>

            <img src="${card.img}" alt="${card.name}">

            <div class="card-name">
                ${card.name}
            </div>

            <div class="card-desc">
                ${getCardDescription(card)}
            </div>

        `;

        container.appendChild(cardEl);

    });

}
function renderCardCollection() {

    const container = document.getElementById("cardsContainer");

    if (!container) return;

    container.innerHTML = "";

    // Junta todas as cartas
    const allCards = [...masterDeck, ...availableRewards];

    // Remove duplicadas pelo nome
    const uniqueCards = [];

    const addedNames = new Set();

    allCards.forEach(card => {

        if (!addedNames.has(card.name)) {

            addedNames.add(card.name);

            uniqueCards.push(card);

        }

    });

    // Renderiza
    uniqueCards.forEach(card => {

        const cardElement = document.createElement("div");

        cardElement.classList.add("collection-card");

        cardElement.innerHTML = `

            <div class="card-top ${card.colorClass}">
                <span class="card-cost">⚡ ${card.cost}</span>
            </div>

            <img src="${card.img}" class="collection-card-img">

            <h3>${card.name}</h3>

            <p class="card-description">
                ${getCardDescription(card)}
            </p>

        `;

        container.appendChild(cardElement);

    });

}
// carregar coleção
window.addEventListener("load", renderCardCollection);
// Captura o botão pelo ID e injeta a função diretamente nele
document.addEventListener("DOMContentLoaded", () => {
    const btnBeta = document.getElementById("btn-beta-tester");
    
    if (btnBeta) {
        btnBeta.addEventListener("click", () => {
            // Chama a sua função existente
            addBetaEnergy(); 
        });
    }
});
// Exemplo de como a função deve atualizar o texto que vimos no print
function addBetaEnergy() {
    energyBank += 9999999;
    updateUI(); // adiciona o valor
    
    // Procura o elemento da reserva (ajuste a classe/id para o seu caso)
    const displayReserva = document.querySelector(".reserva-energia"); 
    if (displayReserva) {
        displayReserva.innerHTML = `Reserva: ${suaVariavelDeReserva} ⚡`;
    }
}
function updateHistoryStats() {

    // 🔥 Melhor streak
    const best = Math.max(
        ...meusHabitos.map(h => h.streak || 0),
        0
    );

    // ⚡ Energia total gerada
    let totalEnergyGenerated = 0;

    meusHabitos.forEach(h => {

        // quantidade de vezes concluídas
        if (h.completedCount) {

            totalEnergyGenerated +=
                h.completedCount * h.recompensa;
        }

    });

    // ✅ Hábitos concluídos
    const completed = meusHabitos.reduce((acc, h) => {

        return acc + (h.completedCount || 0);

    }, 0);

    // Atualiza UI
    document.getElementById("bestStreak").innerText = best;

    document.getElementById("totalEnergy").innerText =
        totalEnergyGenerated;

    document.getElementById("completedHabits").innerText =
        completed;

    document.getElementById("consecutiveDaysDisplay").innerText =
        consecutiveDays || 0;
}
function toggleDeckView(){

    const modal = document.getElementById("deckModal");

    modal.classList.toggle("hidden");

    renderDeckView();
}
function updateEnergy(){

    document.getElementById("energyStat").textContent =
        player.energy;

}
function aplicarEfeitoDeUpgrade(card) {

    if (card.isUpgraded) {
        console.log("Esta carta já está no nível máximo!");
        return false;
    }

    card.isUpgraded = true;

    const originalName = card.name;

    card.name = card.name + "+";

    switch (originalName) {

        case "Golpe":
            card.cost = 0;
            break;

        case "Escudo":
            card.cost = 0;
            break;

        case "Golpe Duplo":
            card.hits = 3;
            card.power += 2;
            break;

        case "Bola de Fogo":
            card.power += 20;
            card.cost = 1;
            break;

        case "Foco":
            card.power += 1;
            break;

        case "Corte Duplo":
            card.hits = 3;
            card.power += 1;
            break;

        case "Lâmina Sombria":
            card.cost = 1;
            break;

        case "Ataque Calculado":
            card.power += 4;
            break;

        case "Reciclar":
            card.draw = (card.draw || 1) + 1;
            break;

        case "Ataque Sombrio":
            card.selfDamage = 5;
            break;
        case"arcane_storm":
        card.power = + 2;
        break;

// --- NOVOS UPGRADES SOLICITADOS ---
        case "Lâmina Sombria":
            card.power += 10;                  // Aumenta o dano +10
            card.cost = Math.max(0, card.cost - 1); // Diminui o custo em 1 (Mínimo 0)
            break;

        case "Reciclar Mão":
            // Guarda o efeito modificado diretamente na carta para a lógica ler depois
            card.extraCards = 1; 
            break;

        case "Boss Killer":
            card.power += 10;                  // Aumenta +10 de dano
            break;

        case "Loop":
            // Armazena uma propriedade dizendo que cartas retornadas ganham desconto
            card.reduceCost = 1; 
            break;

        case "Sobrecarga":
            // Indica que no próximo turno ela manterá a energia padrão
            card.noOverloadPenalty = true; 
            break;

        case "Ataque Final":
            card.power += 5;                   // Aumenta +5 de dano
            break;

        case "Golpe Vampírico":
            // Define o modificador de cura fixa para 20
            card.fixedHeal = 20; 
            break;

        // Se uma carta não possuir regra customizada, aplica um upgrade padrão genérico
        default:
            if (card.power > 0) card.power += 5;
            else card.cost = Math.max(0, card.cost - 1);
            break;
    }

    card.isUpgraded = true; // Marca a carta como melhorada
    return true;
}
function obterTextoPreviaUpgrade(card) {
    // Se a carta já estiver upada, avisa
    if (card.isUpgraded) {
        return "<span style='color: #e74c3c;'>Já está no nível máximo!</span>";
    }

    // Retorna o texto baseado no nome original da carta
    switch (card.name) {
        case "Golpe":
            return "<span style='color: #2ecc71;'>⚡ Custo: 1 ➔ 0</span><br><span style='color: #f1c40f;'>Fica gratuita!</span>";
        
        case "Escudo":
            return "<span style='color: #2ecc71;'>⚡ Custo: 1 ➔ 0</span><br><span style='color: #f1c40f;'>Fica gratuita!</span>";
        
        case "Corte Duplo":
            return "<span style='color: #2ecc71;'>⚔️ Golpes: 2 ➔ 3</span><br><span style='color: #2ecc71;'>💥 Dano: +1 por hit</span>";
        
        case "Bola de Fogo":
            return "<span style='color: #2ecc71;'>💥 Dano: +20</span><br><span style='color: #2ecc71;'>⚡ Custo: 2 ➔ 1</span>";
            
        case "Foco":
            return "<span style='color: #2ecc71;'>🔋 Energia: +2 adicionais</span>";
        case "Lâmina Sombria":
    return `
        <span style='color:#2ecc71;'>
            ⚡ Custo: reduzido para 1
        </span>
    `;

case "Ataque Calculado":
    return `
        <span style='color:#2ecc71;'>
            💥 Dano: +4
        </span>
    `;

case "recycle":
    return `
        <span style='color:#2ecc71;'>
            🃏 Compra +1 carta adicional
        </span>
    `;

case "Ataque Sombrio":
    return `
        <span style='color:#2ecc71;'>
            ❤️ Perda de vida: 10 ➜ 5
        </span>
    `;
case"arcane_storm":
return `
        <span style='color:#2ecc71;'>
            💥 Dano: +2
        </span>
    `;
       // --- NOVOS PREVIEWS SOLICITADOS ---
        case "Lâmina Sombria":
            return `<span>Dano: ${card.power} ➔ <b style="color:#2ecc71">${card.power + 10}</b></span><br>
                    <span>Custo: ${card.cost}⚡ ➔ <b style="color:#2ecc71">${Math.max(0, card.cost - 1)}⚡</b></span>`;

        case "Reciclar Mão":
            return `<span>Efeito: Recicla a mão ➔ <b style="color:#2ecc71">Compra +1 carta extra!</b></span>`;

        case "Boss Killer":
            return `<span>Dano: ${card.power} ➔ <b style="color:#2ecc71">${card.power + 10}</b></span>`;

        case "Loop":
            return `<span>Efeito: Retorna carta ➔ <b style="color:#2ecc71">Reduz custo dela em 1⚡!</b></span>`;

        case "Sobrecarga":
            return `<span>Penalidade: Limite 2⚡ ➔ <b style="color:#2ecc71">Sem penalidade (3⚡)!</b></span>`;

        case "Ataque Final":
            return `<span>Dano: ${card.power} ➔ <b style="color:#2ecc71">${card.power + 5}</b></span>`;

        case "Golpe Vampírico":
            return `<span>Cura: 50% do dano ➔ <b style="color:#2ecc71">Cura fixa de 20 HP!</b></span>`;

        default:
            if (card.power > 0) {
                return `<span>Dano: ${card.power} ➔ <b style="color:#2ecc71">${card.power + 5}</b></span>`;
            }
            return `<span>Custo: ${card.cost}⚡ ➔ <b style="color:#2ecc71">${Math.max(0, card.cost - 1)}⚡</b></span>`;
    }
}
let witchRealTarget = "enemy";
let thornedClone = null;
function shuffleWitchClones() {

    const positions = ["enemy", "minion", "minion2"];

    // embaralha posições
    positions.sort(() => Math.random() - 0.5);

    witchRealTarget = positions[0];

    // escolhe clone espinhoso
    thornedClone = positions[
        Math.floor(Math.random() * 2) + 1
    ];

    if(thornedClone === witchRealTarget){
        thornedClone = positions[1];
    }

    // =====================================
    // TROCA VISUAL DOS SPRITES
    // =====================================

    const enemyImg = document.getElementById("enemySprite");
    const minionImg = document.getElementById("minionSprite");
    const minion2Img = document.getElementById("minion2Sprite");

    // todas parecem iguais
    enemyImg.src = "feiticeira.png";
    minionImg.src = "feiticeira.png";
    minion2Img.src = "feiticeira.png";

    // remove efeitos antigos
    enemyImg.classList.remove("thorns");
    minionImg.classList.remove("thorns");
    minion2Img.classList.remove("thorns");

    // adiciona brilho de espinhos
    if(thornedClone === "enemy"){
        enemyImg.classList.add("thorns");
    }

    if(thornedClone === "minion"){
        minionImg.classList.add("thorns");
    }

    if(thornedClone === "minion2"){
        minion2Img.classList.add("thorns");
    }

    log("🌀 As ilusões da Feiticeira mudaram!");
}
let witchPositions = {
    enemy: "real",
    minion: "fake",
    minion2: "fake"
};
// ==========================================
// --- SISTEMA DE MODO CLARO/ESCURO ---
// ==========================================

function toggleLightMode() {
    const body = document.body;
    body.classList.toggle('light-mode');
    
    const btn = document.getElementById('themeToggleBtn');
    const isLight = body.classList.contains('light-mode');
    
    if (isLight) {
        btn.innerText = "Ativar Modo Escuro 🌙";
        localStorage.setItem('habitQuestTheme', 'light');
    } else {
        btn.innerText = "Ativar Modo Claro ☀️";
        localStorage.setItem('habitQuestTheme', 'dark');
    }
}

// Carrega a preferência salva quando a página carregar
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('habitQuestTheme');
    const btn = document.getElementById('themeToggleBtn');
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        if (btn) btn.innerText = "Ativar Modo Escuro 🌙";
    }
});
function openEditHabitMenu() {

    if (meusHabitos.length === 0) {
        alert("Você ainda não possui hábitos.");
        return;
    }

    const overlay =
        document.getElementById("editHabitOverlay");

    const list =
        document.getElementById("editHabitList");

    list.innerHTML = "";

    meusHabitos.forEach(habit => {

        const card = document.createElement("div");

        card.className = "edit-habit-card";

        card.innerHTML = `
            <div class="edit-habit-title">
                ${habit.nome}
            </div>

            <div class="edit-habit-desc">
                ${habit.descricao || "Sem descrição"}
            </div>
        `;

        card.onclick = () => {

            closeEditHabitMenu();

            loadHabitToEditor(habit);
        };

        list.appendChild(card);
    });

    overlay.classList.remove("hidden");
}
function closeEditHabitMenu() {

    document
        .getElementById("editHabitOverlay")
        .classList.add("hidden");
}
function fecharLoja() {

    // fecha a loja
    toggleShop();

    // se veio da progressão
    if (shopFromProgression) {

        shopFromProgression = false;

        // inicia a batalha
        startBattle();
    }
}

function loadHabitToEditor(habit) {

    editingHabitId = habit.id;

    abrirModalHabito();

    document.getElementById('habitMenuTitle').innerText =
        "Editar Hábito";

    document.getElementById('saveHabitBtn').innerText =
        "💾 Salvar Alterações";

    document.getElementById('deleteHabitBtn')
        .classList.remove('hidden');

    // remove emoji do começo
    let nomeSemEmoji = habit.nome.replace(
        /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u,
        ''
    );

    document.getElementById('habitInput').value =
        nomeSemEmoji;

    document.getElementById("habitDescription").value =
        habit.descricao || "";

    document.getElementById('habitDifficulty').value =
        habit.recompensa;

    document.getElementById('habitType').value =
        habit.tipo;

    selectedIcon = habit.nome.split(" ")[0];

    document.querySelectorAll('.emoji-item').forEach(el => {

        el.classList.remove('selected');

        if (
            el.dataset.icon === selectedIcon ||
            el.textContent === selectedIcon
        ) {
            el.classList.add('selected');
        }
    });

    toggleDaysSelector();

    document.querySelectorAll('.day-checkbox')
        .forEach(box => {

            box.checked = false;

            if (
                habit.dias &&
                habit.dias.includes(parseInt(box.value))
            ) {
                box.checked = true;
            }
        });
}

function saveHabit() {

    if (editingHabitId !== null) {
        updateHabit();
    } else {
        addHabit();
    }
}

function updateHabit() {

    const habit =
        meusHabitos.find(h => h.id === editingHabitId);

    if (!habit) return;

    const nome =
        document.getElementById('habitInput')
            .value.trim();

    if (!nome) {
        alert("Digite o nome do hábito!");
        return;
    }

    const tipo =
        document.getElementById('habitType').value;

    const diasSelecionados =
        tipo === "semanal"
            ? getSelectedDays()
            : [];

    if (
        tipo === "semanal" &&
        diasSelecionados.length === 0
    ) {
        alert("Selecione os dias.");
        return;
    }

    habit.nome = `${selectedIcon} ${nome}`;

    habit.descricao =
        document.getElementById("habitDescription").value;

    habit.tipo = tipo;

    habit.recompensa = parseInt(
        document.getElementById('habitDifficulty').value
    );

    habit.dias = diasSelecionados;

    resetHabitMenu();

    fecharModalHabito();

    renderHabitsForToday();

    log(`✏️ Hábito atualizado!`);
}

function deleteHabit() {

    if (editingHabitId === null) return;

    const habit =
        meusHabitos.find(h => h.id === editingHabitId);

    if (!habit) return;

    const confirmar = confirm(
        `Excluir "${habit.nome}"?`
    );

    if (!confirmar) return;

    meusHabitos =
        meusHabitos.filter(
            h => h.id !== editingHabitId
        );

    resetHabitMenu();

    fecharModalHabito();

    renderHabitsForToday();

    log("🗑️ Hábito excluído!");
}

function resetHabitMenu() {

    editingHabitId = null;

    document.getElementById('habitMenuTitle')
        .innerText = "Criar Novo Hábito";

    document.getElementById('saveHabitBtn')
        .innerText = "Criar Hábito";

    document.getElementById('deleteHabitBtn')
        .classList.add('hidden');

    document.getElementById('habitInput').value = "";

    document.getElementById("habitDescription").value = "";

    document.getElementById('habitDifficulty').value = "5";

    document.getElementById('habitType').value =
        "diario";

    document.querySelectorAll('.day-checkbox')
        .forEach(cb => cb.checked = false);

    toggleDaysSelector();
}
window.openEditHabitMenu = openEditHabitMenu;
window.saveHabit = saveHabit;
window.deleteHabit = deleteHabit;
// ==========================================
// --- COMPRA DE PACOTE DE CARTAS NA LOJA ---
// ==========================================

function buyRandomCardPack() {
    const PRICE = 30;

    // 1. Verifica moedas usando a variável global correta
    if (gold < PRICE) {
        log("❌ Moedas insuficientes para o Pacote!");
        return;
    }

    // 2. Verifica se ainda existem cartas disponíveis
    if (availableRewards.length < 2) {
        log("❌ Não há cartas suficientes na loja para comprar!");
        return;
    }

    // 3. Paga o valor
    gold -= PRICE;
    updateUI();

    // 4. Sorteia dois índices de cartas diferentes
    let idx1 = Math.floor(Math.random() * availableRewards.length);
    let idx2;
    do { 
        idx2 = Math.floor(Math.random() * availableRewards.length); 
    } while (idx1 === idx2);

    const card1 = availableRewards[idx1];
    const card2 = availableRewards[idx2];

    // 5. Mostra a tela visual (adaptada para a loja)
    showShopCardChoice(card1, card2, idx1, idx2);
}

function showShopCardChoice(card1, card2, idx1, idx2) {
    const screen = document.getElementById('rewardScreen');
    const container = document.getElementById('rewardCardDisplay');

    // Usa a mesma tela de loot
    screen.classList.remove('hidden');

    container.innerHTML = `
        <h3 style="color: #f1c40f; margin-bottom: 20px;">Pacote de Cartas! Escolha UMA:</h3>
        <div style="display: flex; gap: 30px; justify-content: center; align-items: center;">
            <div onclick="claimShopReward(${idx1})" style="cursor:pointer; text-align:center;">
                <div class="card ${card1.colorClass}">
                    <div class="card-cost">${card1.cost}</div>
                    <img src="${card1.img}">
                    <div class="card-tooltip">
                        <b>${card1.name}</b><br>
                        ${getCardDescription(card1)}
                    </div>
                </div>
                <p style="color:white; font-weight:bold; margin-top:10px;">${card1.name}</p>
            </div>
            <div onclick="claimShopReward(${idx2})" style="cursor:pointer; text-align:center;">
                <div class="card ${card2.colorClass}">
                    <div class="card-cost">${card2.cost}</div>
                    <img src="${card2.img}">
                    <div class="card-tooltip">
                        <b>${card2.name}</b><br>
                        ${getCardDescription(card2)}
                    </div>
                </div>
                <p style="color:white; font-weight:bold; margin-top:10px;">${card2.name}</p>
            </div>
        </div>
    `;
}

function claimShopReward(index) {
    // Remove a carta da pool geral e adiciona ao deck principal do jogador
    const selected = availableRewards.splice(index, 1)[0];
    masterDeck.push(selected);
    
    log(`🛍️ Você comprou e aprendeu: ${selected.name}!`);
    
    // Esconde a tela de recompensa para voltar à Loja
    document.getElementById('rewardScreen').classList.add('hidden');
    
    updateUI();
}
