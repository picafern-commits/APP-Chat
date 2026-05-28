SÓ NOS — FIREBASE V2

Esta versão já está preparada para funcionar em tempo real com Firebase.

1) Abre o ficheiro firebase-config.js
2) Cola a configuração web do teu projeto Firebase
3) Publica esta pasta no GitHub Pages ou abre num servidor local

REGRAS FIRESTORE
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /messages/{doc} { allow read, write: if true; }
    match /shopping/{doc} { allow read, write: if true; }
    match /events/{doc} { allow read, write: if true; }
    match /memories/{doc} { allow read, write: if true; }
    match /locations/{doc} { allow read, write: if true; }
  }
}

REGRAS STORAGE
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /chat-images/{allPaths=**} {
      allow read, write: if true;
    }
  }
}

IMPORTANTE
- O chat, compras, agenda e memórias sincronizam em tempo real
- As imagens do chat e das memórias ficam no Storage
- Se o Firebase não estiver preenchido, a app usa modo local
- A localização usa a permissão de GPS do browser e guarda a última posição de cada perfil
- As notificações locais funcionam enquanto a app/browser está ativo. Push com a app fechada precisa de Firebase Cloud Messaging
- Para Android/iPhone, instala pelo browser como app
