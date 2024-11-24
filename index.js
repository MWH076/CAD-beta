const firebaseConfig = {
    apiKey: "AIzaSyDY6K-eT453xY_-KVw12qE10_s8BcAy1EA",
    authDomain: "cad-beta.firebaseapp.com",
    projectId: "cad-beta",
    storageBucket: "cad-beta.firebasestorage.app",
    messagingSenderId: "1064813950737",
    appId: "1:1064813950737:web:e9bd9b846cec933610feb0"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const authContainer = document.getElementById("auth-container");
const gameContainer = document.getElementById("game-container");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let currentPlayer = null;
let gameSession = null;
let playerPositions = { player1: { x: 100, y: 300 }, player2: { x: 600, y: 300 } };

const playerImages = {
    player1: new Image(),
    player2: new Image()
};
playerImages.player1.src = "player1.png";
playerImages.player2.src = "player2.png";

function renderGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    Object.entries(playerPositions).forEach(([player, pos]) => {
        ctx.drawImage(playerImages[player], pos.x, pos.y, 50, 50);
    });
}

function updatePlayerPosition(player, x, y) {
    if (gameSession) {
        db.collection("games").doc(gameSession.id).update({
            [`positions.${player}`]: { x, y }
        });
    }
}

function handleKeyPress(event) {
    if (!currentPlayer) return;

    const pos = playerPositions[currentPlayer];
    if (event.key === "w" && pos.y > 0) pos.y -= 10;
    if (event.key === "a" && pos.x > 0) pos.x -= 10;
    if (event.key === "d" && pos.x < canvas.width - 50) pos.x += 10;

    updatePlayerPosition(currentPlayer, pos.x, pos.y);
}

async function joinGame(user) {
    const gamesRef = db.collection("games");
    const querySnapshot = await gamesRef.where("isFull", "==", false).get();

    if (querySnapshot.empty) {
        const newGame = await gamesRef.add({
            players: { player1: user.uid },
            positions: playerPositions,
            isFull: false
        });
        gameSession = { id: newGame.id, data: { players: { player1: user.uid }, positions: playerPositions, isFull: false } };
        currentPlayer = "player1";
    } else {
        const gameDoc = querySnapshot.docs[0];
        const gameData = gameDoc.data();

        currentPlayer = "player2";
        gameData.players.player2 = user.uid;
        gameData.isFull = true;

        await gamesRef.doc(gameDoc.id).update(gameData);

        gameSession = { id: gameDoc.id, data: gameData };
    }

    db.collection("games").doc(gameSession.id).onSnapshot((doc) => {
        const data = doc.data();
        playerPositions = data.positions;
        renderGame();
    });
}

function initializeGame() {
    document.addEventListener("keydown", handleKeyPress);
    renderGame();
}

loginBtn.addEventListener("click", async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);

    const user = result.user;
    authContainer.style.display = "none";
    gameContainer.style.display = "block";

    await joinGame(user);
    initializeGame();
});

logoutBtn.addEventListener("click", async () => {
    await auth.signOut();
    location.reload();
});
