const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = 900;
canvas.height = 600;

// ---- GLOBAL VARIABLES ----

const cellSize = 100;
const cellGap = 3;
const gameGrid = [];
const defenders = [];
const enemies = [];
const enemyPositions = [];
const projectiles = [];
const resources = [];
let numberOfResources = 300;
let frame = 0;  // va être augmenté à chaque animation loop, les ennemies seront spawn de plus en plus par rapport à cette variable
let enemiesInterval = 600;
let gameOver = false;
let score = 0;
const winningScore = 50;
let chosenDefender = 1;     // 1 premier defender du shop selected, 2 l'autre

// ---- MOUSE ----

const mouse = {
    x: undefined,   // 10 et y 10 dans le tuto
    y: undefined,
    width: 0.1,
    height: 0.1,
    clicked: false
}

canvas.addEventListener('mousedown', function() {
    mouse.clicked = true;
});

canvas.addEventListener('mouseup', function() {
    mouse.clicked = false;
});

let canvasPosition = canvas.getBoundingClientRect(); // renvoie la position du canva par rapport à la fenetre

canvas.addEventListener('mousemove', function(e) { // on crée une callback function avec e pour event, quand la fonction mousemove est en cours
    mouse.x = e.x - canvasPosition.left;    // renvoie la position de la souris par rapport à la position du canva
    mouse.y = e.y - canvasPosition.top;     // probleme si resize la fenetre, voir window.addEventListener tout en bas
});
canvas.addEventListener('mouseleave', function() {
    mouse.x = undefined;
    mouse.y = undefined;
});

// ---- GAME BOARD ----

const controlsBar = {
    width: canvas.width,
    height: cellSize,
}
        //on a créé un constructor d'une case de grid, puis ligne 29 on la rentre en tant qu'objet dans le tableau
class Cell {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = cellSize;
        this.height = cellSize;
    }
    draw() {
        if (mouse.x && mouse.y && collision(this, mouse)){
            ctx.strokeStyle = 'black';
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    }
}
        // si il a collision entre mouse et cell, celà desinne la cell. On rajoute en conditions si la mouse a des coordonnées
        // sinon quant on quitte le canva ça dessine toute la ligne ou colonne
        
function createGrid() {
        //on commence à cellsize car au dessus c'est notre controlsbar, à chaque row on incrémente de column
    for (let y = cellSize; y < canvas.height; y += cellSize) {
        for (let x = 0; x < canvas.width; x += cellSize) {
        //a chaque fois qu'on a incrémenté une case, on la rentre en tant qu'object dans le tableau avec ses positions, puis ligne 39
            gameGrid.push(new Cell(x, y));
        }
    }
}
createGrid();

        //pour chaque cell de notre tableau, on utilise la methode draw du constructor pour la dessiner puis dans la loop animate() on lance la fonction
function handleGameGrid() {
    for (let i = 0; i < gameGrid.length; i++) {
        gameGrid[i].draw();
    }
}

// ---- PROJECTILES ----

class Projectile {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 10;
        this.power = 20;
        this.speed = 5;
    }
    update() {
        this.x += this.speed;
    }
    draw() {
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width, 0, Math.PI * 2);
        ctx.fill();      // rempli en noir du style
    }
}
function handleProjectiles() {
    for (let i = 0; i < projectiles.length; i++) {
        projectiles[i].update();
        projectiles[i].draw();
        for (let j= 0; j < enemies.length; j++) {   // pour chaque projectile on regarde les ennemies et si il y a collision
            if (enemies[j] && projectiles[i] && collision(enemies[j], projectiles[i])) {
                enemies[j].health -= projectiles[i].power;
                projectiles.splice(i, 1);
                i--;
            }
        }
        if (projectiles[i] && projectiles[i].x > canvas.width - cellSize) {     // si le projectile va plus loin que la derniere cell
            projectiles.splice(i, 1);
            i--;                                             // à droite, on le supprime
        }
    }
}

// ---- DEFENDERS ----

