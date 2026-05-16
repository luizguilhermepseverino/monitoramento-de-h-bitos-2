// ==========================================
// --- ESTADO DE PROGRESSÃO E INIMIGOS ---
// ==========================================
let currentStage = 0;
let gold = 0; 

const enemiesList = [
    { name: "Globin", hp: 45, maxHp: 45, color: "#27ae60", img: "globin.png" },
    { name: "Golem", hp: 90, maxHp: 90, color: "#e67e22", img: "golem.png" },
    { name: "Cavaleiro Sombrio", hp: 200, maxHp: 200, color: "#2c3e50", img: "cavaleiro.png" },
    { name: "Cientista", hp: 270, maxHp: 270, color: "#9b59b6", img: "cientista.png" },
    { name: "Dragão do Prazo Final", hp: 300, maxHp: 300, color: "#c0392b", img: "dragao.png" }
];

// Lista de sugestões temáticas
const habitSuggestions = [
    "Treinar 30min na Academia",
    "Estudar JavaScript por 1 Hora",
    "Beber 2L de Água",
    "Comer uma Fruta no Lanche",
    "Meditar por 10 Minutos",
    "Ler 5 Páginas de um Livro",
    "Organizar a Mesa de Trabalho",
    "Praticar Alongamento",
    "Revisar Matéria do ENEM",
    "Caminhada de 20 Minutos"
];

function toggleSuggestions() {
    const box = document.getElementById('suggestionBox');
    box.classList.toggle('hidden');
    
    // Limpa a box e adiciona as sugestões como botões
    box.innerHTML = ''; 
    habitSuggestions.forEach(sugestao => {
        const btn = document.createElement('button');
        btn.innerText = sugestao;
        btn.className = 'suggestion-item-btn';
        btn.onclick = () => {
            document.getElementById('habitInput').value = sugestao;
            box.classList.add('hidden'); // Fecha o menu após escolher
        };
        box.appendChild(btn);
    });
}

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

let enemy = { ...enemiesList[0], nextAction: null, bleedTurns: 0, stunned: false, enemyShield: 0, hasSummoned: false };

