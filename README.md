### Introdução

Este repositório contém a implementação de um sistema de chat distribuído em tempo real, desenvolvido como trabalho prático para a disciplina de Sistemas Distribuídos.

O sistema foi projetado utilizando arquitetura de microsserviços, comunicação assíncrona via WebSockets, autenticação stateless com JWT, persistência de dados e escalabilidade horizontal real, suportada pelo uso de Redis.

A aplicação permite que múltiplos usuários se cadastrem, façam login e troquem mensagens em tempo real, mesmo quando conectados a diferentes instâncias do serviço de chat.


**Relatório:** 

Link google docs: https://docs.google.com/document/d/1awn8AK5Bzyo-CRX81Gng2MsWLUlukKniMZOUWTBZBg4/edit?usp=sharing

Link pdf: https://github.com/leticiaasoares/sd-chat/blob/main/Relatorio_TP_Final_LeticiaSoares_MateusGoncalves.pdf


### Iniciar o Redis

O Redis deve estar em execução antes de iniciar o `chat-service`.

Verifique se o Redis está ativo:

```bash
redis-cli ping
```

Resposta esperada:

```text
PONG
```

Caso o Redis não esteja rodando, inicie-o conforme o seu sistema operacional.

---

### Rodar o Auth-Service

Em um terminal, execute:

```bash
cd auth-service
npm install
npm start
```

O serviço de autenticação ficará disponível em:

```text
http://localhost:4000
```

---

### Rodar o Chat-Service (Escalabilidade Horizontal)

O `chat-service` pode ser executado em **múltiplas instâncias**.
Cada instância deve ser iniciada em um terminal diferente, utilizando portas distintas.

Exemplo com **três instâncias**:

```bash
cd chat-service
npm install

PORT=4001 REDIS_URL=redis://localhost:6379 node server.js
PORT=4002 REDIS_URL=redis://localhost:6379 node server.js
PORT=4003 REDIS_URL=redis://localhost:6379 node server.js
```


### Acessar o Front-end

O front-end é servido pelo próprio `chat-service`.

Acesse pelo navegador:

* [http://localhost:4001](http://localhost:4001)
* [http://localhost:4002](http://localhost:4002)
* [http://localhost:4003](http://localhost:4003)

Cada endereço corresponde a uma instância diferente do `chat-service`.