const defenderTypes = [];
const defender1 = new Image();
defender1.src = '/img/defender1.png';
const defender2 = new Image();
defender2.src = '/img/defender2.png';
defenderTypes.push(defender1);
defenderTypes.push(defender2);


class Defender {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = cellSize - cellGap * 2;
        this.height = cellSize - cellGap * 2;
        this.shooting = false;
        this.shootNow = false;  // sert pour savoir quand passer l'animation en attack
        this.health = 100;
        this.projectiles = [];
        this.timer = 0;     // cadence de tir
        this.frameX = 0;   
        this.frameY = 0;    
        this.minFrame = 0;
        this.maxFrame = 18;
        this.spriteWidth = 44;  
        this.spriteHeight = 42;
        this.chosenDefender = chosenDefender;
    }
    draw() {
        //ctx.fillStyle = 'blue';
        //ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText(Math.floor(this.health), this.x + 18, this.y + 20);
        if (this.chosenDefender === 1) {
            ctx.drawImage   (defender1, this.frameX * this.spriteWidth, this.frameY * this.spriteHeight, this.spriteWidth,
                            this.spriteHeight, this.x, this.y, this.width, this.height);
        } else if (this.chosenDefender === 2) {
            ctx.drawImage   (defender2, this.frameX * this.spriteWidth, this.frameY * this.spriteHeight, this.spriteWidth,
                            this.spriteHeight, this.x, this.y, this.width, this.height);
        }
    }
    update() {
        if (frame % 8 === 0) {
            if (this.frameX < this.maxFrame) this.frameX++;
            else this.frameX = this.minFrame;
            if (this.chosenDefender === 1) {
                if (this.frameX === 14) this.shootNow = true;
            } else if (this.chosenDefender === 2) {
                if (this.frameX === 21) this.shootNow = true;
            }
        }
        if (this.chosenDefender === 1) {
            if (this.shooting) {        // mode attack
                this.minFrame = 11;
                this.maxFrame = 18;
            } else {                    // mode idle
                this.minFrame = 0 ;
                this.maxFrame = 10 ;
            }
        } else if (this.chosenDefender === 2) {
            this.spriteWidth = 64;
            this.spriteHeight = 34;
            if (this.shooting) {
                this.minFrame = 17;
                this.maxFrame = 28;
            } else {
                this.minFrame = 0 ;
                this.maxFrame = 16 ;
            }
        }

        /*if (this.shooting) {    // ne tire que si un ennemi est en vue
            this.timer++;     
            if (this.timer % 100 === 0) {   // toutes les 100 frames, le defender tire un projectile
                projectiles.push(new Projectile(this.x + 70, this.y + 50));
            }
        } else {
            this.timer = 0;
        }*/
        // On remplace le block du dessus par celui en dessous: ne tire que si l'animation est à la bonne frame et ennemi sur la ligne
        // la candence de projectile est basée sur l'animation maintenant, donc du modulo frame

        if (this.shooting && this.shootNow) {
            projectiles.push(new Projectile(this.x + 70, this.y + 50));
            this.shootNow = false;
        }
    }
}

    // on dessine notre defender, et on met la fonction dans la loop animate()
function handleDefenders() {
    for (let i = 0; i < defenders.length; i++) {
        defenders[i].draw();
        defenders[i].update();
        if (enemyPositions.indexOf(defenders[i].y) !== -1) {    // si indexOf retourne -1 ca veut dire qu'il n'a pas trouvé d'item avec cette valeur
            defenders[i].shooting = true;       // pas compris mais si non égale à -1 ca veut dire qu'un ennemie est sur la même row que le defender
        } else {
            defenders[i].shooting = false;
        }
        for (j = 0; j < enemies.length; j++) {  // pour chaque defender, on regarde si chaque ennemi entre en collision
            if (defenders[i] && collision(defenders[i], enemies[j])) {
                enemies[j].movement = 0;    // en collision l'ennemi s'arrête
                defenders[i].health -= 0.2;
            }
            if (defenders[i] && defenders[i].health <= 0) { // on rajoute defenders[i] pour s'assurer qu'il existe
                defenders.splice(i, 1)  // on retire 1 element à l'index i
                i--;    // on revient d'un index pour être sûr que l'ennemi suivant n'est pas skipe
                enemies[j].movement = enemies[j].speed;
            }
        }
    }
}

