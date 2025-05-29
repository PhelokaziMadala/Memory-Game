
class MemoryGame {
    constructor() {
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.maxMoves = 0;
        this.score = 0;
        this.timer = 0;
        this.timerInterval = null;
        this.gameStarted = false;
        this.difficulty = null;
        this.soundEnabled = true;
        this.highScore = this.loadHighScore();
        
        this.cardSymbols = ['🍎', '🍌', '🍊', '🍇', '🍓', '🥝', '🍑', '🍒', 
                           '🥭', '🍍', '🥥', '🍉', '🍋', '🫐', '🍈', '🥑',
                           '🌮', '🍕', '🍔', '🌭', '🥨', '🧀', '🥓', '🍖'];
        
        this.initializeElements();
        this.setupEventListeners();
        this.updateDisplay();
        this.createSoundEffects();
    }
    
    initializeElements() {
        this.scoreEl = document.getElementById('score');
        this.movesEl = document.getElementById('moves');
        this.timerEl = document.getElementById('timer');
        this.highScoreEl = document.getElementById('high-score');
        this.gameBoardEl = document.getElementById('game-board');
        this.gameStatusEl = document.getElementById('game-status');
        this.difficultySelector = document.getElementById('difficulty-selector');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.soundToggleBtn = document.getElementById('sound-toggle');
        this.difficultyBtns = document.querySelectorAll('.difficulty-btn');
    }
    
