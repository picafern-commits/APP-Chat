SÓ NOS - CHAT PRIVADO EM TEMPO REAL
===================================

Esta versão já vai personalizada para:
- Nome da app: Só Nos
- Utilizador 1: Ricardo
- Utilizador 2: Carol
- PIN Ricardo: 22970
- PIN Carol: 22970
- Cor principal: Roxo

O que já vem nesta versão:
- Chat em tempo real para Android e iPhone
- 2 utilizadores com PIN
- Envio de texto
- Envio de imagem
- Visto de leitura (✔ / ✔✔)
- Tema escuro/claro
- Instalação como app no ecrã principal

FICHEIROS IMPORTANTES
---------------------
1) firebase-config.js
2) index.html
3) style.css
4) app.js

ANTES DE USAR
-------------
1. Cria um projeto no Firebase
2. Ativa Firestore Database
3. Vai a Project Settings > Your apps > Web app
4. Copia a configuração Firebase para o ficheiro firebase-config.js
5. Publica a pasta no GitHub Pages ou abre num servidor local

EXEMPLO DE REGRAS FIRESTORE PARA TESTAR
---------------------------------------
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomId}/messages/{messageId} {
      allow read, write: if true;
    }
  }
}

ATENÇÃO
-------
Estas regras são abertas e servem só para testes rápidos.

IPHONE
------
Abre no Safari > Partilhar > Adicionar ao ecrã principal

ANDROID
-------
Abre no Chrome > menu > Instalar app / Adicionar ao ecrã principal
