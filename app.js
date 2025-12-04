// --- KONFIGURÁCIÓ ---
// ⚠️ IDE ÍRD VISSZA A KULCSODAT!
const RAWG_API_KEY = "d1cbae34f39545a9b3f7b524c5917a2a"; 

const saveButton = document.querySelector('.save-btn');
const mainBtn = document.getElementById('addBtn');
const searchInput = document.getElementById('searchInput');

let currentGameId = null;
let currentGameName = "";
let currentGameTotal = 0; 
let editingId = null; 
let editingOldImage = null; 

// --- ÚJ: ÉRTESÍTÉS FÜGGVÉNY (TOAST) ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    // Ikon választása
    const icon = type === 'success' ? '✅' : '⚠️';
    
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icon}</span> ${message}`;
    
    container.appendChild(toast);

    // 3.5 másodperc múlva töröljük a HTML-ből is
    setTimeout(() => {
        toast.remove();
    }, 3500);
}

// --- JÁTÉK KERESÉS (RAWG) ---
window.searchRAWG = function() {
    const query = document.getElementById('apiSearchInput').value;
    const resultsDiv = document.getElementById('api-results');
    
    if(!query) return;

    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = '<p style="padding:10px; color:#888;">Keresés...</p>';

    fetch(`https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${query}&page_size=5`)
        .then(response => response.json())
        .then(data => {
            resultsDiv.innerHTML = ""; 
            data.results.forEach(game => {
                const div = document.createElement('div');
                div.className = 'api-item';
                div.innerHTML = `
                    <img src="${game.background_image || 'https://via.placeholder.com/50'}" alt="">
                    <span>${game.name} (${game.released ? game.released.slice(0,4) : '?'})</span>
                `;
                div.onclick = () => selectApiGame(game.name, game.background_image);
                resultsDiv.appendChild(div);
            });
        })
        .catch(err => {
            console.error(err);
            resultsDiv.innerHTML = '<p style="padding:10px; color:red;">Hiba történt.</p>';
        });
}

function selectApiGame(name, image) {
    document.getElementById('gameNameInput').value = name;
    document.getElementById('apiImageURL').value = image;
    document.getElementById('api-results').style.display = 'none';
    showToast("Játék adatai betöltve!"); // Itt már az újat használjuk
}

// --- NAVIGÁCIÓ ---

window.openGame = function(id, name, total) {
    currentGameId = id;
    currentGameName = name;
    currentGameTotal = total || 1;

    document.getElementById('games-gallery').style.display = 'none';
    document.getElementById('dashboard').style.display = 'none';
    if(searchInput) searchInput.style.display = 'none';
    document.getElementById('trophy-view').style.display = 'block';
    
    document.getElementById('current-game-title').innerText = name;
    mainBtn.innerText = "+ Új Trófea";
    
    editingId = null;
    loadTrophies(id);
}

window.backToGames = function() {
    currentGameId = null;
    editingId = null; 

    document.getElementById('games-gallery').style.display = 'grid';
    document.getElementById('dashboard').style.display = 'flex';
    if(searchInput) {
        searchInput.style.display = 'block';
        searchInput.value = "";
    }
    filterGames();

    document.getElementById('trophy-view').style.display = 'none';
    mainBtn.innerText = "+ Új Játék";
    
    loadGames(); 
    loadStats();
}

window.filterGames = function() {
    if(!searchInput) return;
    const filterValue = searchInput.value.toLowerCase();
    const cards = document.querySelectorAll('#games-gallery .card');

    cards.forEach(card => {
        const title = card.querySelector('h2').innerText.toLowerCase();
        if(title.includes(filterValue)) card.style.display = "block";
        else card.style.display = "none";
    });
}

// --- MODAL KEZELÉS ---

window.openModal = function() {
    editingId = null;
    editingOldImage = null;
    
    document.getElementById('gameNameInput').value = "";
    document.getElementById('totalTrophiesInput').value = "";
    document.getElementById('achievNameInput').value = "";
    document.getElementById('achievDescInput').value = "";
    document.getElementById('achievDateInput').value = "";
    document.getElementById('imageFile').value = "";
    
    document.getElementById('apiSearchInput').value = "";
    document.getElementById('apiImageURL').value = "";
    document.getElementById('api-results').style.display = 'none';

    saveButton.innerText = "Mentés";
    showModalUI();
}

function showModalUI() {
    document.getElementById('uploadModal').style.display = 'flex';
    
    if(currentGameId === null) {
        document.getElementById('modal-title').innerText = editingId ? "Játék Szerkesztése" : "Új Játék";
        document.getElementById('game-fields').style.display = 'block';
        document.getElementById('trophy-fields').style.display = 'none';
    } else {
        document.getElementById('modal-title').innerText = editingId ? "Trófea Szerkesztése" : ("Új Trófea: " + currentGameName);
        document.getElementById('game-fields').style.display = 'none';
        document.getElementById('trophy-fields').style.display = 'block';
    }
}

window.closeModal = function() { 
    document.getElementById('uploadModal').style.display = 'none'; 
    editingId = null; 
}

// --- MENTÉS ---
saveButton.addEventListener('click', function() {
    const fileInput = document.getElementById('imageFile');
    const file = fileInput.files[0];
    
    const apiImage = document.getElementById('apiImageURL').value;

    if(currentGameId === null) { 
        if(!file && !apiImage && !editingId) {
            showToast("Válassz borítóképet!", "error"); return; // Hibaüzenet toast-tal
        }
    }
    else { 
        if(!file && !editingId) { 
            showToast("Válassz képet a trófeához!", "error"); return; 
        }
    }

    saveButton.innerText = "Mentés...";
    saveButton.disabled = true;

    let imagePromise;

    if (file) {
        const storageRef = firebase.storage().ref();
        const fileName = (currentGameId ? 'trofeak/' : 'boritok/') + Date.now() + "_" + file.name;
        imagePromise = storageRef.child(fileName).put(file).then(s => s.ref.getDownloadURL());
    } 
    else if (apiImage && currentGameId === null) {
        imagePromise = Promise.resolve(apiImage);
    }
    else {
        imagePromise = Promise.resolve(editingOldImage);
    }

    imagePromise.then((url) => {
        
        if(currentGameId === null) {
            const gName = document.getElementById('gameNameInput').value;
            const gTotal = document.getElementById('totalTrophiesInput').value;
            
            if(gName === "") throw new Error("A név kötelező!");

            const data = {
                nev: gName,
                total: parseInt(gTotal) || 0,
                borito: url
            };
            if(!editingId) data.datum = new Date(); 

            if(editingId) return db.collection("games").doc(editingId).update(data);
            else return db.collection("games").add(data);
        } 
        else {
            const tName = document.getElementById('achievNameInput').value;
            const tDateInput = document.getElementById('achievDateInput').value;
            const tDesc = document.getElementById('achievDescInput').value;
            
            if(tName === "") throw new Error("A név kötelező!");

            const data = {
                gameId: currentGameId,
                nev: tName,
                leiras: tDesc,
                kep: url
            };

            if(tDateInput) data.datum = new Date(tDateInput);
            else if(!editingId) data.datum = new Date();

            if(editingId) return db.collection("trofeak").doc(editingId).update(data);
            else return db.collection("trofeak").add(data);
        }

    }).then(() => {
        showToast(editingId ? "Sikeres frissítés!" : "Sikeres mentés!", "success"); // Sikerüzenet
        
        saveButton.innerText = "Mentés";
        saveButton.disabled = false;
        closeModal();
        
        if(currentGameId) loadTrophies(currentGameId);
        else {
            loadGames();
            loadStats();
        }
    })
    .catch((error) => {
        console.error(error);
        showToast("Hiba: " + error.message, "error"); // Hibaüzenet
        saveButton.innerText = "Mentés";
        saveButton.disabled = false;
    });
});

// --- SZERKESZTÉS ---
window.editGame = function(id, name, total, image) {
    editingId = id;
    editingOldImage = image; 
    currentGameId = null; 

    document.getElementById('gameNameInput').value = name;
    document.getElementById('totalTrophiesInput').value = total;
    
    document.getElementById('apiSearchInput').value = "";
    document.getElementById('api-results').style.display = 'none';
    
    showModalUI();
    saveButton.innerText = "Frissítés"; 
}

window.editTrophy = function(id, name, desc, dateStr, image) {
    editingId = id;
    editingOldImage = image;

    document.getElementById('achievNameInput').value = name;
    document.getElementById('achievDescInput').value = desc;

    showModalUI();
    saveButton.innerText = "Frissítés";
}

function loadStats() {
    db.collection("games").get().then((snap) => {
        document.getElementById('stat-games-count').innerText = snap.size;
    });
    db.collection("trofeak").get().then((snap) => {
        document.getElementById('stat-trophies-count').innerText = snap.size;
    });
}

function loadGames() {
    const gallery = document.getElementById('games-gallery');
    db.collection("games").orderBy("datum", "desc").get().then((snapshot) => {
        gallery.innerHTML = "";
        snapshot.forEach((doc) => {
            const data = doc.data();
            const safeName = data.nev.replace(/'/g, "\\'"); 
            
            gallery.innerHTML += `
                <div class="card" onclick="openGame('${doc.id}', '${safeName}', ${data.total})">
                    <button class="edit-btn" onclick="event.stopPropagation(); editGame('${doc.id}', '${safeName}', ${data.total}, '${data.borito}')">✏️</button>
                    <button class="delete-btn" onclick="event.stopPropagation(); deleteGame('${doc.id}')">×</button>
                    <div class="card-image" style="background-image: url('${data.borito}');"></div>
                    <div class="card-content"><h2 style="text-align: center;">${data.nev}</h2></div>
                </div>`;
        });
        if(searchInput && searchInput.value) filterGames();
    });
}

function loadTrophies(gameId) {
    const listContainer = document.getElementById('trophies-list');
    const progressText = document.getElementById('progress-text');
    const progressPercent = document.getElementById('progress-percent');
    const progressFill = document.getElementById('progress-fill');

    db.collection("trofeak").where("gameId", "==", gameId).orderBy("datum", "desc").get().then((snapshot) => {
        listContainer.innerHTML = "";
        
        const currentCount = snapshot.size;
        const percent = Math.round((currentCount / currentGameTotal) * 100);
        
        progressText.innerText = `${currentCount} / ${currentGameTotal} TELJESÍTMÉNY ELÉRVE`;
        progressPercent.innerText = `${percent}%`;
        progressFill.style.width = "0%"; // Animáció reset
        setTimeout(() => { progressFill.style.width = `${percent}%`; }, 100);

        if(snapshot.empty) {
            listContainer.innerHTML = "<p style='color: #666; padding: 20px; text-align: center;'>Még nincs trófea feltöltve.</p>";
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            let dateStr = "";
            if(data.datum) {
                const dateObj = data.datum.toDate();
                dateStr = dateObj.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' });
            }

            const safeName = data.nev.replace(/'/g, "\\'");
            const safeDesc = (data.leiras || "").replace(/'/g, "\\'");

            listContainer.innerHTML += `
                <div class="trophy-row">
                    <div class="trophy-row-icon" style="background-image: url('${data.kep}');"></div>
                    <div class="trophy-row-content">
                        <h3 style="margin-bottom: 5px;">${data.nev}</h3>
                        <p style="color: #999; margin: 0; font-size: 13px;">${data.leiras || ""}</p>
                    </div>
                    <div class="trophy-row-right">
                        <div class="trophy-row-date">Feloldva:<br>${dateStr}</div>
                        <div class="trophy-buttons">
                            <button class="row-edit-btn" onclick="editTrophy('${doc.id}', '${safeName}', '${safeDesc}', '', '${data.kep}')">✏️</button>
                            <button class="row-delete-btn" onclick="deleteTrophy('${doc.id}')">×</button>
                        </div>
                    </div>
                </div>`;
        });
    });
}

window.deleteGame = function(id) {
    if(confirm("Biztosan törlöd a játékot?")) db.collection("games").doc(id).delete().then(() => { 
        loadGames(); 
        loadStats(); 
        showToast("Játék törölve.", "error"); // Törlés értesítés
    });
}

window.deleteTrophy = function(id) {
    if(confirm("Törlöd ezt a trófeát?")) db.collection("trofeak").doc(id).delete().then(() => { 
        loadTrophies(currentGameId); 
        loadStats(); 
        showToast("Trófea törölve.", "error"); // Törlés értesítés
    });
}

loadGames();
loadStats();