const card1 = {     // icone du shop defender
    x: 10,
    y: 10,
    width: 70,
    height: 85
}
const card2 = {
    x: 90,
    y: 10,
    width: 70,
    height: 85
}

function chooseDefender() {
    let card1stroke = 'black';
    let card2stroke = 'black';
    if (collision(mouse, card1) && mouse.clicked) {
        chosenDefender = 1;
    } else if (collision(mouse, card2) && mouse.clicked) {
        chosenDefender = 2;
    }
    if (chosenDefender === 1) {
        card1stroke = 'gold';
        card2stroke = 'black';
    } else if (chosenDefender === 2) {
        card1stroke = 'black';
        card2stroke = 'gold';
    } else {
        card1stroke = 'black';
        card2stroke = 'black';
    }
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.fillRect(card1.x, card1.y, card1.width, card1.height);
    ctx.strokeStyle = card1stroke;
    ctx.strokeRect(card1.x, card1.y, card1.width, card1.height);
    ctx.drawImage(defender1, 0, 0, 44, 42, 10, 5, 44*2, 42*2);
    ctx.fillRect(card2.x, card2.y, card2.width, card2.height);
    ctx.strokeStyle = card2stroke;
    ctx.strokeRect(card2.x, card2.y, card2.width, card2.height);
    ctx.drawImage(defender2, 0, 0, 44, 42, 70, 25, 44*2, 42*2)
}

// ---- FLOATING MESSAGES

const floatingMessages = [];
class FloatingMessage {
    constructor(value, x , y, size, color) {
        this.value = value;
        this.x = x;
        this.y = y;
        this.size = size;   // on pourra changer la taille et la couleur en fonction d'un enemie ou d'une ressource
        this.lifeSpan = 0;  // va servir pour timer la durée d'apparition du message
        this.color = color;
        this.opacity = 1;
    }
    update() {
        this.y -= 0.3;
        this.lifeSpan += 1;
        if (this.opacity > 0.03) this.opacity -= 0.03;  // tant que l'opacité est > à 0.01, on la décroit de 0.01
    }
    draw() {
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.font = this.size + 'px Arial';
        ctx.fillText(this.value, this.x, this.y);
        ctx.globalAlpha = 1;    // on veut que ca n'affecte que le text d'ici donc on le remet à 1 juste après
    }
}
function handleFloatingMessages() {
    for (let i = 0; i < floatingMessages.length; i++) {
        floatingMessages[i].update();
        floatingMessages[i].draw();
        if (floatingMessages[i].lifeSpan >= 50) {
            floatingMessages.splice(i, 1);
            i--;
        }
    }
}

// ---- ENNEMIES ----

const enemyTypes = [];
const enemy1 = new Image();
enemy1.src = '/img/enemy1.png';
enemyTypes.push(enemy1);
const enemy2 = new Image();
enemy2.src = '/img/enemy2.png';
enemyTypes.push(enemy2);
const enemy3 = new Image();
enemy3.src = '/img/enemy3.png';
enemyTypes.push(enemy3);