// --- SISTEMA DE LACAIO E ALVOS ---
let minion = null;
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
    { name: "Lâmina Sombria", type: "atk", effect: "bleed", cost: 2, power: 20, img: "laminasombria.png", colorClass: "card-espada" },
    { name: "Veredito do Arcanjo", type: "magia", cost: 3, power: 60, img: "veredito.png", colorClass: "card-magia" },
    { name: "Preciso", type: "pierce", cost: 1, power: 20, img: "preciso.png", colorClass: "card-espada" },
    { name: "Bola de Fogo", type: "magia", cost: 2, power: 35, img: "boladefogo.png", colorClass: "card-magia" },
    { name: "Loop", type: "loop", cost: 0, power: 0, img: "loop.png", colorClass: "card-magia" },
    { name: "Sobrecarga", type: "sobrecarga", cost: 0, power: 0, img: "sobrecarga.png", colorClass: "card-raio" },
    { name: "Ataque Calculado", type: "ataque_calculado", cost: 1, power: 8, img: "ataquecalculado.png", colorClass: "card-ataque" },
    
    // --- NOVAS CARTAS ADICIONADAS ---
    { name: "Ataque Final", type: "ataque_final", cost: 0, power: 30, img: "ataquefinal.png", colorClass: "card-ataque" },
    { name: "descarte ataque", type: "descarte_atk", cost: 2, power: 50, img: "descarte.png", colorClass: "card-espada" },
    { name: "Golpe Vampírico", type: "vampiric_atk", cost: 2, power: 25, img: "vampirico.png", colorClass: "card-magia" }
];
const masterDeck = [
    { name: "Golpe", type: "atk", cost: 1, power: 15, img: "golpe.png", colorClass: "card-ataque" },
    { name: "Golpe", type: "atk", cost: 1, power: 15, img: "golpe.png", colorClass: "card-ataque" },
    { name: "Golpe", type: "atk", cost: 1, power: 15, img: "golpe.png", colorClass: "card-ataque" },
    { name: "Golpe", type: "atk", cost: 1, power: 15, img: "golpe.png", colorClass: "card-ataque" },
    { name: "Golpe", type: "atk", cost: 1, power: 15, img: "golpe.png", colorClass: "card-ataque" },
    { name: "Golpe", type: "atk", cost: 1, power: 15, img: "golpe.png", colorClass: "card-ataque" },
    { name: "Escudo", type: "def", cost: 1, power: 20, img: "escudo.png", colorClass: "card-defesa" },
    { name: "Escudo", type: "def", cost: 1, power: 20, img: "escudo.png", colorClass: "card-defesa" },
    { name: "Escudo", type: "def", cost: 1, power: 20, img: "escudo.png", colorClass: "card-defesa" },
    { name: "Escudo", type: "def", cost: 1, power: 20, img: "escudo.png", colorClass: "card-defesa" },
    { name: "Escudo", type: "def", cost: 1, power: 20, img: "escudo.png", colorClass: "card-defesa" },
    { name: "Escudo", type: "def", cost: 1, power: 20, img: "escudo.png", colorClass: "card-defesa" }
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

// =====================================
// SISTEMA DE NAVEGAÇÃO UNIFICADO
// =====================================


            sidebarButtons.forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");

            screens.forEach(screen => {
                screen.classList.remove("active-screen");
            });

            const screenName = button.dataset.screen;

            const targetScreen = document.getElementById(
                `screen-${screenName}`
            );

            if(targetScreen) {
                targetScreen.classList.add("active-screen");
                
                if(target === "cards"){
                    renderCardsScreen();
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
    const btnStart = document.getElementById('btnStartBattle');
    if(btnStart) btnStart.classList.add('hidden');
    shuffleDeck();
    drawHand(); 
    prepareEnemyAction();
    if (player.energy === 0) refillEnergyFromBank();
    updateUI();
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

    // ATUALIZA O HISTÓRICO:
    if(habitHistoryData[currentDayIndex] !== undefined) {
        habitHistoryData[currentDayIndex]++; 
    }
    
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

function drawHand() {
    // Cartas iniciais que PODEM repetir na mão
    const basicCards = ["Golpe", "Escudo"];

    while (currentHand.length < 6) {
        if (drawPile.length === 0) shuffleDeck();
        
        // Olhamos a primeira carta do baralho sem tirar ela ainda
        const nextCard = drawPile[0]; 

        // Verificamos se já existe uma carta com esse mesmo nome na mão
        const alreadyInHand = currentHand.some(c => c.name === nextCard.name);

        // Se for uma carta especial (Loot) e já estiver na mão, mandamos para o fim da fila
        if (!basicCards.includes(nextCard.name) && alreadyInHand) {
            // Move a carta para o final do deck para tentar pegar outra
            drawPile.push(drawPile.shift()); 
            
            // Proteção: se o deck inteiro for de cartas repetidas, paramos para não travar o loop
            const allRepeated = drawPile.every(c => currentHand.some(h => h.name === c.name));
            if (allRepeated) break;
            
            continue; 
        }

        // Se passar nas regras, puxa a carta para a mão
        currentHand.push(drawPile.shift());
    }
}


function setTarget(target) {
    if (!minion && target === 'minion') return;
    currentTarget = target;
    updateUI();
    log(`🎯 Mirando no ${target === 'enemy' ? enemy.name : minion.name}!`);
}
function playCard(index) {
    if (!inBattle || skillCheckActive || !document.getElementById('minigameOverlay').classList.contains('hidden')) return;
    
    // Mudamos para 'let' para podermos atualizar o índice caso a carta de descarte altere o tamanho da mão
    let cardIndex = index;
    const card = currentHand[cardIndex];

    if (!card) return;

    if (player.energy >= card.cost) {
        player.energy -= card.cost;
        let finalPower = (card.power || 0) + player.dmgBuff;
        let targetEnt = (currentTarget === 'minion' && minion && minion.hp > 0) ? minion : enemy;

        switch(card.type) {
            case "retaliation":
                let baseDmg = player.tookDamageThisTurn ? (card.power * 2) : card.power;
                let totalRetalDmg = baseDmg + player.dmgBuff;
                let hpDmg = Math.max(0, totalRetalDmg - (targetEnt.enemyShield || 0));
                targetEnt.enemyShield = Math.max(0, (targetEnt.enemyShield || 0) - totalRetalDmg);
                targetEnt.hp -= hpDmg;
                shakeElement(document.getElementById('enemySprite'));
                log(`Determinação! Causou ${totalRetalDmg} de dano${player.tookDamageThisTurn ? " (RETALIAÇÃO!)" : ""}.`);
                player.dmgBuff = 0;
                break;

            case "atk": 
            case "pierce": 
            case "magia":
                let damageToHp = Math.max(0, finalPower - (targetEnt.enemyShield || 0));
                targetEnt.enemyShield = Math.max(0, (targetEnt.enemyShield || 0) - finalPower);
                targetEnt.hp -= damageToHp;
                shakeElement(document.getElementById('enemySprite'));
                log(`Usou ${card.name} em ${targetEnt.name}! Causou ${finalPower} de impacto.`);
                if (card.effect === "bleed") { targetEnt.bleedTurns = 3; log("Sangramento!"); }
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

            case "energy": 
                player.energy += card.power; 
                log(`Foco! +${card.power}⚡.`);
                for(let i=0; i<2; i++) {
                    if (drawPile.length === 0) shuffleDeck();
                    currentHand.push(drawPile.shift());
                }
                break;

            case "recycle":
                currentHand = []; drawHand();
                log("Mão reciclada!");
                break;

            case "time_stop":
                enemy.stunned = true; 
                if(minion) minion.stunned = true;
                player.energy += 1;
                log("O tempo parou!");
                break;

            case "execute":
                let damageDealt = card.power + player.dmgBuff;
                targetEnt.hp -= damageDealt;
                log(`Boss Killer causou ${damageDealt} de dano!`);

                 if (targetEnt.hp > 0 && targetEnt.hp < 60) {
                    targetEnt.hp = 0;
                    log(`🎯 LIMIAR ATINGIDO! O inimigo tinha menos de 60 HP e foi executado!`);
                } else if (targetEnt.hp <= 0) {
                    log(`O golpe foi fatal!`);
                } else {
                    log(`O alvo resistiu à execução.`);
                }

                player.dmgBuff = 0;
                shakeElement(document.getElementById('enemySprite'));
                break;

            case "dark_atk":
                let darkDmg = (card.power + player.dmgBuff);
                targetEnt.hp -= darkDmg;
                applyDamageToPlayer(card.selfDamage);
                log(`Ataque Sombrio no ${targetEnt.name}!`);
                player.dmgBuff = 0;
                break;

            case "ataque_final":
                let hasOtherAttacks = currentHand.some((c, i) => i !== cardIndex && ["atk", "pierce", "magia", "retaliation", "execute", "dark_atk", "ataque_calculado", "descarte_atk", "vampiric_atk"].includes(c.type));
                
                if (hasOtherAttacks) {
                    log(`${card.name} falhou: Você ainda tem outras cartas de ataque na mão!`);
                    player.energy += card.cost; 
                    return; 
                }
                
                let finalStrikeDmg = card.power + player.dmgBuff;
                let finalStrikeHpDmg = Math.max(0, finalStrikeDmg - (targetEnt.enemyShield || 0));
                targetEnt.enemyShield = Math.max(0, (targetEnt.enemyShield || 0) - finalStrikeDmg);
                targetEnt.hp -= finalStrikeHpDmg;
                shakeElement(document.getElementById('enemySprite'));
                log(`Ataque Final fulminante! Causou ${finalStrikeDmg} de dano.`);
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
                
                // Se a carta descartada estava antes da carta jogada no array, o índice da carta jogada diminui em 1
                if (idxToDiscard < cardIndex) {
                    cardIndex -= 1;
                }
                
                let discardStrikeDmg = card.power + player.dmgBuff;
                let discardStrikeHpDmg = Math.max(0, discardStrikeDmg - (targetEnt.enemyShield || 0));
                targetEnt.enemyShield = Math.max(0, (targetEnt.enemyShield || 0) - discardStrikeDmg);
                targetEnt.hp -= discardStrikeHpDmg;
                shakeElement(document.getElementById('enemySprite'));
                log(`Sacrificou ${discardedCard.name}! O ataque brutal causou ${discardStrikeDmg} de dano.`);
                player.dmgBuff = 0;
                break;

            case "vampiric_atk":
                let vampDmg = card.power + player.dmgBuff;
                let hpVampDmg = Math.max(0, vampDmg - (targetEnt.enemyShield || 0));
                targetEnt.enemyShield = Math.max(0, (targetEnt.enemyShield || 0) - vampDmg);
                targetEnt.hp -= hpVampDmg;
                
                let healAmt = Math.floor(hpVampDmg * 0.5);
                player.hp = Math.min(100, player.hp + healAmt);
                
                shakeElement(document.getElementById('enemySprite'));
                log(`Golpe Vampírico! Causou ${vampDmg} de dano e sugou ${healAmt} de HP.`);
                player.dmgBuff = 0;
                break;

            case "loop":
                if (lastPlayedCard) {
                    let copiedCard = { ...lastPlayedCard, id: Math.random().toString(36).substr(2, 9) };
                    currentHand.push(copiedCard);
                    log(`Loop! Retornou ${copiedCard.name} para a sua mão.`);
                } else {
                    log("Loop falhou: Nenhuma carta foi jogada ainda.");
                }
                break;

            case "sobrecarga":
                player.energy += 3;
                overloadedNextTurn = true;
                log("Sobrecarga! +3⚡ agora. Mas você terá limite de energia no próximo turno.");
                break;

            case "ataque_calculado":
                let cardsInHand = currentHand.length - 1; 
                let calcDamage = card.power + (card.power * cardsInHand) + player.dmgBuff;;
                let hpDamageCalc = Math.max(0, calcDamage - (targetEnt.enemyShield || 0));
                targetEnt.enemyShield = Math.max(0, (targetEnt.enemyShield || 0) - calcDamage);
                targetEnt.hp -= hpDamageCalc;
                shakeElement(document.getElementById('enemySprite'));
                log(`Ataque Calculado (${cardsInHand} cartas)! Causou ${calcDamage} de dano em ${targetEnt.name}.`);
                player.dmgBuff = 0;
                break;
        }

        // --- PARTE FINAL RESTAURADA AQUI ---
        if (card.type !== "loop") {
            lastPlayedCard = card;
        }

        currentHand.splice(cardIndex, 1);
        updateUI();
        
        if (minion && minion.hp <= 0) {
            log("O Cavaleiro Sombrio foi destruído!");
            minion = null;
            currentTarget = "enemy";
            updateUI();
        }
        checkGameOver();
    } else {
        log("Sem energia!");
    }
}

function endTurn() {
    if (!inBattle || skillCheckActive || !document.getElementById('minigameOverlay').classList.contains('hidden')) return; 
    
    // 1. Limpeza de escudos e aplicação de status negativos (Sangramento/Queimadura)
    enemy.enemyShield = 0;
    if (minion) minion.enemyShield = 0;
    if (enemy.bleedTurns > 0) { enemy.hp -= 10; enemy.bleedTurns--; }
    if (minion && minion.bleedTurns > 0) { minion.hp -= 10; minion.bleedTurns--; }
    if (player.burnTurns > 0) { player.hp -= 8; player.burnTurns--; }
    updateUI();

    // 2. Inicia o processamento do Boss
    setTimeout(() => {
        if (enemy.hp <= 0) { checkGameOver(); return; }
        
        // A) Regra do Dragão (Convocar)
        if (enemy.nextAction.type === "summon_knight") {
            enemy.hasSummoned = true;
            log(`🐉 O Dragão convocou o Cavaleiro Sombrio!`);
            minion = { name: "Lacaio Cavaleiro", hp: 170, maxHp: 170, img: "cavaleiro.png", nextAction: null, bleedTurns: 0, stunned: false, enemyShield: 0 };
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
                    applyDamageToPlayer(enemy.nextAction.val);
                    log(`${enemy.name} atacou!`);
                    break;
                case "shield":
                    enemy.enemyShield += enemy.nextAction.val;
                    log(`${enemy.name} defendeu!`);
                    break;
            case "knight_drain":
                if (player.shield > 0) {
                // 🛡️ ROUBA APENAS ESCUDO
                let stolenShield = player.shield;

                enemy.enemyShield += stolenShield;
                player.shield = 0;

                log(`🛡️ O Cavaleiro drenou ${stolenShield} de escudo!`);
                } else {
                // ❤️ SEM ESCUDO → CAUSA DANO NA VIDA
                applyDamageToPlayer(enemy.nextAction.val);
                log(`🍷 DRENO! ${enemy.name} drenou sua vida!`);
                }

                // Cura sempre acontece
                enemy.hp = Math.min(enemy.maxHp, enemy.hp + 20); 
                log(`+20 HP para o Cavaleiro.`);

            updateUI(); 
            break;
                case "dragon_fire":
                    applyDamageToPlayer(enemy.nextAction.val);
                    enemy.enemyShield += 30;
                    log(`${enemy.name} soprou fogo!`);
                    break;
                case "dragon_rest":
                    enemy.hp = Math.min(enemy.maxHp, enemy.hp + 50);
                    log(`${enemy.name} descansou.`);
                    updateUI();
                    break;
            }
        }
        
        // 3. Finaliza a ação do Boss e passa para o Lacaio/Fim do turno
        executeMinionActionAndFinish();
        
    }, 600);
}

function executeMinionActionAndFinish() {
    if (minion && minion.hp > 0 && !minion.stunned) {
        setTimeout(() => {
            switch(minion.nextAction.type) {
                case "dmg":
                    applyDamageToPlayer(minion.nextAction.val);
                    log(`${minion.name} atacou!`);
                    break;
                case "shield_boss":
                    enemy.enemyShield += minion.nextAction.val;
                    log(`${minion.name} protegeu o Dragão!`);
                    break;
            }
            finishEnemyTurn();
        }, 500);
    } else {
        finishEnemyTurn();
    }
}

function finishEnemyTurn() {
    enemy.stunned = false;
    if(minion) minion.stunned = false;
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
        case "pierce": return `Causa ${card.power} de dano ao inimigo.`;
        case "def": return `Ganha ${card.power} de escudo.`;
        case "magia": return `Dano Mágico: ${card.power}.`;
        case "energy": return `Ganha ${card.power} de energia e compra 2 cartas.`;
        case "execute": return `Dano: ${card.power}. Executa instantaneamente se o HP for menor que 60.`;
        case "dark_atk": return `Causa ${card.power} de dano, mas você sofre dano de volta.`;
        case "retaliation": return `Dano: ${card.power}. O dano é DOBRADO se você sofreu dano neste turno.`;
        case "time_stop": return `Atordoa os inimigos por 1 turno e ganha +1⚡.`;
        case "loop": return `Retorna a última carta jogada para a sua mão.`;
        case "sobrecarga": return `Ganha +3⚡ agora, mas limita a energia no próximo turno.`;
        case "ataque_calculado": return `Dano base: ${card.power}. Aumenta com base nas cartas na sua mão.`;
        case "recycle": return `Descarta sua mão atual e compra cartas novas.`;
        default: return `Um efeito misterioso...`;
        case "ataque_final":
            return `Causa ${card.power} de dano. Só pode ser usada se não houver outros ataques na mão.`;
        case "descarte_atk":
            return `Causa ${card.power} de dano brutal, mas sacrifica uma carta aleatória da sua mão.`;
        case "vampiric_atk":
            return `Causa ${card.power} de dano e cura seu HP em 50% do dano causado diretamente à vida do alvo.`;
    }
}
// --- INTERFACE ---
function updateUI() {
    // =========================
    // --- REFERÊNCIAS BASE ---
    // =========================
    const handDiv = document.getElementById('playerHand');
    const enemyName = document.getElementById('enemyNameDisplay');
    const intentText = document.getElementById('intentText');

    const activeEnemy = (currentTarget === 'minion' && minion) ? minion : enemy;

    // =========================
    // --- INIMIGO ---
    // =========================
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

    // =========================
    // --- PLAYER ---
    // =========================
    if (DOM.playerHp) DOM.playerHp.style.width = Math.max(0, player.hp) + "%";
    if (DOM.playerHpText) DOM.playerHpText.innerText = `${Math.max(0, Math.floor(player.hp))} / 100`;
    if (DOM.energyStat) DOM.energyStat.innerText = player.energy;
    if (DOM.shieldPlayer) DOM.shieldPlayer.innerText = `🛡️ ${player.shield}`;
    if (DOM.energyBank) DOM.energyBank.innerText = `Reserva: ${energyBank}⚡`;

    // =========================
    // --- OURO ---
    // =========================
    const goldUI = document.getElementById('goldValue');
    const goldBtn = document.getElementById('btnGoldDisplay');

    if (goldUI) goldUI.innerText = gold;
    if (goldBtn) goldBtn.innerText = gold;

    // =========================
    // --- INTENÇÃO DO INIMIGO ---
    // =========================
    let combinedIntent = enemy.nextAction
        ? `Boss: ${enemy.nextAction.text}`
        : "Aguardando...";

    if (minion && minion.hp > 0 && minion.nextAction) {
        combinedIntent += ` | Lacaio: ${minion.nextAction.text}`;
    }

    if (intentText) intentText.innerText = combinedIntent;

    // =========================
    // --- SELETOR DE ALVO ---
    // =========================
    let targetUI = document.getElementById('targetSelectorContainer');

    if (minion && minion.hp > 0) {
        if (!targetUI) {
            targetUI = document.createElement('div');
            targetUI.id = 'targetSelectorContainer';
            targetUI.style.margin = '10px auto';

            handDiv.parentNode.insertBefore(targetUI, handDiv);
        }

        targetUI.style.display = 'block';

        targetUI.innerHTML = `
            <div style="display:flex; gap:15px; align-items:center; justify-content:center; background:#222; padding:8px 15px; border-radius:8px; border:1px solid #444;">
                <button onclick="setTarget('enemy')" 
                    style="background:${currentTarget === 'enemy' ? '#c0392b' : '#333'}; color:white; padding:8px 12px; border:none; border-radius:5px; cursor:pointer;">
                    🎯 Boss
                </button>

                <div style="text-align:center;">
                    <strong style="color:white;">${minion.name}</strong><br>
                    <small style="color:#ff7675;">HP: ${Math.max(0, Math.floor(minion.hp))} / ${minion.maxHp}</small>
                </div>

                <button onclick="setTarget('minion')" 
                    style="background:${currentTarget === 'minion' ? '#2c3e50' : '#333'}; color:white; padding:8px 12px; border:none; border-radius:5px; cursor:pointer;">
                    🎯 Lacaio
                </button>
            </div>
        `;
    } else if (targetUI) {
        targetUI.style.display = 'none';
    }

    // =========================
    // --- CARTAS NA MÃO ---
    // =========================
    if (handDiv) {
        handDiv.innerHTML = '';

currentHand.forEach((card, index) => {
    const cardEl = document.createElement('div');
    cardEl.className = `card ${card.colorClass}`;

    // 🔥 VERIFICA ENERGIA
    if (player.energy < card.cost) {
        cardEl.classList.add('disabled');
    } else {
        cardEl.onclick = () => playCard(index);
    }

            cardEl.innerHTML = `
    <div class="card-cost">${card.cost}</div>
    <img src="${card.img}" alt="${card.name}">
    
    <div class="card-name">${card.name}</div>

    <!-- 🔥 TOOLTIP -->
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
    if (enemy.name.includes("Dragão")) {
        if (!enemy.hasSummoned) {
            enemy.nextAction = { text: "Convocar Lacaio 📯", type: "summon_knight", val: 0 };
            return;
        }
        actions = [
            { text: "Sopro 🔥 (30+🛡️30)", type: "dragon_fire", val: 30 },
            { text: "Descanso (+50 HP)", type: "dragon_rest", val: 50 },
            { text: "Mordida (45 dano)", type: "dmg", val: 45 }
        ];
    } else if (enemy.name.includes("Cientista")) {
        // Removido: Campo de Força (shield)
        actions = [
            { text: "Cálculo Letal 📐 (60 dano)", type: "sci_math", val: 60 },
            { text: "Hipótese Escrita 📝 (70 dano)", type: "sci_type", val: 70 },
            { text: "Lança-Chamas (40 dano)", type: "dmg", val: 50 }
        ];
    } else if (enemy.name.includes("Cavaleiro")) {
        // Removido: Muralha (shield)
        actions = [
            { text: "Dreno (25 + Cura 25)", type: "knight_drain", val: 35 },
            { text: "Esmagar 30 de dano(PARRY!)", type: "dmg_heavy", val: 30 }
        ];
    } else {
        actions = [
            { text: "Ataque (30 dano)", type: "dmg", val: 30 },
            { text: "Barreira (25🛡️)", type: "shield", val: 25 }
        ];
    }
    enemy.nextAction = actions[Math.floor(Math.random() * actions.length)];
    prepareMinionAction();
    updateUI();
}

function prepareMinionAction() {
    if (!minion) return;
    let mActions = [
        { text: "Ataque (15 dano)", type: "dmg", val: 15 },
        { text: "Proteção (15🛡️ Boss)", type: "shield_boss", val: 15 }
    ];
    minion.nextAction = mActions[Math.floor(Math.random() * mActions.length)];
}

function checkGameOver() {
    if (enemy.hp <= 0) {
        inBattle = false;
        const reward = Math.floor(Math.random() * 11) + 15; 
        gold += reward;
        log(`Vitória! Você coletou 💰 ${reward} moedas.`);
        
        minion = null;
        currentTarget = "enemy";
        currentHand = [];
        overloadedNextTurn = false;
        lastPlayedCard = null;
        updateUI();
        showRewardChoice();
    } else if (player.hp <= 0) {
        alert("GAME OVER!"); location.reload();
    }
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
    }
    
    showEnergyGain(totalGanhado);
    log(`✔ ${h.nome} concluído! +${totalGanhado}⚡ (Streak: ${h.streak})`);
    
    renderHabitsForToday();
    if(typeof updateUI === 'function') updateUI();
    updateChart();
}

// ==========================================
// --- INTERFACE E NAVEGAÇÃO ---
// ==========================================

/**
 * Alterna a visibilidade do menu de hábitos
 */
function toggleHabitMenu() {
    const menu = document.getElementById('habitMenu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

function toggleDaysSelector() {
    const tipo = document.getElementById('habitType').value;
    const selector = document.getElementById('weekDaysSelector');
    if (selector) {
        selector.classList.toggle('hidden', tipo !== 'semanal');
    }
}


function nextDay() {
    currentDayIndex = (currentDayIndex + 1) % 7;
    
    const dailyBonus = Math.min(3 + consecutiveDays, 15); 
    energyBank += dailyBonus;
    consecutiveDays++; 

    const display = document.getElementById('currentDayDisplay');
    if(display) display.innerText = `📅 ${weekDays[currentDayIndex]}`;
    
    showEnergyGain(dailyBonus); 
    log(`🌅 Amanheceu em ${weekDays[currentDayIndex]}! +${dailyBonus}⚡ (Bônus Diário)`);
    
    renderHabitsForToday(); 
    if(typeof updateUI === 'function') updateUI(); 
    updateChart(); 
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

        lastDoneIndex: null
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
    suaVariavelDeReserva += 10; // adiciona o valor
    
    // Procura o elemento da reserva (ajuste a classe/id para o seu caso)
    const displayReserva = document.querySelector(".reserva-energia"); 
    if (displayReserva) {
        displayReserva.innerHTML = `Reserva: ${suaVariavelDeReserva} ⚡`;
    }
}