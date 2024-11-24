import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, increment } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDY6K-eT453xY_-KVw12qE10_s8BcAy1EA",
    authDomain: "cad-beta.firebaseapp.com",
    projectId: "cad-beta",
    storageBucket: "cad-beta.firebasestorage.app",
    messagingSenderId: "1064813950737",
    appId: "1:1064813950737:web:e9bd9b846cec933610feb0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentPlayer = null;

document.getElementById("google-login").addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        console.log(`Logged in as ${user.displayName}`);
        joinGame(user);
    } catch (error) {
        console.error("Error logging in:", error);
    }
});

async function joinGame(user) {
    const gameRef = doc(db, "games", "game1");
    const gameSnapshot = await gameRef.get();

    if (!gameSnapshot.exists()) {
        await setDoc(gameRef, {
            player1: user.uid,
            player1Position: { x: 0, y: 0 },
            status: "waiting"
        });
        currentPlayer = "player1";
    } else {
        const gameData = gameSnapshot.data();
        if (gameData.status === "waiting") {
            await updateDoc(gameRef, {
                player2: user.uid,
                player2Position: { x: 0, y: 0 },
                status: "active"
            });
            currentPlayer = "player2";
        } else {
            alert("Game is full!");
            return;
        }
    }

    document.getElementById("login").style.display = "none";
    document.getElementById("game").style.display = "block";

    onSnapshot(gameRef, (doc) => {
        const data = doc.data();
        updateGame(data);
    });
}

function updateGame(data) {
    const player1Element = document.getElementById("player1");
    const player2Element = document.getElementById("player2");

    if (data.player1Position) {
        player1Element.style.transform = `translate(${data.player1Position.x * 10}px, ${data.player1Position.y * 10}px)`;
    }
    if (data.player2Position) {
        player2Element.style.transform = `translate(${data.player2Position.x * 10}px, ${data.player2Position.y * 10}px)`;
    }

    document.getElementById("status").innerText = data.status === "active" ? "Game Active!" : "Waiting for players...";
}

document.addEventListener("keydown", async (event) => {
    if (!currentPlayer) return;

    let movement = { x: 0, y: 0 };
    if (currentPlayer === "player1") {
        if (event.key === "w") movement.y = -1;
        if (event.key === "a") movement.x = -1;
        if (event.key === "d") movement.x = 1;
    } else if (currentPlayer === "player2") {
        if (event.key === "ArrowUp") movement.y = -1;
        if (event.key === "ArrowLeft") movement.x = -1;
        if (event.key === "ArrowRight") movement.x = 1;
    }

    const gameRef = doc(db, "games", "game1");
    const positionField = currentPlayer === "player1" ? "player1Position" : "player2Position";
    const gameSnapshot = await gameRef.get();
    const gameData = gameSnapshot.data();
    const currentPosition = gameData[positionField];

    await updateDoc(gameRef, {
        [positionField]: {
            x: currentPosition.x + movement.x,
            y: currentPosition.y + movement.y
        }
    });
});