class Enemy {
    constructor(verticalPosition) {
        this.x = canvas.width;  // fait apparaitre le monstre tout à droite du canvas
        this.y = verticalPosition;
        this.width = cellSize - cellGap * 2;
        this.height = cellSize - cellGap * 2;
        this.speed = Math.random() * 0.2 + 0.4;  // chaque ennemy aura sa propre speed, alors que le mouvement pourra changer
        this.movement = this.speed;     // on crée une autre variable car on fera s'arrêter les ennemis en contact avec les defenders
        this.health = 100;
        this.maxHealth = this.health;    // on crée un autre health pour donner des récompenses différentes en fonction du maxhp
        this.enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        this.frameX = 0;    //  pour choisir quelles frames de l'animation pour l'ennemi
        this.frameY = 0;    // pareil si on a plusieurs row à l'animation
        this.minFrame = 0;
        if (this.enemyType === enemy1) {
            this.maxFrame = 11;
            this.spriteWidth = 30;
            this.spriteHeight = 38;
        } else if (this.enemyType === enemy2) {
            this.maxFrame = 6;
            this.spriteWidth = 46;
            this.spriteHeight = 30;
        } else if (this.enemyType === enemy3) {
            this.maxFrame = 5;
            this.spriteWidth = 52;
            this.spriteHeight = 34;
        }
    }
    update() {
        this.x -= this.movement;
        if (frame % 15 === 0) {     // permet de diminuer la vitesse d'animation
            if (this.frameX < this.maxFrame) this.frameX++;     // cela fait boucler entre la minframe et la maxframe
            else this.frameX = this.minFrame;   // pour plusieurs row d'animation, une autre logique est nécessaire
        }
    }
    draw() {
        //ctx.fillStyle = 'red';
        //ctx.fillRect(this.x, this.y, this.width, this.height)
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText(Math.floor(this.health), this.x + 28, this.y + 15);
        //ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
        ctx.drawImage   (this.enemyType, this.frameX * this.spriteWidth, this.frameY * this.spriteHeight, this.spriteWidth,
                        this.spriteHeight, this.x, this.y, this.width, this.height);
    }
}
function handleEnemies() {
    for (let i = 0; i < enemies.length; i++) {
        enemies[i].update();
        enemies[i].draw();
        if (enemies[i].x < 0) {     // si un ennemi arrive a gauche c'est gameover
            gameOver = true;
        }
        if (enemies[i].health <= 0) {
            let gainedResources = enemies[i].maxHealth/10;
            floatingMessages.push(new FloatingMessage('+' + gainedResources, enemies[i].x, enemies[i].y, 30, 'black'));
            floatingMessages.push(new FloatingMessage('+' + gainedResources, 250, 50, 30, 'gold'));
            numberOfResources += gainedResources;
            score += gainedResources;
            const findThisIndex = enemyPositions.indexOf(enemies[i].y); // on utilise la methode indexOf pour savoir l'index de tel ennemie dans enemyPosition
            enemyPositions.splice(findThisIndex, 1);
            enemies.splice(i, 1);
            i--;
        }
    }
    if (frame % enemiesInterval === 0 && score < winningScore) {    // on ajoute un ennemi tout les enemiesInterval, que si le score est moins que wining score
        let verticalPosition = Math.floor(Math.random() * 5 + 1) * cellSize + cellGap; // prend une ligne au hazard pour le spawn
        enemies.push(new Enemy(verticalPosition));
        enemyPositions.push(verticalPosition);      // on ajoute sa position verticale dan sun tableau
        if (enemiesInterval > 120) enemiesInterval -= 50;  // on baisse l'interval des ennemies au fur et à mesure pour la progression
    }
}

// ---- RESSOURCES ----
const gold = new Image();
gold.src = '/img/gold.png';

const amounts = [20, 30, 40];
class Resource {    // on crée des ressources qui spawn aléatoirement
    constructor() {
        this.x = Math.random() * (canvas.width - cellSize);
        this.y = (Math.floor(Math.random() * 5) + 1) * cellSize + 25;
        this.width = cellSize * 0.6;
        this.height = cellSize * 0.6;
        this.amount = amounts[Math.floor(Math.random() * amounts.length)];
    }
    draw() {
        //ctx.fillStyle = 'yellow';
        //ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.drawImage(gold, 0, 0, 32, 32, this.x, this.y, this.width, this.height);
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText(this.amount, this.x + 18 , this.y + 35);
    }
}
function handleResources() {
    if (frame % 500 === 0 && score < winningScore) {
        resources.push(new Resource());
    }
    for (let i = 0; i < resources.length; i++) {
        resources[i].draw();
        if (resources[i] && mouse.x && mouse.y && collision(resources[i], mouse)) {
            numberOfResources += resources[i].amount;
            floatingMessages.push(new FloatingMessage('+' + resources[i].amount, resources[i].x, resources[i].y, 30, 'black'));
            floatingMessages.push(new FloatingMessage('+' + resources[i].amount, 400, 85, 30, 'gold'));
            resources.splice(i, 1);
            i--;
        }
    }
}

