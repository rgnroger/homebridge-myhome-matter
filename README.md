# MyHome — instalação limpa

Versão **1.1.0-beta.5**, fork de [miobio/homebridge-myhome-hb2](https://github.com/miobio/homebridge-myhome-hb2). Cadastre os dados do novo local; não precisa de backup, IP, senha ou pareamento da residência.

## Requisitos

- Node.js **22 ou 24 LTS**, na manutenção mais recente; prefira 24 para uma instalação nova, conforme a [política oficial](https://github.com/homebridge/homebridge/wiki/How-To-Update-Node.js).
- Homebridge **2.4.x** recomendado. A faixa declarada também permite **1.11.x com Node 22** para HomeKit. Matter exige **2.4+ dentro da série 2**, com Matter habilitado.
- Homebridge UI para o configurador e gateway MyHome/OpenWebNet acessível pela rede, normalmente na porta TCP 20000. Confira senha e autorização OpenWebNet no equipamento.

## Instalar em outro local

1. Instale um Homebridge novo pelo [guia oficial](https://github.com/homebridge/homebridge/wiki). Use a identidade e o pareamento gerados nessa instalação; não restaure a residência.
2. Instale este fork no diretório de plugins do novo Homebridge. Seu nome interno é **homebridge-myhome-hb2**. Procurar esse nome no npm instala o original, não este fork.

**Docker/CasaOS com a imagem oficial:** abra o terminal do contêiner e confirme que `/homebridge` é o volume persistente:

```sh
cd /homebridge
npm install https://github.com/rgnroger/homebridge-myhome-matter/archive/refs/tags/v1.1.0-beta.5.tar.gz
```

**Linux/macOS com plugins globais, fora de Docker:** use o mesmo Node/npm do serviço:

```sh
npm install -g https://github.com/rgnroger/homebridge-myhome-matter/archive/refs/tags/v1.1.0-beta.5.tar.gz
```

Use `sudo` apenas se essa instalação global exigir permissão. Instalações com diretório personalizado devem usar seu próprio diretório de plugins. Não mantenha original e fork em dois diretórios simultaneamente.

Também é possível transferir o pacote `homebridge-myhome-hb2-1.1.0-beta.5.tgz` e instalar com `npm install ./homebridge-myhome-hb2-1.1.0-beta.5.tgz` no diretório de plugins, ou `npm install -g /caminho/arquivo.tgz` para plugins globais. As dependências exigem internet.

3. Reinicie o Homebridge e abra **Plugins → homebridge-myhome-hb2 → Configurações**.
4. Informe IP/hostname, porta e senha do **novo gateway**. Clique em **Adicionar dispositivo** e escolha relé, dimmer ou persiana. Preencha nome, A e PL; barramento padrão 0. Área 0 é aceita e PL deve ser maior que zero. Persiana comum exige tempo real de percurso completo em segundos.
5. Comece com um dispositivo, Matter desmarcado. Clique em **Salvar configuração**, feche a tela e use **Reiniciar** no painel Homebridge.
6. Confira a conexão nos registros, pareie a nova ponte pelo código exibido pelo Homebridge e teste o dispositivo. Depois cadastre os demais.

Sem gateway/dispositivos, o plugin carrega e aguarda cadastro sem abrir conexões. Abrir o editor não grava dados. O salvamento preserva outros plugins e cria um backup ao lado do arquivo de configuração.

## Configuração

[CONFIGURADOR.md](CONFIGURADOR.md) contém exemplos. [sample_config.json](sample_config.json) é um **fragmento inicial vazio**, não um substituto do arquivo inteiro do Homebridge. Inclua seu objeto no array `platforms` existente.

- HomeKit: relés, dimmers e persianas comum/avançada; tipos legados pelo JSON.
- Matter opcional: somente `MHRelay`. A tela cria a plataforma complementar ao selecionar relés. Habilite e pareie Matter pelo Homebridge; ambas as plataformas precisam ficar na ponte principal, no mesmo processo.
- Dimmers e persianas não são publicados em Matter nesta beta. Persiana avançada requer atuador que suporte posição.
- Comando enfileirado não confirma execução física. Teste autenticação, acionamento e retorno de estado no novo local. Os testes automatizados não acessam equipamentos.

## Desenvolvimento

```sh
npm ci
npm test
npm run check
npm pack
```

Sem compilação. Lockfile incluído para reproduzir o ambiente de testes. Veja [CHANGELOG.md](CHANGELOG.md). [MATTER-TESTE.md](MATTER-TESTE.md) é histórico, não o guia atual.

## Créditos

Licença MIT, com avisos originais de angeloxx, Simone Tisa e LeJeko. Base modernizada por miobio; configurador e Matter no fork rgnroger. bvial/homebridge-myhome foi referência de experiência, sem incorporação de código. Projeto independente de BTicino, Legrand, Amazon e Apple.