    setupEventListeners() {
        this.difficultyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.startGame(e.target.dataset.difficulty);
            });
        });
        
        this.newGameBtn.addEventListener('click', () => this.showDifficultySelector());
        this.resetBtn.addEventListener('click', () => this.resetGame());
        this.soundToggleBtn.addEventListener('click', () => this.toggleSound());
    }
    
    createSoundEffects() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    playSound(type, frequency = 440, duration = 200) {
        if (!this.soundEnabled) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
            
            switch(type) {
                case 'flip':
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
                    break;
                case 'match':
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime);
                    oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1);
                    break;
                case 'nomatch':
                    oscillator.type = 'sawtooth';
                    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
                    break;
                case 'win':
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime);
                    oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.2);
                    oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.4);
                    duration = 600;
                    break;
                case 'click':
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
                    break;
            }
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + duration / 1000);
        } catch (error) {
            console.log('Web Audio API not supported');
        }
    }
    
    startGame(difficulty) {
        this.playSound('click');
        this.difficulty = difficulty;
        this.difficultySelector.classList.add('hidden');
        this.gameBoardEl.classList.remove('hidden');
        
        const dimensions = this.getDimensions(difficulty);
        this.createBoard(dimensions.rows, dimensions.cols);
        this.resetStats();
        this.setTimeLimit(difficulty);
        this.startTimer();
        this.gameStarted = true;
        this.updateDisplay();
    }
    
    getDimensions(difficulty) {
        const dimensions = {
            easy: { rows: 3, cols: 4 },
            medium: { rows: 4, cols: 4 },
            hard: { rows: 4, cols: 6 }
        };
        return dimensions[difficulty];
    }
    
    setTimeLimit(difficulty) {
        const timeLimits = {
            easy: 2 * 60,    // 2 minutes
            medium: 4 * 60, // 4 minutes
            hard: 6 * 60    // 6 minutes
        };
        this.timer = timeLimits[difficulty];
        
        const moveLimits = {
            easy: 10,
            medium: 12,
            hard: 14,
        };
        this.maxMoves = moveLimits[difficulty];
        this.moves = this.maxMoves;
    }
    
    createBoard(rows, cols) {
        const totalCards = rows * cols;
        const totalPairs = totalCards / 2;
        
        this.gameBoardEl.className = `game-board ${this.difficulty}`;
        this.gameBoardEl.innerHTML = '';
        
        // Create pairs of symbols
        const gameSymbols = this.cardSymbols.slice(0, totalPairs);
        const cardSymbols = [...gameSymbols, ...gameSymbols];
        
        // Shuffle the cards
        this.shuffleArray(cardSymbols);
        
        this.cards = [];
        cardSymbols.forEach((symbol, index) => {
            const card = this.createCard(symbol, index);
            this.gameBoardEl.appendChild(card);
            this.cards.push(card);
        });
    }
    
    createCard(symbol, index) {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.symbol = symbol;
        card.dataset.index = index;
        
        card.innerHTML = `
            <div class="card-face card-back"></div>
            <div class="card-face card-front">${symbol}</div>
        `;
        
        card.addEventListener('click', () => this.flipCard(card));
        
        return card;
    }
    
    flipCard(card) {
        if (!this.gameStarted || card.classList.contains('flipped') || 
            card.classList.contains('matched') || this.flippedCards.length >= 2) {
            return;
        }
        
        this.playSound('flip');
        card.classList.add('flipped');
        this.flippedCards.push(card);
        
        if (this.flippedCards.length === 2) {
            this.moves--;
            this.updateDisplay();
            this.checkMatch();
        }
    }
    
    checkMatch() {
        const [card1, card2] = this.flippedCards;
        const isMatch = card1.dataset.symbol === card2.dataset.symbol;
        
        setTimeout(() => {
            if (isMatch) {
                this.handleMatch(card1, card2);
            } else {
                this.handleNoMatch(card1, card2);
            }
            
            this.flippedCards = [];
            
            // Check if moves are exhausted after this turn
            if (this.moves <= 0 && this.gameStarted && this.matchedPairs < this.cards.length / 2) {
                setTimeout(() => this.movesExhausted(), 500);
            }
        }, 1000);
    }
    
    handleMatch(card1, card2) {
        this.playSound('match', 523, 400);
        card1.classList.add('matched');
        card2.classList.add('matched');
        
        this.matchedPairs++;
        this.score += 100;
        this.updateDisplay();
        
        if (this.matchedPairs === this.cards.length / 2) {
            this.endGame();
        }
    }
    
    handleNoMatch(card1, card2) {
        this.playSound('nomatch', 200, 300);
        card1.classList.add('shake');
        card2.classList.add('shake');
        
        setTimeout(() => {
            card1.classList.remove('flipped', 'shake');
            card2.classList.remove('flipped', 'shake');
        }, 500);
    }
    
    endGame() {
        this.gameStarted = false;
        this.stopTimer();
        
        // Bonus points for time and moves
        const timeBonus = Math.max(0, this.timer * 2);
        const moveBonus = Math.max(0, (this.cards.length - this.moves) * 10);
        this.score += timeBonus + moveBonus;
        
        this.playSound('win', 523, 600);
        this.gameStatusEl.textContent = `🎉 You Won! Final Score: ${this.score}`;
        this.gameStatusEl.className = 'game-status win';
        
        this.checkHighScore();
        this.updateDisplay();
        
        setTimeout(() => {
            this.gameStatusEl.className = 'game-status';
        }, 3000);
    }
    
    timeUp() {
        this.gameStarted = false;
        this.stopTimer();
        this.timer = 0;
        
        this.playSound('nomatch', 200, 800);
        this.gameStatusEl.textContent = `⏰ Time's up! You lost. Try again!`;
        this.gameStatusEl.className = 'game-status';
        
        this.updateDisplay();
        
        // Reset flipped cards
        this.cards.forEach(card => {
            if (card.classList.contains('flipped') && !card.classList.contains('matched')) {
                card.classList.remove('flipped');
            }
        });
        this.flippedCards = [];
        
        setTimeout(() => {
            this.gameStatusEl.textContent = '';
        }, 3000);
    }
    
    movesExhausted() {
        this.gameStarted = false;
        this.stopTimer();
        this.moves = 0;
        
        this.playSound('nomatch', 200, 800);
        this.gameStatusEl.textContent = `🚫 You have run out of moves! Retry again!`;
        this.gameStatusEl.className = 'game-status';
        
        this.updateDisplay();
        
        // Reset flipped cards
        this.cards.forEach(card => {
            if (card.classList.contains('flipped') && !card.classList.contains('matched')) {
                card.classList.remove('flipped');
            }
        });
        this.flippedCards = [];
        
        setTimeout(() => {
            this.gameStatusEl.textContent = '';
        }, 3000);
    }
    
    checkHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
            this.gameStatusEl.textContent = `🏆 NEW HIGH SCORE: ${this.score}! 🏆`;
        }
    }
    
    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timer--;
            this.updateDisplay();
            
            if (this.timer <= 0) {
                this.timeUp();
            }
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    resetStats() {
        this.matchedPairs = 0;
        this.moves = this.maxMoves;
        this.score = 0;
        this.flippedCards = [];
        this.gameStatusEl.textContent = '';
        this.gameStatusEl.className = 'game-status';
        // Timer will be set by setTimeLimit method
    }
    
    resetGame() {
        this.playSound('click');
        this.stopTimer();
        this.gameStarted = false;
        
        if (this.difficulty) {
            this.resetStats();
            this.setTimeLimit(this.difficulty);
            const dimensions = this.getDimensions(this.difficulty);
            this.createBoard(dimensions.rows, dimensions.cols);
            this.startTimer();
            this.gameStarted = true;
        }
        
        this.updateDisplay();
    }
    
    showDifficultySelector() {
        this.playSound('click');
        this.stopTimer();
        this.gameStarted = false;
        this.difficulty = null;
        this.difficultySelector.classList.remove('hidden');
        this.gameBoardEl.classList.add('hidden');
        this.resetStats();
        this.timer = 0;
        this.moves = 0;
        this.maxMoves = 0;
        this.updateDisplay();
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.soundToggleBtn.textContent = this.soundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF';
        
        if (this.soundEnabled) {
            this.playSound('click', 800, 200);
        } else {
            try {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
                
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.15);
            } catch (error) {
                console.log('Web Audio API not supported');
            }
        }
    }
    
    updateDisplay() {
        this.scoreEl.textContent = this.score;
        this.movesEl.textContent = this.moves;
        this.highScoreEl.textContent = this.highScore;
        
        const minutes = Math.floor(this.timer / 60);
        const seconds = this.timer % 60;
        this.timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    saveHighScore() {
        localStorage.setItem('memoryGameHighScore', this.highScore.toString());
    }
    
    loadHighScore() {
        const savedScore = localStorage.getItem('memoryGameHighScore');
        return savedScore ? parseInt(savedScore, 10) : 0;
    }
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MemoryGame();
});

// Handle Web Audio API user interaction requirement
document.addEventListener('click', function initAudio() {
    if (window.game && window.game.audioContext && window.game.audioContext.state === 'suspended') {
        window.game.audioContext.resume();
    }
    document.removeEventListener('click', initAudio);
}, { once: true });