// ---- UTILITIES ----

function handleGameStatus() {
    ctx.fillStyle = 'gold';
    ctx.font = '30px Arial';
    ctx.fillText('Score: ' + score, 180, 40);
    ctx.fillText('Resources: ' + numberOfResources, 180, 80);
    if (gameOver){
        ctx.fillStyle = 'black';
        ctx.font = '90px Arial';
        ctx.fillText('GAME OVER', 190, 330);    // ne s'affiche pas ? pourquoi ? TROUVé, il faut mettre handleenemies avant handlegamestatus
    }
    if (score >= winningScore && enemies.length === 0) {
        ctx.fillStyle = 'black';
        ctx.font = '60px Arial';
        ctx.fillText('LEVEL COMPLETE', 130, 300);
        ctx.font = '30px Arial';
        ctx.fillText('You win with ' + score + ' points !', 134, 340);
    }
}

// donne la position de la souris sur la grid la plus proche, fonction qui va nous servir à placer des defenders
canvas.addEventListener('click', function(){
    const gridPositionX = mouse.x - (mouse.x % cellSize) + cellGap;
    const gridPositionY = mouse.y - (mouse.y % cellSize) + cellGap;
    if (gridPositionY < cellSize) return; // si on clic sur la control bar celà stop la fonction
    for (let i = 0; i < defenders.length; i++) { // si un defenders est deja sur la grid on ne peut pas en poser un dessus
        if (defenders[i].x === gridPositionX && defenders[i].y === gridPositionY)
        return;
    }
    let defenderCost = 100;
    // on crée un nouveau defender lors du clic et on le rajoute au tableau
    if (numberOfResources >= defenderCost) {
        defenders.push(new Defender(gridPositionX, gridPositionY));
        numberOfResources -= defenderCost;
    } else {
        floatingMessages.push(new FloatingMessage('need more resources', mouse.x , mouse.y, 20, 'blue'));
    }
})

const background = new Image();
background.src = 'img/grassland.png';

        //refresh le canva, faire plusieurs canvas et n'en refresh que certains serait plus optimal
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(background, 0, 0, 1000, 740, 0, 0, 900, 600);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, controlsBar.width, controlsBar.height);
    handleGameGrid();
    handleDefenders();
    handleResources();
    handleProjectiles();
    handleEnemies();
    chooseDefender();       // mis avant gamestatus car les dessins s'empilent
    handleGameStatus();     // mis avant handleEnemies celà n'affiche pas gameover
    handleFloatingMessages();
    frame++;
    if (!gameOver) requestAnimationFrame(animate); // si gameover est false faire la loop
}
animate();

        //detection de collision reutilisable
function collision (first, second) {
    if (    !(  first.x > second.x + second.width ||
                first.x + first.width < second.x ||
                first.y > second.y + second.height ||
                first.y + first.height < second.y)
    ) {
        return true;
    };
};
        // si une des conditions au dessus est vraie alors il n'y a pas de collision, ! renvoie l'inverse donc faux
        // donc avec le ! se lit si elles sont toutes fausse, renvoie vrai, il y a collision. Puis draw() ligne 45
window.addEventListener('resize', function() {
    canvasPosition = canvas.getBoundingClientRect();
});
        // lorsqu'on resize la fenetre, la position du canva n'est plus correct, et donc celui de la souris, on la recalcule donc dès qu'elle est changée